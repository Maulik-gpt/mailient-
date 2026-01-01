"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Zap,
  Sparkles,
  Check,
  ArrowRight,
  Loader2,
  ShieldCheck,
  FileText,
  Calendar,
  MousePointer2,
  ExternalLink,
  ChevronRight,
  Play,
  Bot,
  Inbox,
  Clock,
  Send,
  UserPlus,
  StickyNote,
  CreditCard,
  Lock,
  Globe
} from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  featureTitle: string;
  features: string[];
  demoType: "video" | "blank";
  accentColor: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "The Inbox, Reimagined.",
    subtitle: "A traditional foundation with a superhuman edge.",
    description: "Your emails haven't changed, but how you interact with them has. Experience the cleanest inbox in the world, powered by deep intelligence.",
    icon: Inbox,
    featureTitle: "Ask AI Anything",
    features: [
      "Natural language search across decades of mail",
      "Instant synthesis of complex threads",
      "One-click noise cancellation"
    ],
    demoType: "video",
    accentColor: "from-blue-500 to-cyan-400"
  },
  {
    title: "Sift Intelligence.",
    subtitle: "Analyze. Draft. Schedule. In seconds.",
    description: "Sift doesn't just read your email; it understands your intent. It's the engine that turns data into progress.",
    icon: Zap,
    featureTitle: "Top 6 Quick Actions",
    features: [
      "AI-Drafted Replies: Personalized to your unique voice",
      "Smart Scheduling: Sync meetings without the back-and-forth",
      "Deep Summarization, Lead Detection, Task Creation, and more"
    ],
    demoType: "video",
    accentColor: "from-yellow-400 to-orange-500"
  },
  {
    title: "Meet Arcus AI.",
    subtitle: "Your personal Chief of Staff.",
    description: "Arcus is always listening, always ready. Whether you need a draft sent at 2 AM or a breakdown of your week, Arcus has the context.",
    icon: Bot,
    featureTitle: "Agent Talk Interface",
    features: [
      "Conversational context mapping",
      "Cross-platform execution",
      "Proactive insight delivery"
    ],
    demoType: "blank",
    accentColor: "from-purple-500 to-pink-500"
  },
  {
    title: "Thought Management.",
    subtitle: "Notes that live where your work happens.",
    description: "Don't let insights slip away. Capture thoughts directly from your inbox and let AI structure them into actionable knowledge units.",
    icon: StickyNote,
    featureTitle: "AI-Enhanced Notes",
    features: [
      "One-click note creation from any email",
      "Automatic cognitive architecture and structuring",
      "Linked context for every piece of info"
    ],
    demoType: "video",
    accentColor: "from-emerald-400 to-teal-500"
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

  // Redirect if not authenticated or if onboarding already completed
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
    const totalSteps = STEPS.length + 1; // +1 for pricing
    const stepWeight = 100 / totalSteps;
    const currentWeight = isPricingStep ? (STEPS.length + 1) * stepWeight : (currentStep + 1) * stepWeight;
    setProgress(currentWeight);
  }, [currentStep, isPricingStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setIsPricingStep(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const fireConfetti = () => {
    const scalar = 2;
    const triangle = confetti.shapeFromPath({ path: 'M0 10 L5 0 L10 10z' });

    confetti({
      shapes: [triangle],
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ffffff', '#3b82f6', '#8b5cf6']
    });
  };

  const handleSelectPlan = (plan: string) => {
    setSelectedPlan(plan);
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccessStep(true);
      fireConfetti();
    }, 2000);
  };

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
        <div className="relative">
          <div className="w-16 h-16 border-t-2 border-white/20 border-r-2 border-white/40 border-b-2 border-white/60 border-l-2 border-white rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-['Satoshi'] overflow-x-hidden">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[160px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[160px] opacity-50" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Progress Header */}
      {!isSuccessStep && (
        <div className="fixed top-0 left-0 w-full z-50 p-6 md:p-10 flex flex-col items-center">
          <div className="w-full max-w-7xl flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black flex items-center justify-center rounded-xl rotate-12 group hover:rotate-0 transition-transform duration-500 cursor-pointer overflow-hidden border border-white/20">
                <img
                  src="/mailient-logo.png"
                  alt="Mailient Logo"
                  className="w-full h-full object-cover -rotate-12 group-hover:rotate-0 transition-transform duration-500 scale-125"
                />
              </div>
              <span className="font-bold tracking-tighter text-xl">MAILIENT</span>
            </div>
            <div className="text-neutral-500 text-sm font-medium tracking-widest uppercase">
              {isPricingStep ? "Step 5 / 5" : `Step ${currentStep + 1} / 5`}
            </div>
          </div>
          <div className="w-full max-w-7xl h-[1px] bg-white/10 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-white transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <main className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex flex-col">
        {isSuccessStep ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-1000">
            <div className="relative">
              <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center border-8 border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                <Check className="w-16 h-16 text-black" strokeWidth={3} />
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center animate-bounce">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic uppercase leading-none">
                You're In.
              </h1>
              <p className="text-2xl text-neutral-400 font-medium max-w-2xl mx-auto">
                Your intelligence layers are active. Welcome to the future of high-velocity communication.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="p-8 bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:bg-white/5 transition-colors">
                <ShieldCheck className="w-10 h-10 text-blue-400" />
                <span className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">Plan Active</span>
                <span className="text-2xl font-bold">{selectedPlan === 'pro' ? 'Pro Unlimited' : 'Starter Premium'}</span>
              </div>
              <div className="p-8 bg-neutral-900/50 border border-neutral-800 rounded-[2.5rem] flex flex-col items-center gap-4 group hover:bg-white/5 transition-colors">
                <Globe className="w-10 h-10 text-purple-400" />
                <span className="text-sm font-semibold text-neutral-500 uppercase tracking-widest">Node Status</span>
                <span className="text-2xl font-bold">Global Ready</span>
              </div>
            </div>

            <Button
              onClick={handleLaunch}
              disabled={isSubmitting}
              className="w-full h-20 bg-white hover:bg-neutral-200 text-black text-2xl font-black rounded-[2.5rem] group transition-all transform hover:scale-[1.02]"
            >
              {isSubmitting ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <span className="flex items-center gap-4">
                  ENTER WORKSPACE
                  <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                </span>
              )}
            </Button>
          </div>
        ) : isPricingStep ? (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000 space-y-16 py-10">
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              <h2 className="text-7xl md:text-9xl font-black tracking-tighter italic uppercase leading-tight">
                Choose <br /> Your Edge.
              </h2>
              <p className="text-2xl text-neutral-400 font-medium leading-relaxed">
                Outpace the noise. Select a plan that matches your velocity.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Starter Plan */}
              <div
                onClick={() => !isSubmitting && handleSelectPlan('starter')}
                className="relative group bg-[#0D0D0D] border border-neutral-800 rounded-[3rem] p-12 hover:border-white/20 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[600px] hover:shadow-[0_0_80px_rgba(255,255,255,0.03)]"
              >
                <div className="absolute top-0 right-0 p-8">
                  <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                    <Send className="w-8 h-8 text-neutral-500" />
                  </div>
                </div>

                <div className="space-y-8 relative z-10">
                  <div className="space-y-2">
                    <span className="px-4 py-1.5 bg-neutral-900 text-neutral-500 text-xs font-bold uppercase tracking-[0.3em] rounded-full">Standard</span>
                    <h3 className="text-5xl font-black tracking-tighter">STARTER</h3>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-7xl font-black leading-none italic">$7.99</span>
                    <span className="text-neutral-500 text-xl font-bold tracking-widest uppercase">/mo</span>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <p className="text-lg text-neutral-400 leading-relaxed font-medium">Fine-tuned for individuals who value precision and clarity.</p>
                    <ul className="space-y-5">
                      {['500 AI-Powered Insights', 'Standard Arcus Access', 'Single Workspace Sync', 'Email Digest Mode'].map((f) => (
                        <li key={f} className="flex items-center gap-4 text-neutral-300 font-medium">
                          <Check className="w-5 h-5 text-white/50" strokeWidth={3} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-12">
                  <div className="w-full h-16 bg-white/5 flex items-center justify-center rounded-[1.5rem] border border-white/10 group-hover:bg-white group-hover:text-black transition-all duration-500 group-hover:scale-[1.02]">
                    <span className="font-black tracking-widest uppercase italic">{isSubmitting && selectedPlan === 'starter' ? 'PROCESSING...' : 'SELECT STARTER'}</span>
                  </div>
                </div>

                {isSubmitting && selectedPlan === 'starter' && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Pro Plan */}
              <div
                onClick={() => !isSubmitting && handleSelectPlan('pro')}
                className="relative group bg-[#0D0D0D] border-2 border-white/20 rounded-[3rem] p-12 hover:border-white transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between min-h-[600px] shadow-[0_0_100px_rgba(255,255,255,0.05)] hover:shadow-[0_0_120px_rgba(255,255,255,0.1)]"
              >
                <div className="absolute top-0 right-0 p-8">
                  <div className="px-5 py-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg shadow-white/10">MOST DEMANDED</div>
                </div>

                <div className="space-y-8 relative z-10">
                  <div className="space-y-2">
                    <span className="px-4 py-1.5 bg-neutral-900 text-white text-xs font-bold uppercase tracking-[0.3em] rounded-full">Elite Tier</span>
                    <h3 className="text-5xl font-black tracking-tighter">PRO ELITE</h3>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-7xl font-black leading-none italic text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-neutral-600">$29.99</span>
                    <span className="text-neutral-500 text-xl font-bold tracking-widest uppercase">/mo</span>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <p className="text-lg text-white leading-relaxed font-bold italic underline decoration-white/20 underline-offset-8">Engineered for founders, executives, and visionaries.</p>
                    <ul className="space-y-5">
                      {[
                        'Unlimited High-Velocity Analysis',
                        'Priority Arcus Cognitive Threading',
                        'Advanced Persona Cloning',
                        'Early Access to R&D Modules',
                        '24/7 Dedicated Support Node'
                      ].map((f) => (
                        <li key={f} className="flex items-center gap-4 text-white font-bold">
                          <Sparkles className="w-5 h-5 text-white animate-pulse" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-12">
                  <div className="w-full h-16 bg-white flex items-center justify-center rounded-[1.5rem] text-black transition-all duration-500 group-hover:scale-[1.02] shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                    <span className="font-black tracking-widest uppercase italic">{isSubmitting && selectedPlan === 'pro' ? 'SECURING...' : 'UPGRADE TO ELITE'}</span>
                  </div>
                </div>

                {isSubmitting && selectedPlan === 'pro' && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md">
                    <Loader2 className="w-12 h-12 animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center items-center gap-12 py-10 opacity-30">
              <div className="flex items-center gap-2 font-black italic tracking-widest text-xs"> <Lock className="w-4 h-4" /> SECURE STRIPE GATEWAY </div>
              <div className="flex items-center gap-2 font-black italic tracking-widest text-xs"> <CreditCard className="w-4 h-4" /> BANK-GRADE ENCRYPTION </div>
              <div className="flex items-center gap-2 font-black italic tracking-widest text-xs"> <Send className="w-4 h-4" /> INSTANT ACTIVATION </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-20 duration-1000 flex flex-col lg:flex-row gap-20 items-center justify-center flex-1" key={currentStep}>
            {/* Left Content */}
            <div className="flex-1 space-y-12 max-w-xl">
              <div className="space-y-6">
                <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg bg-gradient-to-br transition-all duration-1000 rotate-12 group-hover:rotate-0", STEPS[currentStep].accentColor)}>
                  {(() => {
                    const Icon = STEPS[currentStep].icon;
                    return <Icon className="w-8 h-8 text-black" strokeWidth={2.5} />;
                  })()}
                </div>
                <div className="space-y-2">
                  <h1 className="text-7xl md:text-8xl font-black tracking-tighter italic uppercase leading-none">
                    {STEPS[currentStep].title}
                  </h1>
                  <p className="text-3xl font-bold text-neutral-500 tracking-tight leading-tight italic">
                    {STEPS[currentStep].subtitle}
                  </p>
                </div>
                <p className="text-xl text-neutral-400 font-medium leading-relaxed">
                  {STEPS[currentStep].description}
                </p>
              </div>

              <div className="space-y-6 p-8 bg-neutral-900/40 border border-neutral-800 rounded-[2.5rem] backdrop-blur-md">
                <h4 className="flex items-center gap-2 text-xs font-black tracking-[0.3em] uppercase text-white/40 mb-4">
                  <Sparkles className="w-3 h-3" /> {STEPS[currentStep].featureTitle}
                </h4>
                <div className="grid gap-6">
                  {STEPS[currentStep].features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-4 group">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white group-hover:scale-150 transition-transform duration-500" />
                      <span className="text-lg text-neutral-100 font-bold leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-16 bg-white hover:bg-neutral-200 text-black text-xl font-black rounded-3xl group transition-all transform hover:scale-[1.02] mt-4"
              >
                <span>NEXT MODULE</span>
                <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
              </Button>
            </div>

            {/* Right Side - Premium Demo Placeholder */}
            <div className="flex-1 w-full max-w-2xl relative">
              <div className="aspect-[4/3] w-full bg-[#080808] border-2 border-white/5 rounded-[4rem] overflow-hidden relative group shadow-[0_0_100px_rgba(255,255,255,0.02)]">
                {STEPS[currentStep].demoType === "video" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 p-12 text-center">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-700 animate-pulse">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter">Module Performance</h3>
                      <p className="text-neutral-500 font-medium">Video demo loading...</p>
                    </div>
                    {/* Metallic Accent Lines */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center opacity-20">
                    <Loader2 className="w-12 h-12 animate-spin text-white mb-6" />
                    <span className="text-sm font-black tracking-widest uppercase">Initializing Interface Demo...</span>
                  </div>
                )}

                {/* Visual Decorative Dots */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                </div>
              </div>

              {/* Float Tags */}
              <div className="absolute -top-6 -right-6 bg-neutral-900 border border-neutral-700 p-4 rounded-2xl shadow-2xl animate-bounce duration-[3000ms]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="pr-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Processing</div>
                    <div className="text-xs font-bold">140ms Latency</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 bg-neutral-900 border border-neutral-700 p-4 rounded-2xl shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="pr-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Security</div>
                    <div className="text-xs font-bold">AES-256 Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modern Static Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-black tracking-[0.5em] text-white/40 uppercase">Global Communication Node</div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          </div>

          <div className="flex items-center gap-8">
            <a href="#" className="text-xs font-black tracking-[0.2em] text-neutral-500 hover:text-white transition-colors uppercase italic underline-offset-4 hover:underline">Support</a>
            <a href="#" className="text-xs font-black tracking-[0.2em] text-neutral-500 hover:text-white transition-colors uppercase italic underline-offset-4 hover:underline">Enterprise</a>
            <a href="https://discord.gg/BtArfKjN" target="_blank" className="flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white hover:text-black transition-all group">
              <span className="text-xs font-black tracking-widest uppercase italic">Join Collective</span>
              <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>

          <div className="text-[10px] font-bold text-neutral-600 tracking-tighter">© 2025 MAILIENT TECHNOLOGIES. ALL RIGHTS REDEFINED.</div>
        </div>
      </footer>
    </div>
  );
}