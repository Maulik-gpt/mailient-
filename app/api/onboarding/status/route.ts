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

    // Check if onboarding is explicitly completed
    if (profile?.onboarding_completed) {
      return NextResponse.json({ completed: true });
    }

    // FALLBACK: Also check if user has an active subscription
    // If they do, they must have completed onboarding (paid = completed)
    try {
      const { data: subscription } = await db.supabase
        .from('user_subscriptions')
        .select('status, plan_type, subscription_ends_at')
        .eq('user_id', session.user.email)
        .maybeSingle();

      if (subscription && subscription.status === 'active') {
        const endDate = new Date(subscription.subscription_ends_at);
        if (endDate > new Date()) {
          // User has active subscription - mark onboarding as complete and return true
          await db.supabase
            .from('user_profiles')
            .update({ onboarding_completed: true })
            .eq('user_id', session.user.email);

          return NextResponse.json({
            completed: true,
            note: 'Auto-completed from subscription status'
          });
        }
      }
    } catch (subError) {
      // Subscription table might not exist yet, continue with normal check
      console.log('Subscription check skipped:', subError);
    }

    // Also check preferences.plan - if user selected a plan, consider onboarding done
    if (profile?.preferences?.plan) {
      // Mark as completed since they selected a plan
      await db.supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('user_id', session.user.email);

      return NextResponse.json({
        completed: true,
        note: 'Auto-completed from plan selection'
      });
    }

    return NextResponse.json({
      completed: false,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json({ completed: false }, { status: 200 });
  }
}
