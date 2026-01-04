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
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            console.log('📡 [Onboarding] Server response:', data);
            if (data.completed) {
              // Already completed onboarding, cache it and redirect
              console.log('🚀 [Onboarding] Redirecting to /home-feed (server)');
              localStorage.setItem('onboarding_completed', 'true');
              router.push("/home-feed");
            } else {
              console.log('⏳ [Onboarding] Staying here: Onboarding is NOT complete');
            }
          } else {
            console.error('❌ [Onboarding] Status API failed:', response.status);
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
