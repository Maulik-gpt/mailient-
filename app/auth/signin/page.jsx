"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Mail, ArrowRight, Shield, AlertCircle, Copy, ArrowLeft } from 'lucide-react';

const PERSONAL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in',
  'outlook.com', 'hotmail.com', 'live.com', 'aol.com',
  'icloud.com', 'me.com', 'protonmail.com', 'proton.me',
  'zoho.com', 'mail.com', 'yandex.com', 'gmx.com',
  'fastmail.com', 'tutanota.com', 'hey.com'
];

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [isWorkspace, setIsWorkspace] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [step, setStep] = useState(1);
  const emailInputRef = useRef(null);

  const callbackUrl = searchParams?.get('callbackUrl') || '/onboarding';

  useEffect(() => {
    const urlError = searchParams?.get('error');
    if (urlError) {
      if (urlError === 'access-denied' || urlError === 'org_internal') {
        setShowAdminModal(true);
      } else {
        setError(urlError === 'configuration' ? 'Authentication configuration error.' : 'An authentication error occurred.');
      }
    }

    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        try {
          const response = await fetch('/api/onboarding/redirect');
          const data = await response.json();
          router.push(data.redirectTo || callbackUrl);
        } catch {
          router.push(callbackUrl);
        }
      }
    };
    checkSession();
  }, [router, callbackUrl, searchParams]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    const domain = trimmed.split('@')[1];
    setEmailDomain(domain);
    setIsWorkspace(!PERSONAL_DOMAINS.includes(domain));
    setStep(2);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn('google', { logout: true, callbackUrl: '/onboarding', login_hint: email.trim().toLowerCase() });
    } catch {
      setError('An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const backToStep1 = () => {
    setStep(1);
    setError(null);
  };

  const benefits = [
    "100 AI-handled emails free",
    "Founder-grade response engine",
    "No credit card required"
  ];

  const adminEmailTemplate = `Hi, I'd like to use Mailient (mailient.xyz) for AI-powered email management. Could you please approve Client ID: ${CLIENT_ID} in admin.google.com → Security → API Controls? Thanks!`;

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Ultra-subtle monochrome film grain */}
      <div className="absolute inset-0 z-0 opacity-[0.035] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[460px] bg-[#121212] border border-[#1F1F1F] border-t-white/5 rounded-[16px] shadow-[0_40px_100px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.02)] p-10 sm:p-14"
      >
        {/* Logo */}
        <div className="mb-12 text-center sm:text-left">
          <span className="text-white text-lg font-light tracking-[0.2em] lowercase">mailient</span>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-4xl font-medium text-white mb-8 tracking-tighter leading-tight">Sign in to continue</h1>

              <div className="space-y-6 mb-12">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm text-white/80">
                    <Check className="w-4 h-4 text-white" strokeWidth={1.5} />
                    <span className="font-light tracking-tight">{benefit}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-8 p-3 bg-white/5 border border-white/10 rounded-lg flex gap-3 items-center">
                  <AlertCircle className="w-4 h-4 text-white shrink-0" strokeWidth={1.5} />
                  <p className="text-xs text-white/60 font-light">{error}</p>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div className="relative group">
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Work email address"
                    className="w-full h-11 px-4 bg-transparent border border-[#1F1F1F] rounded-xl text-white placeholder:text-[#333333] focus:outline-none focus:border-white/40 transition-all text-sm group-hover:border-[#333333] font-light"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={!email.includes('@')}
                  className="w-full h-11 bg-white text-black rounded-[14px] font-semibold text-sm hover:bg-[#F5F5F5] hover:-translate-y-0.5 hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.1)] disabled:opacity-50 active:scale-[0.98]"
                >
                  Continue
                </button>
              </form>

              <div className="mt-10 text-center sm:text-left">
                <button
                  onClick={() => router.push('/auth/signup')}
                  className="text-[#444444] hover:text-white text-xs font-light tracking-tight transition-colors"
                >
                  or create an account
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="flex flex-col">
                <button
                  onClick={backToStep1}
                  className="flex items-center gap-2 text-[#444444] hover:text-white transition-colors text-xs font-light mb-8 group w-fit"
                >
                  <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                  use different email
                </button>

                <div className="p-6 bg-white/[0.01] border border-[#1F1F1F] rounded-2xl mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-[#333333]">Identity</span>
                    <span className={`text-[10px] font-medium uppercase tracking-widest ${isWorkspace ? 'text-white/40' : 'text-[#333333]'}`}>
                      {isWorkspace ? 'Workspace' : 'Personal'}
                    </span>
                  </div>
                  <div className="text-white font-medium truncate text-sm tracking-tight">
                    {email}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-11 bg-white text-black rounded-[14px] font-semibold text-sm hover:bg-[#F5F5F5] hover:-translate-y-0.5 hover:shadow-lg transition-all flex items-center justify-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_2px_rgba(0,0,0,0.1)] disabled:opacity-50 active:scale-[0.98]"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Connect with Google
                    </>
                  )}
                </button>

                {isWorkspace && (
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="w-full text-center text-[10px] font-semibold text-[#333333] hover:text-white/40 transition-colors py-2 uppercase tracking-[0.2em]"
                  >
                    manual approval needed?
                  </button>
                )}
              </div>

              {!isWorkspace && (
                <div className="p-4 bg-white/[0.01] border border-[#1F1F1F] rounded-xl flex gap-3">
                  <AlertCircle className="w-4 h-4 text-[#333333] shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-[11px] text-[#444444] leading-relaxed font-light">
                    personal accounts require manual confirmation on the google consent screen. click 'advanced' if prompted.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Admin Modal - Monochrome version */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              className="w-full max-w-lg bg-[#0E0E0E] border border-[#1F1F1F] border-t-white/5 rounded-[20px] shadow-[0_45px_120px_rgba(0,0,0,0.95)] overflow-hidden"
            >
              <div className="p-10 sm:p-14 space-y-10">
                <div className="flex items-center justify-between font-light">
                  <h2 className="text-2xl text-white tracking-tight">Admin Approval Needed</h2>
                  <button onClick={() => setShowAdminModal(false)} className="text-[#333333] hover:text-white transition-colors">
                    <ArrowRight className="w-6 h-6 rotate-[-45deg]" strokeWidth={1} />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="p-6 bg-transparent border border-[#1F1F1F] rounded-2xl space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-widest text-[#444444]">OAuth Client ID</span>
                      <button
                        onClick={() => copyToClipboard(CLIENT_ID, 'clientid')}
                        className="text-[10px] font-semibold uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-2"
                      >
                        {copiedField === 'clientid' ? 'copied' : 'copy'}
                      </button>
                    </div>
                    <div className="text-[11px] font-mono text-white/80 break-all bg-white/[0.02] p-4 border border-[#1F1F1F] rounded-xl leading-relaxed">
                      {CLIENT_ID || 'unconfigured_client_id'}
                    </div>
                  </div>

                  <div className="space-y-4 text-xs text-white/40 font-light leading-relaxed tracking-tight">
                    <p>1. Open Google Admin → Security → API Controls</p>
                    <p>2. Select 'Manage Third-Party App Access'</p>
                    <p>3. Add 'Mailient' using the Client ID above</p>
                    <p>4. Set access level to 'Trusted'</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowAdminModal(false)}
                    className="flex-1 h-11 bg-white text-black rounded-[14px] font-semibold text-sm hover:bg-[#F5F5F5] hover:-translate-y-0.5 transition-all shadow-lg"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-4 h-4 border border-white/20 border-t-white animate-spin rounded-full" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
