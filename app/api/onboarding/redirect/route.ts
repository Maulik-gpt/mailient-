import { NextResponse } from "next/server";
// @ts-ignore
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

export async function GET() {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ redirectTo: "/auth/signin" });
    }

    const userEmail = session.user.email.toLowerCase();
    const db = new DatabaseService(true);
    const profile = await db.getUserProfile(userEmail);

    console.log(`🔍 Checking onboarding redirect for: ${userEmail}`);
    console.log(`👤 Profile: ${!!profile}, Completed: ${profile?.onboarding_completed}`);

    // Helper: check whether the user has a real, paid (non-free) subscription.
    const hasPaidSubscription = async (): Promise<boolean> => {
      try {
        const { data: subscription } = await db.supabase
          .from('user_subscriptions')
          .select('status, plan_type, subscription_ends_at')
          .ilike('user_id', userEmail)
          .maybeSingle();

        if (!subscription) return false;

        console.log(`💳 Subscription found: status=${subscription.status}, plan=${subscription.plan_type}`);

        const now = new Date();
        const endDate = subscription.subscription_ends_at ? new Date(subscription.subscription_ends_at) : null;
        const isNotExpired = !endDate || endDate > now;

        // Strict: only active/trialing AND a real paid plan type grants access.
        return (
          (subscription.status === 'active' || subscription.status === 'trialing') &&
          !!subscription.plan_type &&
          subscription.plan_type !== 'free' &&
          subscription.plan_type !== 'none' &&
          isNotExpired
        );
      } catch (subError) {
        console.log('⚠️ Subscription check failed:', subError);
        return false;
      }
    };

    // Check if onboarding is explicitly completed
    if (profile?.onboarding_completed) {
      // Onboarding is marked done, but access to the app requires a PAID
      // subscription. Without one the user must be parked on the paywall
      // (onboarding step 13) — never sent to /home-feed.
      if (await hasPaidSubscription()) {
        return NextResponse.json({ redirectTo: "/home-feed" });
      }
      console.log('🔒 Onboarding completed but UNPAID — parking on paywall (step 13).');
      return NextResponse.json({ redirectTo: "/onboarding?step=13" });
    }

    // Not completed — check if they have a paid subscription anyway (e.g.
    // webhook created the sub but they never finished the UI flow). If so,
    // mark onboarding complete and let them in.
    if (await hasPaidSubscription()) {
      console.log('✅ Paid subscription found for incomplete-onboarding user — auto-completing.');
      try {
        if (profile?.id) {
          await db.supabase
            .from('user_profiles')
            .update({ onboarding_completed: true })
            .eq('id', profile.id);
        } else {
          await db.supabase
            .from('user_profiles')
            .upsert({
              user_id: userEmail,
              email: userEmail,
              onboarding_completed: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        }
      } catch (e) {
        console.error('Error auto-completing onboarding from subscription:', e);
      }
      return NextResponse.json({ redirectTo: "/home-feed" });
    }

    // No paid subscription, onboarding not complete — start/resume onboarding.
    return NextResponse.json({ redirectTo: "/onboarding" });
  } catch (error) {
    console.error("Error checking onboarding redirect:", error);
    return NextResponse.json({ redirectTo: "/onboarding" });
  }
}
