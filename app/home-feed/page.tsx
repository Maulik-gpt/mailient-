"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { GmailInterfaceFixed } from '@/components/ui/gmail-interface-fixed';

export default function HomeFeed() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check authentication, activate pending subscriptions, and check onboarding status
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.email) {
      const checkAndActivate = async () => {
        try {
          // IMMEDIATE CHECK: If localStorage says we are done, don't redirect
          // This prevents the "flash and redirect" when returning from Whop
          const isDone = localStorage.getItem('onboarding_completed') === 'true';

          // First, check if there's a pending plan that needs activation (user returned from Whop)
          const pendingPlan = localStorage.getItem('pending_plan');
          const pendingTimestamp = localStorage.getItem('pending_plan_timestamp');

          if (pendingPlan && pendingTimestamp) {
            const timestamp = parseInt(pendingTimestamp);
            const oneHourAgo = Date.now() - (60 * 60 * 1000);

            if (timestamp > oneHourAgo) {
              console.log('🔄 Activating pending subscription:', pendingPlan);

              const activateResponse = await fetch('/api/subscription/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planType: pendingPlan })
              });

              if (activateResponse.ok) {
                console.log('✅ Subscription activated locally');
                localStorage.removeItem('pending_plan');
                localStorage.removeItem('pending_plan_timestamp');
                // Set this IMMEDIATELY to prevent the onboarding check from failing
                localStorage.setItem('onboarding_completed', 'true');
              }
            } else {
              localStorage.removeItem('pending_plan');
              localStorage.removeItem('pending_plan_timestamp');
            }
          }

          // Then check onboarding status from server
          // If we JUST activated above, this might still hit a replica lag, 
          // but the localStorage check at the top of the function handles it.
          // However, we check again here just to be sure.
          if (localStorage.getItem('onboarding_completed') === 'true') {
            return;
          }

          console.log('📡 [HomeFeed] Checking server-side onboarding status...');
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            console.log('📡 [HomeFeed] Server status:', data);
            if (!data.completed) {
              console.log('🚫 [HomeFeed] User NOT completed, redirecting to /onboarding');
              router.push("/onboarding");
            } else {
              // Cache it if it was true on server
              console.log('✅ [HomeFeed] User is completed');
              localStorage.setItem('onboarding_completed', 'true');
            }
          }
        } catch (error) {
          console.error("Error in home-feed init:", error);
        }
      };
      checkAndActivate();
    }
  }, [status, session, router]);

  // Set page title
  useEffect(() => {
    document.title = 'Mailient Sift AI - Bulk Email Processing';
  }, []);

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

