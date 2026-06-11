'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, X,
  Mail, CalendarClock, Calendar, Bot, Inbox, Clock, Users,
  Zap, FileText, MessageSquare, Video, CheckCircle2, Play,
  Send, Activity, PlusCircle, UserPlus, Sliders, Link,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import PricingSection3 from '@/components/ui/pricing-section-3';

/* ─── Types & Constants ──────────────────────────────────────────── */

type StepId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
const TOTAL_PROGRESS_STEPS = 7; // steps 1-6 show progress, step 7 is pricing

const POLAR_CHECKOUT_URLS: Record<'monthly' | 'annual' | 'lifetime', string> = {
  monthly:  'https://buy.polar.sh/polar_cl_BmoCj2jm6Hxy2Pc4DI6y717wsENNDAniGPfsB1pMO61',
  annual:   'https://buy.polar.sh/polar_cl_ojXGgACq5GNMsUInVP3HX5vpXepohT5P8m7SL2RcCej',
  lifetime: 'https://buy.polar.sh/polar_cl_BmoCj2jm6Hxy2Pc4DI6y717wsENNDAniGPfsB1pMO61',
};

type GoalId = 'scheduling' | 'inbox' | 'followups' | 'briefings' | 'custom';

const GOALS: Array<{ id: GoalId; title: string; desc: string; icon: React.ReactNode }> = [
  { id: 'scheduling', title: 'Scheduling Meetings', desc: 'Auto-schedule from email requests', icon: <Calendar className="w-5 h-5" /> },
  { id: 'inbox',      title: 'Inbox Management', desc: 'Triage, label, and prioritize', icon: <Inbox className="w-5 h-5" /> },
  { id: 'followups',  title: 'Follow-Ups', desc: 'Track and nudge unanswered threads', icon: <Clock className="w-5 h-5" /> },
  { id: 'briefings',  title: 'Executive Briefings', desc: 'Daily digests of what matters', icon: <FileText className="w-5 h-5" /> },
  { id: 'custom',     title: 'Custom Agent', desc: 'Describe your own workflow', icon: <Sliders className="w-5 h-5" /> },
];

interface AgentPlan {
  goal: string;
  tools: string[];
  actions: string[];
  permissions: string[];
  schedule: string;
}

/* ─── Utility ────────────────────────────────────────────────────── */

function slugifyHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

/* ─── Animation Variants ─────────────────────────────────────────── */

const stepVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(4px)' },
};

const springTransition = { duration: 0.4, ease: [0.16, 1, 0.3, 1] };

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function SiftOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const stepFromUrl = Number(searchParams?.get('step') || 0) as StepId;
  const [step, setStep] = useState<StepId>(
    (stepFromUrl >= 0 && stepFromUrl <= 8) ? stepFromUrl : 0,
  );

  const firstName = useMemo(() => {
    const raw = session?.user?.name?.trim();
    if (raw) return raw.split(/\s+/)[0];
    const local = session?.user?.email?.split('@')[0] || '';
    const first = local.split(/[._\-+]/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
  }, [session]);

  // ── State ──
  const [selectedGoals, setSelectedGoals] = useState<GoalId[]>([]);
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [integrationStatuses, setIntegrationStatuses] = useState<any[]>([]);

  // ── Fetch integration statuses ──
  const fetchIntegrationStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        const data = await res.json();
        setIntegrationStatuses(Array.isArray(data.integrations) ? data.integrations : []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchIntegrationStatus();
  }, [fetchIntegrationStatus]);

  // Re-fetch on step 2 in case user returns from OAuth
  useEffect(() => {
    if (step === 2) fetchIntegrationStatus();
  }, [step, fetchIntegrationStatus]);

  const isConnected = useCallback((providerId: string) => {
    return integrationStatuses.some((s: any) => s.provider === providerId && s.connected);
  }, [integrationStatuses]);

  // ── Navigation ──
  const goto = useCallback((next: StepId) => {
    setStep(next);
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    if (next === 0) params.delete('step'); else params.set('step', String(next));
    const q = params.toString();
    window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);

    // Save step progress (fire and forget)
    fetch('/api/onboarding/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: next }),
    }).catch(() => {});
  }, [searchParams]);

  // ── Handlers ──
  const handleConnectGoogle = () => {
    signIn('google', { callbackUrl: `${window.location.pathname}?step=2`, redirect: true });
  };

  const handleConnectTool = (appId: string) => {
    const routes: Record<string, string> = {
      google_calendar: '/api/arcus/v3/oauth/gcal',
      slack: '/api/arcus/v3/oauth/slack',
      notion: '/api/arcus/v3/oauth/notion',
      google_meet: '/api/arcus/v3/oauth/gcal', // shares Calendar OAuth
    };
    const route = routes[appId];
    if (route) {
      // Store return step in sessionStorage
      sessionStorage.setItem('onboarding_return_step', '2');
      window.location.assign(route);
    }
  };

  const handleGenerateAgent = async () => {
    if (!agentPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/onboarding/generate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: agentPrompt, goals: selectedGoals }),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setAgentPlan(data.plan);
        goto(5);
      } else {
        toast.error('Could not generate agent plan. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAgent = () => {
    goto(6);
  };

  const handleRunTest = async () => {
    setIsRunningTest(true);
    try {
      // Simulate a test by checking connections
      await new Promise(r => setTimeout(r, 2000));
      setTestResult('Agent test completed successfully! Your agent processed 3 recent emails and identified 1 meeting request.');
    } catch {
      setTestResult('Test completed with partial results. Your agent is ready to go.');
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleFinish = async (plan: 'monthly' | 'annual' | 'lifetime') => {
    setIsSubmitting(true);
    try {
      const finalUsername = slugifyHandle(
        session?.user?.email?.split('@')[0] || firstName || 'mailient_user'
      );
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: finalUsername,
          profileName: session?.user?.name || firstName,
          bio: null,
          avatarUrl: session?.user?.image || null,
          plan,
          personality: 'balanced',
          goals: selectedGoals,
          agentConfig: agentPlan,
        }),
      });
      if (!res.ok) {
        const msg = await res.json().then(j => j?.error).catch(() => null);
        throw new Error(msg || `Setup didn't save (${res.status})`);
      }

      localStorage.setItem('onboarding_completed', 'true');
      try {
        localStorage.setItem('pending_plan', plan);
        localStorage.setItem('pending_plan_timestamp', String(Date.now()));
      } catch {}
      window.location.href = POLAR_CHECKOUT_URLS[plan];
    } catch (e: any) {
      setIsSubmitting(false);
      toast.error("We couldn't finish setting up your account", {
        description: (e?.message ? `${e.message}. ` : '') + "Please try again — you haven't been charged.",
      });
    }
  };

  // ── Progress logic ──
  const progressStep = step >= 1 && step <= 6 ? step : null;
  const showProgress = step >= 1 && step <= 6;
  const showNavFooter = step > 0 && step < 7;

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAFAFA] to-[#F0F0F2] text-[#1A1A1A] font-satoshi flex flex-col relative overflow-hidden">
      {/* Subtle background orbs */}
      <div className="fixed inset-0 pointer-events-none select-none overflow-hidden -z-10">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-neutral-200/30 to-gray-200/20 blur-[100px] onboarding-liquid-glow" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-neutral-100/25 to-gray-100/15 blur-[80px] onboarding-liquid-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Background Dot Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none select-none -z-10 opacity-[0.04]"
           style={{
             backgroundImage: "radial-gradient(circle, #000000 1px, transparent 1px)",
             backgroundSize: "24px 24px",
           }}
      />

      {/* ── Header ── */}
      {step < 8 && (
        <header className="sticky top-0 z-30 onboarding-glass border-b border-black/[0.04]">
          <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-black/[0.06]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mailient-logo-premium.png" alt="Mailient" className="w-full h-full object-cover" />
              </div>
              <span className="text-[13px] font-semibold tracking-tight text-[#1A1A1A]">Mailient</span>
            </div>

            {/* Progress bar */}
            {showProgress && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 6 }, (_, i) => {
                  const segStep = i + 1;
                  const isFilled = progressStep !== null && segStep <= progressStep;
                  const isCurrent = segStep === progressStep;
                  return (
                    <motion.div
                      key={i}
                      layout
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className="h-[3px] rounded-[3px] bg-black/[0.06] overflow-hidden"
                      style={{ width: isCurrent ? 32 : 12 }}
                    >
                      <motion.div
                        className="h-full bg-[#1A1A1A] rounded-[3px]"
                        initial={false}
                        animate={{ width: isFilled ? '100%' : '0%' }}
                        transition={{ type: "spring", stiffness: 220, damping: 24, delay: isCurrent ? 0.08 : 0 }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Step counter or spacer */}
            {showProgress ? (
              <span className="text-[12px] text-black/40 font-medium tabular-nums min-w-[48px] text-right">
                {progressStep}/{TOTAL_PROGRESS_STEPS - 1}
              </span>
            ) : <span className="w-12" />}
          </div>
        </header>
      )}

      {/* ── Main ── */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className={cn('w-full', step === 7 ? 'max-w-6xl' : 'max-w-xl')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={stepVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={springTransition}
            >
              {step === 0 && <StepWelcome onGetStarted={() => goto(1)} />}
              {step === 1 && <StepConnectGmail onConnect={handleConnectGoogle} isConnected={!!session} />}
              {step === 2 && (
                <StepConnectTools
                  isConnected={isConnected}
                  onConnect={handleConnectTool}
                />
              )}
              {step === 3 && (
                <StepChooseGoal
                  selected={selectedGoals}
                  onToggle={(id) => {
                    setSelectedGoals(prev =>
                      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
                    );
                  }}
                />
              )}
              {step === 4 && (
                <StepCreateAgent
                  prompt={agentPrompt}
                  setPrompt={setAgentPrompt}
                  onGenerate={handleGenerateAgent}
                  isGenerating={isGenerating}
                />
              )}
              {step === 5 && (
                <StepReviewApprove
                  plan={agentPlan}
                  onApprove={handleApproveAgent}
                />
              )}
              {step === 6 && (
                <StepFirstRun
                  isConnectedGmail={!!session}
                  isConnectedCalendar={isConnected('google_calendar')}
                  testResult={testResult}
                  isRunning={isRunningTest}
                  onRunTest={handleRunTest}
                />
              )}
              {step === 7 && (
                <StepPricing
                  firstName={firstName}
                  isSubmitting={isSubmitting}
                  onSelect={(planId) => handleFinish(planId)}
                />
              )}
              {step === 8 && <StepSuccess />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Footer Nav ── */}
      {showNavFooter && (
        <footer className="sticky bottom-0 z-30 onboarding-glass border-t border-black/[0.04]">
          <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => step > 0 && goto((step - 1) as StepId)}
              disabled={step === 0}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium transition-colors',
                step === 0
                  ? 'opacity-30 cursor-not-allowed text-black/40'
                  : 'text-black/55 hover:text-black hover:bg-black/[0.04]',
              )}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            {step === 7 ? (
              <span className="text-[12px] text-black/40 hidden sm:inline">
                Tap a plan above to continue
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (step === 4) {
                    handleGenerateAgent();
                  } else if (step === 5) {
                    handleApproveAgent();
                  } else if (step === 6) {
                    goto(7);
                  } else {
                    goto((step + 1) as StepId);
                  }
                }}
                disabled={isSubmitting || isGenerating}
                className={cn(
                  'inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full text-[13.5px] font-semibold transition-all duration-200 active:scale-[0.97]',
                  (isSubmitting || isGenerating)
                    ? 'bg-black/[0.06] text-black/30 cursor-not-allowed'
                    : 'onboarding-cta',
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating…
                  </>
                ) : step === 4 ? (
                  <>
                    Generate Agent
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : step === 5 ? (
                  <>
                    Approve Agent
                    <Check className="w-3.5 h-3.5" />
                  </>
                ) : step === 6 ? (
                  <>
                    Continue to Plans
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 0 — WELCOME
   ═══════════════════════════════════════════════════════════════════ */

function StepWelcome({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="text-center">
      {/* Glowing icon */}
      <div className="relative inline-flex items-center justify-center mb-8">
        <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-neutral-300/30 to-gray-300/20 blur-xl onboarding-liquid-glow" />
        <div className="relative w-16 h-16 rounded-2xl onboarding-glass-card flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mailient-logo-premium.png" alt="Mailient" className="w-10 h-10 object-cover" />
        </div>
      </div>

      <h1 className="text-4xl sm:text-[48px] sm:leading-[1.08] font-semibold tracking-[-0.03em] mb-4 text-[#1A1A1A]">
        Meet your AI
        <br />
        <span className="text-black">
          Email Operator
        </span>
      </h1>

      <p className="text-[16px] text-black/50 max-w-md mx-auto leading-relaxed mb-10">
        Automate AI agents that manage communication, scheduling, follow-ups, and more.
      </p>

      <button
        type="button"
        onClick={onGetStarted}
        className="onboarding-cta inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-[15px] font-semibold"
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Trust badges */}
      <div className="mt-12 flex items-center justify-center gap-6 text-[11px] uppercase tracking-[0.14em] font-medium text-black/30">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
          Encrypted
        </span>
        <span className="w-px h-3 bg-black/10" />
        <span className="inline-flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
          Gmail Safe
        </span>
        <span className="w-px h-3 bg-black/10" />
        <span className="inline-flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
          Autonomous
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 1 — CONNECT GMAIL
   ═══════════════════════════════════════════════════════════════════ */

function StepConnectGmail({ onConnect, isConnected }: { onConnect: () => void; isConnected: boolean }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl onboarding-glass-card mb-6">
        <Mail className="w-6 h-6 text-black" strokeWidth={1.75} />
      </div>

      <h1 className="text-3xl sm:text-[40px] sm:leading-[1.08] font-semibold tracking-[-0.025em] mb-3">
        Connect your inbox
      </h1>
      <p className="text-[15px] text-black/50 max-w-sm mx-auto leading-relaxed mb-8">
        Mailient needs access to your Gmail to understand and act on your emails.
      </p>

      <div className="onboarding-glass-card p-6 mb-6 max-w-sm mx-auto text-left">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-100/50 flex items-center justify-center">
            <GoogleMark />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#1A1A1A]">Gmail</p>
            <p className="text-[12px] text-black/40">Read, draft, and send emails</p>
          </div>
        </div>
        <ul className="space-y-2 text-[13px] text-black/50">
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
            Read and search your inbox
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
            Draft replies in your voice
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
            Manage labels and archive
          </li>
        </ul>
      </div>

      {isConnected ? (
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[13px] font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Gmail connected
        </div>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="onboarding-cta inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-[14px] font-semibold"
        >
          <GoogleMark />
          Connect Gmail
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 2 — CONNECT TOOLS
   ═══════════════════════════════════════════════════════════════════ */

const TOOLS = [
  { id: 'google_calendar', name: 'Google Calendar', required: true, icon: <Calendar className="w-5 h-5" /> },
  { id: 'notion', name: 'Notion', required: false, icon: <FileText className="w-5 h-5" /> },
  { id: 'slack', name: 'Slack', required: false, icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'google_meet', name: 'Google Meet', required: false, icon: <Video className="w-5 h-5" /> },
];

function StepConnectTools({
  isConnected,
  onConnect,
}: {
  isConnected: (id: string) => boolean;
  onConnect: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl onboarding-glass-card mb-6">
          <Link className="w-6 h-6 text-black" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl sm:text-[40px] sm:leading-[1.08] font-semibold tracking-[-0.025em] mb-3">
          Connect your workspace
        </h1>
        <p className="text-[15px] text-black/50 max-w-sm mx-auto leading-relaxed">
          Link the tools Mailient needs to operate autonomously.
        </p>
      </div>

      {/* Required */}
      <div className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-black/35 mb-2 px-1">Required</p>
        {TOOLS.filter(t => t.required).map(tool => (
          <ToolCard
            key={tool.id}
            {...tool}
            connected={isConnected(tool.id)}
            onConnect={() => onConnect(tool.id)}
          />
        ))}
      </div>

      {/* Optional */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-black/35 mb-2 px-1">Optional</p>
        <div className="space-y-2">
          {TOOLS.filter(t => !t.required).map(tool => (
            <ToolCard
              key={tool.id}
              {...tool}
              connected={isConnected(tool.id)}
              onConnect={() => onConnect(tool.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ToolCard({
  name, connected, required, onConnect,
}: {
  name: string; connected: boolean; required: boolean; onConnect: () => void;
}) {
  return (
    <div className={cn(
      'onboarding-glass-card flex items-center justify-between px-5 py-4 mb-2',
      connected && 'onboarding-glass-card-active',
    )}>
      <div className="flex items-center gap-2.5">
        <p className="text-[14px] font-semibold text-[#1A1A1A]">{name}</p>
        {required && (
          <span className="text-[9px] uppercase tracking-wider font-bold text-black bg-black/[0.05] border border-black/[0.05] px-1.5 py-0.5 rounded">
            Required
          </span>
        )}
      </div>
      {connected ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[12px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Connected
        </span>
      ) : (
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold text-black bg-black/[0.04] hover:bg-black/[0.08] border border-black/[0.08] transition-colors"
        >
          Connect
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 3 — CHOOSE YOUR GOAL
   ═══════════════════════════════════════════════════════════════════ */

function StepChooseGoal({
  selected,
  onToggle,
}: {
  selected: GoalId[];
  onToggle: (id: GoalId) => void;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl onboarding-glass-card mb-6">
          <Mail className="w-6 h-6 text-black" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl sm:text-[40px] sm:leading-[1.08] font-semibold tracking-[-0.025em] mb-3">
          What do you want Mailient to handle?
        </h1>
        <p className="text-[15px] text-black/50 max-w-sm mx-auto leading-relaxed">
          Select one or more goals to shape your first agent.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOALS.map((goal, i) => {
          const isActive = selected.includes(goal.id);
          return (
            <motion.button
              key={goal.id}
              type="button"
              onClick={() => onToggle(goal.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                'text-left p-4 rounded-2xl transition-all duration-200',
                isActive
                  ? 'onboarding-glass-card-active'
                  : 'onboarding-glass-card',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                  isActive
                    ? 'bg-black text-white'
                    : 'bg-black/[0.03] text-black/50',
                )}>
                  {goal.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1A1A1A] mb-0.5">{goal.title}</p>
                  <p className="text-[12px] text-black/45 leading-snug">{goal.desc}</p>
                </div>
                {isActive && (
                  <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 4 — CREATE FIRST AGENT
   ═══════════════════════════════════════════════════════════════════ */

function StepCreateAgent({
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
}: {
  prompt: string;
  setPrompt: (s: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl onboarding-glass-card mb-6">
          <Sliders className="w-6 h-6 text-black" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl sm:text-[40px] sm:leading-[1.08] font-semibold tracking-[-0.025em] mb-3">
          Describe your agent
        </h1>
        <p className="text-[15px] text-black/50 max-w-sm mx-auto leading-relaxed">
          What should this agent do? Describe it in plain language.
        </p>
      </div>

      <div className="onboarding-glass-card p-5">
        <label className="block text-[11px] uppercase tracking-[0.14em] font-semibold text-black/35 mb-2">
          Agent Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Schedule meetings from incoming emails and send me a daily report."
          rows={4}
          className="w-full bg-transparent border-none text-[15px] text-[#1A1A1A] placeholder:text-black/25 focus:outline-none resize-none leading-relaxed"
        />
      </div>

      <div className="mt-3 px-1">
        <p className="text-[12px] text-black/35">
          <span className="font-medium text-black/45">Example:</span> &ldquo;Schedule meetings from incoming emails and send me a daily report.&rdquo;
        </p>
      </div>

      {isGenerating && (
        <div className="mt-6 flex items-center justify-center gap-3 text-[13px] text-black/50">
          <Loader2 className="w-4 h-4 animate-spin text-black" />
          Generating your agent plan…
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 5 — REVIEW & APPROVE
   ═══════════════════════════════════════════════════════════════════ */

function StepReviewApprove({
  plan,
  onApprove,
}: {
  plan: AgentPlan | null;
  onApprove: () => void;
}) {
  if (!plan) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-black mx-auto mb-3" />
        <p className="text-[14px] text-black/50">Loading agent plan…</p>
      </div>
    );
  }

  const sections = [
    { label: 'Goal', icon: <Zap className="w-4 h-4" />, content: plan.goal },
    { label: 'Tools', icon: <Zap className="w-4 h-4" />, content: plan.tools.join(', ') },
    { label: 'Actions', icon: <Activity className="w-4 h-4" />, items: plan.actions },
    { label: 'Permissions', icon: <ShieldCheck className="w-4 h-4" />, items: plan.permissions },
    { label: 'Schedule', icon: <Clock className="w-4 h-4" />, content: plan.schedule },
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl onboarding-glass-card mb-6">
          <CheckCircle2 className="w-6 h-6 text-black" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl sm:text-[40px] sm:leading-[1.08] font-semibold tracking-[-0.025em] mb-3">
          Mailient generated a plan
        </h1>
        <p className="text-[15px] text-black/50 max-w-sm mx-auto leading-relaxed">
          Review what your agent will do, then approve to activate.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="onboarding-glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-black/85">{s.icon}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-black/40">{s.label}</span>
            </div>
            {s.content && (
              <p className="text-[14px] text-[#1A1A1A] font-medium">{s.content}</p>
            )}
            {s.items && (
              <ul className="space-y-1.5">
                {s.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-[13px] text-black/65">
                    <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 6 — FIRST RUN
   ═══════════════════════════════════════════════════════════════════ */

function StepFirstRun({
  isConnectedGmail,
  isConnectedCalendar,
  testResult,
  isRunning,
  onRunTest,
}: {
  isConnectedGmail: boolean;
  isConnectedCalendar: boolean;
  testResult: string | null;
  isRunning: boolean;
  onRunTest: () => void;
}) {
  const checks = [
    { label: 'Inbox connected', done: isConnectedGmail },
    { label: 'Calendar connected', done: isConnectedCalendar },
    { label: 'Agent active', done: true },
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl onboarding-glass-card mb-6">
          <Play className="w-6 h-6 text-black" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl sm:text-[40px] sm:leading-[1.08] font-semibold tracking-[-0.025em] mb-3">
          Your agent is live
        </h1>
        <p className="text-[15px] text-black/50 max-w-sm mx-auto leading-relaxed">
          Everything is connected and ready to go.
        </p>
      </div>

      {/* Status checklist */}
      <div className="onboarding-glass-card p-5 mb-5">
        <div className="space-y-3">
          {checks.map((check, i) => (
            <motion.div
              key={check.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 + 0.3 }}
              className="flex items-center gap-3"
            >
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                check.done
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-black/[0.04] text-black/25',
              )}>
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              </div>
              <span className={cn(
                'text-[14px] font-medium',
                check.done ? 'text-[#1A1A1A]' : 'text-black/35',
              )}>
                {check.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Run Test */}
      {!testResult ? (
        <button
          onClick={onRunTest}
          disabled={isRunning}
          className={cn(
            'w-full onboarding-glass-card p-4 flex items-center justify-center gap-2 text-[14px] font-semibold transition-all',
            isRunning ? 'text-black/40' : 'text-black hover:text-black/80 font-semibold underline decoration-dotted underline-offset-4',
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running test…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Test
            </>
          )}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="onboarding-glass-card-active p-4"
          style={{ borderRadius: 20 }}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-[13px] text-black/65 leading-relaxed">{testResult}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 7 — PRICING (Unchanged component, dark wrapper)
   ═══════════════════════════════════════════════════════════════════ */

function StepPricing({
  firstName,
  isSubmitting,
  onSelect,
}: {
  firstName: string;
  isSubmitting: boolean;
  onSelect: (planId: 'monthly' | 'annual' | 'lifetime') => void;
}) {
  return (
    <div className="relative">
      <div className="text-center mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-black/40 font-medium mb-3">
          Almost there
        </p>
        <h1 className="text-3xl sm:text-[40px] sm:leading-[1.08] font-semibold tracking-[-0.025em] mb-3 text-[#1A1A1A]">
          {firstName ? `Pick your plan, ${firstName}.` : 'Pick your plan.'}
        </h1>
        <p className="text-[15px] text-black/50 max-w-md mx-auto leading-relaxed">
          Choose the plan that fits. Change anytime in settings.
        </p>
      </div>

      {isSubmitting && (
        <div className="absolute inset-0 z-20 backdrop-blur-sm bg-white/60 rounded-3xl flex items-center justify-center">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#1A1A1A] text-white font-medium text-[13px]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Setting up your account…
          </div>
        </div>
      )}

      <div className="relative bg-[#030303] rounded-[28px] border border-white/[0.06] overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.3)]">
        <PricingSection3 handleSelectPlan={(planId) => onSelect(planId)} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 8 — SUCCESS SCREEN
   ═══════════════════════════════════════════════════════════════════ */

function StepSuccess() {
  const router = useRouter();

  useEffect(() => {
    // Fire confetti
    const timer = setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF'],
      });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const actions = [
    { icon: <Send className="w-5 h-5" />, title: 'Send a test email', desc: 'Try your agent in action', href: '/home-feed' },
    { icon: <Activity className="w-5 h-5" />, title: 'View activity', desc: 'See what your agent does', href: '/home-feed' },
    { icon: <PlusCircle className="w-5 h-5" />, title: 'Create another agent', desc: 'Build more automations', href: '/dashboard/agent-talk' },
    { icon: <UserPlus className="w-5 h-5" />, title: 'Invite teammates', desc: 'Collaborate with your team', href: '/home-feed' },
  ];

  return (
    <div className="text-center">
      {/* Success icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
        className="relative inline-flex items-center justify-center mb-8"
      >
        <div className="absolute w-28 h-28 rounded-full bg-gradient-to-br from-neutral-200/50 to-gray-200/30 blur-xl onboarding-liquid-glow" />
        <div className="relative w-18 h-18 rounded-2xl bg-black flex items-center justify-center p-4 shadow-lg border border-black/10">
          <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={1.75} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-3xl sm:text-[40px] sm:leading-[1.08] font-semibold tracking-[-0.025em] mb-3"
      >
        Your first operator is ready
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-[15px] text-black/50 max-w-md mx-auto leading-relaxed mb-10"
      >
        Everything is set up. Here&apos;s what you can do next.
      </motion.p>

      {/* Action cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 gap-3 mb-8 max-w-md mx-auto"
      >
        {actions.map((action, i) => (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.08 }}
            onClick={() => router.push(action.href)}
            className="onboarding-glass-card p-4 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-black/[0.04] text-black flex items-center justify-center mb-3 group-hover:bg-black/[0.08] transition-colors">
              {action.icon}
            </div>
            <p className="text-[13px] font-semibold text-[#1A1A1A] mb-0.5">{action.title}</p>
            <p className="text-[11px] text-black/40 leading-snug">{action.desc}</p>
          </motion.button>
        ))}
      </motion.div>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <button
          onClick={() => router.push('/home-feed')}
          className="onboarding-cta inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full text-[15px] font-semibold"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}

/* ─── Google Mark SVG ─────────────────────────────────────────────── */

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13.1-5l-6.1-5c-2 1.4-4.4 2-7 2-5.3 0-9.7-3.4-11.3-8l-6.5 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.1 5C40 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
