import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      username,
      emailUsage,
      emailsPerDay,
      writingStyle,
      plan,
    } = body;

    if (!username || username.length === 0) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const db = new DatabaseService(true);
    const userId = session.user.email;

    // Check if username is already taken by another user
    const existingProfile = await db.supabase
      .from("user_profiles")
      .select("user_id, username")
      .eq("username", username)
      .maybeSingle();

    if (existingProfile.data && existingProfile.data.user_id !== userId) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      );
    }

    // Update user profile with onboarding data
    const updateData: any = {
      username,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    // Store onboarding preferences in preferences JSONB field
    const preferences: any = {
      email_usage: emailUsage || null,
      emails_per_day: emailsPerDay || null,
      writing_style: writingStyle || null,
      plan: plan || null,
    };

    // Get existing preferences and merge
    const existingProfileData = await db.getUserProfile(userId);
    if (existingProfileData) {
      const existingPrefs = existingProfileData.preferences || {};
      updateData.preferences = { ...existingPrefs, ...preferences };
    } else {
      updateData.preferences = preferences;
    }

    // Update or create profile
    const { data, error } = await db.supabase
      .from("user_profiles")
      .upsert({
        user_id: userId,
        email: userId,
        ...updateData,
      }, {
        onConflict: "user_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      return NextResponse.json(
        { error: "Failed to save onboarding data" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

