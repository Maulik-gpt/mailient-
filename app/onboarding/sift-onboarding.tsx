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
    // Initialize step from URL or default to 0
    const stepFromUrl = searchParams?.get('step');
    return stepFromUrl ? parseInt(stepFromUrl, 10) : 0;
  });
  const [role, setRole] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
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
          console.log(`💾 [Onboarding] Step ${currentStep} saved to server`);
        } catch (error) {
          console.error("❌ Failed to save onboarding step:", error);
        }
      };
      saveStep();
    }
  }, [currentStep, status, session]);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && currentStep < STEPS.length - 1) {
        handleNext();
      } else if (e.key === "ArrowLeft" && currentStep > 0) {
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep]);

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

  const goToStep = (step: number) => {
    if (step >= 0 && step < STEPS.length) {
      setCurrentStep(step);
      router.push(`/onboarding?step=${step}`);
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
    setScanError(null);
    setScanNeedsReauth(false);
    try {
      // Fake delay for perceived value
      const delayPromise = new Promise(resolve => setTimeout(resolve, 4000));

      // Use onboarding-specific endpoint that bypasses subscription checks
      const fetchPromise = fetch("/api/onboarding/emails").then(async (res) => {
        let data: any = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (!res.ok) {
          const err: any = new Error(data?.details || data?.error || `Failed to fetch emails (${res.status})`);
          err.needsReauth = !!data?.needsReauth;
          throw err;
        }

        return data;
      });

      const [_, data] = await Promise.all([delayPromise, fetchPromise]);

      console.log('📧 Onboarding email scan result:', data);

      if (data.emails && data.emails.length > 0) {
        setScannedEmails(data.emails);
        // Use the smart analysis from the API
        setAnalysisResult({
          toReply: data.analysis?.toReply || [],
          unanswered: data.analysis?.unanswered || []
        });
      } else {
        // Even if no emails found, set empty results
        setScannedEmails([]);
        setAnalysisResult({ toReply: [], unanswered: [] });
      }

      handleNext();
    } catch (error: any) {
      console.error("Scan failed:", error);
      if (error?.needsReauth) {
        setScanNeedsReauth(true);
        setScanError("Gmail permissions need to be refreshed. Please reconnect Gmail to continue.");
        return;
      }

      setScanError(error?.message || "Failed to fetch emails. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAction = async (type: "summary" | "reply" | "ask", email: any, question?: string) => {
    if (!email?.id) {
      console.error('❌ No email ID provided');
      setActionResult('Error: No email ID found');
      return;
    }

    if (type === "ask" && !question?.trim()) {
      setActionResult('Please enter a question to ask about this email.');
      return;
    }

    console.log(`🔧 Starting ${type} action for email:`, email.id, email.subject);

    setActionType(type);
    setSelectedEmailForAction(email);
    setActionLoading(true);
    setActionResult(null);
    setEmailSent(false);

    try {
      // Small artificial delay for perceived "intelligence" and weight of Arcus
      await new Promise(resolve => setTimeout(resolve, 800));

      // Use onboarding-specific endpoint that bypasses subscription checks
      const endpoint = "/api/onboarding/ai-action";
      console.log(`📡 Calling onboarding AI endpoint: ${endpoint}`);

      const requestBody: any = {
        emailId: email.id,
        actionType: type,
        context: {
          role,
          goals: selectedGoals,
          userName: session?.user?.name || "there"
        }
      };

      // Add question for ask action
      if (type === "ask" && question) {
        requestBody.question = question;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      console.log(`📡 Response status: ${response.status}`);

      const data = await response.json();
      console.log(`📡 Response data:`, data);

      if (!response.ok) {
        throw new Error(data.message || data.error || `Failed to generate AI response (${response.status})`);
      }

      // Handle the unified response format from onboarding endpoint
      if (data.result) {
        setActionResult(data.result);
        if (type === "ask") {
          setAiQuestion(""); // Clear question after successful response
        }
      } else {
        // Fallback based on action type
        if (type === "summary") {
          const fallbackSummary = `This email from ${email.from} discusses "${email.subject}". ${email.snippet ? `Key point: ${email.snippet.substring(0, 100)}...` : 'Please review the full content for details.'}`;
          setActionResult(fallbackSummary);
        } else if (type === "reply") {
          const fromName = email.from?.match(/([^<\s]+)/)?.[1]?.trim() || email.from?.split('@')?.[0] || 'there';
          const fallbackDraft = `Hi ${fromName},\n\nThank you for your email regarding "${email.subject}". I appreciate you reaching out and will review this carefully.\n\nI'll get back to you with a proper response soon.\n\nBest regards,\n${session?.user?.name || 'User'}`;
          setActionResult(fallbackDraft);
        } else {
          setActionResult('I can help you understand this email better. Please try again or ask a specific question.');
        }
      }
    } catch (error: any) {
      console.error("❌ AI Action Error:", error);
      setActionResult(error.message || "Failed to generate response. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmailForAction || !actionResult || actionType !== "reply") return;

    setIsSendingEmail(true);
    try {
      // Extract original from address
      const to = selectedEmailForAction.from.match(/<([^>]+)>/)?.[1] || selectedEmailForAction.from;
      const subject = `Re: ${selectedEmailForAction.subject}`;

      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          body: actionResult,
          isHtml: false
        })
      });

      if (!response.ok) throw new Error("Failed to send email");

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ffffff", "#cccccc", "#999999"]
      });

      setEmailSent(true);
      setTimeout(handleNext, 2000);
    } catch (error) {
      console.error("Send failed:", error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSelectPlan = async (plan: string) => {
    setSelectedPlan(plan);
    setIsSubmitting(true);

    try {
      console.log('🛒 User selected plan:', plan);
      console.log('👤 User role:', role);
      console.log('🎯 User goals:', selectedGoals);
      console.log('📧 User email:', session?.user?.email);
      console.log('👤 User name:', session?.user?.name);

      // Generate a proper username from email if name is not available
      const username = session?.user?.name?.toLowerCase().replace(/\s/g, '_') ||
        session?.user?.email?.split('@')[0] || 'user';

      console.log('👤 Generated username:', username);

      // Complete onboarding
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          plan: plan,
          role: role,
          goals: selectedGoals
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save onboarding progress");
      }

      const result = await response.json();
      console.log('✅ Onboarding completion response:', result);

      // Set fallback flags in localStorage to prevent redirection loops
      localStorage.setItem('onboarding_completed', 'true');
      localStorage.setItem('pending_plan', plan);
      localStorage.setItem('pending_plan_timestamp', Date.now().toString());
      localStorage.setItem('user_role', role || 'founder');
      localStorage.setItem('user_plan', plan);
      localStorage.setItem('user_username', username);

      console.log('📋 Set localStorage flags for onboarding completion');

      // Free plan: skip checkout, go directly to the dashboard
      if (plan === 'free') {
        console.log('🆓 Free plan selected — skipping checkout, redirecting to dashboard');
        router.push('/home-feed');
        return;
      }

      // Paid plans: redirect to Polar checkout
      const checkoutUrl = POLAR_CHECKOUT_URLS[plan as keyof typeof POLAR_CHECKOUT_URLS];
      if (checkoutUrl) {
        const params = new URLSearchParams();
        if (session?.user?.email) params.set('customer_email', session.user.email);

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mailient.xyz';
        params.set('success_url', `${baseUrl}/payment-success`);

        console.log('🚀 Redirecting to Polar:', `${checkoutUrl}?${params.toString()}`);
        window.location.href = `${checkoutUrl}?${params.toString()}`;
      } else {
        // Fallback to dashboard if checkout URL is missing
        console.log('⚠️ No Polar URL, redirecting to home-feed');
        router.push("/home-feed");
      }
    } catch (error) {
      console.error('❌ Error during plan selection:', error);
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
            {isScanning ? (
              <>
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
              </>
            ) : scanError ? (
              <>
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold text-white">We couldn’t scan your inbox.</h2>
                  <p className="text-zinc-500">{scanError}</p>
                </div>
                <div className="flex flex-col gap-3 items-center">
                  {scanNeedsReauth ? (
                    <Button
                      onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                      className="h-14 px-10 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold"
                    >
                      Reconnect Gmail
                    </Button>
                  ) : null}
                  <Button
                    onClick={startScan}
                    className="h-14 px-10 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold"
                  >
                    Retry Scan
                  </Button>
                  <Button
                    onClick={() => {
                      setScannedEmails([]);
                      setAnalysisResult({ toReply: [], unanswered: [] });
                      handleNext();
                    }}
                    variant="ghost"
                    className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl h-12 px-6"
                  >
                    Skip
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold text-white">Ready to scan your inbox.</h2>
                  <p className="text-zinc-500">We’ll look at your latest emails to find what needs attention.</p>
                </div>
                <Button
                  onClick={startScan}
                  className="h-14 px-10 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold"
                >
                  Start Scan
                </Button>
              </>
            )}
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

                  {/* Two Main Actions */}
                  <div className="space-y-4">
                    {/* Primary Action: Generate Reply Draft */}
                    <Button
                      onClick={() => handleAction("reply", emailToTry)}
                      disabled={actionLoading}
                      className="w-full h-16 bg-white text-black hover:bg-zinc-200 rounded-2xl font-bold flex items-center justify-center gap-3 text-lg shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all"
                    >
                      {actionLoading && actionType === "reply" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                      Generate Reply Draft
                    </Button>

                    {/* Secondary Action: Talk to AI */}
                    <div className="p-6 bg-zinc-900/50 border border-white/10 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <MessageSquare className="w-5 h-5" />
                        <span className="font-bold">Talk to AI about this email</span>
                      </div>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={aiQuestion}
                          onChange={(e) => setAiQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && aiQuestion.trim() && handleAction("ask", emailToTry, aiQuestion)}
                          placeholder="Ask anything... e.g., 'What does this person want?' or 'Is this urgent?'"
                          className="flex-1 h-12 px-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                          disabled={actionLoading}
                        />
                        <Button
                          onClick={() => handleAction("ask", emailToTry, aiQuestion)}
                          disabled={actionLoading || !aiQuestion.trim()}
                          className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading && actionType === "ask" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {["What's the priority?", "Summarize this", "What action needed?"].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setAiQuestion(suggestion);
                              handleAction("ask", emailToTry, suggestion);
                            }}
                            disabled={actionLoading}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition-colors disabled:opacity-50"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {actionResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-6 relative overflow-hidden group/result"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-white/20 to-transparent" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                              {actionType === "summary" ? <Sparkles className="w-3 h-3 text-zinc-300" /> :
                                actionType === "ask" ? <MessageSquare className="w-3 h-3 text-zinc-300" /> :
                                  <Bot className="w-3 h-3 text-zinc-300" />}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                              {actionType === "summary" ? "Arcus Synthesis" :
                                actionType === "ask" ? "Arcus Intelligence" :
                                  "Deep Draft Intelligence"}
                            </span>
                          </div>
                          <motion.div
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                          />
                        </div>

                        <div className="text-zinc-200 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                          {actionResult}
                        </div>

                        <div className="pt-4 flex items-center justify-between border-t border-white/5">
                          <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                            Processing via Arcus Model 4.0
                          </div>
                          <div className="flex gap-4">
                            {actionType === "reply" && !emailSent && (
                              <Button
                                onClick={handleSendReply}
                                disabled={isSendingEmail}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6 h-12 font-bold transition-all shadow-lg shadow-emerald-500/10"
                              >
                                {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                {isSendingEmail ? "Sending..." : "Send Reply"}
                              </Button>
                            )}
                            {emailSent ? (
                              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                <Check className="w-4 h-4" />
                                Sent! Continuing...
                              </div>
                            ) : (
                              <Button onClick={handleNext} variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl h-12 px-6">
                                Continue
                                <ArrowRight className="ml-2 w-4 h-4" />
                              </Button>
                            )}
                          </div>
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
          <motion.div key="step-8" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="space-y-16 max-w-6xl mx-auto">
            <div className="space-y-4 text-center max-w-2xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">Pick the plan that fits you.</h2>
              <p className="text-zinc-500 text-lg">Start free — upgrade anytime as you grow.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(plan => (
                <div key={plan.name}>
                  <PricingCard
                    plan={plan as any}
                    isHighlighted={plan.highlighted}
                    className={cn(isSubmitting && selectedPlan === plan.name.toLowerCase() && "opacity-50 pointer-events-none")}
                    onPlanSelect={() => !isSubmitting && handleSelectPlan(plan.name.toLowerCase())}
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
            {/* Desktop step indicator */}
            <div className="hidden md:flex gap-1">
              {STEPS.map((step, i) => (
                <button
                  key={i}
                  onClick={() => goToStep(i)}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    i <= currentStep ? "w-8 bg-white hover:bg-white/80" : "w-4 bg-white/10 hover:bg-white/20"
                  )}
                  title={`Go to ${step}`}
                />
              ))}
            </div>

            {/* Mobile step dropdown */}
            <div className="md:hidden">
              <select
                value={currentStep}
                onChange={(e) => goToStep(parseInt(e.target.value, 10))}
                className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-white/30"
              >
                {STEPS.map((step, i) => (
                  <option key={i} value={i}>
                    {i + 1}. {step}
                  </option>
                ))}
              </select>
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
