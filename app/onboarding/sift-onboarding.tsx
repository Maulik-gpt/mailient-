'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, Loader2, ShieldCheck, Sparkles, X,
  Mail, CalendarClock, AtSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import PricingSection3 from '@/components/ui/pricing-section-3';

type StepId = 0 | 1 | 2 | 3;
const STEPS: StepId[] = [0, 1, 2, 3];
const STEP_LABELS = ['Connect', 'Identity', 'Tone', 'Plan'];

const POLAR_CHECKOUT_URLS: Record<'monthly' | 'annual' | 'lifetime', string> = {
  monthly:  'https://buy.polar.sh/polar_cl_BmoCj2jm6Hxy2Pc4DI6y717wsENNDAniGPfsB1pMO61',
  annual:   'https://buy.polar.sh/polar_cl_ojXGgACq5GNMsUInVP3HX5vpXepohT5P8m7SL2RcCej',
  lifetime: 'https://buy.polar.sh/polar_cl_BmoCj2jm6Hxy2Pc4DI6y717wsENNDAniGPfsB1pMO61',
};

type Tone = 'direct' | 'balanced' | 'warm';
const TONES: Array<{ id: Tone; title: string; tagline: string; example: string }> = [
  { id: 'direct',   title: 'Direct',   tagline: 'Crisp. Action first.',           example: '"Drafted — open in Gmail to send."' },
  { id: 'balanced', title: 'Balanced', tagline: 'One warm opener, then go.',      example: '"Got it. Drafted the reply to Priya."' },
  { id: 'warm',     title: 'Warm',     tagline: 'Lead with care, stay grounded.', example: '"Love it — drafted the renewal note for Priya."' },
];

function slugifyHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

export default function SiftOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const stepFromUrl = Number(searchParams?.get('step') || 0) as StepId;
  const [step, setStep] = useState<StepId>(
    STEPS.includes(stepFromUrl) ? stepFromUrl : 0,
  );

  const firstName = useMemo(() => {
    const raw = session?.user?.name?.trim();
    if (raw) return raw.split(/\s+/)[0];
    const local = session?.user?.email?.split('@')[0] || '';
    const first = local.split(/[._\-+]/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : '';
  }, [session]);

  const [profileName, setProfileName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [tone, setTone] = useState<Tone>('balanced');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user?.name && !profileName) setProfileName(session.user.name);
    if (session?.user?.email && !username) setUsername(slugifyHandle(session.user.email.split('@')[0]));
  }, [session, profileName, username]);

  useEffect(() => {
    const u = username.trim();
    if (u.length < 3) { setUsernameAvailable(null); return; }
    let cancelled = false;
    setCheckingUsername(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/onboarding/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u }),
        });
        const data = await res.json();
        if (!cancelled) setUsernameAvailable(!!data.available);
      } catch {
        if (!cancelled) setUsernameAvailable(null);
      } finally {
        if (!cancelled) setCheckingUsername(false);
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [username]);

  const goto = useCallback((next: StepId) => {
    setStep(next);
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    if (next === 0) params.delete('step'); else params.set('step', String(next));
    const q = params.toString();
    window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
  }, [searchParams]);

  const handleConnectGoogle = () => {
    signIn('google', { callbackUrl: `${window.location.pathname}?step=1`, redirect: true });
  };

  const handleFinish = async (plan: 'monthly' | 'annual' | 'lifetime') => {
    setIsSubmitting(true);
    try {
      // Personality is a nice-to-have — failing it must not block finishing.
      await fetch('/api/agent-talk/personality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communicationStyle: tone }),
      }).catch(() => {});

      // Completing onboarding is CRITICAL. Previously this was .catch(() => {})
      // and the flow proceeded to checkout regardless — so a user whose
      // onboarding never saved would pay, return, and be stuck un-onboarded.
      // Now: if completion fails, surface it and DO NOT send them to checkout.
      const finalUsername = username.trim() || slugifyHandle(firstName || 'mailient_user');
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: finalUsername,
          profileName: profileName.trim() || firstName,
          bio: bio.trim() || null,
          avatarUrl: session?.user?.image || null,
          plan,
          personality: tone,
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

  const canContinue = (() => {
    if (step === 0) return true;
    if (step === 1) {
      const u = username.trim();
      return u.length >= 3 && usernameAvailable !== false && !checkingUsername;
    }
    if (step === 2) return true;
    return false;
  })();

  const handleContinue = () => {
    if (step === 3) return;
    if (!canContinue) return;
    goto((step + 1) as StepId);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white font-satoshi flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/75 dark:bg-black/65 border-b border-black/[0.04] dark:border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mailient-logo-premium.png" alt="Mailient" className="w-full h-full object-cover" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight">Mailient</span>
          </div>
          <div className="flex items-center gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  s === step
                    ? 'w-8 bg-black dark:bg-white'
                    : s < step
                      ? 'w-1.5 bg-black/40 dark:bg-white/40'
                      : 'w-1.5 bg-black/10 dark:bg-white/10',
                )}
              />
            ))}
          </div>
          {step > 0 && step < 3 ? (
            <button
              type="button"
              onClick={() => goto(3)}
              className="text-[12px] text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
            >
              Skip
            </button>
          ) : <span className="w-12" />}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className={cn('w-full', step === 3 ? 'max-w-6xl' : 'max-w-xl')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && (
                <StepWelcome firstName={firstName} onConnect={handleConnectGoogle} onSkip={() => goto(1)} />
              )}
              {step === 1 && (
                <StepIdentity
                  firstName={firstName}
                  profileName={profileName}
                  setProfileName={setProfileName}
                  username={username}
                  setUsername={setUsername}
                  bio={bio}
                  setBio={setBio}
                  checking={checkingUsername}
                  available={usernameAvailable}
                  avatar={session?.user?.image || null}
                />
              )}
              {step === 2 && <StepTone tone={tone} setTone={setTone} />}
              {step === 3 && (
                <StepPricing
                  firstName={firstName}
                  isSubmitting={isSubmitting}
                  onSelect={(planId) => handleFinish(planId)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="sticky bottom-0 z-30 backdrop-blur-xl bg-white/75 dark:bg-black/65 border-t border-black/[0.04] dark:border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => step > 0 && goto((step - 1) as StepId)}
            disabled={step === 0}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium transition-colors',
              step === 0
                ? 'opacity-30 cursor-not-allowed text-black/55 dark:text-white/55'
                : 'text-black/65 dark:text-white/65 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]',
            )}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          {step === 0 ? (
            <span className="text-[12px] text-black/40 dark:text-white/40 hidden sm:block">
              Step 1 of 4 · Connect to begin
            </span>
          ) : (
            <span className="text-[12px] text-black/40 dark:text-white/40 hidden sm:block">
              {STEP_LABELS[step]} · {step + 1} of {STEPS.length}
            </span>
          )}

          {step === 3 ? (
            <span className="text-[12px] text-black/40 dark:text-white/40 hidden sm:inline">
              Tap a plan above to continue
            </span>
          ) : (
            <button
              type="button"
              onClick={step === 0 ? handleConnectGoogle : handleContinue}
              disabled={!canContinue || isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 pl-4 pr-3 py-2 rounded-full text-[13.5px] font-semibold transition-[background-color,transform] duration-150 active:scale-[0.97]',
                !canContinue || isSubmitting
                  ? 'bg-black/[0.08] dark:bg-white/[0.08] text-black/40 dark:text-white/40 cursor-not-allowed'
                  : 'bg-black text-white dark:bg-white dark:text-black hover:bg-black/85 dark:hover:bg-white/85',
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Setting up…
                </>
              ) : step === 0 ? (
                <>
                  Continue with Google
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
    </div>
  );
}

function StepWelcome({ firstName, onConnect, onSkip }: { firstName: string; onConnect: () => void; onSkip: () => void }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-black/[0.04] dark:ring-white/[0.05] text-black/70 dark:text-white/70 mb-6">
        <Sparkles className="w-6 h-6" strokeWidth={1.75} />
      </div>
      <h1 className="text-3xl sm:text-[40px] sm:leading-[1.05] font-semibold tracking-[-0.025em] mb-3">
        {firstName ? `Welcome, ${firstName} —` : 'Welcome —'}
      </h1>
      <p className="text-[15px] text-black/55 dark:text-white/55 max-w-md mx-auto leading-relaxed mb-10">
        One Google sign-in connects your inbox and calendar. Mailient reads only what it needs to surface what matters today.
      </p>

      <button
        type="button"
        onClick={onConnect}
        className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full text-[14px] font-semibold bg-black text-white dark:bg-white dark:text-black hover:bg-black/85 dark:hover:bg-white/85 transition-[background-color,transform] duration-150 active:scale-[0.97]"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto">
        <Promise icon={<Mail className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Gmail" sub="Read & draft" />
        <Promise icon={<CalendarClock className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Calendar" sub="Prep meetings" />
        <Promise icon={<ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Encrypted" sub="Yours alone" />
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="mt-8 text-[12px] text-black/40 dark:text-white/40 hover:text-black/65 dark:hover:text-white/65 transition-colors"
      >
        I'll connect later
      </button>
    </div>
  );
}

function Promise({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
      <div className="w-7 h-7 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center text-black/65 dark:text-white/65 flex-shrink-0">
        {icon}
      </div>
      <div className="text-left min-w-0">
        <p className="text-[12.5px] font-semibold tracking-tight text-black dark:text-white truncate">{label}</p>
        <p className="text-[11px] text-black/45 dark:text-white/45 truncate">{sub}</p>
      </div>
    </div>
  );
}

function StepIdentity(props: {
  firstName: string;
  profileName: string; setProfileName: (s: string) => void;
  username: string; setUsername: (s: string) => void;
  bio: string; setBio: (s: string) => void;
  checking: boolean;
  available: boolean | null;
  avatar: string | null;
}) {
  const { firstName, profileName, setProfileName, username, setUsername, bio, setBio, checking, available, avatar } = props;
  const initial = (profileName || firstName || '?').trim()[0]?.toUpperCase() || '?';

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-2">Who are you?</h1>
      <p className="text-[15px] text-black/55 dark:text-white/55 mb-8">
        Used in messages from Arcus and on your shareable handle.
      </p>

      <div className="flex items-center gap-4 mb-6">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="w-14 h-14 rounded-full object-cover ring-1 ring-black/[0.06] dark:ring-white/[0.06]" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-black/[0.06] dark:bg-white/[0.06] flex items-center justify-center text-[18px] font-semibold tracking-tight text-black/70 dark:text-white/70">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] uppercase tracking-[0.14em] text-black/40 dark:text-white/40 font-medium">Display name</p>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder={firstName || 'Your name'}
            className="mt-1 w-full bg-transparent border-none focus:outline-none text-[20px] font-semibold tracking-tight text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
            maxLength={60}
          />
        </div>
      </div>

      <FieldLabel>Handle</FieldLabel>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/35 dark:text-white/35 pointer-events-none">
          <AtSign className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(slugifyHandle(e.target.value))}
          placeholder="yourname"
          className="w-full h-12 pl-10 pr-12 rounded-xl bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] text-[15px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-black/30 dark:focus:border-white/25 transition-colors"
          maxLength={24}
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
          {checking ? (
            <Loader2 className="w-4 h-4 animate-spin text-black/35 dark:text-white/35" />
          ) : available === true ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
          ) : available === false ? (
            <X className="w-4 h-4 text-rose-500" strokeWidth={2.25} />
          ) : null}
        </span>
      </div>
      <p className="mt-1.5 text-[12px] text-black/40 dark:text-white/40">
        {username.length < 3
          ? '3 characters minimum.'
          : available === false
            ? `"${username}" is taken — try another.`
            : available === true
              ? `mailient.xyz/u/${username}`
              : `Will live at mailient.xyz/u/${username || 'yourname'}`}
      </p>

      <div className="mt-6">
        <FieldLabel>Bio <span className="ml-1 text-black/30 dark:text-white/30 font-normal">(optional)</span></FieldLabel>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Founder of X. Building Y. Talking to Z."
          rows={3}
          maxLength={160}
          className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/[0.02] border border-black/[0.08] dark:border-white/[0.08] text-[14px] text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-black/30 dark:focus:border-white/25 transition-colors resize-none leading-relaxed"
        />
        <p className="mt-1.5 text-[12px] text-black/40 dark:text-white/40 text-right tabular-nums">{bio.length}/160</p>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11.5px] uppercase tracking-[0.14em] font-medium text-black/40 dark:text-white/40 mb-1.5">
      {children}
    </label>
  );
}

function StepTone({ tone, setTone }: { tone: Tone; setTone: (t: Tone) => void }) {
  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] mb-2">How should Arcus talk?</h1>
      <p className="text-[15px] text-black/55 dark:text-white/55 mb-8">
        Change anytime in settings. Affects how replies and reports read — not what gets done.
      </p>

      <div className="space-y-2.5">
        {TONES.map((t) => {
          const active = t.id === tone;
          return (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id)}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'w-full text-left rounded-2xl px-4 py-3.5 border transition-[border-color,background-color] duration-200',
                active
                  ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                  : 'bg-white dark:bg-white/[0.02] border-black/[0.08] dark:border-white/[0.08] text-black dark:text-white hover:border-black/[0.16] dark:hover:border-white/[0.16]',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
                  active
                    ? 'border-white dark:border-black bg-white dark:bg-black'
                    : 'border-black/30 dark:border-white/25',
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'text-[15px] font-semibold tracking-tight',
                      active ? 'text-white dark:text-black' : 'text-black dark:text-white',
                    )}>{t.title}</span>
                    <span className={cn(
                      'text-[12px]',
                      active ? 'text-white/65 dark:text-black/65' : 'text-black/45 dark:text-white/45',
                    )}>{t.tagline}</span>
                  </div>
                  <p className={cn(
                    'mt-1 text-[13px] italic',
                    active ? 'text-white/75 dark:text-black/75' : 'text-black/50 dark:text-white/50',
                  )}>{t.example}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

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
      <div className="text-center mb-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-black/40 dark:text-white/40 font-medium mb-3">
          Step 4 of 4 · Pick a plan
        </p>
        <h1 className="text-3xl sm:text-[40px] sm:leading-[1.05] font-semibold tracking-[-0.025em] mb-3 text-black dark:text-white">
          {firstName ? `Welcome aboard, ${firstName}.` : 'Welcome aboard.'}
        </h1>
        <p className="text-[15px] text-black/55 dark:text-white/55 max-w-md mx-auto leading-relaxed">
          Pick the plan that fits. Change anytime in settings.
        </p>
      </div>

      {isSubmitting && (
        <div className="absolute inset-0 z-20 backdrop-blur-sm bg-black/30 rounded-3xl flex items-center justify-center">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white text-black font-medium text-[13px]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Setting up your account…
          </div>
        </div>
      )}

      <div className="relative bg-[#030303] rounded-[28px] border border-white/[0.06] overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)]">
        <PricingSection3 handleSelectPlan={(planId) => onSelect(planId)} />
      </div>
    </div>
  );
}

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
