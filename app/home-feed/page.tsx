"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { GmailInterfaceFixed } from '@/components/ui/gmail-interface-fixed';
import confetti from 'canvas-confetti';

function HomeFeedContent() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check authentication, subscription status, and onboarding status
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.email) {
      const checkAccessAndSubscription = async () => {
        try {
          // IMMEDIATE CHECK: If localStorage says we are done, check subscription
          const isDone = localStorage.getItem('onboarding_completed') === 'true';

          // Check subscription status FIRST
          console.log('📡 [HomeFeed] Checking subscription status...');
          try {
            const subResponse = await fetch('/api/subscription/status');
            if (subResponse.ok) {
              const subData = await subResponse.json();
              console.log('💳 [HomeFeed] Subscription status:', subData);

              // Extract from the nested subscription object
              const isActive = subData.subscription?.hasActiveSubscription;
              const planType = subData.subscription?.planType;

              // If user has an active subscription OR has a valid plan type, allow access
              if (isActive || planType === 'starter' || planType === 'pro') {
                localStorage.setItem('onboarding_completed', 'true');
                console.log('✅ [HomeFeed] Subscription active, access granted', { isActive, planType });
                return;
              }

              // No active subscription - check onboarding status before forcing pricing
              console.log('🚫 [HomeFeed] No active subscription, checking onboarding completion...');

              const onboardingResp = await fetch("/api/onboarding/status");
              if (onboardingResp.ok) {
                const onboardingData = await onboardingResp.json();
                if (!onboardingData.completed) {
                  console.log('🚀 [HomeFeed] Onboarding incomplete, redirecting to /onboarding');
                  router.push('/onboarding');
                  return;
                }
              }

              console.log('🚫 [HomeFeed] No active subscription, redirecting to /pricing', { isActive, planType });
              router.push('/pricing');
              return;
            } else {
              console.error('❌ [HomeFeed] Subscription API failed:', subResponse.status);
            }
          } catch (subError) {
            console.error('⚠️ [HomeFeed] Subscription check error:', subError);
          }

          // If we're already marked as completed locally and haven't been redirected, allow access
          if (isDone) {
            console.log('✅ [HomeFeed] Already completed (localStorage)');
            return;
          }

          // SECURITY FIX: Clear any pending plan data without activating
          const pendingPlan = localStorage.getItem('pending_plan');
          const pendingTimestamp = localStorage.getItem('pending_plan_timestamp');

          if (pendingPlan || pendingTimestamp) {
            console.log('🧹 [HomeFeed] Clearing stale pending plan data');
            localStorage.removeItem('pending_plan');
            localStorage.removeItem('pending_plan_timestamp');
          }

          // Check onboarding status from server with retry logic
          console.log('📡 [HomeFeed] Checking server-side onboarding status...');

          const maxRetries = 3;
          let retryCount = 0;
          let serverCompleted = false;

          while (retryCount < maxRetries && !serverCompleted) {
            try {
              const response = await fetch("/api/onboarding/status");
              if (response.ok) {
                const data = await response.json();
                console.log('📡 [HomeFeed] Server status:', data);

                if (data.completed) {
                  serverCompleted = true;
                  console.log('✅ [HomeFeed] User is completed');
                  localStorage.setItem('onboarding_completed', 'true');

                  // Double-check subscription for completed users
                  const subCheck = await fetch('/api/subscription/status');
                  if (subCheck.ok) {
                    const subCheckData = await subCheck.json();
                    const subIsActive = subCheckData.subscription?.hasActiveSubscription;
                    const subPlanType = subCheckData.subscription?.planType;
                    if (!subIsActive && subPlanType !== 'starter' && subPlanType !== 'pro') {
                      console.log('🚫 [HomeFeed] Onboarding done but no subscription, redirecting to /pricing');
                      router.push('/pricing');
                      return;
                    }
                  }
                } else {
                  console.log(`⏳ [HomeFeed] User NOT completed (attempt ${retryCount + 1}/${maxRetries})`);
                  if (retryCount === maxRetries - 1) {
                    console.log('🚫 [HomeFeed] All retries exhausted, redirecting to /onboarding');
                    router.push("/onboarding");
                    return;
                  }
                }
              } else {
                console.error('❌ [HomeFeed] Status API failed:', response.status);
              }
            } catch (error) {
              console.error(`⚠️ [HomeFeed] Status check failed (attempt ${retryCount + 1}):`, error);
              if (retryCount < maxRetries - 1) {
                const delay = Math.pow(2, retryCount) * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
            retryCount++;
          }
        } catch (error) {
          console.error("Error in home-feed init:", error);
        }
      };
      checkAccessAndSubscription();
    }
  }, [status, session, router]);

  // Set page title
  useEffect(() => {
    document.title = 'Mailient - AI Inbox';
  }, []);

  // Check for welcome query param and trigger confetti
  const searchParams = useSearchParams();

  useEffect(() => {
    const welcome = searchParams.get('welcome');
    if (welcome === 'true') {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        const sparkleConfig = {
          ...defaults,
          particleCount,
          colors: ['#ffffff', '#ffffff', '#e4e4e7', '#d4d4d8', '#18181b'], // Heavily weighted towards white/silver for "shine"
          shapes: ['star', 'circle'] as any,
          scalar: 1.2,
          gravity: 0.8, // Floating effect
          drift: 0,
        };

        confetti({
          ...sparkleConfig,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...sparkleConfig,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('welcome');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/");
  };

  return (
    <div className="satoshi-home-feed w-full h-screen bg-black dark:bg-black">
      <GmailInterfaceFixed />
    </div>
  );
}

export default function HomeFeed() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    }>
      <HomeFeedContent />
    </Suspense>
  );
}

