// @ts-ignore
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DatabaseService } from '@/lib/supabase';

// Server-side component that handles authentication
export default async function DashboardPage() {
  // Server-side authentication check
  // @ts-ignore
  const session = await auth();

  // If no session exists, redirect to home page
  if (!session) {
    redirect('/');
  }

  // Check onboarding status
  let profile = null;
  if (session.user?.email) {
    try {
      const db = new DatabaseService();
      profile = await db.getUserProfile(session.user.email);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Fallback to null profile
    }
  }

  // If onboarding is not completed explicitly, check fallbacks
  if (!profile || !profile.onboarding_completed) {
    // Check if they have a plan selected or an active subscription
    const db = new DatabaseService();

    // 1. Check preferences for plan selection
    if (profile?.preferences?.plan) {
      console.log('✅ Auto-completing onboarding for user with selected plan');
      await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', session.user.email);
    } else {
      // 2. Check for active subscription
      try {
        const { data: subscription } = await db.supabase
          .from('user_subscriptions')
          .select('status, subscription_ends_at')
          .eq('user_id', session.user.email)
          .maybeSingle();

        if (subscription && subscription.status === 'active' && new Date(subscription.subscription_ends_at) > new Date()) {
          console.log('✅ Auto-completing onboarding for user with active subscription');
          await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', session.user.email);
        } else {
          // No valid onboarding or subscription found, redirect
          console.log('🚫 User not onboarded, redirecting to /onboarding');
          redirect('/onboarding');
        }
      } catch (e) {
        console.error('Subscription check failed in dashboard:', e);
        redirect('/onboarding');
      }
    }
  }

  // If authenticated and onboarded, redirect to the main home feed
  // which is the unified interface for the application
  redirect('/home-feed');
}

