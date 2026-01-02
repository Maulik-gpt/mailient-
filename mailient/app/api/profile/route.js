// app/api/profile/route.js
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth.js";
import { createClient } from "@supabase/supabase-js";
import { decrypt, encrypt } from "@/lib/crypto.js";
import { isValidUrlStrict } from "@/lib/url-utils.js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Ensure database tables exist
async function ensureDatabaseTables() {
  try {
    console.log("Checking if user_profiles table exists...");

    // Test if user_profiles table exists by doing a simple query
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id")
      .limit(1);

    if (error && error.message.includes('does not exist')) {
      console.log("user_profiles table doesn't exist, triggering database setup...");

      try {
        // Call database setup endpoint
        const setupResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/database/setup`, {
          method: 'POST'
        });

        if (setupResponse.ok) {
          const setupResult = await setupResponse.json();
          console.log("Database setup completed:", setupResult);

          // Re-test table existence
          const { error: retestError } = await supabase
            .from("user_profiles")
            .select("id")
            .limit(1);

          if (retestError && retestError.message.includes('does not exist')) {
            throw new Error("Database table 'user_profiles' still does not exist after setup. Please manually run the SQL schema.");
          }
        } else {
          const setupError = await setupResponse.json();
          throw new Error(`Database setup failed: ${setupError.error || 'Unknown error'}`);
        }
      } catch (setupError) {
        console.error("Database setup failed:", setupError);
        throw new Error("Database table 'user_profiles' does not exist. Please run the database setup script at /api/database/setup");
      }
    }

    console.log("Database tables check completed");
  } catch (error) {
    console.error("Error checking database tables:", error);
    throw error;
  }
}

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
    last_refreshed_at: new Date().toISOString(),
  }).eq("google_email", row.google_email);
  return body.access_token;
}

// GET - Retrieve user profile
export async function GET(req) {
  try {
    // Check for legacy Gmail profile fetch
    let email = null;
    try {
      const url = new URL(req.url);
      email = url.searchParams.get("email");
    } catch (urlError) {
      console.error("Error parsing URL:", urlError);
      // Continue without email param
    }

    if (email) {
      return await getGmailProfile(email);
    }

    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase environment variables");
      throw new Error("Server configuration error: Missing database credentials");
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!session.user.email) {
      console.error("Session user missing email:", session.user);
      return NextResponse.json({ error: "Invalid session: missing email" }, { status: 401 });
    }

    const user = { email: session.user.email };

    // Ensure database tables exist
    await ensureDatabaseTables();

    // Fetch profile from database using email as user_id
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Supabase query error:", error);
      throw error;
    }

    if (!profile) {
      console.log("No existing profile found, attempting Gmail sync...");

      // Try to sync from Gmail first before creating fallback
      try {
        const syncResponse = await fetch(`${req.nextUrl.origin}/api/profile/sync`, {
          method: 'POST',
          headers: {
            'cookie': req.headers.get('cookie') || ''
          }
        });

        if (syncResponse.ok) {
          console.log("Gmail sync successful, fetching synced profile...");
          const syncedProfile = await syncResponse.json();
          return NextResponse.json(syncedProfile.profile);
        } else {
          console.log("Gmail sync failed, creating fallback profile");
        }
      } catch (syncError) {
        console.warn("Gmail sync failed (non-critical):", syncError);
      }

      // If no profile exists and Gmail sync failed, return basic info
      // Check if user has tokens (handle errors gracefully)
      let tokens = [];
      try {
        const { data: tokensData, error: tokensError } = await supabase
          .from("user_tokens")
          .select("google_email")
          .eq("google_email", user.email);
        if (!tokensError) {
          tokens = tokensData || [];
        } else {
          console.warn("Error fetching tokens (non-critical):", tokensError);
        }
      } catch (e) {
        console.warn("Exception fetching tokens (non-critical):", e);
      }

      let emailCount = 0;
      try {
        const { count, error: countError } = await supabase
          .from("user_emails")
          .select("*", { count: 'exact', head: true })
          .eq("user_id", user.email);
        if (!countError) {
          emailCount = count || 0;
        } else {
          console.warn("Error counting emails (non-critical):", countError);
        }
      } catch (e) {
        console.warn("Exception counting emails (non-critical):", e);
      }

      return NextResponse.json({
        user_id: user.email,
        email: user.email,
        name: session.user.name || null,
        username: null,
        picture: session.user.image || null,
        avatar_url: session.user.image || null,
        banner_url: null,
        bio: null,
        location: null,
        website: null,
        status: 'online',
        preferences: { theme: 'dark', language: 'en', notifications: true, email_frequency: 'daily', timezone: 'UTC' },
        birthdate: null,
        gender: null,
        work_status: null,
        interests: [],
        last_synced_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Enhanced data for Mailient
        email_accounts_connected: tokens.length || 0,
        emails_processed: emailCount || 0,
        plan: profile?.preferences?.plan || 'Free Plan',
        storage_used: `${Math.round(emailCount * 0.1)} MB`,
        last_email_activity: null
      });
    }

    // Fetch additional data for Mailient
    // Query by google_email since tokens might be stored with email as user_id
    let tokens = [];
    try {
      const { data: tokensData, error: tokensError } = await supabase
        .from("user_tokens")
        .select("google_email")
        .eq("google_email", user.email);
      if (!tokensError) {
        tokens = tokensData || [];
      } else {
        console.warn("Error fetching tokens (non-critical):", tokensError);
      }
    } catch (e) {
      console.warn("Exception fetching tokens (non-critical):", e);
    }

    let emailCount = 0;
    try {
      const { count, error: countError } = await supabase
        .from("user_emails")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", user.email);
      if (!countError) {
        emailCount = count || 0;
      } else {
        console.warn("Error counting emails (non-critical):", countError);
      }
    } catch (e) {
      console.warn("Exception counting emails (non-critical):", e);
    }

    let lastEmail = null;
    try {
      const { data: lastEmailData, error: lastEmailError } = await supabase
        .from("user_emails")
        .select("date")
        .eq("user_id", user.email)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!lastEmailError) {
        lastEmail = lastEmailData;
      } else {
        console.warn("Error fetching last email (non-critical):", lastEmailError);
      }
    } catch (e) {
      console.warn("Exception fetching last email (non-critical):", e);
    }

    const enhancedProfile = {
      ...profile,
      email_accounts_connected: tokens.length || 0,
      emails_processed: 99, // Show 99+ for demo purposes
      plan: profile?.preferences?.plan || 'Free Plan',
      storage_used: `${Math.round(emailCount * 0.1)} MB`, // Rough estimate
      last_email_activity: lastEmail?.date || null,
      // Ensure defaults for new fields - always set them
      bio: profile.bio || null,
      location: profile.location || null, // Will be empty until user sets it
      website: profile.website || 'https://example.com',
      status: profile.status || 'online',
      banner_url: profile.banner_url || null,
      preferences: profile.preferences || { theme: 'dark', language: 'en', notifications: true, email_frequency: 'daily', timezone: 'UTC' },
      birthdate: profile.birthdate || '1999-01-01', // Default for demo
      gender: profile.gender || 'Not specified', // Default for demo
      work_status: profile.work_status || 'Professional',
      interests: profile.interests || ['Technology', 'Productivity', 'AI']
    };

    return NextResponse.json(enhancedProfile);
  } catch (err) {
    console.error("Profile GET error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      details: err.details
    });

    // Handle authentication errors
    if (err.message === "Authentication required" || err.message?.includes("Authentication")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Try to get session for fallback profile
    try {
      const session = await auth();
      if (session?.user?.email) {
        // Return a minimal fallback profile instead of error
        console.warn("Returning fallback profile due to error:", err.message);
        return NextResponse.json({
          user_id: session.user.email,
          email: session.user.email,
          name: session.user.name || null,
          picture: session.user.image || null,
          avatar_url: session.user.image || null,
          banner_url: null,
          bio: null,
          location: null,
          website: null,
          status: 'online',
          preferences: { theme: 'dark', language: 'en', notifications: true, email_frequency: 'daily', timezone: 'UTC' },
          birthdate: null,
          gender: null,
          work_status: null,
          interests: [],
          last_synced_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email_accounts_connected: 0,
          emails_processed: 0,
          plan: profile?.preferences?.plan || 'Free Plan',
          storage_used: '0 MB',
          last_email_activity: null
        });
      }
    } catch (fallbackError) {
      console.error("Error creating fallback profile:", fallbackError);
    }

    // If we can't create a fallback, return error
    return NextResponse.json({
      error: err.message || "Internal server error",
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 });
  }
}

// PUT - Create or update user profile
export async function PUT(req) {
  try {
    console.log("PUT /api/profile - Starting profile update");
    const session = await auth();
    if (!session?.user) {
      console.log("PUT /api/profile - Authentication failed");
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const user = { email: session.user.email };
    console.log("PUT /api/profile - User authenticated:", user.email);

    // Ensure database tables exist
    await ensureDatabaseTables();

    const body = await req.json();
    console.log("PUT /api/profile - Request body:", JSON.stringify(body, null, 2));

    // Validate required fields
    const { name, avatar_url, bio, location, website, status, preferences, birthdate, gender, work_status, interests, banner_url } = body;

    // URL validation for website field
    if (website && website.trim() && !isValidUrlStrict(website.trim())) {
      return NextResponse.json({ error: "Invalid website URL format" }, { status: 400 });
    }

    // Build profile data, only including defined values
    const profileData = {
      user_id: user.email, // Use email as user_id for consistency with tokens
      email: user.email,
      updated_at: new Date().toISOString()
    };

    // Only include fields that are provided (not undefined)
    if (name !== undefined) profileData.name = name;
    if (avatar_url !== undefined) profileData.avatar_url = avatar_url;
    if (banner_url !== undefined) profileData.banner_url = banner_url;
    if (bio !== undefined) profileData.bio = bio;
    if (location !== undefined) profileData.location = location;
    if (website !== undefined) profileData.website = website;
    if (status !== undefined) profileData.status = status || 'online';
    if (preferences !== undefined) {
      profileData.preferences = {
        theme: 'dark',
        language: 'en',
        notifications: true,
        email_frequency: 'daily',
        timezone: 'UTC',
        ...preferences
      };
    }
    if (birthdate !== undefined) profileData.birthdate = birthdate;
    if (gender !== undefined) profileData.gender = gender;
    if (work_status !== undefined) profileData.work_status = work_status;
    if (interests !== undefined) profileData.interests = interests;

    // Only set last_synced_at if we're doing a full update
    profileData.last_synced_at = new Date().toISOString();

    console.log("PUT /api/profile - Profile data to save:", JSON.stringify(profileData, null, 2));

    // Check if profile exists
    console.log("PUT /api/profile - Checking if profile exists for user:", user.email);
    const { data: existingProfile, error: checkError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.email)
      .maybeSingle();

    if (checkError) {
      console.error("PUT /api/profile - Error checking existing profile:", checkError);
      throw checkError;
    }

    console.log("PUT /api/profile - Existing profile check result:", existingProfile);

    let result;
    if (existingProfile) {
      console.log("PUT /api/profile - Updating existing profile");
      // Update existing profile
      const { data, error } = await supabase
        .from("user_profiles")
        .update(profileData)
        .eq("user_id", user.email)
        .select()
        .single();

      if (error) {
        console.error("PUT /api/profile - Error updating profile:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      console.log("PUT /api/profile - Profile updated successfully:", data);
      result = data;
    } else {
      console.log("PUT /api/profile - Creating new profile");
      // Create new profile with defaults for required fields
      const createData = {
        ...profileData,
        name: profileData.name || null,
        avatar_url: profileData.avatar_url || null,
        banner_url: profileData.banner_url || null,
        bio: profileData.bio || null,
        location: profileData.location || null,
        website: profileData.website || 'https://example.com',
        status: profileData.status || 'online',
        preferences: profileData.preferences || { theme: 'dark', language: 'en', notifications: true, email_frequency: 'daily', timezone: 'UTC' },
        birthdate: profileData.birthdate || '1999-01-01',
        gender: profileData.gender || 'Not specified',
        work_status: profileData.work_status || 'Professional',
        interests: profileData.interests || ['Technology', 'Productivity', 'AI'],
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("user_profiles")
        .insert(createData)
        .select()
        .single();

      if (error) {
        console.error("PUT /api/profile - Error creating profile:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      console.log("PUT /api/profile - Profile created successfully:", data);
      result = data;
    }

    console.log("PUT /api/profile - Returning result:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Profile PUT error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      details: err.details,
      hint: err.hint
    });

    if (err.message === "Authentication required" || err.message?.includes("Authentication")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Provide more specific error messages
    let errorMessage = "Failed to update profile";
    if (err.code === '23505') {
      errorMessage = "Profile already exists with this information";
    } else if (err.code === '23503') {
      errorMessage = "Invalid reference in profile data";
    } else if (err.code === '23502') {
      errorMessage = "Required field is missing";
    } else if (err.message) {
      errorMessage = err.message;
    }

    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        code: err.code,
        details: err.details,
        hint: err.hint
      } : undefined
    }, { status: 500 });
  }
}

// PATCH - Partial profile update
export async function PATCH(req) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!session.user.email) {
      console.error("Session user missing email:", session.user);
      return NextResponse.json({ error: "Invalid session: missing email" }, { status: 401 });
    }

    const user = { email: session.user.email };

    // Ensure database tables exist
    await ensureDatabaseTables();

    const body = await req.json();

    console.log("PATCH request body:", body);

    // URL validation for website field
    if (body.website && body.website.trim() && !isValidUrlStrict(body.website.trim())) {
      return NextResponse.json({ error: "Invalid website URL format" }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData = {
      updated_at: new Date().toISOString()
      // Note: last_synced_at column may not exist in current schema, so we'll skip it for now
    };

    // Map frontend field names to database column names
    const fieldMapping = {
      name: 'name',
      avatar_url: 'avatar_url',
      banner_url: 'banner_url',
      bio: 'bio',
      location: 'location',
      website: 'website',
      status: 'status',
      preferences: 'preferences',
      birthdate: 'birthdate',
      gender: 'gender',
      work_status: 'work_status',
      interests: 'interests'
    };

    // Only include fields that exist in the database schema and are provided
    Object.keys(fieldMapping).forEach(field => {
      if (body[field] !== undefined && body[field] !== null) {
        updateData[fieldMapping[field]] = body[field];
      }
    });

    console.log("Update data:", updateData);

    // First check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("user_id", user.email)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("PATCH - Error checking existing profile:", checkError);
      throw checkError;
    }

    console.log("Existing profile check:", existingProfile);

    if (!existingProfile) {
      console.log("No existing profile found, creating new one");
      // Create new profile if it doesn't exist
      const createData = {
        user_id: user.email,
        email: user.email,
        name: null,
        avatar_url: null,
        banner_url: null,
        bio: null,
        location: null,
        website: 'https://example.com',
        status: 'online',
        preferences: { theme: 'dark', language: 'en', notifications: true, email_frequency: 'daily', timezone: 'UTC' },
        birthdate: '1999-01-01',
        gender: 'Not specified',
        work_status: 'Professional',
        interests: ['Technology', 'Productivity', 'AI'],
        ...updateData
      };

      const { data, error } = await supabase
        .from("user_profiles")
        .insert(createData)
        .select()
        .single();

      if (error) {
        console.error("Profile create error:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });

        let errorMessage = "Failed to create profile";
        if (error.code === '23505') {
          errorMessage = "Profile already exists with this information";
        } else if (error.code === '23503') {
          errorMessage = "Invalid reference in profile data";
        } else if (error.code === '23502') {
          errorMessage = "Required field is missing";
        } else if (error.message) {
          errorMessage = error.message;
        }

        return NextResponse.json({
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? {
            code: error.code,
            details: error.details,
            hint: error.hint
          } : undefined
        }, { status: 500 });
      }

      console.log("Profile created successfully:", data);
      return NextResponse.json(data);
    }

    // Update existing profile
    const { data, error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", user.email)
      .select()
      .single();

    if (error) {
      console.error("Profile patch error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      let errorMessage = "Failed to update profile";
      if (error.code === '23505') {
        errorMessage = "Profile already exists with this information";
      } else if (error.code === '23503') {
        errorMessage = "Invalid reference in profile data";
      } else if (error.code === '23502') {
        errorMessage = "Required field is missing";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return NextResponse.json({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          details: error.details,
          hint: error.hint
        } : undefined
      }, { status: 500 });
    }

    console.log("Profile updated successfully:", data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Profile PATCH error:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      details: err.details,
      hint: err.hint
    });

    if (err.message === "Authentication required" || err.message?.includes("Authentication")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let errorMessage = err.message || "Failed to update profile";
    return NextResponse.json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 });
  }
}

// Legacy Gmail profile fetch function
async function getGmailProfile(email) {
  const { data: row } = await supabase.from("user_tokens").select("*").eq("google_email", email).maybeSingle();
  if (!row) return NextResponse.json({ error: "no_tokens" }, { status: 404 });

  let access = null;
  try {
    if (row.encrypted_access_token) access = decrypt(row.encrypted_access_token);
  } catch (e) {
    access = null;
  }

  // try fetch; on 401 try refresh once
  const profileFetch = async (token) => {
    const r = await fetch("https://www.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, text };
  };

  if (access) {
    const res = await profileFetch(access);
    if (res.ok) return NextResponse.json(JSON.parse(res.text));
    if (res.status === 401) {
      // attempt refresh
      try {
        const newToken = await refreshAccessToken(row);
        const retry = await profileFetch(newToken);
        if (retry.ok) return NextResponse.json(JSON.parse(retry.text));
        return NextResponse.json({ error: retry.text }, { status: retry.status });
      } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 401 });
      }
    }
    return NextResponse.json({ error: res.text }, { status: res.status });
  }

  // no access token: try refresh
  try {
    const newToken = await refreshAccessToken(row);
    const retry = await profileFetch(newToken);
    if (retry.ok) return NextResponse.json(JSON.parse(retry.text));
    return NextResponse.json({ error: retry.text }, { status: retry.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 401 });
  }
}


// DELETE - Permanently delete account and all data
export async function DELETE(req) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const userId = session.user.email;
    console.log(`🧨 DELETE ACCOUNT REQUEST: ${userId}`);

    // All relevant tables to wipe
    const tables = [
      'agent_chat_history',
      'search_history',
      'saved_searches',
      'unsubscribed_emails',
      'search_index',
      'search_performance',
      'notes',
      'user_emails',
      'user_tokens',
      'user_profiles'
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', userId);

        if (error) {
          // Fallback for user_tokens which might use google_email
          if (table === 'user_tokens') {
            await supabase.from(table).delete().eq('google_email', userId);
          } else {
            console.warn(`⚠️ Warning: Deletion for ${table} failed or returned error:`, error.message);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Warning: Exception deleting from ${table}:`, err.message);
      }
    }

    console.log(`✅ ACCOUNT PERMANENTLY DELETED: ${userId}`);
    return NextResponse.json({ success: true, message: "Account and all associated data have been permanently deleted." });

  } catch (error) {
    console.error("💥 ERROR DURING ACCOUNT DELETION:", error);
    return NextResponse.json({ error: "Failed to permanently delete account data." }, { status: 500 });
  }
}
