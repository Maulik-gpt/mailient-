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

    // 2. Check if they have an active paid subscription (the only reliable auto-complete)
    try {
      console.log(`💳 Checking subscriptions for: ${userEmail}`);
      const { data: subscription } = await db.supabase
        .from('user_subscriptions')
        .select('status, plan_type, subscription_ends_at')
        .ilike('user_id', userEmail)
        .maybeSingle();

      if (subscription) {
        console.log(`💳 Subscription found: status=${subscription.status}, plan=${subscription.plan_type}`);
        // If they have any valid subscription status AND it's not 'none', they are done
        const now = new Date();
        const endDate = subscription.subscription_ends_at ? new Date(subscription.subscription_ends_at) : null;
        const isNotExpired = !endDate || endDate > now;

        if ((subscription.status === 'active' || subscription.status === 'trialing') &&
          subscription.plan_type && subscription.plan_type !== 'none' && isNotExpired) {
          console.log(`✅ Status: Completed (active paid subscription found)`);

          if (!profile?.onboarding_completed) {
            await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', userEmail);
          }
          return NextResponse.json({ completed: true, note: 'active_subscription' });
        }
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
