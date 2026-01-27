"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import SiftOnboardingPage from "./sift-onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect if not authenticated or if onboarding is already completed
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    // Check if onboarding is already completed
    if (status === "authenticated" && session?.user?.email) {
      const userEmail = session?.user?.email;
      console.log(`📋 [Onboarding] Checking status for: ${userEmail}`);

      const checkOnboardingStatus = async () => {
        try {
          // Check local storage first for instant redirection
          const localDone = localStorage.getItem('onboarding_completed') === 'true';
          console.log(`📋 [Onboarding] Local status: ${localDone}`);

          if (localDone) {
            console.log('🚀 [Onboarding] Redirecting to /home-feed (localStorage)');
            router.push("/home-feed");
            return;
          }

          console.log('📡 [Onboarding] Fetching status from server...');

          // Try multiple times with exponential backoff to handle database replication delays
          const maxRetries = 3;
          let retryCount = 0;
          let serverCompleted = false;

          while (retryCount < maxRetries && !serverCompleted) {
            try {
              const response = await fetch("/api/onboarding/status");
              if (response.ok) {
                const data = await response.json();
                console.log('📡 [Onboarding] Server response:', data);

                if (data.completed) {
                  serverCompleted = true;
                  // Already completed onboarding, cache it and redirect
                  console.log('🚀 [Onboarding] Redirecting to /home-feed (server)');
                  localStorage.setItem('onboarding_completed', 'true');
                  router.push("/home-feed");
                } else if (data.lastStep !== undefined) {
                  // Not completed, redirect to the last step they were on
                  const currentParam = new URLSearchParams(window.location.search).get('step');
                  if (currentParam === null || parseInt(currentParam) !== data.lastStep) {
                    console.log(`🚀 [Onboarding] Redirecting to step ${data.lastStep}`);
                    router.push(`/onboarding?step=${data.lastStep}`);
                    serverCompleted = true; // Stop retrying as we found our place
                  } else {
                    console.log(`⏳ [Onboarding] Already on step ${data.lastStep}`);
                    serverCompleted = true;
                  }
                } else {
                  console.log('⏳ [Onboarding] Staying here: Onboarding is NOT complete');
                }
              } else {
                console.error('❌ [Onboarding] Status API failed:', response.status);
              }
            } catch (error) {
              console.error(`⚠️ [Onboarding] Status check failed (attempt ${retryCount + 1}):`, error);
              if (retryCount < maxRetries - 1) {
                // Exponential backoff: 500ms, 1000ms, 2000ms
                const delay = Math.pow(2, retryCount) * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
            retryCount++;
          }
        } catch (error) {
          console.error("❌ [Onboarding] Error checking status:", error);
        }
      };
      checkOnboardingStatus();
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-[#fafafa] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Use the new Sift onboarding flow
  return <SiftOnboardingPage />;
}
