"use client";

import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PricingCard } from "@/components/ui/pricing";

const STEPS = [
  "Welcome",
  "Role",
  "Goals",
  "Scanning",
  "Analysis",
  "Try Action",
  "Success",
  "Benefits",
  "Pricing"
];

const ROLES = [
  { id: "founder", title: "Founder / Builder", icon: Briefcase },
  { id: "freelancer", title: "Freelancer / Consultant", icon: User },
  { id: "student", title: "Student / Other", icon: GraduationCap },
];

const GOALS = [
  { id: "forgetting", title: "Forgetting to reply", description: "Never leave a thread hanging again." },
  { id: "followups", title: "Missing follow-ups", description: "Stay on top of every opportunity." },
  { id: "messy", title: "Inbox feels messy", description: "Get a clear view of what matters." },
  { id: "unimportant", title: "Too many unimportant emails", description: "Focus on human-to-human sync." },
];

const WHOP_CHECKOUT_URLS = {
  starter: 'https://whop.com/checkout/plan_OXtDPFaYlmYWN',
  pro: 'https://whop.com/checkout/plan_HjjXVb5SWxdOK'
};

const plans = [
  {
    name: "Starter",
    info: "Ideal for businesses ready to explore AI and intelligent automation",
    price: { monthly: 7.99, yearly: 7.99 },
    features: [
      { text: "AI Sift Intelligence" },
      { text: "Priority Inbox" },
      { text: "Basic AI Drafts" },
      { text: "Secure Google OAuth" },
      { text: "Standard Relationship Tracking" }
    ],
    btn: { text: "Select Starter", href: "#" }
  },
  {
    name: "Pro",
    info: "Built for companies that want to gain an edge with AI-powered automation",
    price: { monthly: 29.99, yearly: 29.99 },
    features: [
      { text: "Everything in Starter" },
      { text: "Unlimited AI Processing" },
      { text: "Advanced Relationship Tracking" },
      { text: "Custom Neural Voice" },
      { text: "Priority Support" },
      { text: "Unlimited Draft Replies" }
    ],
    btn: { text: "Select Pro Elite", href: "#" },
    highlighted: true
  }
];

export default function SiftOnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [role, setRole] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedEmails, setScannedEmails] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedEmailForAction, setSelectedEmailForAction] = useState<any>(null);
  const [actionType, setActionType] = useState<"summary" | "reply" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Animation variants
  const containerVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.4, ease: "easeIn" } }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Step 4: Scan Logic
  useEffect(() => {
    if (currentStep === 3) {
      startScan();
    }
  }, [currentStep]);

  const startScan = async () => {
    setIsScanning(true);
    try {
      // Fake delay for perceived value
      const delayPromise = new Promise(resolve => setTimeout(resolve, 4000));

      // Real fetch
      const fetchPromise = fetch("/api/gmail/messages?maxResults=20").then(res => res.json());

      const [_, data] = await Promise.all([delayPromise, fetchPromise]);

      if (data.emails) {
        setScannedEmails(data.emails);
        // Heuristic analysis
        const toReply = data.emails.filter((e: any) => e.labels.includes("UNREAD")).slice(0, 3);
        const unanswered = data.emails.filter((e: any) => !e.labels.includes("SENT")).slice(0, 2);

        setAnalysisResult({
          toReply,
          unanswered
        });
      }

      handleNext();
    } catch (error) {
      console.error("Scan failed:", error);
      handleNext(); // Still move forward even if it fails
    } finally {
      setIsScanning(false);
    }
  };

  const handleAction = async (type: "summary" | "reply", email: any) => {
    setActionType(type);
    setSelectedEmailForAction(email);
    setActionLoading(true);
    setActionResult(null);

    try {
      const endpoint = type === "summary" ? "/api/email/summary" : "/api/email/draft-reply";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id })
      });

      const data = await response.json();
      if (type === "summary") {
        if (data.summary && data.summary.includes("Could not generate summary")) {
          throw new Error("AI Service temporary failure");
        }
        setActionResult(data.summary);
      } else {
        setActionResult(data.draftReply || data.draft);
      }
    } catch (error) {
      console.error("Action failed:", error);
      setActionResult("Failed to generate response. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectPlan = async (plan: string) => {
    setSelectedPlan(plan);
    setIsSubmitting(true);

    try {
      // Complete onboarding
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: session?.user?.name?.toLowerCase().replace(/\s/g, '_') || 'user',
          plan: plan,
          role: role,
          goals: selectedGoals
        }),
      });

      // Redirect to Whop
      const checkoutUrl = WHOP_CHECKOUT_URLS[plan as keyof typeof WHOP_CHECKOUT_URLS];
      if (checkoutUrl) {
        const params = new URLSearchParams();
        if (session?.user?.email) params.set('email', session.user.email);
        window.location.href = `${checkoutUrl}?${params.toString()}`;
      }
    } catch (error) {
      console.error('Error during plan selection:', error);
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <motion.div key="step-0" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-8 text-center max-w-2xl mx-auto">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
                Welcome to Mailient 👋
              </h1>
              <p className="text-xl md:text-2xl text-zinc-400 font-light leading-relaxed">
                We help you stay on top of important emails without living in your inbox.
              </p>
            </div>
            <div className="pt-8">
              <Button onClick={handleNext} size="lg" className="h-16 px-12 bg-white text-black hover:bg-zinc-200 rounded-2xl text-lg font-bold transition-all group shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        );

      case 1: // Who are you?
        return (
          <motion.div key="step-1" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 max-w-4xl mx-auto">
            <div className="space-y-4 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Who are you?</h2>
              <p className="text-zinc-500 text-lg">This helps us tailor Mailient for you.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    onClick={() => { setRole(r.id); setTimeout(handleNext, 300); }}
                    className={cn(
                      "group p-8 rounded-3xl border transition-all duration-500 flex flex-col items-center text-center space-y-4",
                      role === r.id
                        ? "bg-white border-white text-black shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                        : "bg-zinc-950/50 border-white/5 text-zinc-400 hover:border-white/20 hover:bg-zinc-900"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                      role === r.id ? "bg-black/5" : "bg-white/5"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold">{r.title}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        );

      case 2: // Goals
        return (
          <motion.div key="step-2" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 max-w-4xl mx-auto">
            <div className="space-y-4 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">What do you want help with?</h2>
              <p className="text-zinc-500 text-lg">User tells you why Mailient matters.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGoals(prev =>
                      prev.includes(g.id) ? prev.filter(i => i !== g.id) : [...prev, g.id]
                    );
                  }}
                  className={cn(
                    "group p-6 rounded-3xl border transition-all duration-300 flex items-start gap-4 text-left",
                    selectedGoals.includes(g.id)
                      ? "bg-white/10 border-white/20"
                      : "bg-zinc-950/50 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className={cn(
                    "mt-1 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors",
                    selectedGoals.includes(g.id) ? "bg-white border-white text-black" : "border-white/20"
                  )}>
                    {selectedGoals.includes(g.id) && <Check className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{g.title}</div>
                    <div className="text-sm text-zinc-500">{g.description}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-center pt-8">
              <Button
                onClick={handleNext}
                disabled={selectedGoals.length === 0}
                className="h-14 px-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold"
              >
                Continue
              </Button>
            </div>
          </motion.div>
        );

      case 3: // Scanning
        return (
          <motion.div key="step-3" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 text-center max-w-2xl mx-auto">
            <div className="relative w-32 h-32 mx-auto">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-t-2 border-white/20 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white">Looking at recent conversations…</h2>
              <p className="text-zinc-500">Finding emails that may need attention.</p>
            </div>
          </motion.div>
        );

      case 4: // First Value Screen
        return (
          <motion.div key="step-4" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 max-w-4xl mx-auto">
            <div className="space-y-4 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Analysis complete.</h2>
              <p className="text-zinc-500 text-lg">These are easy to miss in a normal inbox.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-950/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {analysisResult?.toReply?.length || 0} emails to reply to
                  </h3>
                </div>
                <div className="space-y-3">
                  {analysisResult?.toReply?.map((e: any) => (
                    <div key={e.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">{e.subject}</div>
                        <div className="text-xs text-zinc-500 truncate">{e.from}</div>
                      </div>
                      <Send className="w-4 h-4 text-zinc-600 ml-4 shrink-0" />
                    </div>
                  ))}
                  {!analysisResult?.toReply?.length && <p className="text-zinc-600 italic">No urgent unread emails found.</p>}
                </div>
              </div>

              <div className="bg-zinc-950/50 border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {analysisResult?.unanswered?.length || 0} unanswered threads
                  </h3>
                </div>
                <div className="space-y-3">
                  {analysisResult?.unanswered?.map((e: any) => (
                    <div key={e.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">{e.subject}</div>
                        <div className="text-xs text-zinc-500 truncate">{e.from}</div>
                      </div>
                      <AlertCircle className="w-4 h-4 text-zinc-600 ml-4 shrink-0" />
                    </div>
                  ))}
                  {!analysisResult?.unanswered?.length && <p className="text-zinc-600 italic">No unanswered threads found.</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <Button onClick={handleNext} className="h-14 px-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold">
                Continue to Try One Action
              </Button>
            </div>
          </motion.div>
        );

      case 5: // Try One Action
        const emailToTry = analysisResult?.toReply?.[0] || analysisResult?.unanswered?.[0] || scannedEmails[0];

        return (
          <motion.div key="step-5" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 max-w-4xl mx-auto">
            <div className="space-y-4 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Try one action.</h2>
              <p className="text-zinc-500 text-lg">You’re always in control. Mailient just helps you move faster.</p>
            </div>

            <div className="bg-zinc-950/50 border border-white/5 rounded-[3rem] p-8 md:p-12 space-y-8 shadow-2xl">
              {emailToTry ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                        <Mail className="w-6 h-6 text-zinc-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-bold text-white truncate">{emailToTry.subject}</div>
                        <div className="text-sm text-zinc-500">From: {emailToTry.from}</div>
                      </div>
                    </div>
                    <div className="p-6 bg-black/40 rounded-2xl border border-white/5 text-zinc-400 text-sm leading-relaxed max-h-32 overflow-y-auto">
                      {emailToTry.snippet}...
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => handleAction("summary", emailToTry)}
                      disabled={actionLoading}
                      variant="outline"
                      className="h-16 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      {actionLoading && actionType === "summary" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      Summarize this email
                    </Button>
                    <Button
                      onClick={() => handleAction("reply", emailToTry)}
                      disabled={actionLoading}
                      variant="outline"
                      className="h-16 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-bold flex items-center justify-center gap-2"
                    >
                      {actionLoading && actionType === "reply" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                      Draft a quick reply
                    </Button>
                  </div>

                  <AnimatePresence>
                    {actionResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 bg-white/5 border border-white/10 rounded-[2rem] space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                            {actionType === "summary" ? "AI Summary" : "AI Draft Reply"}
                          </span>
                          <Sparkles className="w-4 h-4 text-white/40" />
                        </div>
                        <div className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                          {actionResult}
                        </div>
                        <div className="pt-4 flex justify-end">
                          <Button onClick={handleNext} className="bg-white text-black hover:bg-zinc-200 rounded-xl font-bold">
                            Continue
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="text-center py-20">
                  <p className="text-zinc-600 italic">No recent emails found to perform actions on.</p>
                  <Button onClick={handleNext} className="mt-8">Skip this step</Button>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 6: // Gentle Progress Reminder
        return (
          <motion.div key="step-6" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(255,255,255,0.2)]">
              <Check className="w-12 h-12 text-black" />
            </div>
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">Nice — you’ve already saved a few minutes today.</h2>
              <p className="text-zinc-500 text-xl leading-relaxed">
                Mailient keeps doing this quietly in the background.
              </p>
            </div>
            <div className="pt-8">
              <Button onClick={handleNext} size="lg" className="h-16 px-12 bg-white text-black hover:bg-zinc-200 rounded-2xl text-lg font-bold shadow-xl">
                Continue
              </Button>
            </div>
          </motion.div>
        );

      case 7: // What You’ll Get Going Forward
        return (
          <motion.div key="step-7" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-12 max-w-2xl mx-auto">
            <div className="space-y-4 text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">This is just the beginning.</h2>
              <p className="text-zinc-500 text-lg">What you'll get going forward:</p>
            </div>

            <div className="space-y-4">
              {[
                "Important emails highlighted",
                "Follow-ups easier to manage",
                "Less mental load in your inbox"
              ].map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 bg-zinc-950/50 border border-white/5 rounded-[1.5rem] flex items-center gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xl font-medium text-white">{b}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-center pt-8">
              <Button onClick={handleNext} size="lg" className="h-16 px-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold shadow-xl">
                See Plans
              </Button>
            </div>
          </motion.div>
        );

      case 8: // Pricing
        return (
          <motion.div key="step-8" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-16 max-w-5xl mx-auto">
            <div className="space-y-4 text-center max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">To keep using Mailient after Alpha, pick a plan that works for you.</h2>
              <p className="text-zinc-500 text-lg">Early users get the lowest price we’ll ever offer.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {plans.map(plan => (
                <div key={plan.name} onClick={() => !isSubmitting && handleSelectPlan(plan.name.toLowerCase())} className="cursor-pointer">
                  <PricingCard
                    plan={plan as any}
                    isHighlighted={plan.highlighted}
                    className={cn(isSubmitting && selectedPlan === plan.name.toLowerCase() && "opacity-50 pointer-events-none")}
                  />
                  {isSubmitting && selectedPlan === plan.name.toLowerCase() && (
                    <div className="mt-4 flex justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans overflow-x-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-900/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-900/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 p-6 md:p-8 flex items-center justify-between backdrop-blur-md bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black flex items-center justify-center rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-transform hover:scale-105 duration-500">
            <img src="/logo-new.png" alt="Mailient" className="w-full h-full object-cover" />
          </div>
          <span className="font-black tracking-[0.2em] text-sm text-neutral-100 uppercase">Mailient</span>
        </div>

        {currentStep > 0 && currentStep < 8 && (
          <div className="flex items-center gap-2">
            <div className="hidden md:flex gap-1">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    i <= currentStep ? "w-8 bg-white" : "w-4 bg-white/10"
                  )}
                />
              ))}
            </div>
            <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase ml-4">
              Step {currentStep + 1} / {STEPS.length}
            </span>
          </div>
        )}

        <div className="flex items-center gap-4">
          {currentStep > 0 && currentStep < 4 && (
            <button onClick={handleBack} className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
              Back
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 pt-40 pb-20 px-6 min-h-screen flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-12 px-8 border-t border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase">Built for Founders</p>
            <div className="flex items-center gap-6">
              <a href="/privacy-policy" className="text-[9px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">Privacy Protocol</a>
              <a href="/terms-of-service" className="text-[9px] font-black text-zinc-600 hover:text-white transition-colors uppercase tracking-widest">Master Terms</a>
            </div>
          </div>

          <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest">
            © 2026 Mailient Intelligence Layer
          </p>
        </div>
      </footer>
    </div>
  );
}
