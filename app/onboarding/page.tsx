"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import SiftOnboardingPage from "./sift-onboarding";
import posthog from "posthog-js";
import { CheckCircle2, ArrowRight, Mail, ExternalLink, Sparkles, ShieldCheck } from "lucide-react";
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-[#fafafa] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (isWaitlistMode && session?.user?.email) {
    return (
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-satoshi flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/[0.03] blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/[0.02] blur-[120px] rounded-full animate-pulse delay-700" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-lg bg-zinc-950/50 backdrop-blur-2xl border border-white/10 p-8 md:p-12 rounded-[32px] shadow-2xl text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(255,255,255,0.1)]"
          >
            <CheckCircle2 className="w-10 h-10 text-black" strokeWidth={2.5} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
              <Sparkles className="w-3 h-3 text-white/60" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Verified Access</span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
              You&apos;re almost there!
            </h1>
            
            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
              We&apos;ve verified your Gmail ID. Click below to complete your spot on the <span className="text-white font-semibold">Mailient Early Access</span> list.
            </p>

            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl mb-10 flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-0.5">Capturing ID</p>
                <p className="text-sm font-medium text-white/80 truncate">{session?.user?.email || "No email verified"}</p>
              </div>
            </div>

            <button
              onClick={() => {
                // Pre-fill Tally form with the verified email
                const email = session?.user?.email || "";
                const tallyUrl = `https://tally.so/r/n0pE_placeholder?email=${encodeURIComponent(email)}`;
                window.location.href = tallyUrl;
              }}
              className="group w-full h-16 bg-white text-black rounded-2xl font-bold text-lg hover:bg-[#F5F5F5] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95"
            >
              Confirm & Join Waitlist
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>

            <div className="mt-8 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Secure verification</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500/60" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Priority access</span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <p className="mt-12 text-zinc-600 text-xs tracking-widest uppercase font-bold">
          Powered by Mailient Intelligence
        </p>
      </div>
    );
  }

  // Use the new Sift onboarding flow with Suspense
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-[#fafafa] rounded-full animate-spin"></div>
      </div>
    }>
      <SiftOnboardingPage />
    </Suspense>
  );
}
