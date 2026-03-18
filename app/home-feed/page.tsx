"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { GmailInterfaceFixed } from '@/components/ui/gmail-interface-fixed';
import { PricingOverlay } from '@/components/ui/pricing-overlay';
import confetti from 'canvas-confetti';
import { useState } from 'react';

function HomeFeedContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showPricing, setShowPricing] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [activatedPlan, setActivatedPlan] = useState('');

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
          // Detect if user might have just returned from payment or activation
          const mightHaveJustPaid = () => {
            const referrer = document.referrer || '';
            const pendingPlan = localStorage.getItem('pending_plan');
            const pendingTimestamp = localStorage.getItem('pending_plan_timestamp');

            const isFromPayment = referrer.includes('polar.sh') ||
              referrer.includes('whop.com') ||
              referrer.includes('/payment-success') ||
              referrer.includes('/pricing');

            const hasPendingPlan = pendingPlan && pendingTimestamp &&
              (Date.now() - parseInt(pendingTimestamp)) < 10 * 60 * 1000; // 10 min window

            return isFromPayment || !!hasPendingPlan;
          };

          const justPaid = mightHaveJustPaid();
          if (justPaid) {
            setIsVerifyingPayment(true);
          }

          const maxRetries = justPaid ? 20 : 1; // 20 retries x 3s = 60 seconds
          const retryDelay = 3000;

          console.log('📡 [HomeFeed] Checking subscription status...', { justPaid, maxRetries });

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            if (attempt > 0) {
              console.log(`⏳ [HomeFeed] Polling attempt ${attempt}/${maxRetries - 1}...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }

            try {
              // Cache busting
              const subResponse = await fetch(`/api/subscription/status?t=${Date.now()}`);
              if (!subResponse.ok) throw new Error(`Status API error: ${subResponse.status}`);
              
              const subData = await subResponse.json();
              const isActive = subData.subscription?.hasActiveSubscription;
              const isExpired = subData.subscription?.isExpired;
              const planType = subData.subscription?.planType;

              // CASE 1: SUCCESSFUL ACTIVATION (Returning User + (Active OR Free) + Not Expired)
              const isSuccess = justPaid && !isExpired && (isActive || planType === 'free');
              
              if (isSuccess) {
                console.log('🎉 [HomeFeed] Activation confirmed!', planType);
                localStorage.setItem('onboarding_completed', 'true');
                localStorage.removeItem('pending_plan');
                localStorage.removeItem('pending_plan_timestamp');
                    setPaymentVerified(true);
                    
                    // Specific plan name for UI
                    const planName = planType === 'starter' ? 'Starter' : planType === 'pro' ? 'Pro' : 'Free';
                    setActivatedPlan(planName);
                
                setTimeout(() => {
                  setIsVerifyingPayment(false);
                  setPaymentVerified(false);
                }, 2500);

                setTimeout(() => {
                  window.location.reload();
                }, 2800);
                return; // Stop polling
              }

              // CASE 2: STILL PENDING (Either expired or not yet active but we just paid)
              if (justPaid && attempt < maxRetries - 1) {
                console.log('⏳ [HomeFeed] Waiting for state update...');
                continue; // Next attempt
              }

              // CASE 3: FINAL STATE (Either access granted or access denied after retries)
              if (isActive || planType === 'free' || planType === 'starter' || planType === 'pro') {
                localStorage.setItem('onboarding_completed', 'true');
                
                if (isExpired) {
                    // Access technically granted by logic but subscription expired
                    if (!justPaid) {
                        setShowPricing(true);
                    } else {
                        // We just paid but reached timeout
                        setIsVerifyingPayment(false);
                        setShowPricing(true);
                    }
                } else {
                    // Valid active plan (e.g. newly upgraded)
                    setIsVerifyingPayment(false);
                    setShowPricing(false);
                }
                return; // Access allowed, stop polling
              }

              // CASE 4: NO SUBSCRIPTION FOUND (Even for free fallback)
              // If we reached here, something is wrong or onboarding is needed
              if (attempt === maxRetries - 1) {
                setIsVerifyingPayment(false);
                console.log('🚫 [HomeFeed] No access. Checking onboarding...');
                const onboardingResp = await fetch("/api/onboarding/status");
                const onboardingData = await onboardingResp.json();
                if (!onboardingData.completed) {
                    router.push('/onboarding');
                } else {
                    router.push('/pricing');
                }
                return;
              }

            } catch (err) {
              console.error('⚠️ Polling error:', err);
              if (attempt === maxRetries - 1) setIsVerifyingPayment(false);
            }
          }
        } catch (error) {
          console.error("Error in home-feed init:", error);
          setIsVerifyingPayment(false);
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
    <div className="satoshi-home-feed w-full h-screen bg-black dark:bg-black relative">
      <GmailInterfaceFixed />
      
      {isVerifyingPayment && (
          <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center gap-6">
              {!paymentVerified ? (
                  <>
                      <div className="relative">
                          <div className="w-16 h-16 border-2 border-white/5 rounded-full" />
                          <div className="absolute inset-0 w-16 h-16 border-t-2 border-white rounded-full animate-spin" />
                      </div>
                      <div className="space-y-2 text-center">
                          <h2 className="text-xl font-serif text-white">Activating your subscription</h2>
                          <p className="text-neutral-500 text-sm max-w-[280px] leading-relaxed">
                              We&apos;re confirming your payment with Polar.<br/>This will only take a moment.
                          </p>
                      </div>
                  </>
              ) : (
                  <>
                      <div className="relative flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center" style={{ animation: 'scaleIn 0.4s ease-out' }}>
                              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'checkDraw 0.5s ease-out 0.2s both' }}>
                                  <path d="M8 18L15 25L28 11" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                          </div>
                      </div>
                      <div className="space-y-2 text-center">
                          <h2 className="text-xl font-serif text-white">You&apos;re all set!</h2>
                          <p className="text-neutral-500 text-sm">
                              {activatedPlan} plan activated successfully.
                          </p>
                      </div>
                  </>
              )}
              <style jsx>{`
                  @keyframes scaleIn {
                      from { transform: scale(0); opacity: 0; }
                      to { transform: scale(1); opacity: 1; }
                  }
                  @keyframes checkDraw {
                      from { opacity: 0; transform: scale(0.5); }
                      to { opacity: 1; transform: scale(1); }
                  }
              `}</style>
          </div>
      )}
      
      {!isVerifyingPayment && <PricingOverlay isOpen={showPricing} onClose={() => setShowPricing(false)} />}
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

