import { NextResponse } from "next/server";
// @ts-ignore
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

export async function GET() {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ completed: false }, { status: 200 });
    }

    const userEmail = session.user.email.toLowerCase();
    console.log(`🔍 Checking onboarding status for: ${userEmail}`);

    const db = new DatabaseService(true);
    const profile = await db.getUserProfile(userEmail);
    console.log(`👤 Profile found: ${!!profile}, Completed: ${profile?.onboarding_completed}, Username: ${profile?.username}`);

    // 1. Check if onboarding is explicitly completed
    if (profile?.onboarding_completed) {
      console.log(`✅ Status: Completed (explicit flag)`);
      return NextResponse.json({ completed: true, source: 'profile_flag' });
    }

    // 2. Check if they have already set a username (means they reached at least step 8/9)
    if (profile?.username) {
      console.log(`✅ Status: Completed (username found: ${profile.username})`);
      // Auto-fix: mark as completed if they have a username
      await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('id', profile.id);
      return NextResponse.json({ completed: true, note: 'username_found' });
    }

    // 3. Check for specific onboarding preferences (plan selection)
    if (profile?.preferences?.plan) {
      console.log(`✅ Status: Completed (plan found in preferences: ${profile.preferences.plan})`);
      await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('id', profile.id);
      return NextResponse.json({ completed: true, note: 'plan_pref_found' });
    }

    // 4. FALLBACK: Also check if user has an active subscription
    try {
      console.log(`💳 Checking subscriptions for: ${userEmail}`);
      const { data: subscription } = await db.supabase
        .from('user_subscriptions')
        .select('status, plan_type, subscription_ends_at')
        .ilike('user_id', userEmail)
        .maybeSingle();

      if (subscription) {
        console.log(`💳 Subscription found: status=${subscription.status}, plan=${subscription.plan_type}`);
        // If they have any valid subscription status or plan, they are done
        if (subscription.status === 'active' || (subscription.plan_type && subscription.plan_type !== 'none')) {
          console.log(`✅ Status: Completed (active subscription found)`);

          // Only update if not already completed to avoid race conditions
          if (!profile?.onboarding_completed) {
            if (profile?.id) {
              await db.supabase
                .from('user_profiles')
                .update({ onboarding_completed: true })
                .eq('id', profile.id);
            } else {
              // If no profile yet, we can try to upsert it or just let it be
              // Completing via user_id (email) is safer if profile.id is missing
              await db.supabase
                .from('user_profiles')
                .upsert({
                  user_id: userEmail,
                  email: userEmail,
                  onboarding_completed: true,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            }
          }

          return NextResponse.json({
            completed: true,
            note: 'Auto-completed from subscription'
          });
        }
      } else {
        console.log(`💳 No subscription record found.`);
      }
    } catch (subError) {
      console.log('⚠️ Subscription check skipped:', subError);
    }

    console.log(`❌ Status: NOT COMPLETED, Last Step: ${profile?.preferences?.last_onboarding_step}`);
    return NextResponse.json({
      completed: false,
      lastStep: profile?.preferences?.last_onboarding_step ?? 0
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json({ completed: false }, { status: 200 });
  }
}
