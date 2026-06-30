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

    // 1. Check if they have an active paid subscription
    try {
      if (!userEmail) {
        console.log('🚫 No user email, redirecting to /onboarding');
        redirect('/onboarding');
      }

      const { data: subscription } = await db.supabase
        .from('user_subscriptions')
        .select('status, plan_type, subscription_ends_at')
        .ilike('user_id', userEmail)
        .order('updated_at', { ascending: false })
        .limit(1);

      const latestSubscription = Array.isArray(subscription) && subscription.length > 0 ? subscription[0] : null;

      if (latestSubscription) {
        console.log(`💳 Subscription found: status=${latestSubscription.status}, plan=${latestSubscription.plan_type}`);
        
        const now = new Date();
        const endDate = latestSubscription.subscription_ends_at ? new Date(latestSubscription.subscription_ends_at) : null;
        const isNotExpired = !endDate || endDate > now;
        
        // Strict check: active/trialing and real paid plan
        const isPaid = (latestSubscription.status === 'active' || latestSubscription.status === 'trialing') &&
                       latestSubscription.plan_type &&
                       latestSubscription.plan_type !== 'free' &&
                       latestSubscription.plan_type !== 'none' &&
                       isNotExpired;

        if (isPaid) {
          console.log('✅ Auto-completing onboarding for user with active subscription');
          await db.supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', userEmail);
        } else {
          // No valid onboarding or subscription found, redirect
          console.log('🚫 User not onboarded, redirecting to /onboarding?step=13');
          redirect('/onboarding?step=13');
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

