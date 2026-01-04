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
  const userEmail = session.user?.email?.toLowerCase();

  if (userEmail) {
    try {
      const db = new DatabaseService();
      profile = await db.getUserProfile(userEmail);
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
      await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', userEmail);
    } else {
      // 2. Check for active subscription
      try {
        const { data: subscription } = await db.supabase
          .from('user_subscriptions')
          .select('status, plan_type, subscription_ends_at')
          .eq('user_id', userEmail)
          .maybeSingle();

        if (subscription) {
          console.log(`💳 Subscription found: status=${subscription.status}, plan=${subscription.plan_type}`);
          // If they have any valid subscription status or plan, they are done
          if (subscription.status === 'active' || (subscription.plan_type && subscription.plan_type !== 'none')) {
            console.log('✅ Auto-completing onboarding for user with active subscription');
            await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', userEmail);
          } else {
            // No valid onboarding or subscription found, redirect
            console.log('🚫 User not onboarded, redirecting to /onboarding');
            redirect('/onboarding');
          }
        } else {
          // 3. FINAL FALLBACK: Check if user has been recently created (within last hour)
          // This handles the case where database replication might cause delays
          if (profile?.created_at) {
            const createdAt = new Date(profile.created_at);
            const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));

            if (createdAt > oneHourAgo) {
              console.log(`🕒 Profile recently created (${createdAt}), assuming onboarding completion`);
              // Auto-complete onboarding for recent profiles
              await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', userEmail);
            } else {
              // Old profile without subscription, redirect to onboarding
              console.log('🚫 User not onboarded, redirecting to /onboarding');
              redirect('/onboarding');
            }
          } else {
            // No profile creation date, redirect to onboarding
            console.log('🚫 User not onboarded, redirecting to /onboarding');
            redirect('/onboarding');
          }
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

