"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Sparkles,
  Check,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Play,
  Bot,
  Inbox,
  Send,
  StickyNote,
  Lock,
} from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  features: string[];
  accentColor: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Intelligence Layer",
    subtitle: "Your inbox, refined.",
    description: "Experience a workspace where noise is filtered and priority is absolute. Mailient understands your communication stack.",
    icon: Inbox,
    features: ["Neural context mapping", "Automated focus filters", "Instant synthesis"],
    accentColor: "from-neutral-200 to-neutral-400"
  },
  {
    title: "Smart Flow",
    subtitle: "Actions at the speed of thought.",
    description: "Respond, summarize, and prioritize without the overhead. Our core engine handles the heavy lifting of your day.",
    icon: Zap,
    features: ["Signature voice drafting", "Contextual quick actions", "Deep thread insights"],
    accentColor: "from-neutral-200 to-neutral-400"
  },
  {
    title: "Meet Arcus",
    subtitle: "Your dedicated AI partner.",
    description: "More than an assistant—Arcus is a proactive partner that learns your workflow and executes with precision.",
    icon: Bot,
    features: ["Proactive execution", "Natural dialogue", "Memory persistence"],
    accentColor: "from-neutral-200 to-neutral-400"
  },
  {
    title: "Deep Memory",
    subtitle: "Notes that understand context.",
    description: "Capture insights directly from your mail. Arcus organizes your thoughts into a structured knowledge base.",
    icon: StickyNote,
    features: ["One-click extraction", "Auto-structuring", "Linked intelligence"],
    accentColor: "from-neutral-200 to-neutral-400"
  }
];

export default function SiftOnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPricingStep, setIsPricingStep] = useState(false);
  const [isSuccessStep, setIsSuccessStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.email) {
      const checkOnboardingStatus = async () => {
        try {
          const response = await fetch("/api/onboarding/status");
          if (response.ok) {
            const data = await response.json();
            if (data.completed) {
              router.push("/home-feed");
            } else {
              setIsLoadingStatus(false);
            }
          } else {
            setIsLoadingStatus(false);
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
          setIsLoadingStatus(false);
        }
      };
      checkOnboardingStatus();
    }
  }, [status, session, router]);

  useEffect(() => {
    const totalSteps = STEPS.length + 1;
    const stepWeight = 100 / totalSteps;
    const currentWeight = isPricingStep ? (STEPS.length + 1) * stepWeight : (currentStep + 1) * stepWeight;
    setProgress(currentWeight);
  }, [currentStep, isPricingStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsPricingStep(true);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Whop checkout URLs
  const WHOP_CHECKOUT_URLS = {
    starter: 'https://whop.com/checkout/plan_OXtDPFaYlmYWN',
    pro: 'https://whop.com/checkout/plan_HjjXVb5SWxdOK'
  };

  const handleSelectPlan = async (plan: string) => {
    setSelectedPlan(plan);
    setIsSubmitting(true);

    try {
      // CRITICAL: Complete onboarding FIRST before redirecting to Whop
      // This ensures users won't be stuck in onboarding loop when they return
      const completeResponse = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: session?.user?.name?.toLowerCase().replace(/\s/g, '_') || 'user',
          plan: plan
        }),
      });

      if (!completeResponse.ok) {
        console.error('Failed to complete onboarding before payment');
      }

      // Store selected plan in localStorage for after payment return
      localStorage.setItem('pending_plan', plan);
      localStorage.setItem('pending_plan_timestamp', Date.now().toString());

      // Redirect to Whop checkout
      const checkoutUrl = WHOP_CHECKOUT_URLS[plan as keyof typeof WHOP_CHECKOUT_URLS];
      if (checkoutUrl) {
        // Add user email as a parameter for tracking
        const params = new URLSearchParams();
        if (session?.user?.email) {
          params.set('email', session.user.email);
        }

        window.location.href = `${checkoutUrl}?${params.toString()}`;
      }
    } catch (error) {
      console.error('Error during plan selection:', error);
      setIsSubmitting(false);
    }
  };

  // Check for payment success on page load (redirect from Whop)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const planFromUrl = urlParams.get('plan');
    const pendingPlan = localStorage.getItem('pending_plan');

    if (paymentStatus === 'success' && (planFromUrl || pendingPlan)) {
      const finalPlan = planFromUrl || pendingPlan || 'starter';
      setSelectedPlan(finalPlan);

      // Clear pending plan from localStorage
      localStorage.removeItem('pending_plan');
      localStorage.removeItem('pending_plan_timestamp');

      // Activate subscription
      const activateSubscription = async () => {
        try {
          const response = await fetch('/api/subscription/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planType: finalPlan })
          });

          if (response.ok) {
            setIsSuccessStep(true);
            setIsPricingStep(false);
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#ffffff', '#000000']
            });
          }
        } catch (error) {
          console.error('Error activating subscription:', error);
        }
      };

      activateSubscription();

      // Clean up URL
      window.history.replaceState({}, '', '/onboarding');
    }
  }, []);

  const handleLaunch = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: session?.user?.name?.toLowerCase().replace(/\s/g, '_') || 'user',
          plan: selectedPlan
        }),
      });

      if (response.ok) {
        router.push("/home-feed");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || isLoadingStatus) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-200 selection:bg-neutral-200 selection:text-black font-['Satoshi'] overflow-x-hidden">
      {/* Minimal Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-neutral-900/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[30%] h-[30%] bg-neutral-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Sleek Header */}
      {!isSuccessStep && (
        <div className="fixed top-0 left-0 w-full z-50 p-8 flex flex-col items-center backdrop-blur-md bg-black/20 border-b border-white/5">
          <div className="w-full max-w-5xl flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-black flex items-center justify-center rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-transform hover:scale-105 duration-500">
                <img src="/favicon.png?v=6" alt="Mailient" className="w-full h-full object-cover" />
              </div>
              <span className="font-semibold tracking-[0.2em] text-sm text-neutral-100 uppercase">Mailient</span>
            </div>
            <div className="text-[10px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
              {isPricingStep ? "05 / 05" : `0${currentStep + 1} / 05`}
            </div>
          </div>
          <div className="w-full max-w-5xl h-[1px] bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-200 transition-all duration-1000 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <main className="relative z-10 pt-48 pb-20 px-8 max-w-5xl mx-auto min-h-screen flex flex-col">
        {isSuccessStep ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12 animate-in fade-in duration-1000">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-white">System ready.</h1>
              <p className="text-lg text-neutral-400 max-w-md mx-auto">
                Intelligence layers are synchronized. Welcome to Mailient.
              </p>
            </div>

            <Button
              onClick={handleLaunch}
              disabled={isSubmitting}
              className="w-64 h-14 bg-white hover:bg-neutral-200 text-black font-semibold rounded-2xl transition-all transform hover:scale-105 shadow-xl shadow-white/5"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Launch Workspace"}
            </Button>
          </div>
        ) : isPricingStep ? (
          <div className="animate-in fade-in duration-700 space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">Select your tier.</h2>
              <p className="text-lg text-neutral-500">Choose the depth of intelligence that fits your needs.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Starter */}
              <div
                onClick={() => !isSubmitting && handleSelectPlan('starter')}
                className="group relative bg-[#080808] border border-neutral-800 p-10 rounded-[2.5rem] hover:border-neutral-600 transition-all duration-500 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                <div className="space-y-6 relative z-10">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-500 uppercase">Standard</span>
                    <h3 className="text-3xl font-semibold text-white">Starter</h3>
                  </div>
                  <div className="text-4xl font-semibold text-neutral-200">$7.99<span className="text-sm font-normal text-neutral-600 ml-1">/mo</span></div>
                  <ul className="space-y-4 pt-6 border-t border-neutral-800">
                    {[
                      '30 Draft Replies /month',
                      '30 Schedule Calls /month',
                      '20 AI-assisted Notes /month',
                      '5 Sift AI Analysis /day',
                      '10 Arcus AI interactions /day',
                      '20 Email Summaries /day'
                    ].map(f => (
                      <li key={f} className="flex items-center gap-3 text-neutral-400 text-sm">
                        <Check className="w-4 h-4 text-neutral-600" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10 h-14 bg-neutral-900 border border-white/5 rounded-2xl flex items-center justify-center font-black text-xs tracking-[0.2em] uppercase group-hover:bg-white group-hover:text-black transition-all duration-500">
                  {isSubmitting && selectedPlan === 'starter' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Select Starter"}
                </div>
              </div>

              {/* Pro */}
              <div
                onClick={() => !isSubmitting && handleSelectPlan('pro')}
                className="group relative bg-white border border-white p-10 rounded-[2.5rem] transition-all duration-500 cursor-pointer shadow-2xl shadow-white/5 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                <div className="space-y-6 relative z-10">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-900/50 uppercase">Elite</span>
                    <h3 className="text-3xl font-semibold text-black">Pro</h3>
                  </div>
                  <div className="text-4xl font-semibold text-black">$29.99<span className="text-sm font-normal text-neutral-500 ml-1">/mo</span></div>
                  <ul className="space-y-4 pt-6 border-t border-black/5">
                    {[
                      'Unlimited Draft Replies',
                      'Unlimited AI Analysis',
                      'Unlimited Arcus AI',
                      'Unlimited Summaries & Notes',
                      'Priority Support',
                      'Early Access to Features'
                    ].map(f => (
                      <li key={f} className="flex items-center gap-3 text-neutral-800 text-sm font-medium">
                        <Sparkles className="w-4 h-4 text-neutral-400" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-10 h-14 bg-black rounded-2xl flex items-center justify-center font-black text-xs tracking-[0.2em] uppercase text-white group-hover:scale-[1.02] transition-all duration-500">
                  {isSubmitting && selectedPlan === 'pro' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Select Pro Elite"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700 space-y-24" key={currentStep}>
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                    {(() => {
                      const Icon = STEPS[currentStep].icon;
                      return <Icon className="w-5 h-5 text-neutral-400" />;
                    })()}
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-5xl font-semibold tracking-tight text-white leading-tight">
                      {STEPS[currentStep].title}
                    </h1>
                    <p className="text-xl text-neutral-500 font-medium italic">
                      {STEPS[currentStep].subtitle}
                    </p>
                  </div>
                  <p className="text-lg text-neutral-400 leading-relaxed font-light">
                    {STEPS[currentStep].description}
                  </p>
                </div>

                <div className="grid gap-4">
                  {STEPS[currentStep].features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-4 text-neutral-500 text-sm italic">
                      <div className="w-1.5 h-[1px] bg-neutral-700" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  className="w-48 h-12 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl group transition-all"
                >
                  Continue
                  <ChevronRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              {/* Minimal Demo Context */}
              <div className="hidden lg:block">
                <div className="aspect-[4/3] bg-[#050505] border border-neutral-900 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-2xl">
                  <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center border border-white/5 opacity-50">
                    <Play className="w-5 h-5 text-neutral-500" />
                  </div>
                  <p className="text-xs font-bold tracking-[0.2em] text-neutral-600 uppercase italic">Interactive Demonstration</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="py-12 px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[10px] font-bold tracking-[0.2em] text-neutral-600 uppercase italic">
            Engineered for Precision
          </div>
          <div className="text-[9px] font-medium text-neutral-700 uppercase tracking-widest">
            © 2025 Mailient Technologies
          </div>
        </div>
      </footer>
    </div>
  );
}
