// app/api/profile/settings/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper function to get authenticated user
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

// GET - Get user settings and preferences
export async function GET(req) {
  try {
    const user = await getAuthenticatedUser(req);

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("preferences, privacy_settings, notification_settings")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Settings fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    // Return default settings if no profile exists
    const defaultSettings = {
      preferences: {
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        email_notifications: true,
        push_notifications: true,
        marketing_emails: false,
        auto_save: true,
        compact_mode: false
      },
      privacy_settings: {
        profile_visibility: 'public',
        show_online_status: true,
        allow_direct_messages: true,
        data_collection: true,
        analytics: false
      },
      notification_settings: {
        email_digest: 'daily',
        desktop_notifications: true,
        sound_enabled: true,
        mention_notifications: true,
        reply_notifications: true
      }
    };

    return NextResponse.json({
      preferences: profile?.preferences || defaultSettings.preferences,
      privacy_settings: profile?.privacy_settings || defaultSettings.privacy_settings,
      notification_settings: profile?.notification_settings || defaultSettings.notification_settings
    });

  } catch (err) {
    console.error("Settings GET error:", err);
    if (err.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update user settings
export async function PUT(req) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const { preferences, privacy_settings, notification_settings } = body;

    // Validate preferences
    if (preferences) {
      const validThemes = ['light', 'dark', 'system'];
      const validLanguages = ['en', 'es', 'fr', 'de', 'ja', 'zh'];

      if (preferences.theme && !validThemes.includes(preferences.theme)) {
        return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
      }

      if (preferences.language && !validLanguages.includes(preferences.language)) {
        return NextResponse.json({ error: "Invalid language" }, { status: 400 });
      }
    }

    // Validate privacy settings
    if (privacy_settings) {
      const validVisibilities = ['public', 'private', 'contacts'];
      if (privacy_settings.profile_visibility && !validVisibilities.includes(privacy_settings.profile_visibility)) {
        return NextResponse.json({ error: "Invalid profile visibility" }, { status: 400 });
      }
    }

    // Validate notification settings
    if (notification_settings) {
      const validDigests = ['never', 'daily', 'weekly', 'monthly'];
      if (notification_settings.email_digest && !validDigests.includes(notification_settings.email_digest)) {
        return NextResponse.json({ error: "Invalid email digest frequency" }, { status: 400 });
      }
    }

    // Update settings
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (preferences) updateData.preferences = preferences;
    if (privacy_settings) updateData.privacy_settings = privacy_settings;
    if (notification_settings) updateData.notification_settings = notification_settings;

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", user.id)
      .select("preferences, privacy_settings, notification_settings")
      .single();

    if (error) {
      console.error("Settings update error:", error);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({
      preferences: data.preferences,
      privacy_settings: data.privacy_settings,
      notification_settings: data.notification_settings,
      message: "Settings updated successfully"
    });

  } catch (err) {
    console.error("Settings PUT error:", err);
    if (err.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - Partial settings update
export async function PATCH(req) {
  try {
    const user = await getAuthenticatedUser(req);
    const body = await req.json();

    const { preferences, privacy_settings, notification_settings } = body;

    // Get current settings
    const { data: currentProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("preferences, privacy_settings, notification_settings")
      .eq("user_id", user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Settings fetch error:", fetchError);
      return NextResponse.json({ error: "Failed to fetch current settings" }, { status: 500 });
    }

    // Merge with current settings
    const updateData = {
      preferences: { ...(currentProfile?.preferences || {}), ...(preferences || {}) },
      privacy_settings: { ...(currentProfile?.privacy_settings || {}), ...(privacy_settings || {}) },
      notification_settings: { ...(currentProfile?.notification_settings || {}), ...(notification_settings || {}) },
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("user_id", user.id)
      .select("preferences, privacy_settings, notification_settings")
      .single();

    if (error) {
      console.error("Settings patch error:", error);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({
      preferences: data.preferences,
      privacy_settings: data.privacy_settings,
      notification_settings: data.notification_settings,
      message: "Settings updated successfully"
    });

  } catch (err) {
    console.error("Settings PATCH error:", err);
    if (err.message === "Authentication required") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

