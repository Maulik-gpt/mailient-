'use client';

/**
 * Mailient onboarding — a 15-screen handoff built on a liquid-glass material
 * system. Light, monochrome, calm. Every connection, scan, voice profile,
 * agent, plan, and preference writes to the SAME data model the rest of the app
 * reads from — there is no throwaway "onboarding state". Progress persists
 * server-side per step so a refresh or another device resumes exactly here.
 *
 * Hero screens (the ones that carry the experience) are fully crafted and wired:
 *   1 Welcome · 2 Connect Gmail · 4 First Scan · 9 Arcus · 15 You're all set
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, Loader2, Lock,
  Mail, Calendar, FileText, MessageSquare, Clock,
  Sparkles, PenLine, ChevronRight, Inbox, Activity, Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ─────────────────────────────────────────────────────────────────────────
   Types & constants
   ───────────────────────────────────────────────────────────────────────── */

const FIRST = 1;
const LAST = 15;
type Step = number; // 1..15

const POLAR_CHECKOUT_URLS: Record<'monthly' | 'annual', string> = {
  monthly: 'https://buy.polar.sh/polar_cl_BmoCj2jm6Hxy2Pc4DI6y717wsENNDAniGPfsB1pMO61',
  annual:  'https://buy.polar.sh/polar_cl_ojXGgACq5GNMsUInVP3HX5vpXepohT5P8m7SL2RcCej',
};

interface ScanResult {
  windowDays: number;
  received: number;
  needsReply: number;
  repetitive: number;
  hoursPerWeek: number;
}

interface AgentSpec {
  name: string;
  summary: string;
  task_description: string;
  cron_schedule: string;
  scheduleLabel: string;
  output_channel: 'gmail' | 'slack' | 'both';
  required_integrations: string[];
  steps: string[];
}

interface CreatedAgent { id: string; name: string; scheduleLabel: string; nextRun?: string }

/* ─────────────────────────────────────────────────────────────────────────
   Utilities
   ───────────────────────────────────────────────────────────────────────── */

function slugifyHandle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24);
}

function timeToCron(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const hh = Number.isFinite(h) ? h : 7;
  const mm = Number.isFinite(m) ? m : 0;
  return `${mm} ${hh} * * *`;
}

function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/* ─────────────────────────────────────────────────────────────────────────
   Controller
   ───────────────────────────────────────────────────────────────────────── */

export default function SiftOnboardingPage() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const reduce = useReducedMotion();

  const urlStep = Number(searchParams?.get('step') || FIRST);
  const [step, setStep] = useState<Step>(urlStep >= FIRST && urlStep <= LAST ? urlStep : FIRST);

  const firstName = useMemo(() => {
    const raw = session?.user?.name?.trim();
    if (raw) return raw.split(/\s+/)[0];
    const local = session?.user?.email?.split('@')[0] || '';
    const first = local.split(/[._\-+]/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
  }, [session]);

  // ── Shared onboarding state (mirrors what gets persisted) ──
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [voiceDone, setVoiceDone] = useState(false);
  const [agentSpec, setAgentSpec] = useState<AgentSpec | null>(null);
  const [createdAgent, setCreatedAgent] = useState<CreatedAgent | null>(null);
  const [planChoice, setPlanChoice] = useState<'monthly' | 'annual' | null>(null);
  const [briefTime, setBriefTime] = useState('07:00');
  const [briefChannel, setBriefChannel] = useState<'gmail' | 'slack' | 'both'>('gmail');

  // ── Integration status ──
  const [integrations, setIntegrations] = useState<any[]>([]);
  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations/status');
      if (res.ok) {
        const d = await res.json();
        setIntegrations(Array.isArray(d.integrations) ? d.integrations : []);
      }
    } catch { /* silent */ }
  }, []);
  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const isConnected = useCallback((provider: string) => {
    if (provider === 'gmail') return !!session || integrations.some((s: any) => s.provider === 'gmail' && s.connected);
    return integrations.some((s: any) => s.provider === provider && s.connected);
  }, [integrations, session]);

  // ── Resume from server on mount ──
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    (async () => {
      try {
        const res = await fetch('/api/onboarding/state');
        if (!res.ok) return;
        const d = await res.json();
        const st = d?.state || {};
        if (st.scan) setScan(st.scan);
        if (st.voiceDone) setVoiceDone(true);
        if (st.agent) setCreatedAgent(st.agent);
        if (st.agentSpec) setAgentSpec(st.agentSpec);
        if (st.plan) setPlanChoice(st.plan);
        if (st.briefTime) setBriefTime(st.briefTime);
        if (st.briefChannel) setBriefChannel(st.briefChannel);
        // Only honor server step if the URL didn't pin one explicitly.
        if (!searchParams?.get('step') && typeof d.step === 'number' && d.step >= FIRST && d.step <= LAST) {
          setStep(d.step);
        }
      } catch { /* non-fatal */ }
    })();
  }, [searchParams]);

  // ── Commit step + patch to server (per-step persistence) ──
  const commit = useCallback((next: Step, patch?: Record<string, unknown>) => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    params.set('step', String(next));
    window.history.replaceState(null, '', `?${params.toString()}`);
    fetch('/api/onboarding/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: next, patch }),
    }).catch(() => {});
  }, [searchParams]);

  const go = useCallback((next: Step, patch?: Record<string, unknown>) => {
    setStep(next);
    commit(next, patch);
    if (next === 3 || next === 10 || next === 11) fetchIntegrations();
  }, [commit, fetchIntegrations]);

  const next = useCallback((patch?: Record<string, unknown>) => go(Math.min(LAST, step + 1), patch), [go, step]);
  const back = useCallback(() => go(Math.max(FIRST, step - 1)), [go, step]);

  // ── In-flow popup OAuth (keeps the user inside onboarding) ──
  const connectViaPopup = useCallback((connectorId: string): Promise<boolean> => {
    return new Promise(async (resolve) => {
      try {
        const res = await fetch('/api/connectors/oauth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectorId, redirectUri: `${window.location.origin}/api/connectors/callback` }),
        });
        if (!res.ok) throw new Error('start failed');
        const { oauthUrl } = await res.json();
        const w = 500, h = 640;
        const popup = window.open(
          oauthUrl, 'Connect',
          `width=${w},height=${h},left=${window.screenX + (window.outerWidth - w) / 2},top=${window.screenY + (window.outerHeight - h) / 2}`,
        );
        if (!popup) { toast.error('Allow popups for this site, then try again.'); return resolve(false); }
        const poll = setInterval(async () => {
          if (popup.closed) {
            clearInterval(poll);
            await fetchIntegrations();
            try {
              const r = await fetch('/api/integrations/status');
              const j = r.ok ? await r.json() : { integrations: [] };
              const ok = (j.integrations || []).some((i: any) => (i.provider === connectorId || i.provider === providerAlias(connectorId)) && i.connected);
              resolve(ok);
            } catch { resolve(false); }
          }
        }, 700);
      } catch {
        toast.error("That connection didn't start. Try again in a moment.");
        resolve(false);
      }
    });
  }, [fetchIntegrations]);

  // ── Complete onboarding (writes the durable record) ──
  const completeOnboarding = useCallback(async () => {
    const username = slugifyHandle(session?.user?.email?.split('@')[0] || firstName || 'mailient_user');
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          profileName: session?.user?.name || firstName,
          avatarUrl: session?.user?.image || null,
          plan: planChoice,
          agentConfig: agentSpec ? { ...agentSpec, agentId: createdAgent?.id || null } : null,
        }),
      });
      localStorage.setItem('onboarding_completed', 'true');
    } catch { /* the durable bits already persisted per-step */ }
  }, [session, firstName, planChoice, agentSpec, createdAgent]);

  // ── Cross-fade transition (functional motion only) ──
  const fade = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.16, ease: [0.16, 1, 0.3, 1] as const },
      };

  const showChrome = step >= 2; // Welcome is full-bleed

  return (
    <div className="lg-stage min-h-screen text-[#0A0A0A] font-sans flex flex-col relative overflow-hidden">
      {/* Grayscale blobs behind the glass */}
      <div className="lg-blobs" aria-hidden="true">
        <div className="lg-blob lg-blob-a" />
        <div className="lg-blob lg-blob-b" />
        <div className="lg-blob lg-blob-c" />
      </div>

      {showChrome && (
        <header className="sticky top-0 z-30 px-5 pt-4 pb-2">
          <div className="max-w-xl mx-auto flex items-center gap-4">
            <span className="text-[13px] font-medium tracking-tight text-[#0A0A0A]/80 shrink-0">Mailient</span>
            <ProgressCapsule step={step} />
          </div>
        </header>
      )}

      <main className="flex-1 flex items-center justify-center px-5 py-8 relative z-10">
        <div className={cn('w-full', step === 13 ? 'max-w-4xl' : 'max-w-xl')}>
          <AnimatePresence mode="wait">
            <motion.div key={step} {...fade}>
              {step === 1  && <S1Welcome onBegin={() => go(2)} />}
              {step === 2  && <S2Gmail isConnected={isConnected('gmail')} onConnect={() => signIn('google', { callbackUrl: `${window.location.pathname}?step=2`, redirect: true })} onContinue={() => next()} />}
              {step === 3  && <S3Calendar connected={isConnected('gcal') || isConnected('google_calendar')} onConnect={() => connectViaPopup('gcal')} onContinue={() => next()} onSkip={() => next()} />}
              {step === 4  && <S4Scan scan={scan} setScan={setScan} onDone={(s) => next({ scan: s })} reduce={!!reduce} />}
              {step === 5  && <S5ScanResults scan={scan} onContinue={() => next()} />}
              {step === 6  && <S6BuildVoice done={voiceDone} setDone={setVoiceDone} onDone={() => next({ voiceDone: true })} />}
              {step === 7  && <S7VoicePreview onContinue={() => next()} />}
              {step === 8  && <S8MeetArcus onContinue={() => next()} />}
              {step === 9  && <S9Arcus scan={scan} firstName={firstName} onContinue={() => next()} reduce={!!reduce} />}
              {step === 10 && <S10Notion connected={isConnected('notion')} onConnect={() => connectViaPopup('notion')} onContinue={() => next()} onSkip={() => next()} />}
              {step === 11 && <S11Slack connected={isConnected('slack')} onConnect={() => connectViaPopup('slack')} onContinue={() => next()} onSkip={() => next()} />}
              {step === 12 && <S12Agent spec={agentSpec} setSpec={setAgentSpec} created={createdAgent} setCreated={setCreatedAgent} onContinue={(c) => next(c ? { agent: c, agentSpec } : undefined)} onSkip={() => next()} />}
              {step === 13 && <S13Plan firstName={firstName} plan={planChoice} onChoose={(p) => { setPlanChoice(p); next({ plan: p }); }} />}
              {step === 14 && <S14Notifications time={briefTime} setTime={setBriefTime} channel={briefChannel} setChannel={setBriefChannel} hasSlack={isConnected('slack')} agentId={createdAgent?.id || null} onContinue={() => next({ briefTime, briefChannel })} />}
              {step === 15 && <S15Done firstName={firstName} agent={createdAgent} scan={scan} briefTime={briefTime} briefChannel={briefChannel} plan={planChoice} onFinish={completeOnboarding} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Quiet back affordance — never on Welcome or the terminal screen */}
      {step > 2 && step < 15 && (
        <footer className="sticky bottom-0 z-30 px-5 pb-5 pt-2">
          <div className="max-w-xl mx-auto">
            <button
              type="button"
              onClick={back}
              className="lg-focus inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium text-[#0A0A0A]/45 hover:text-[#0A0A0A]/80 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

function providerAlias(connectorId: string): string {
  if (connectorId === 'gcal') return 'google_calendar';
  return connectorId;
}

/* ─────────────────────────────────────────────────────────────────────────
   Progress capsule — the signature liquid-glass element
   ───────────────────────────────────────────────────────────────────────── */

function ProgressCapsule({ step }: { step: Step }) {
  // Segments represent steps 2..15 (Welcome has no progress yet).
  const segs = LAST - 1; // 14
  return (
    <div className="lg-capsule flex-1" role="progressbar" aria-valuemin={FIRST} aria-valuemax={LAST} aria-valuenow={step} aria-label="Setup progress">
      {Array.from({ length: segs }, (_, i) => {
        const segStep = i + 2;
        const filled = segStep <= step;
        return (
          <div key={i} className="lg-capsule-seg flex-1">
            <div className="lg-capsule-fill" style={{ width: filled ? '100%' : '0%' }} />
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Shared bits
   ───────────────────────────────────────────────────────────────────────── */

function Display({ children, className }: { children: React.ReactNode; className?: string }) {
  // Light-weight display headline (Satoshi 400–500). Sentence case enforced by copy.
  return (
    <h1 className={cn('font-medium tracking-[-0.03em] text-[#0A0A0A] leading-[1.08]', className)}>
      {children}
    </h1>
  );
}

function Body({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-[#0A0A0A]/55 leading-relaxed', className)}>{children}</p>;
}

function PrimaryButton({ children, onClick, disabled, type = 'button', className }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn('lg-cta lg-focus inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[14.5px] font-medium', className)}
    >
      {children}
    </button>
  );
}

function SkipLink({ onClick, children = 'Skip for now' }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lg-focus text-[13.5px] font-medium text-[#0A0A0A]/45 hover:text-[#0A0A0A]/80 transition-colors rounded-full px-2 py-1"
    >
      {children}
    </button>
  );
}

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('lg-card p-7 md:p-9', className)}>{children}</div>;
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl lg-pane mb-6">
      {children}
    </div>
  );
}

function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13.1-5l-6.1-5c-2 1.4-4.4 2-7 2-5.3 0-9.7-3.4-11.3-8l-6.5 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.1 5C40 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

/* ═══════════════════════════ 1 · WELCOME ═══════════════════════════ */

function S1Welcome({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="text-center px-2">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="inline-block mb-10">
        <div className="w-16 h-16 rounded-[20px] lg-card flex items-center justify-center overflow-hidden mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mailient-logo-premium.png" alt="Mailient" className="w-9 h-9 object-cover" />
        </div>
      </motion.div>

      <Display className="text-[34px] sm:text-[48px] sm:leading-[1.05] mb-5">
        Your inbox is about to
        <br className="hidden sm:block" /> get an employee.
      </Display>

      <Body className="text-[16px] max-w-md mx-auto mb-10">
        Mailient handles your communication while you sleep. Let’s set it up — it takes about 3 minutes.
      </Body>

      <PrimaryButton onClick={onBegin} className="px-8 py-3.5 text-[15px]">
        Begin <ArrowRight className="w-4 h-4" />
      </PrimaryButton>
    </div>
  );
}

/* ═══════════════════════════ 2 · CONNECT GMAIL (required) ═══════════════════════════ */

function S2Gmail({ isConnected, onConnect, onContinue }: { isConnected: boolean; onConnect: () => void; onContinue: () => void }) {
  return (
    <div className="text-center">
      <IconBadge><Mail className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
      <Display className="text-[28px] sm:text-[34px] mb-3">Connect your inbox</Display>
      <Body className="text-[15px] max-w-sm mx-auto mb-7">
        Mailient reads and drafts from your inbox. This is the one connection it can’t work without.
      </Body>

      <GlassCard className="text-left max-w-sm mx-auto mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white border border-black/[0.06] flex items-center justify-center"><GoogleMark /></div>
          <div>
            <p className="text-[14px] font-medium text-[#0A0A0A]">Gmail</p>
            <p className="text-[12.5px] text-[#0A0A0A]/50">Read and draft access</p>
          </div>
          {isConnected && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#0A0A0A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" /> Connected
            </span>
          )}
        </div>
        <div className="flex items-start gap-2 text-[12.5px] text-[#0A0A0A]/55 leading-relaxed">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#0A0A0A]/45" strokeWidth={2} />
          Read and draft access. Revoke anytime. Your emails never train anything.
        </div>
      </GlassCard>

      {isConnected ? (
        <PrimaryButton onClick={onContinue}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <PrimaryButton onClick={onConnect}><GoogleMark /> Connect Gmail</PrimaryButton>
          <span className="text-[12px] text-[#0A0A0A]/35">Continue unlocks once Gmail is connected.</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 3 · CONNECT CALENDAR (skippable) ═══════════════════════════ */

function S3Calendar({ connected, onConnect, onContinue, onSkip }: { connected: boolean; onConnect: () => Promise<boolean>; onContinue: () => void; onSkip: () => void }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => { setBusy(true); const ok = await onConnect(); setBusy(false); if (ok) onContinue(); };
  return (
    <div className="text-center">
      <IconBadge><Calendar className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
      <Display className="text-[28px] sm:text-[34px] mb-3">Add your calendar</Display>
      <Body className="text-[15px] max-w-sm mx-auto mb-8">
        So Mailient can book meetings without double-booking you.
      </Body>
      {connected ? (
        <PrimaryButton onClick={onContinue}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <PrimaryButton onClick={handle} disabled={busy}>
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</> : <><GoogleMark /> Connect Google Calendar</>}
          </PrimaryButton>
          <SkipLink onClick={onSkip} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 4 · FIRST SCAN (real data, auto-advance) ═══════════════════════════ */

function S4Scan({ scan, setScan, onDone, reduce }: { scan: ScanResult | null; setScan: (s: ScanResult) => void; onDone: (s: ScanResult) => void; reduce: boolean }) {
  const [display, setDisplay] = useState(0);
  const [phase, setPhase] = useState<'reading' | 'settled' | 'error'>(scan ? 'settled' : 'reading');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (scan) { setDisplay(scan.received); setPhase('settled'); return; }
    (async () => {
      try {
        const res = await fetch('/api/onboarding/scan', { method: 'POST' });
        const d = await res.json();
        if (!res.ok || !d.success) throw new Error(d?.error || 'scan failed');
        const result: ScanResult = {
          windowDays: d.windowDays, received: d.received, needsReply: d.needsReply,
          repetitive: d.repetitive, hoursPerWeek: d.hoursPerWeek,
        };
        setScan(result);
        // Count-up to the real number, then settle into the insight.
        if (reduce) {
          setDisplay(result.received); setPhase('settled');
        } else {
          const target = result.received;
          const t0 = performance.now();
          const dur = Math.min(2600, 900 + target);
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(tick);
            else setPhase('settled');
          };
          requestAnimationFrame(tick);
        }
      } catch {
        setPhase('error');
      }
    })();
  }, [scan, setScan, reduce]);

  // Auto-advance once settled (with a readable beat).
  useEffect(() => {
    if (phase !== 'settled' || !scan) return;
    const t = setTimeout(() => onDone(scan), reduce ? 600 : 2400);
    return () => clearTimeout(t);
  }, [phase, scan, onDone, reduce]);

  if (phase === 'error') {
    return (
      <div className="text-center">
        <IconBadge><Inbox className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
        <Display className="text-[26px] mb-3">The scan didn’t finish</Display>
        <Body className="text-[15px] max-w-sm mx-auto mb-7">It may have timed out. We can do this later — your inbox is safe.</Body>
        <PrimaryButton onClick={() => scan && onDone(scan)}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mb-7 flex items-center justify-center gap-2 text-[12.5px] font-medium text-[#0A0A0A]/45">
        {phase === 'reading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {phase === 'reading' ? 'Reading your inbox…' : 'Here’s what we found'}
      </div>

      <div className="tabular-nums font-medium tracking-[-0.04em] text-[#0A0A0A] text-[64px] sm:text-[88px] leading-none mb-3">
        {display.toLocaleString()}
      </div>

      <AnimatePresence mode="wait">
        {phase === 'reading' ? (
          <motion.p key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[14px] text-[#0A0A0A]/45">
            emails and counting…
          </motion.p>
        ) : (
          <motion.div key="s" initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Body className="text-[16px] max-w-sm mx-auto">
              You’ve gotten <span className="text-[#0A0A0A] font-medium">{scan?.received.toLocaleString()}</span> emails in the last{' '}
              {scan?.windowDays} days. About <span className="text-[#0A0A0A] font-medium">{scan?.needsReply.toLocaleString()}</span> needed a reply.
            </Body>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════ 5 · SCAN RESULTS ═══════════════════════════ */

function S5ScanResults({ scan, onContinue }: { scan: ScanResult | null; onContinue: () => void }) {
  const rows = [
    { label: 'Emails received', value: scan?.received, sub: `last ${scan?.windowDays ?? 30} days` },
    { label: 'Needed a reply', value: scan?.needsReply, sub: 'from real people' },
    { label: 'Repetitive / automated', value: scan?.repetitive, sub: 'newsletters, updates, promos' },
    { label: 'Hours a week', value: scan?.hoursPerWeek, sub: 'estimated, on email' },
  ];
  return (
    <div>
      <div className="text-center mb-7">
        <IconBadge><Activity className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
        <Display className="text-[26px] sm:text-[32px] mb-3">This is your month</Display>
        <Body className="text-[15px] max-w-sm mx-auto">This is what Mailient is going to take off your plate.</Body>
      </div>
      <GlassCard className="divide-y divide-black/[0.06] p-0">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-6 py-4">
            <div>
              <p className="text-[14px] font-medium text-[#0A0A0A]">{r.label}</p>
              <p className="text-[12px] text-[#0A0A0A]/45">{r.sub}</p>
            </div>
            <span className="tabular-nums text-[22px] font-medium tracking-tight text-[#0A0A0A]">
              {r.value != null ? r.value.toLocaleString() : '—'}
            </span>
          </div>
        ))}
      </GlassCard>
      <div className="text-center mt-7">
        <PrimaryButton onClick={onContinue}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>
      </div>
    </div>
  );
}

/* ═══════════════════════════ 6 · BUILD VOICE (real, auto-advance) ═══════════════════════════ */

function S6BuildVoice({ done, setDone, onDone }: { done: boolean; setDone: (b: boolean) => void; onDone: () => void }) {
  const [status, setStatus] = useState<'working' | 'done' | 'error'>(done ? 'done' : 'working');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (done) return;
    (async () => {
      try {
        const res = await fetch('/api/user/voice-profile', { method: 'POST' });
        if (!res.ok) throw new Error('voice failed');
        setDone(true); setStatus('done');
      } catch { setStatus('error'); }
    })();
  }, [done, setDone]);

  useEffect(() => {
    if (status !== 'done') return;
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [status, onDone]);

  return (
    <div className="text-center">
      <IconBadge><PenLine className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
      <Display className="text-[26px] sm:text-[32px] mb-3">Learning how you write</Display>
      <Body className="text-[15px] max-w-sm mx-auto mb-8">
        Mailient is reading your last 90 days of sent mail to learn your voice — not a generic AI tone.
      </Body>
      <div className="flex items-center justify-center gap-2.5 text-[13.5px] font-medium text-[#0A0A0A]/55">
        {status === 'working' && <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing your sent mail…</>}
        {status === 'done' && <><Check className="w-4 h-4" /> Voice profile ready</>}
        {status === 'error' && <span className="text-[#0A0A0A]/45">We’ll finish this later — continuing.</span>}
      </div>
      {status === 'error' && (
        <div className="mt-6"><PrimaryButton onClick={onDone}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton></div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 7 · VOICE PREVIEW ═══════════════════════════ */

interface ToneState { formality: number; detail: number; warmth: number; confidence: number }

function S7VoicePreview({ onContinue }: { onContinue: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tone, setTone] = useState<ToneState>({ formality: 50, detail: 40, warmth: 50, confidence: 30 });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/user/voice-profile');
        const d = await res.json();
        const p = d?.profile || null;
        setProfile(p);
        const t = p?.manual_settings?.tone;
        if (t) setTone({ formality: t.formality ?? 50, detail: t.detail ?? 40, warmth: t.warmth ?? 50, confidence: t.confidence ?? 30 });
      } catch { /* non-fatal */ } finally { setLoading(false); }
    })();
  }, []);

  const toneDesc = profile?.tone?.description;
  const toneLabel = typeof toneDesc === 'string' ? toneDesc : 'Direct, warm, low on filler';
  const signoff = profile?.closing_patterns?.[0] || profile?.sample_phrases?.[0] || 'Best,';
  const sample = profile?.sample_phrases?.find((s: string) => s?.length > 20)
    || 'Thanks for the nudge — that works on my end. I’ll send the doc over before end of day so you have time to review.';

  const saveTone = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/voice-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone }),
      });
      const d = await res.json();
      if (res.ok && d?.profile) setProfile(d.profile);
      setEditing(false);
    } catch {
      toast.error("Couldn't save those adjustments — try again.");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="text-center mb-7">
        <IconBadge><PenLine className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
        <Display className="text-[26px] sm:text-[32px] mb-3">This is how you sound</Display>
        <Body className="text-[15px] max-w-sm mx-auto">Mailient drafts in this voice. You can adjust it any time.</Body>
      </div>

      <GlassCard className="mb-5">
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#0A0A0A]/45"><Loader2 className="w-4 h-4 animate-spin" /> Loading your profile…</div>
        ) : editing ? (
          <div className="space-y-5">
            <ToneSlider label="Formality"  left="Casual"   right="Formal"     value={tone.formality}  onChange={(v) => setTone({ ...tone, formality: v })} />
            <ToneSlider label="Detail"     left="Brief"    right="Detailed"   value={tone.detail}     onChange={(v) => setTone({ ...tone, detail: v })} />
            <ToneSlider label="Warmth"     left="Warm"     right="Direct"     value={tone.warmth}     onChange={(v) => setTone({ ...tone, warmth: v })} />
            <ToneSlider label="Confidence" left="Reserved" right="Confident"  value={tone.confidence} onChange={(v) => setTone({ ...tone, confidence: v })} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-5">
              <Trait label="Tone" value={toneLabel} />
              <Trait label="Typical sign-off" value={signoff} />
              <Trait label="Reply length" value={profile?.structural_patterns?.avg_length || 'Short, a few lines'} />
              <Trait label="Formality" value={profile?.tone?.primary || 'Semi-formal'} />
            </div>
            <div className="pt-5 border-t border-black/[0.06]">
              <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#0A0A0A]/40 mb-2">A draft in your voice</p>
              <p className="text-[14px] text-[#0A0A0A]/80 leading-relaxed italic">“{sample}”</p>
            </div>
          </>
        )}
      </GlassCard>

      {editing ? (
        <div className="flex items-center justify-center gap-5">
          <PrimaryButton onClick={saveTone} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Save voice <Check className="w-4 h-4" /></>}
          </PrimaryButton>
          <SkipLink onClick={() => setEditing(false)}>Cancel</SkipLink>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-5">
          <PrimaryButton onClick={onContinue}>This is me <Check className="w-4 h-4" /></PrimaryButton>
          <SkipLink onClick={() => setEditing(true)}>Adjust</SkipLink>
        </div>
      )}
    </div>
  );
}

function ToneSlider({ label, left, right, value, onChange }: {
  label: string; left: string; right: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] font-medium text-[#0A0A0A]">{label}</span>
        <span className="text-[11px] tabular-nums text-[#0A0A0A]/35">{value}</span>
      </div>
      <input
        type="range" min={0} max={100} step={5} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="lg-focus w-full accent-[#0A0A0A] h-1.5 cursor-pointer"
      />
      <div className="flex items-center justify-between mt-1 text-[10.5px] text-[#0A0A0A]/40">
        <span>{left}</span><span>{right}</span>
      </div>
    </div>
  );
}

function Trait({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#0A0A0A]/40 mb-1">{label}</p>
      <p className="text-[14px] font-medium text-[#0A0A0A] capitalize">{value}</p>
    </div>
  );
}

/* ═══════════════════════════ 8 · MEET ARCUS ═══════════════════════════ */

function S8MeetArcus({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="text-center">
      <IconBadge><Cpu className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
      <Display className="text-[34px] sm:text-[44px] mb-5">Meet Arcus.</Display>
      <Body className="text-[16px] max-w-md mx-auto mb-9">
        Arcus is the operator that runs your inbox. It reads, decides, drafts, schedules, and reports —
        and shows you its reasoning every time, before anything is sent.
      </Body>
      <PrimaryButton onClick={onContinue}>See Arcus work <ArrowRight className="w-4 h-4" /></PrimaryButton>
    </div>
  );
}

/* ═══════════════════════════ 9 · ARCUS INTERACTION (real SSE → real drafts) ═══════════════════════════ */

interface Moment { kind: 'reason' | 'decision' | 'action' | 'final'; text: string }

function S9Arcus({ scan, firstName, onContinue, reduce }: { scan: ScanResult | null; firstName: string; onContinue: () => void; reduce: boolean }) {
  const count = Math.max(1, Math.min(3, scan?.needsReply ?? 3));
  const [phase, setPhase] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [moments, setMoments] = useState<Moment[]>([]);
  const [drafts, setDrafts] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [moments]);

  const push = (m: Moment) => setMoments((prev) => [...prev, m]);

  const run = async () => {
    setPhase('working'); setMoments([]); setDrafts(0);
    try {
      const res = await fetch('/api/arcus/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Find my ${count} oldest unread emails in the inbox that look like they need a reply, and draft a reply to each one in my voice. Save each as a Gmail draft — do NOT send anything.`,
          actionMode: 'auto',
        }),
      });
      if (!res.ok || !res.body) throw new Error('stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';
        for (const block of blocks) {
          const evLine = block.split('\n').find((l) => l.startsWith('event:'));
          const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
          if (!evLine || !dataLine) continue;
          const type = evLine.slice(6).trim();
          let data: any = {};
          try { data = JSON.parse(dataLine.slice(5).trim()); } catch { /* */ }
          handleEvent(type, data, (t) => { finalText = t; });
        }
      }
      if (finalText) push({ kind: 'final', text: finalText });
      setPhase('done');
    } catch {
      setPhase('error');
    }
  };

  const handleEvent = (type: string, data: any, setFinal: (t: string) => void) => {
    switch (type) {
      case 'thinking':
      case 'narrative': {
        const t = (data?.text || data?.message || '').toString().trim();
        if (t && t.length > 3) push({ kind: 'reason', text: clip(t) });
        break;
      }
      case 'tool_call': {
        const label = humanTool(data?.name || data?.tool || '');
        if (label) push({ kind: 'decision', text: label });
        break;
      }
      case 'tool_result': {
        const name = (data?.name || data?.tool || '').toString();
        if (/draft/i.test(name)) setDrafts((d) => d + 1);
        break;
      }
      case 'message': {
        const t = (data?.text || data?.content || '').toString().trim();
        if (t) setFinal(clip(t, 320));
        break;
      }
      default: break;
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <IconBadge><Cpu className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
        <Display className="text-[26px] sm:text-[32px] mb-3">Watch Arcus work</Display>
        <Body className="text-[15px] max-w-sm mx-auto">
          {phase === 'idle'
            ? <>Arcus will draft replies to your {count} oldest unanswered {count === 1 ? 'email' : 'emails'} — in your voice. Nothing sends.</>
            : <>Every decision, in the open{firstName ? `, ${firstName}` : ''}.</>}
        </Body>
      </div>

      {phase === 'idle' && (
        <div className="text-center">
          <GlassCard className="max-w-sm mx-auto mb-6 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl lg-pane flex items-center justify-center"><Inbox className="w-4 h-4 text-[#0A0A0A]" /></div>
              <div>
                <p className="text-[13.5px] font-medium text-[#0A0A0A]">Draft {count} {count === 1 ? 'reply' : 'replies'}</p>
                <p className="text-[12px] text-[#0A0A0A]/50">Your {count} oldest unanswered {count === 1 ? 'email' : 'emails'}</p>
              </div>
            </div>
          </GlassCard>
          <PrimaryButton onClick={run}>Watch Arcus work <ArrowRight className="w-4 h-4" /></PrimaryButton>
        </div>
      )}

      {(phase === 'working' || phase === 'done') && (
        <>
          <div ref={scroller} className="lg-card p-5 max-h-[300px] overflow-y-auto space-y-2.5">
            {moments.map((m, i) => (
              <motion.div
                key={i}
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-start gap-2.5"
              >
                <MomentDot kind={m.kind} />
                <p className={cn('text-[13.5px] leading-snug', m.kind === 'final' ? 'text-[#0A0A0A] font-medium' : 'text-[#0A0A0A]/70')}>
                  {m.text}
                </p>
              </motion.div>
            ))}
            {phase === 'working' && (
              <div className="flex items-center gap-2 text-[13px] text-[#0A0A0A]/40 pt-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> thinking…
              </div>
            )}
          </div>

          {phase === 'done' && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full lg-pane text-[13px] font-medium text-[#0A0A0A] mb-6">
                <Check className="w-3.5 h-3.5" />
                {drafts > 0 ? `${drafts} ${drafts === 1 ? 'draft' : 'drafts'} saved — nothing was sent.` : 'Saved as drafts — nothing was sent.'}
              </div>
              <div><PrimaryButton onClick={onContinue}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton></div>
            </div>
          )}
        </>
      )}

      {phase === 'error' && (
        <div className="text-center">
          <Body className="text-[14px] mb-5">Arcus couldn’t finish that run — it may have timed out. You can try this again from your dashboard.</Body>
          <PrimaryButton onClick={onContinue}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>
        </div>
      )}
    </div>
  );
}

function MomentDot({ kind }: { kind: Moment['kind'] }) {
  if (kind === 'final') return <Check className="w-3.5 h-3.5 mt-0.5 text-[#0A0A0A] shrink-0" strokeWidth={2.5} />;
  if (kind === 'decision') return <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[#0A0A0A]/60 shrink-0" strokeWidth={2.5} />;
  return <span className="w-1.5 h-1.5 rounded-full bg-[#0A0A0A]/25 mt-[6px] shrink-0" />;
}

function clip(s: string, n = 160): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

function humanTool(name: string): string {
  const map: Record<string, string> = {
    search_gmail: 'Searching your inbox',
    gmail_search: 'Searching your inbox',
    gmail_bulk_read_threads: 'Reading the threads',
    read_email: 'Reading the email',
    gmail_extract_data_from_threads: 'Pulling out what matters',
    gmail_draft_reply: 'Drafting a reply in your voice',
    gmail_batch_draft_replies: 'Drafting replies in your voice',
    create_draft: 'Saving the draft',
    get_voice_profile: 'Matching your writing voice',
    check_draft_quality: 'Checking the draft sounds like you',
  };
  if (map[name]) return map[name];
  if (/draft/i.test(name)) return 'Drafting a reply in your voice';
  if (/search|read/i.test(name)) return 'Reading your inbox';
  return '';
}

/* ═══════════════════════════ 10 · NOTION (skippable) ═══════════════════════════ */

function S10Notion({ connected, onConnect, onContinue, onSkip }: { connected: boolean; onConnect: () => Promise<boolean>; onContinue: () => void; onSkip: () => void }) {
  return (
    <ConnectScreen
      icon={<FileText className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} />}
      title="Connect Notion"
      subtitle="Mailient can log every contact, deal, and decision to Notion automatically."
      connected={connected} onConnect={onConnect} onContinue={onContinue} onSkip={onSkip}
    />
  );
}

/* ═══════════════════════════ 11 · SLACK (skippable) ═══════════════════════════ */

function S11Slack({ connected, onConnect, onContinue, onSkip }: { connected: boolean; onConnect: () => Promise<boolean>; onContinue: () => void; onSkip: () => void }) {
  return (
    <ConnectScreen
      icon={<MessageSquare className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} />}
      title="Connect Slack"
      subtitle="Get your morning briefing in Slack."
      connected={connected} onConnect={onConnect} onContinue={onContinue} onSkip={onSkip}
    />
  );
}

function ConnectScreen({ icon, title, subtitle, connected, onConnect, onContinue, onSkip }: {
  icon: React.ReactNode; title: string; subtitle: string;
  connected: boolean; onConnect: () => Promise<boolean>; onContinue: () => void; onSkip: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const handle = async () => { setBusy(true); const ok = await onConnect(); setBusy(false); if (ok) onContinue(); };
  return (
    <div className="text-center">
      <IconBadge>{icon}</IconBadge>
      <Display className="text-[28px] sm:text-[34px] mb-3">{title}</Display>
      <Body className="text-[15px] max-w-sm mx-auto mb-8">{subtitle}</Body>
      {connected ? (
        <PrimaryButton onClick={onContinue}>Continue <ArrowRight className="w-4 h-4" /></PrimaryButton>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <PrimaryButton onClick={handle} disabled={busy}>
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting…</> : <>Connect <ArrowRight className="w-4 h-4" /></>}
          </PrimaryButton>
          <SkipLink onClick={onSkip} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ 12 · FIRST AGENT (real create, skippable) ═══════════════════════════ */

const AGENT_TEMPLATES = [
  {
    id: 'morning_inbox_sweep', name: 'Morning Inbox Sweep', tagline: 'Wake up to a triaged inbox with drafts ready',
    schedule: 'Daily 7:00 AM', recommended: true,
    plan: ['Read the last 24h of unread email', 'Draft replies in your voice', 'Archive newsletters & promos', 'Log key conversations to Notion'],
  },
  {
    id: 'meeting_prep_concierge', name: 'Meeting Autopilot', tagline: 'A prep doc for every external meeting tomorrow',
    schedule: 'Daily 6:00 PM', recommended: false,
    plan: ['Scan tomorrow’s calendar', 'Pull recent emails with each attendee', 'Write a one-page prep doc', 'Add Meet links & buffers'],
  },
  {
    id: 'weekly_executive_brief', name: 'Weekly Digest', tagline: 'A real executive briefing every Friday',
    schedule: 'Friday 4:00 PM', recommended: false,
    plan: ['Aggregate the week’s email & meetings', 'Find revenue wins & client updates', 'Compose a structured briefing', 'Post to Slack & email it'],
  },
];

type AgentTemplate = (typeof AGENT_TEMPLATES)[number];
type Review =
  | { kind: 'template'; template: AgentTemplate }
  | { kind: 'custom'; spec: AgentSpec };

function S12Agent({ spec, setSpec, created, setCreated, onContinue, onSkip }: {
  spec: AgentSpec | null; setSpec: (s: AgentSpec | null) => void;
  created: CreatedAgent | null; setCreated: (c: CreatedAgent | null) => void;
  onContinue: (created: boolean) => void; onSkip: () => void;
}) {
  const [mode, setMode] = useState<'pick' | 'custom' | 'review'>('pick');
  const [review, setReview] = useState<Review | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [busy, setBusy] = useState(false);

  // Design the custom agent, then show its plan for approval (don't create yet).
  const designCustom = async () => {
    if (!customPrompt.trim()) return;
    setBusy(true);
    try {
      const g = await fetch('/api/onboarding/generate-agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customPrompt }),
      });
      const gd = await g.json();
      if (!gd.success || !gd.agent) throw new Error('design failed');
      setSpec(gd.agent);
      setReview({ kind: 'custom', spec: gd.agent });
      setMode('review');
    } catch {
      toast.error("Couldn't design that agent right now — try rephrasing, or do it later.");
    } finally { setBusy(false); }
  };

  // Approve → actually create the real arcus_agents row.
  const approve = async () => {
    if (!review) return;
    setBusy(true);
    try {
      let agent: any;
      if (review.kind === 'template') {
        const res = await fetch('/api/arcus/agents/templates', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: review.template.id }),
        });
        const d = await res.json();
        if (!res.ok || !d.agent?.id) throw new Error(d?.error || 'failed');
        agent = d.agent;
      } else {
        const s = review.spec;
        const res = await fetch('/api/arcus/agents/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: s.name, task_description: s.task_description,
            cron_schedule: s.cron_schedule, output_channel: s.output_channel,
            slack_channel: null, skip_confirmations: false,
          }),
        });
        const d = await res.json();
        if (!res.ok || !d.agent?.id) throw new Error(d?.error || 'failed');
        agent = d.agent;
      }
      setCreated({ id: agent.id, name: agent.name, scheduleLabel: agent.scheduleLabel || '', nextRun: agent.nextRun });
      onContinue(true);
    } catch {
      toast.error("Couldn't activate that agent right now — you can add it from your dashboard.");
    } finally { setBusy(false); }
  };

  // ── Review / approve ──
  if (mode === 'review' && review) {
    const name = review.kind === 'template' ? review.template.name : review.spec.name;
    const schedule = review.kind === 'template' ? review.template.schedule : review.spec.scheduleLabel;
    const summary = review.kind === 'template' ? review.template.tagline : review.spec.summary;
    const steps = review.kind === 'template' ? review.template.plan : review.spec.steps;
    return (
      <div>
        <div className="text-center mb-7">
          <IconBadge><Sparkles className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
          <Display className="text-[26px] sm:text-[32px] mb-3">Here’s the plan</Display>
          <Body className="text-[15px] max-w-sm mx-auto">Approve to put it on a schedule. Drafts always wait for your sign-off.</Body>
        </div>
        <GlassCard className="mb-5">
          <p className="text-[16px] font-medium text-[#0A0A0A]">{name}</p>
          <p className="text-[13px] text-[#0A0A0A]/55 mt-0.5">{summary}</p>
          <p className="text-[12px] text-[#0A0A0A]/45 mt-2 inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {schedule}</p>
          <ol className="mt-4 pt-4 border-t border-black/[0.06] space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full lg-pane text-[11px] font-medium grid place-content-center shrink-0 tabular-nums">{i + 1}</span>
                <span className="text-[13.5px] text-[#0A0A0A]/75 leading-snug">{s}</span>
              </li>
            ))}
          </ol>
        </GlassCard>
        <div className="flex items-center justify-center gap-5">
          <PrimaryButton onClick={approve} disabled={busy}>
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</> : <>Approve & activate <Check className="w-4 h-4" /></>}
          </PrimaryButton>
          <SkipLink onClick={() => { setReview(null); setMode('pick'); }}>Choose another</SkipLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-7">
        <IconBadge><Sparkles className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
        <Display className="text-[26px] sm:text-[32px] mb-3">Set your first agent on a schedule</Display>
        <Body className="text-[15px] max-w-sm mx-auto">Pick one to run on its own, or describe your own. You can change it later.</Body>
      </div>

      {mode === 'pick' ? (
        <div className="space-y-2.5">
          {AGENT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setReview({ kind: 'template', template: t }); setMode('review'); }}
              className={cn(
                'lg-focus w-full text-left lg-card p-5 flex items-center gap-4 transition-transform active:scale-[0.99]',
                t.recommended && 'lg-pulse',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-medium text-[#0A0A0A]">{t.name}</p>
                  {t.recommended && <span className="text-[9px] uppercase tracking-[0.12em] font-bold text-[#0A0A0A]/45">Recommended</span>}
                </div>
                <p className="text-[12.5px] text-[#0A0A0A]/50 mt-0.5">{t.tagline}</p>
                <p className="text-[11.5px] text-[#0A0A0A]/40 mt-1.5 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {t.schedule}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#0A0A0A]/30" />
            </button>
          ))}
          <button onClick={() => setMode('custom')} className="lg-focus w-full text-center py-3 text-[13.5px] font-medium text-[#0A0A0A]/55 hover:text-[#0A0A0A] transition-colors">
            Describe your own
          </button>
        </div>
      ) : (
        <div>
          <div className="lg-card p-5 focus-within:border-black/20">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Every morning, triage my inbox and draft replies in my voice."
              rows={4}
              className="w-full bg-transparent border-none text-[15px] text-[#0A0A0A] placeholder:text-[#0A0A0A]/35 focus:outline-none resize-none leading-relaxed"
            />
          </div>
          <div className="flex items-center justify-center gap-5 mt-5">
            <PrimaryButton onClick={designCustom} disabled={!customPrompt.trim() || busy}>
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Designing…</> : <>Design agent <ArrowRight className="w-4 h-4" /></>}
            </PrimaryButton>
            <SkipLink onClick={() => setMode('pick')}>Back to templates</SkipLink>
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        <SkipLink onClick={onSkip}>I’ll do this later</SkipLink>
      </div>
    </div>
  );
}

/* ═══════════════════════════ 13 · CHOOSE PLAN ═══════════════════════════ */

const PLAN_FEATURES = [
  'Full inbox triage & drafting in your voice',
  'Arcus operator + scheduled agents',
  'Live Notion, Calendar & Slack sync',
  'Approval queue — you sign off on every send',
];

function S13Plan({ firstName, plan, onChoose }: { firstName: string; plan: 'monthly' | 'annual' | null; onChoose: (p: 'monthly' | 'annual') => void }) {
  const [annual, setAnnual] = useState(plan ? plan === 'annual' : true);
  return (
    <div>
      <div className="text-center mb-8">
        <Display className="text-[28px] sm:text-[36px] mb-3">{firstName ? `Choose your plan, ${firstName}.` : 'Choose your plan.'}</Display>
        <Body className="text-[15px] max-w-sm mx-auto">One plan, everything included. Cancel anytime.</Body>
      </div>

      <div className="flex justify-center mb-7">
        <div className="lg-capsule !p-1 flex gap-1 rounded-full">
          {(['monthly', 'annual'] as const).map((opt) => {
            const active = (opt === 'annual') === annual;
            return (
              <button
                key={opt}
                onClick={() => setAnnual(opt === 'annual')}
                className={cn('lg-focus relative rounded-full px-5 py-2 text-[12.5px] font-medium transition-colors', active ? 'text-white' : 'text-[#0A0A0A]/55')}
              >
                {active && <motion.span layoutId="plan-toggle" className="absolute inset-0 rounded-full bg-[#0A0A0A]" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  {opt === 'monthly' ? 'Monthly' : 'Annual'}
                  {opt === 'annual' && <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-black uppercase', active ? 'bg-white text-[#0A0A0A]' : 'bg-[#0A0A0A] text-white')}>2 months free</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <GlassCard className="max-w-md mx-auto text-center">
        <div className="flex items-baseline justify-center mb-1">
          <span className="text-[48px] font-medium tracking-tight text-[#0A0A0A]">${annual ? '16.58' : '29'}</span>
          <span className="text-[13px] text-[#0A0A0A]/50 ml-2">/mo{annual ? ', billed yearly' : ''}</span>
        </div>
        <p className="text-[12px] text-[#0A0A0A]/45 mb-6">{annual ? '$199/year · 2 months free' : 'Billed monthly'}</p>

        <ul className="space-y-3 text-left mb-7">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <span className="w-[18px] h-[18px] rounded-full lg-pane grid place-content-center mt-0.5 shrink-0"><Check className="w-3 h-3 text-[#0A0A0A]" strokeWidth={2.5} /></span>
              <span className="text-[13.5px] text-[#0A0A0A]/75 leading-snug">{f}</span>
            </li>
          ))}
        </ul>

        <PrimaryButton onClick={() => onChoose(annual ? 'annual' : 'monthly')} className="w-full">
          Choose {annual ? 'annual' : 'monthly'} <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </GlassCard>

      <p className="text-center text-[12.5px] text-[#0A0A0A]/45 mt-6 max-w-sm mx-auto leading-relaxed">
        30 days, money back, from me directly. — Maulik
      </p>
    </div>
  );
}

/* ═══════════════════════════ 14 · NOTIFICATIONS ═══════════════════════════ */

function S14Notifications({ time, setTime, channel, setChannel, hasSlack, agentId, onContinue }: {
  time: string; setTime: (t: string) => void;
  channel: 'gmail' | 'slack' | 'both'; setChannel: (c: 'gmail' | 'slack' | 'both') => void;
  hasSlack: boolean; agentId: string | null; onContinue: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const channels: Array<{ id: 'gmail' | 'slack' | 'both'; label: string; disabled?: boolean }> = [
    { id: 'gmail', label: 'Gmail' },
    { id: 'slack', label: 'Slack', disabled: !hasSlack },
    { id: 'both', label: 'Both', disabled: !hasSlack },
  ];

  const save = async () => {
    setSaving(true);
    // Make the preference real: retarget the created agent's schedule + channel.
    if (agentId) {
      try {
        await fetch('/api/arcus/agents', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: agentId, cron_schedule: timeToCron(time), output_channel: channel }),
        });
      } catch { /* preference still persisted via state patch on continue */ }
    }
    setSaving(false);
    onContinue();
  };

  return (
    <div>
      <div className="text-center mb-7">
        <IconBadge><Clock className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.75} /></IconBadge>
        <Display className="text-[26px] sm:text-[32px] mb-3">When’s your briefing?</Display>
        <Body className="text-[15px] max-w-sm mx-auto">Pick a time and where it lands. That’s it.</Body>
      </div>

      <GlassCard className="max-w-sm mx-auto space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#0A0A0A]/40 mb-2.5">Morning briefing at</p>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="lg-focus w-full bg-white/60 border border-black/[0.08] rounded-xl px-4 py-3 text-[16px] font-medium text-[#0A0A0A]"
          />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#0A0A0A]/40 mb-2.5">Deliver to</p>
          <div className="grid grid-cols-3 gap-2">
            {channels.map((c) => (
              <button
                key={c.id}
                disabled={c.disabled}
                onClick={() => setChannel(c.id)}
                className={cn(
                  'lg-focus rounded-xl py-2.5 text-[13px] font-medium border transition-all',
                  channel === c.id ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'bg-white/50 text-[#0A0A0A]/70 border-black/[0.08] hover:border-black/20',
                  c.disabled && 'opacity-35 cursor-not-allowed',
                )}
                title={c.disabled ? 'Connect Slack to use this' : undefined}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="text-center mt-7">
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ═══════════════════════════ 15 · YOU'RE ALL SET ═══════════════════════════ */

function S15Done({ firstName, agent, scan, briefTime, briefChannel, plan, onFinish }: {
  firstName: string; agent: CreatedAgent | null; scan: ScanResult | null;
  briefTime: string; briefChannel: 'gmail' | 'slack' | 'both'; plan: 'monthly' | 'annual' | null;
  onFinish: () => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    await onFinish();
    if (plan) {
      try { localStorage.setItem('pending_plan', plan); } catch {}
      window.location.href = POLAR_CHECKOUT_URLS[plan];
    } else {
      router.push('/home-feed');
    }
  };

  const channelLabel = briefChannel === 'both' ? 'Gmail + Slack' : briefChannel === 'slack' ? 'Slack' : 'Gmail';

  return (
    <div className="text-center">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
        <IconBadge><Check className="w-5 h-5 text-[#0A0A0A]" strokeWidth={2} /></IconBadge>
      </motion.div>

      <Display className="text-[32px] sm:text-[42px] mb-4">Arcus is on duty.</Display>
      <Body className="text-[15.5px] max-w-md mx-auto mb-8">
        {firstName ? `You're set, ${firstName}. ` : ''}Here’s what’s running. Everything waits for your approval before it sends.
      </Body>

      <GlassCard className="max-w-sm mx-auto text-left space-y-4 mb-9">
        <SummaryRow icon={<Mail className="w-4 h-4" />} label="Inbox" value="Connected" />
        {agent ? (
          <>
            <SummaryRow icon={<Sparkles className="w-4 h-4" />} label="First agent" value={agent.name} />
            <SummaryRow
              icon={<Clock className="w-4 h-4" />}
              label="First run"
              value={agent.nextRun ? new Date(agent.nextRun).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : `${prettyTime(briefTime)} · ${channelLabel}`}
            />
          </>
        ) : (
          <SummaryRow icon={<Clock className="w-4 h-4" />} label="Briefing" value={`${prettyTime(briefTime)} · ${channelLabel}`} />
        )}
        {scan && <SummaryRow icon={<Activity className="w-4 h-4" />} label="Taking off your plate" value={`~${scan.hoursPerWeek}h / week`} />}
      </GlassCard>

      <PrimaryButton onClick={finish} disabled={busy} className="px-8 py-3.5 text-[15px]">
        {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening…</> : <>Go to Mailient <ArrowRight className="w-4 h-4" /></>}
      </PrimaryButton>
    </div>
  );
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl lg-pane flex items-center justify-center text-[#0A0A0A]/70 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#0A0A0A]/40">{label}</p>
        <p className="text-[14px] font-medium text-[#0A0A0A] truncate">{value}</p>
      </div>
    </div>
  );
}
