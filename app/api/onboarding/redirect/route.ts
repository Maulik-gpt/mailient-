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

    // Check if onboarding is explicitly completed
    if (profile?.onboarding_completed) {
      return NextResponse.json({ redirectTo: "/home-feed" });
    }

    // FALLBACK: Check if user selected a plan (means they went through onboarding)
    if (profile?.preferences?.plan) {
      console.log(`✅ Auto-completing onboarding (plan pref found)`);
      try {
        await db.supabase
          .from('user_profiles')
          .update({ onboarding_completed: true })
          .eq('id', profile.id);
      } catch (e) {
        console.error('Error auto-completing onboarding:', e);
      }
      return NextResponse.json({ redirectTo: "/home-feed" });
    }

    // FALLBACK: Check for active subscription
    try {
      const { data: subscription } = await db.supabase
        .from('user_subscriptions')
        .select('status, plan_type, subscription_ends_at')
        .ilike('user_id', userEmail)
        .maybeSingle();

      if (subscription) {
        console.log(`💳 Subscription found: ${subscription.status}, ${subscription.plan_type}`);
        // User has any subscription - they completed payment
        if (subscription.status === 'active' || (subscription.plan_type && subscription.plan_type !== 'none')) {
          try {
            if (profile?.id) {
              await db.supabase
                .from('user_profiles')
                .update({ onboarding_completed: true })
                .eq('id', profile.id);
            } else {
              // If no profile, we can still redirect them to home-feed
              // and optionally create a skeleton profile
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
      }
    } catch (subError) {
      console.log('Subscription check skipped:', subError);
    }

    // No onboarding completion found - redirect to onboarding
    return NextResponse.json({ redirectTo: "/onboarding" });
  } catch (error) {
    console.error("Error checking onboarding redirect:", error);
    return NextResponse.json({ redirectTo: "/onboarding" });
  }
}
