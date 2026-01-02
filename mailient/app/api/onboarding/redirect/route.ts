import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DatabaseService } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ redirectTo: "/auth/signin" });
    }

    const db = new DatabaseService();
    const profile = await db.getUserProfile(session.user.email);

    // Check if onboarding is explicitly completed
    if (profile?.onboarding_completed) {
      return NextResponse.json({ redirectTo: "/home-feed" });
    }

    // FALLBACK: Check if user selected a plan (means they went through onboarding)
    if (profile?.preferences?.plan) {
      // Auto-mark as complete
      try {
        await db.supabase
          .from('user_profiles')
          .update({ onboarding_completed: true })
          .eq('user_id', session.user.email);
      } catch (e) {
        console.error('Error auto-completing onboarding:', e);
      }
      return NextResponse.json({ redirectTo: "/home-feed" });
    }

    // FALLBACK: Check for active subscription
    try {
      const { data: subscription } = await db.supabase
        .from('user_subscriptions')
        .select('status, subscription_ends_at')
        .eq('user_id', session.user.email)
        .maybeSingle();

      if (subscription && subscription.status === 'active') {
        const endDate = new Date(subscription.subscription_ends_at);
        if (endDate > new Date()) {
          // User has active subscription - they completed payment
          try {
            await db.supabase
              .from('user_profiles')
              .update({ onboarding_completed: true })
              .eq('user_id', session.user.email);
          } catch (e) {
            console.error('Error auto-completing onboarding from subscription:', e);
          }
          return NextResponse.json({ redirectTo: "/home-feed" });
        }
      }
    } catch (subError) {
      // Subscription table might not exist, continue
      console.log('Subscription check skipped:', subError);
    }

    // No onboarding completion found - redirect to onboarding
    return NextResponse.json({ redirectTo: "/onboarding" });
  } catch (error) {
    console.error("Error checking onboarding redirect:", error);
    return NextResponse.json({ redirectTo: "/onboarding" });
  }
}
