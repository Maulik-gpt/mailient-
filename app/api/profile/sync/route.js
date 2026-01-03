// app/api/profile/sync/route.js
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase.js";
import { decrypt, encrypt } from "@/lib/crypto.js";
// import { auth } from "@/lib/auth.js"; // Removed top-level import to prevent build-time evaluation

// CRITICAL: Force dynamic rendering to prevent build-time evaluation
export const dynamic = 'force-dynamic';

const supabase = new Proxy({}, {
  get: (target, prop) => getSupabaseAdmin()[prop]
});

// Ensure database tables exist
async function ensureDatabaseTables() {
  try {
    console.log("Checking if user_profiles table exists in sync...");

    // Test if user_profiles table exists by doing a simple query
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id")
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log("user_profiles table doesn't exist in sync endpoint");
      throw new Error("Database table 'user_profiles' does not exist. Please run database setup.");
    }

    console.log("Database tables check completed in sync");
  } catch (error) {
    console.error("Error checking database tables in sync:", error);
    throw error;
  }
}

// Helper to get authenticated user
async function getAuthenticatedUser(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("No authorization header");
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error("Invalid token");
    }

    return user;
  } catch (error) {
    throw new Error("Authentication required");
  }
}

// Refresh access token
async function refreshAccessToken(row) {
  if (!row.encrypted_refresh_token) throw new Error("no_refresh_token");
  const refresh_token = decrypt(row.encrypted_refresh_token);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const body = await r.json();
  if (body.error) throw new Error(JSON.stringify(body));
  const enc = encrypt(body.access_token);
  const expiry = body.expires_in ? new Date(Date.now() + body.expires_in * 1000).toISOString() : null;
  await supabase.from("user_tokens").update({
    encrypted_access_token: enc,
    access_token_expires_at: expiry,
    updated_at: new Date().toISOString(),
  }).eq("google_email", row.google_email);
  return body.access_token;
}

// Sync profile from Google
async function syncProfileFromGoogle(userEmail) {
  // Get user tokens
  const { data: row, error: tokenError } = await supabase
    .from("user_tokens")
    .select("*")
    .eq("google_email", userEmail)
    .single();

  if (tokenError || !row) {
    throw new Error("No tokens found for user");
  }

  let accessToken;
  try {
    accessToken = decrypt(row.encrypted_access_token);
  } catch (e) {
    // Try refresh
    accessToken = await refreshAccessToken(row);
  }

  // Fetch Google profile
  const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Refresh token and retry
      accessToken = await refreshAccessToken(row);
      const retryResponse = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!retryResponse.ok) {
        throw new Error("Failed to fetch Google profile after token refresh");
      }
      const googleProfile = await retryResponse.json();
      return googleProfile;
    }
    throw new Error("Failed to fetch Google profile");
  }

  const googleProfile = await response.json();

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userEmail)
    .maybeSingle();

  let profile;
  if (existingProfile) {
    // Update existing profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from("user_profiles")
      .update({
        name: googleProfile.name,
        avatar_url: googleProfile.picture,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userEmail)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      throw new Error("Failed to update profile in database");
    }
    profile = updatedProfile;
  } else {
    // Create new profile
    const { data: newProfile, error: createError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: userEmail,
        email: userEmail,
        name: googleProfile.name,
        avatar_url: googleProfile.picture,
        bio: null,
        location: null,
        website: null,
        status: 'online',
        last_synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to create profile:", createError);
      throw new Error("Failed to create profile in database");
    }
    profile = newProfile;
  }

  return profile;
}

// GET - Sync profile from Google
export async function GET(req) {
  try {
    // Use the same authentication method as the profile API
    const { auth } = await import("@/lib/auth.js");
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Ensure database tables exist
    await ensureDatabaseTables();

    const syncedProfile = await syncProfileFromGoogle(session.user.email);

    return NextResponse.json({
      message: "Profile synced successfully",
      profile: syncedProfile,
      synced_at: syncedProfile.last_synced_at,
    });
  } catch (err) {
    console.error("Profile sync error:", err);
    if (err.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST - Manual sync trigger (for admin or scheduled)
export async function POST(req) {
  try {
    // Use the same authentication method as the profile API
    const { auth } = await import("@/lib/auth.js");
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Ensure database tables exist
    await ensureDatabaseTables();

    const syncedProfile = await syncProfileFromGoogle(session.user.email);

    return NextResponse.json({
      message: "Profile synced successfully",
      profile: syncedProfile,
      synced_at: syncedProfile.last_synced_at,
    });
  } catch (err) {
    console.error("Profile sync error:", err);
    if (err.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

