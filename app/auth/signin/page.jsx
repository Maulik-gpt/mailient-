"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Check, AlertCircle, Copy, CheckCircle2, Shield, Info,
  ArrowRight, ExternalLink, Globe, Lock, Workflow, Mail
} from 'lucide-react';

// Domains that are personal (not Workspace)
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
  const [isWorkspace, setIsWorkspace] = useState(null); // null = not checked, true/false
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [step, setStep] = useState(1); // 1 = email input, 2 = connect button
  const emailInputRef = useRef(null);

  const callbackUrl = searchParams?.get('callbackUrl') || '/onboarding';

  // Check for OAuth errors
  useEffect(() => {
    const urlError = searchParams?.get('error');
    if (urlError) {
      if (urlError === 'access-denied' || urlError === 'org_internal') {
        setShowAdminModal(true);
      } else {
        switch (urlError) {
          case 'configuration':
            setError('Authentication configuration error. Please try again.');
            break;
          case 'pkce-retry':
            setError('Authentication temporarily failed. Please try signing in again.');
            break;
          default:
            setError('An authentication error occurred. Please try again.');
        }
      }
    }

    // Check if user is already authenticated
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session) {
          try {
            const response = await fetch('/api/onboarding/redirect');
            if (response.ok) {
              const data = await response.json();
              router.push(data.redirectTo);
            } else {
              router.push(callbackUrl);
            }
          } catch (error) {
            router.push(callbackUrl);
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
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

    if (PERSONAL_DOMAINS.includes(domain)) {
      setIsWorkspace(false);
      setStep(2);
    } else {
      setIsWorkspace(true);
      setStep(2);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn('google', {
        callbackUrl: '/onboarding',
        login_hint: email.trim().toLowerCase(),
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleBack = () => {
    setStep(1);
    setIsWorkspace(null);
    setEmailDomain('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Blurred Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[130px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-zinc-900/40 rounded-full blur-[100px]" />
      </div>

      {/* Grid Pattern overlay for depth */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />

      {/* Main Modal */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[440px] bg-white rounded-[28px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        {/* Modal Header with Grainy Gradient */}
        <div className="relative h-44 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1a1a1a] via-[#3a1c71] to-[#ffaf7b] opacity-90" />
          <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat scale-150" />

          {/* Logo Container */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 bg-white rounded-xl border border-white/20 flex items-center justify-center shadow-inner overflow-hidden">
              <img src="/logo-new.png" alt="Mailient" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-medium tracking-[0.2em] text-[10px] uppercase opacity-80 font-mono">Mailient</span>
          </motion.div>
        </div>

        {/* Modal Body */}
        <div className="p-8 pt-10 sm:p-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-semibold text-[#1a1a1a] tracking-tight">Sign in to continue</h2>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Features List */}
                <div className="space-y-4 mb-8">
                  {[
                    { icon: <Check className="w-4 h-4 text-emerald-500" />, text: "AI email prioritization for teams" },
                    { icon: <Check className="w-4 h-4 text-emerald-500" />, text: "Secure Workspace integration" },
                    { icon: <Check className="w-4 h-4 text-emerald-500" />, text: "Draft replies in your voice" }
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-zinc-600">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                        {feature.icon}
                      </div>
                      <span className="font-medium">{feature.text}</span>
                    </div>
                  ))}
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Work email address"
                      className="w-full h-14 px-5 bg-zinc-50 border border-zinc-200 rounded-2xl text-[#1a1a1a] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-base"
                      autoFocus
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-300">
                      <Mail className="w-5 h-5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!email.includes('@')}
                    className="w-full h-14 bg-[#1a1a1a] text-white rounded-full font-semibold text-base hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/5 disabled:opacity-50 disabled:hover:bg-[#1a1a1a] group"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>

                <div className="text-center">
                  <p className="text-xs text-zinc-400 font-medium tracking-wide">
                    OR CONTINUE WITH
                  </p>
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      onClick={() => handleGoogleSignIn()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors text-sm font-medium text-zinc-700"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5.04c1.74 0 3.3.6 4.53 1.76l3.39-3.39C17.85 1.53 15.15 0 12 0 7.31 0 3.26 2.69 1.18 6.61l3.96 3.07C6.1 7.24 8.84 5.04 12 5.04z" />
                        <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.59-5.17 3.59-8.82z" />
                        <path fill="#FBBC05" d="M5.14 14.68c-.25-.74-.4-1.54-.4-2.38s.15-1.64.4-2.38l-4.14-3.21C.37 8.21 0 10.05 0 12s.37 3.79 1 5.31l4.14-3.32z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3C15.01 18.77 13.62 19.2 12 19.2c-3.13 0-5.8-2.12-6.76-4.99l-3.97 3.07C3.33 21.31 7.35 24 12 24z" />
                      </svg>
                      Google
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="flex flex-col items-center">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-zinc-400 hover:text-[#1a1a1a] transition-colors text-sm font-medium mb-6 group"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Edit email address
                  </button>

                  <div className="w-full p-6 bg-zinc-50 border border-zinc-100 rounded-2xl mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Workspace status</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isWorkspace ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {isWorkspace ? 'Verified Domain' : 'Personal Domain'}
                      </span>
                    </div>
                    <div className="text-[#1a1a1a] font-medium truncate">
                      {email}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full h-15 bg-[#1a1a1a] text-white rounded-full font-semibold text-base hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/10 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#EA4335" d="M12 5.04c1.74 0 3.3.6 4.53 1.76l3.39-3.39C17.85 1.53 15.15 0 12 0 7.31 0 3.26 2.69 1.18 6.61l3.96 3.07C6.1 7.24 8.84 5.04 12 5.04z" />
                          <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.59-5.17 3.59-8.82z" />
                          <path fill="#FBBC05" d="M5.14 14.68c-.25-.74-.4-1.54-.4-2.38s.15-1.64.4-2.38l-4.14-3.21C.37 8.21 0 10.05 0 12s.37 3.79 1 5.31l4.14-3.32z" />
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3C15.01 18.77 13.62 19.2 12 19.2c-3.13 0-5.8-2.12-6.76-4.99l-3.97 3.07C3.33 21.31 7.35 24 12 24z" />
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="w-full text-center text-xs font-semibold text-zinc-400 hover:text-zinc-600 transition-colors py-2 uppercase tracking-wide"
                  >
                    Need admin approval?
                  </button>
                </div>

                {!isWorkspace && (
                  <div className="p-5 border border-amber-100 bg-amber-50/50 rounded-2xl flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-tight mb-1">Personal Account Detected</p>
                      <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                        Access requires manual verification from Google for non-Workspace domains.
                        Click 'Advanced' → 'Go to Mailient' if prompted.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Branding */}
          <div className="mt-12 pt-8 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold text-zinc-300 uppercase tracking-[0.2em] sm:px-2">
            <span>OAuth 2.0</span>
            <div className="w-1.5 h-1.5 bg-zinc-100 rounded-full" />
            <span>Vault Secure</span>
            <div className="w-1.5 h-1.5 bg-zinc-100 rounded-full" />
            <span>Privacy</span>
          </div>
        </div>
      </motion.div>

      {/* Admin Approval Modal - Redesigned to match */}
      <AnimatePresence>
        {showAdminModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-white rounded-[32px] overflow-hidden"
            >
              <div className="h-32 bg-[#1a1a1a] flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
                <Shield className="w-12 h-12 text-white/20" />
              </div>

              <div className="p-8 sm:p-12 space-y-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#1a1a1a] tracking-tight">Admin Protocol Required</h2>
                  <button onClick={() => setShowAdminModal(false)} className="text-zinc-300 hover:text-zinc-800 transition-colors">
                    <AlertCircle className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-6 bg-zinc-950 rounded-2xl space-y-4 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Client ID</span>
                      <button
                        onClick={() => copyToClipboard(CLIENT_ID, 'clientid')}
                        className="text-[10px] font-bold uppercase tracking-widest text-white hover:text-zinc-400 transition-colors flex items-center gap-2"
                      >
                        {copiedField === 'clientid' ? 'Copied' : 'Copy'}
                        {copiedField === 'clientid' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="text-xs font-mono text-emerald-400 break-all bg-black/50 p-4 border border-emerald-900/10 rounded-xl leading-relaxed">
                      {CLIENT_ID || 'UNCONFIGURED'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { step: '01', title: 'Open Console', desc: 'Go to Admin Security' },
                      { step: '02', title: 'App Control', desc: 'Search via Client ID' },
                      { step: '03', title: 'Set Trust', desc: 'Mark as Trusted' }
                    ].map((item, i) => (
                      <div key={i} className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                        <span className="text-[10px] font-black text-zinc-200 block mb-1">{item.step}</span>
                        <h4 className="text-[11px] font-bold text-[#1a1a1a] uppercase mb-1">{item.title}</h4>
                        <p className="text-[10px] text-zinc-500 font-medium leading-tight">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <a
                    href="/workspace-setup"
                    target="_blank"
                    className="flex-1 h-14 rounded-2xl border border-zinc-200 flex items-center justify-center gap-2 text-sm font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Full Documentation
                  </a>
                  <button
                    onClick={() => setShowAdminModal(false)}
                    className="flex-1 h-14 bg-[#1a1a1a] text-white rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all"
                  >
                    Acknowledge
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-white animate-spin rounded-full" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
