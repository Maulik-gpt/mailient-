"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
  User,
  Briefcase,
  GraduationCap,
  AlertCircle,
  Clock,
  Mail,
  MessageSquare,
  Layout,
  Star,
  RefreshCw,
  Shield,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PricingCard } from "@/components/ui/pricing";
import posthog from "posthog-js";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

const STEPS = [
  "Positioning",
  "Identity",
  "Scanning",
  "Snapshot",
  "Win",
  "Trust",
  "Pricing",
  "Ready"
];

const ROLES = [
  { id: "founder", title: "Founder" },
  { id: "freelancer", title: "Freelancer" },
  { id: "business_owner", title: "Business Owner" },
  { id: "student", title: "Student" },
];

const DRAIN_OPTIONS = [
  "Sales inquiries",
  "Client revisions",
  "Team coordination",
  "Cold outreach",
  "Support",
  "Academic emails",
];

const PERSONALITY_LABELS = [
  "Minimal & Direct",
  "Strategic & Thoughtful",
  "Friendly & Warm",
  "Assertive & Sharp",
];

const MATTERS_MOST = [
  "Save time",
  "Close more deals",
  "Reduce mental clutter",
  "Never miss important emails",
];

const POLAR_CHECKOUT_URLS = {
  starter: 'https://buy.polar.sh/polar_cl_B9DSDJSz1EeVhR8rtLcVgn1vVvjvizMvp0yOs3IQOJW',
  pro: 'https://buy.polar.sh/polar_cl_B9DSDJSz1EeVhR8rtLcVgn1vVvjvizMvp0yOs3IQOJW'
};

const plans = [
  {
    name: "Free",
    info: "Experience the power of Mailient AI — no credit card required",
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: "1 AI Draft per day" },
      { text: "1 Sift Analysis per day" },
      { text: "3 Email Summaries per day" },
      { text: "Secure Google OAuth" },
      { text: "Basic Relationship Tracking" }
    ],
    btn: { text: "Start Free", href: "#" }
  },
  {
    name: "Starter",
    info: "For solopreneurs ready to automate their inbox at scale",
    price: { monthly: 7.99, yearly: 7.99 },
    features: [
      { text: "10 AI Drafts per day" },
      { text: "10 Sift Analyses per day" },
      { text: "20 Arcus AI queries per day" },
      { text: "30 Email Summaries per day" },
      { text: "Standard Relationship Tracking" }
    ],
    btn: { text: "Select Starter", href: "#" },
    highlighted: true
  },
  {
    name: "Pro",
    info: "Unlimited power for teams and power users who demand the best",
    price: { monthly: 29.99, yearly: 29.99 },
    features: [
      { text: "Everything in Starter" },
      { text: "Unlimited AI Processing" },
      { text: "Advanced Relationship Tracking" },
      { text: "Custom Neural Voice" },
      { text: "Priority Support" },
      { text: "Unlimited Draft Replies" }
    ],
    btn: { text: "Select Pro", href: "#" }
  }
];

export default function SiftOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(() => {
    const stepFromUrl = searchParams?.get('step');
    return stepFromUrl ? parseInt(stepFromUrl, 10) : 0;
  });

  // Identity state
  const [role, setRole] = useState<string | null>(null);
  const [drainingEmails, setDrainingEmails] = useState<string[]>([]);
  const [personalityIdx, setPersonalityIdx] = useState(1);
  const [primaryGoal, setPrimaryGoal] = useState<string | null>(null);
  const [customInstruction, setCustomInstruction] = useState("");
  const [identityStep, setIdentityStep] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedEmails, setScannedEmails] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanNeedsReauth, setScanNeedsReauth] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedEmailForAction, setSelectedEmailForAction] = useState<any>(null);
  const [actionType, setActionType] = useState<"summary" | "reply" | "ask" | null>(null);
  const [aiQuestion, setAiQuestion] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Auto-advance Step 0 logic
  useEffect(() => {
    if (currentStep === 0) {
      const timer = setTimeout(() => {
        handleNext();
      }, 10000); // 10s max as per request
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Save step to database as user progresses
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      const saveStep = async () => {
        try {
          await fetch("/api/onboarding/step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: currentStep }),
          });
        } catch (error) {
          console.error("Failed to save onboarding step:", error);
        }
      };
      saveStep();
    }
  }, [currentStep, status, session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      router.push(`/onboarding?step=${nextStep}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      router.push(`/onboarding?step=${prevStep}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Step 2 Logic: Advances through sub-steps
  const handleIdentityNext = () => {
    if (identityStep < 4) {
      setIdentityStep(prev => prev + 1);
    } else {
      handleNext();
    }
  };

  // Step 3: Scan Logic
  useEffect(() => {
    if (currentStep === 2) {
      startScan();
    }
  }, [currentStep]);

  const startScan = async () => {
    setIsScanning(true);
    setScanError(null);
    setScanNeedsReauth(false);
    try {
      // Fake delay for perceived value
      const delayPromise = new Promise(resolve => setTimeout(resolve, 4000));
      const fetchPromise = fetch("/api/onboarding/emails").then(async (res) => {
        let data: any = {};
        try { data = await res.json(); } catch { data = {}; }
        if (!res.ok) {
          const err: any = new Error(data?.details || data?.error || `Failed to fetch emails (${res.status})`);
          err.needsReauth = !!data?.needsReauth;
          throw err;
        }
        return data;
      });

      const [_, data] = await Promise.all([delayPromise, fetchPromise]);
      if (data.emails && data.emails.length > 0) {
        setScannedEmails(data.emails);
        setAnalysisResult({
          toReply: data.analysis?.toReply || [],
          unanswered: data.analysis?.unanswered || []
        });
      } else {
        setScannedEmails([]);
        setAnalysisResult({ toReply: [], unanswered: [] });
      }
      handleNext();
    } catch (error: any) {
      console.error("Scan failed:", error);
      if (error?.needsReauth) {
        setScanNeedsReauth(true);
        setScanError("Gmail permissions need to be refreshed. Please reconnect Gmail.");
        return;
      }
      setScanError(error?.message || "Failed to fetch emails.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAction = async (type: "summary" | "reply" | "ask", email: any, question?: string) => {
    if (!email?.id) return;
    setActionType(type);
    setSelectedEmailForAction(email);
    setActionLoading(true);
    setActionResult(null);
    setEmailSent(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const requestBody: any = {
        emailId: email.id,
        actionType: type,
        context: { role, goals: [primaryGoal], userName: session?.user?.name || "there" }
      };
      if (type === "ask" && question) requestBody.question = question;

      const response = await fetch("/api/onboarding/ai-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed");
      setActionResult(data.result);
    } catch (error: any) {
      setActionResult("Error: " + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmailForAction || !actionResult) return;
    setIsSendingEmail(true);
    try {
      const to = selectedEmailForAction.from.match(/<([^>]+)>/)?.[1] || selectedEmailForAction.from;
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject: `Re: ${selectedEmailForAction.subject}`, body: actionResult })
      });
      if (!response.ok) throw new Error("Send failed");
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      setEmailSent(true);
      setTimeout(handleNext, 1200);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSelectPlan = async (plan: string) => {
    setSelectedPlan(plan);
    setIsSubmitting(true);
    try {
      const username = session?.user?.name?.toLowerCase().replace(/\s/g, '_') || session?.user?.email?.split('@')[0] || 'user';
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          plan,
          role,
          personality: PERSONALITY_LABELS[personalityIdx],
          goals: [primaryGoal],
          customInstruction
        }),
      });
      if (!response.ok) throw new Error("Failed");

      localStorage.setItem('onboarding_completed', 'true');
      if (plan === 'free') {
        router.push('/home-feed');
        return;
      }
      const checkoutUrl = POLAR_CHECKOUT_URLS[plan as keyof typeof POLAR_CHECKOUT_URLS];
      if (checkoutUrl) {
        window.location.href = `${checkoutUrl}?customer_email=${session?.user?.email}&success_url=${window.location.origin}/payment-success`;
      } else {
        router.push("/home-feed");
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0, filter: "blur(4px)", y: 10 },
    visible: { opacity: 1, filter: "blur(0px)", y: 0, transition: { duration: 0.8, ease: "circOut" } },
    exit: { opacity: 0, filter: "blur(4px)", y: -10, transition: { duration: 0.4 } }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // POSITIONING
        return (
          <motion.div key="step-0" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 text-center max-w-3xl mx-auto px-6">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-medium tracking-tight text-white leading-[1.1] font-serif">
                Your inbox is not your job.<br />
                <span className="text-zinc-500 italic">It’s your leverage.</span>
              </h1>
              <p className="text-xl md:text-2xl text-zinc-400 font-light leading-relaxed max-w-2xl mx-auto">
                Mailient learns how you think and handles your email like you would - but faster.
              </p>
            </div>
            <div className="pt-8 flex justify-center">
              <LiquidButton
                onClick={handleNext}
                className="group relative h-16 px-12 text-lg font-medium text-white transition-all hover:scale-105 active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <span>Start Onboarding</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </div>
              </LiquidButton>
            </div>
          </motion.div>
        );

      case 1: // IDENTITY CAPTURE
        return (
          <motion.div key="step-1" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto px-6 w-full">
            <AnimatePresence mode="wait">
              {identityStep === 0 && (
                <motion.div key="q1" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-10">
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Question 1 of 5</span>
                    <h2 className="text-4xl font-medium text-white">What are you?</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => { setRole(r.id); setTimeout(handleIdentityNext, 400); }}
                        className={cn(
                          "group p-6 rounded-3xl border text-left transition-all duration-300",
                          role === r.id
                            ? "bg-white border-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            : "bg-zinc-950/20 border-white/5 text-zinc-400 hover:border-white/20 hover:bg-zinc-900/50"
                        )}
                      >
                        <span className="text-xl font-medium">{r.title}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {identityStep === 1 && (
                <motion.div key="q2" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-10">
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Question 2 of 5</span>
                    <h2 className="text-4xl font-medium text-white">What kind of emails drain you?</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DRAIN_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setDrainingEmails(prev => prev.includes(opt) ? prev.filter(i => i !== opt) : [...prev, opt]);
                        }}
                        className={cn(
                          "group p-4 rounded-2xl border text-left transition-all duration-300 flex items-center justify-between",
                          drainingEmails.includes(opt)
                            ? "bg-white/10 border-white/40 text-white"
                            : "bg-zinc-950/20 border-white/5 text-zinc-400 hover:border-white/10"
                        )}
                      >
                        <span className="text-lg">{opt}</span>
                        {drainingEmails.includes(opt) && <Check className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                  <div className="pt-6">
                    <LiquidButton
                      onClick={handleIdentityNext}
                      disabled={drainingEmails.length === 0}
                      className="w-full h-14 text-white font-bold disabled:opacity-30"
                    >
                      Continue
                    </LiquidButton>
                  </div>
                </motion.div>
              )}

              {identityStep === 2 && (
                <motion.div key="q3" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12">
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Question 3 of 5</span>
                    <h2 className="text-4xl font-medium text-white">How should Mailient sound?</h2>
                  </div>
                  <div className="space-y-12 py-10">
                    <div className="relative">
                      <input
                        type="range" min="0" max="3" step="1"
                        value={personalityIdx}
                        onChange={(e) => setPersonalityIdx(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                      />
                      <div className="flex justify-between mt-6">
                        {PERSONALITY_LABELS.map((label, idx) => (
                          <div key={label} className={cn("text-xs uppercase tracking-tighter transition-colors max-w-[80px] text-center", personalityIdx === idx ? "text-white font-bold" : "text-zinc-600")}>
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-8 apple-glass-liquid-dark rounded-[2.5rem] border border-white/5 text-center italic text-zinc-400">
                      "I'll adopt a <span className="text-white font-medium">{PERSONALITY_LABELS[personalityIdx]}</span> tone when drafting your replies."
                    </div>
                  </div>
                  <LiquidButton onClick={handleIdentityNext} className="w-full h-14 text-white font-bold">
                    Looks Good
                  </LiquidButton>
                </motion.div>
              )}

              {identityStep === 3 && (
                <motion.div key="q4" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-10">
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Question 4 of 5</span>
                    <h2 className="text-4xl font-medium text-white">What matters most?</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {MATTERS_MOST.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setPrimaryGoal(opt); setTimeout(handleIdentityNext, 400); }}
                        className={cn(
                          "group p-6 rounded-3xl border text-left transition-all duration-300",
                          primaryGoal === opt
                            ? "bg-white border-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            : "bg-zinc-950/20 border-white/5 text-zinc-400 hover:border-white/20 hover:bg-zinc-900/50"
                        )}
                      >
                        <span className="text-xl font-medium">{opt}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {identityStep === 4 && (
                <motion.div key="q5" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-10">
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Question 5 of 5</span>
                    <h2 className="text-4xl font-medium text-white">One custom instruction:</h2>
                    <p className="text-zinc-500">How should Mailient think before replying?</p>
                  </div>
                  <div className="space-y-6">
                    <textarea
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      placeholder="e.g. 'Never agree to calls before checking my calendar.' or 'Be concise but never rude.'"
                      className="w-full p-6 bg-zinc-950/50 border border-white/10 rounded-[2rem] text-white text-lg min-h-[160px] focus:outline-none focus:border-white/30 transition-all placeholder:text-zinc-700"
                    />
                    <LiquidButton onClick={handleIdentityNext} className="w-full h-14 text-white font-bold">
                      Complete Setup
                    </LiquidButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );

      case 2: // SCANNING
        return (
          <motion.div key="step-2" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-2xl mx-auto text-center space-y-12">
            <div className="relative w-40 h-40 mx-auto">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t-2 border-white/20 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Mail className="w-10 h-10 text-white animate-pulse" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-medium text-white italic">Performing Live Intelligence Scan</h2>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <ScanningLabel label="Analyzing your inbox patterns..." delay={0} />
                <ScanningLabel label="Identifying priority senders..." delay={1.5} />
                <ScanningLabel label="Learning your communication style..." delay={3} />
              </div>
            </div>
          </motion.div>
        );

      case 3: // SNAPSHOT
        return (
          <motion.div key="step-3" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto px-6 w-full space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-medium text-white">Inbox Snapshot</h2>
              <p className="text-zinc-500">Real-time insights from your latest threads.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Total Analyzed" value={scannedEmails.length} icon={Inbox} color="text-blue-400" />
              <StatCard label="Needs Action" value={analysisResult?.toReply?.length || 0} icon={Bot} color="text-yellow-400" />
              <StatCard label="Missed Opportunities" value={analysisResult?.unanswered?.length || 0} icon={Zap} color="text-purple-400" />
            </div>
            <div className="flex justify-center pt-8">
              <LiquidButton onClick={handleNext} className="h-14 px-12 text-white font-bold">
                Continue to Delegations
              </LiquidButton>
            </div>
          </motion.div>
        );

      case 4: // IMMEDIATE WIN
        const delegationEmails = analysisResult?.toReply?.slice(0, 3) || [];
        return (
          <motion.div key="step-4" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-4xl mx-auto px-6 w-full space-y-12 pb-20">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-medium text-white">The Immediate Win</h2>
              <p className="text-zinc-500">Here are 3 emails you can delegate right now.</p>
            </div>

            <div className="space-y-6">
              {delegationEmails.map((email: any, idx: number) => (
                <DelegationRow
                  key={email.id}
                  email={email}
                  onSend={handleSendReply}
                  loading={isSendingEmail && selectedEmailForAction?.id === email.id}
                  sent={emailSent && selectedEmailForAction?.id === email.id}
                  onAction={() => handleAction("reply", email)}
                  result={selectedEmailForAction?.id === email.id ? actionResult : null}
                  actionLoading={actionLoading && selectedEmailForAction?.id === email.id}
                />
              ))}
              {delegationEmails.length === 0 && (
                <div className="p-12 text-center text-zinc-600 border border-white/5 rounded-[2.5rem] italic">
                  No delegatable threads found in recent history.
                </div>
              )}
            </div>

            <div className="flex justify-center pt-8">
              <button
                onClick={handleNext}
                className="text-zinc-500 hover:text-white transition-colors underline underline-offset-4"
              >
                Skip to Dashboard
              </button>
            </div>
          </motion.div>
        );

      case 5: // CONTROL & TRUST
        return (
          <motion.div key="step-5" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto px-6 text-center space-y-12">
            <div className="space-y-6">
              <h2 className="text-5xl font-medium text-white">Control & Trust</h2>
              <p className="text-xl text-zinc-500">Built for high-stakes workflows where privacy is default.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
              <TrustItem icon={Shield} title="Approval First" desc="Mailient never sends without your explicit signal." />
              <TrustItem icon={EyeOff} title="Data Privacy" desc="Your email content is never shared or used to train public models." />
              <TrustItem icon={User} title="You Own Personality" desc="Switch AI off or adjust tone at any moment." />
              <TrustItem icon={Lock} title="Encrypted & Secure" desc="Enterprise-grade security for your Workspace data." />
            </div>
            <LiquidButton onClick={handleNext} className="h-16 px-14 text-white text-lg font-bold shadow-xl">
              I Trust Mailient
            </LiquidButton>
          </motion.div>
        );

      case 6: // PRICING
        return (
          <motion.div key="step-6" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-6xl mx-auto px-4 pb-20">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-5xl font-medium text-white tracking-tight leading-tight">
                Choose your path
              </h2>
              <p className="text-zinc-500 text-lg">Select the plan that fits your leverage today.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <PricingCard
                  key={plan.name}
                  plan={plan as any}
                  isHighlighted={plan.highlighted}
                  onPlanSelect={() => handleSelectPlan(plan.name.toLowerCase())}
                />
              ))}
            </div>
          </motion.div>
        );

      case 7: // READY
        return (
          <motion.div key="step-7" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="max-w-xl mx-auto text-center space-y-12 py-20">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-32 h-32 bg-white rounded-full mx-auto flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.2)]"
            >
              <CheckCircle2 className="w-16 h-16 text-black" strokeWidth={3} />
            </motion.div>
            <div className="space-y-4">
              <h2 className="text-6xl font-medium text-white italic">You're ready to go!</h2>
              <p className="text-xl text-zinc-500">Your leverage has arrived.</p>
            </div>
            <LiquidButton
              onClick={() => router.push("/home-feed")}
              className="h-16 px-14 text-white text-lg font-bold animate-pulse hover:animate-none"
            >
              I'm readyyy!
            </LiquidButton>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black bg-grain text-white selection:bg-white selection:text-black font-sans flex flex-col items-center justify-center py-10">
      {/* HUD Progress */}
      {currentStep < 7 && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 rounded-full transition-all duration-700",
                i === currentStep ? "w-8 bg-white" : i < currentStep ? "w-4 bg-white/40" : "w-1 bg-white/10"
              )}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>

      {/* Footer Branding */}
      <div className="fixed bottom-12 left-8 z-[60] flex items-center gap-2 text-white/20 select-none">
        <Bot className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-widest font-black">Mailient Onboarding / v2.1</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="p-8 apple-glass-liquid-dark rounded-[2.5rem] border border-white/5 space-y-4 text-center">
      <div className={cn("w-12 h-12 mx-auto flex items-center justify-center rounded-2xl bg-white/5", color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-4xl font-serif font-medium">{value}</div>
        <div className="text-xs uppercase tracking-widest text-zinc-600 mt-1">{label}</div>
      </div>
    </div>
  );
}

function DelegationRow({ email, loading, sent, onSend, onAction, result, actionLoading }: any) {
  return (
    <div className="apple-glass-liquid-dark rounded-[2.5rem] border border-white/5 p-8 flex flex-col md:flex-row items-center gap-8 transition-all hover:bg-white/[0.02]">
      <div className="flex-1 space-y-2 min-w-0 w-full">
        <h4 className="text-lg font-medium text-white truncate">{email.subject}</h4>
        <p className="text-sm text-zinc-500 truncate">From: {email.from}</p>
        <div className="pt-4 text-sm text-zinc-400 border-t border-white/5 mt-4 line-clamp-2 italic">"{email.snippet}"</div>
      </div>
      <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[180px]">
        {sent ? (
          <div className="flex items-center gap-2 text-emerald-400 font-bold px-6 py-4 justify-center">
            <Check className="w-5 h-5" />
            Sent
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl text-[13px] text-zinc-300 border border-white/10 line-clamp-4 leading-relaxed">
              {result}
            </div>
            <div className="flex gap-2">
              <LiquidButton onClick={onSend} className="flex-1 h-12 text-white text-xs font-black uppercase tracking-widest">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Send with Mailient"}
              </LiquidButton>
            </div>
          </div>
        ) : (
          <LiquidButton
            disabled={actionLoading}
            onClick={onAction}
            className="w-full h-14 text-white text-xs font-black uppercase tracking-widest"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Delegate to Mailient"}
          </LiquidButton>
        )}
      </div>
    </div>
  );
}

function TrustItem({ icon: Icon, title, desc }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-white/40" />
        <h4 className="text-lg font-medium text-white">{title}</h4>
      </div>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function ScanningLabel({ label, delay }: { label: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 1 }}
      className="flex items-center gap-3 text-sm text-zinc-500"
    >
      <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
      {label}
    </motion.div>
  );
}
