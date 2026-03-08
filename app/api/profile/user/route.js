// app/api/profile/user/route.js
import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth.js";
import { DatabaseService } from "../../../../lib/supabase.js";

export async function GET(request) {
  try {
    // Get the session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.email;

    // Fetch user profile from database
    const db = new DatabaseService();
    const profile = await db.getUserProfile(userId);

    // If no profile in DB, fetch from Google and store
    if (!profile) {
      const googleResponse = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!googleResponse.ok) {
        throw new Error("Failed to fetch Google profile");
      }

      const googleProfile = await googleResponse.json();

      // Store in database with email as user_id
      await db.storeUserProfile(userId, {
        email: googleProfile.email,
        name: googleProfile.name,
        picture: googleProfile.picture,
        last_synced_at: new Date().toISOString(),
      });

      // Return the Google profile with additional mock data
      const fullProfile = {
        id: googleProfile.id,
        email: googleProfile.email,
        name: googleProfile.name,
        picture: googleProfile.picture,
        phone: "Not provided",
        bio: "No bio available",
        accountCreated: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        privacySettings: "Private",
        notificationPreferences: "Email notifications enabled",
        linkedAccounts: ["Google"],
        subscriptionStatus: "Free Plan",
        activitySummary: "Active user with email processing"
      };

      return NextResponse.json(fullProfile);
    }

    // Return existing profile with additional mock data
    const fullProfile = {
      id: profile.user_id,
      email: profile.email,
      name: profile.name,
      username: profile.username || null, // Include username from onboarding
      picture: profile.picture,
      phone: "Not provided", // TODO: Add to schema if needed
      bio: "No bio available", // TODO: Add to schema if needed
      accountCreated: profile.updated_at,
      lastLogin: new Date().toISOString(),
      privacySettings: "Private",
      notificationPreferences: "Email notifications enabled",
      linkedAccounts: ["Google"],
      subscriptionStatus: "Free Plan",
      activitySummary: "Active user with email processing"
    };

    return NextResponse.json(fullProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    // Get the session
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.email;
    const body = await request.json();

    // Update profile in database
    const db = new DatabaseService();
    await db.storeUserProfile(userId, {
      email: body.email || session.user.email,
      name: body.name || session.user.name,
      picture: body.picture || session.user.image,
      last_synced_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

