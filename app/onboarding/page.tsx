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
      const checkOnboardingStatus = async () => {
        try {
          // Check local storage first for instant redirection
          if (localStorage.getItem('onboarding_completed') === 'true') {
            router.push("/home-feed");
            return;
          }

          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            if (data.completed) {
              // Already completed onboarding, cache it and redirect
              localStorage.setItem('onboarding_completed', 'true');
              router.push("/home-feed");
            }
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
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
