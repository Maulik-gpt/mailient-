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

    const db = new DatabaseService(true);
    const profile = await db.getUserProfile(session.user.email);

    // 1. Check if onboarding is explicitly completed
    if (profile?.onboarding_completed) {
      return NextResponse.json({ completed: true });
    }

    // 2. Check if they have already set a username (means they reached at least step 8/9)
    if (profile?.username) {
      // Auto-fix: mark as completed if they have a username
      await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', session.user.email);
      return NextResponse.json({ completed: true, note: 'username_found' });
    }

    // 3. Check for specific onboarding preferences (plan selection)
    if (profile?.preferences?.plan) {
      await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', session.user.email);
      return NextResponse.json({ completed: true, note: 'plan_pref_found' });
    }

    // 4. FALLBACK: Also check if user has an active subscription
    try {
      const { data: subscription } = await db.supabase
        .from('user_subscriptions')
        .select('status, plan_type, subscription_ends_at')
        .eq('user_id', session.user.email)
        .maybeSingle();

      if (subscription) {
        // If they have any valid subscription status or plan, they are done
        if (subscription.status === 'active' || (subscription.plan_type && subscription.plan_type !== 'none')) {
          await db.supabase
            .from('user_profiles')
            .update({ onboarding_completed: true })
            .eq('user_id', session.user.email);

          return NextResponse.json({
            completed: true,
            note: 'Auto-completed from subscription'
          });
        }
      }
    } catch (subError) {
      console.log('Subscription check skipped:', subError);
    }

    return NextResponse.json({
      completed: false,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json({ completed: false }, { status: 200 });
  }
}
