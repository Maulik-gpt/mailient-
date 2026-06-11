"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import SiftOnboardingPage from "./sift-onboarding";
import posthog from "posthog-js";
import { CheckCircle2, ArrowRight, Mail, ExternalLink, Zap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isWaitlistMode, setIsWaitlistMode] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('waitlist') === 'true') {
      setIsWaitlistMode(true);
    }
  }, []);

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

      // Identify user in PostHog
      posthog.identify(userEmail, {
        email: userEmail,
        name: session.user.name || undefined,
      });

      // Capture login event
      posthog.capture('user_logged_in', {
        email: userEmail,
      });

      const checkOnboardingStatus = async () => {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const forceRedo = urlParams.get('force') === 'true';

          if (forceRedo) {
            console.log('🚀 [Onboarding] Force re-do detected. Skipping status checks.');
            localStorage.removeItem('onboarding_completed');
            return;
          }

          // Check local storage status but don't force redirect
          const localDone = localStorage.getItem('onboarding_completed') === 'true';
          console.log(`📋 [Onboarding] Local status: ${localDone}`);

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
                  // Already completed onboarding, ensure cached locally for status indicators but don't force redirect
                  console.log('📋 [Onboarding] Onboarding completed according to server.');
                  localStorage.setItem('onboarding_completed', 'true');
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
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] to-[#F0F0F2] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-black/[0.08] border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (isWaitlistMode && session?.user?.email) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-satoshi flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.12, type: 'spring', damping: 22, stiffness: 280 }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-black/[0.04] dark:ring-white/[0.05] text-black/70 dark:text-white/70 mb-6"
          >
            <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
          </motion.div>

          <p className="text-[11px] uppercase tracking-[0.18em] text-black/40 dark:text-white/40 font-medium mb-3">
            Verified
          </p>
          <h1 className="text-3xl sm:text-[40px] sm:leading-[1.05] font-semibold tracking-[-0.025em] mb-3">
            You&apos;re almost in.
          </h1>
          <p className="text-[15px] text-black/55 dark:text-white/55 leading-relaxed mb-7 max-w-sm mx-auto">
            We verified your Google sign-in. Confirm below to lock your spot on the Mailient Early Access list.
          </p>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] mb-7 text-left">
            <div className="w-9 h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center text-black/65 dark:text-white/65 flex-shrink-0">
              <Mail className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-black/40 dark:text-white/40 font-medium mb-0.5">
                Capturing
              </p>
              <p className="text-[13.5px] font-medium text-black dark:text-white truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const email = session?.user?.email || '';
              const tallyUrl = `https://tally.so/r/b5KpB6?email=${encodeURIComponent(email)}`;
              window.location.href = tallyUrl;
            }}
            className="group inline-flex items-center gap-2 pl-5 pr-3 py-3 rounded-full text-[14px] font-semibold bg-black text-white dark:bg-white dark:text-black hover:bg-black/85 dark:hover:bg-white/85 transition-[background-color,transform] duration-150 active:scale-[0.97]"
          >
            Confirm & join waitlist
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="mt-8 flex items-center justify-center gap-4 text-[11px] uppercase tracking-[0.14em] font-medium text-black/35 dark:text-white/35">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
              Secure
            </span>
            <span className="w-px h-3 bg-black/10 dark:bg-white/10" />
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
              Priority access
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Use the new Sift onboarding flow with Suspense
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] to-[#F0F0F2] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-black/[0.08] border-t-black rounded-full animate-spin" />
      </div>
    }>
      <SiftOnboardingPage />
    </Suspense>
  );
}
