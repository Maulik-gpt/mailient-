import { NextResponse } from "next/server";
// @ts-ignore
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";
// @ts-ignore
import { sendPlanEmail } from "@/lib/email-service";

export async function POST(request: Request) {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      username,
      profileName,
      bio,
      avatarUrl,
      bannerUrl,
      plan,
      role,
      personality,
      goals,
      customInstruction
    } = body;

    if (!username || username.length === 0) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const db = new DatabaseService(true);
    const userId = session.user.email.toLowerCase();

    // Check if username is already taken by another user
    let finalUsername = username;
    const existingProfile = await db.supabase
      .from("user_profiles")
      .select("user_id, username")
      .eq("username", username)
      .maybeSingle();

    if (existingProfile.data && existingProfile.data.user_id !== userId) {
      console.log(`⚠️ Username "${username}" taken, generating unique one...`);
      // Append a random 4-digit suffix to make it unique
      const suffix = Math.floor(1000 + Math.random() * 9000);
      finalUsername = `${username}_${suffix}`;
      console.log(`✅ New username: ${finalUsername}`);
    }

    // Update user profile with onboarding data
    const updateData: any = {
      username: finalUsername,
      name: profileName || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    // Store onboarding preferences in preferences JSONB field
    const preferences: any = {
      banner_url: bannerUrl || null,
      plan: plan || null,
      role: role || null,
      goals: goals || null,
      personality: personality || null,
      custom_instruction: customInstruction || null,
    };

    console.log(`📋 Completing onboarding for ${userId}`);
    console.log(`👤 Username: ${finalUsername}`);
    console.log(`💳 Plan: ${plan}`);
    console.log(`🎯 Role: ${role}, Goals: ${goals}`);

    // Get existing preferences and merge
    const existingProfileData = await db.getUserProfile(userId);
    if (existingProfileData) {
      const existingPrefs = existingProfileData.preferences || {};
      updateData.preferences = { ...existingPrefs, ...preferences };
      console.log(`🔄 Merging with existing preferences`);
    } else {
      updateData.preferences = preferences;
      console.log(`🆕 Creating new profile`);
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
      console.error("❌ Error updating profile:", error);
      return NextResponse.json(
        { error: "Failed to save onboarding data", details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ Onboarding completed successfully for ${userId}`);
    console.log(`📊 Profile ID: ${data.id}, Username: ${data.username}, Completed: ${data.onboarding_completed}`);

    // Send a welcome email for free-plan users (fire-and-forget)
    if (!plan || plan === 'free') {
      const displayName = session.user?.name || username || null;
      sendPlanEmail({ toEmail: userId, toName: displayName, plan: 'free' })
        .then((result: { success: boolean; error?: string }) => {
          if (result.success) console.log(`📧 Free welcome email sent → ${userId}`);
          else console.warn(`⚠️ Free welcome email failed for ${userId}:`, result.error);
        })
        .catch((err: unknown) => console.error('❌ Email send threw unexpectedly:', err));
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

