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
                console.log('✅ Subscription activated!');
                localStorage.removeItem('pending_plan');
                localStorage.removeItem('pending_plan_timestamp');
              }
            } else {
              localStorage.removeItem('pending_plan');
              localStorage.removeItem('pending_plan_timestamp');
            }
          }

          // Then check onboarding status
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            if (!data.completed) {
              router.push("/onboarding");
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

