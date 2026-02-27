"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Mail, ArrowRight, Shield, AlertCircle, Copy, ArrowLeft } from 'lucide-react';

const PERSONAL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in',
  'outlook.com', 'hotmail.com', 'live.com', 'aol.com',
  'icloud.com', 'me.com', 'protonmail.com', 'proton.me',
  'zoho.com', 'mail.com', 'yandex.com', 'gmx.com',
  'fastmail.com', 'tutanota.com', 'hey.com'
];

export default function GetStarted() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [isWorkspace, setIsWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const emailInputRef = useRef(null);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    const domain = trimmed.split('@')[1];
    setEmailDomain(domain);
    setIsWorkspace(!PERSONAL_DOMAINS.includes(domain));
    setStep(2);
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { logout: true, callbackUrl: '/onboarding', login_hint: email.trim().toLowerCase() });
    } catch (error) {
      console.error('Sign up error:', error);
      setIsLoading(false);
    }
  };

  const backToStep1 = () => {
    setStep(1);
    setIsWorkspace(null);
    setEmailDomain('');
  };

  const benefits = [
    "100 AI-handled emails free",
    "Founder-grade response engine",
    "No credit card required"
  ];

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Dynamic blurred background accents */}
      <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vw] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[5%] w-[35vw] h-[35vw] bg-white/[0.015] rounded-full blur-[100px] pointer-events-none" />

      {/* Ultra-subtle monochrome film grain */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[920px] bg-white/[0.01] backdrop-blur-[40px] border border-white/[0.06] border-t-white/[0.08] rounded-[24px] shadow-[0_50px_100px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.03)] overflow-hidden"
      >
        <div className="flex flex-col md:flex-row min-h-[540px]">

          {/* Left Section: Branding & Benefits */}
          <div className="md:w-[48%] p-10 sm:p-14 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/[0.05]">
            <div>
              <div className="mb-16">
                <span className="text-white text-xl font-light tracking-[0.2em] lowercase">mailient</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-medium text-white mb-8 tracking-tighter leading-[1.1]">
                Join the <br /> Waitlist
              </h1>

              <p className="text-white/40 text-sm font-light tracking-tight max-w-[280px] leading-relaxed mb-12">
                Mailient is currently in early access. Secure your spot to redefine your inbox.
              </p>

              <div className="space-y-6">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm text-white/70">
                    <div className="w-5 h-5 rounded-full border border-white/5 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={2} />
                    </div>
                    <span className="font-light tracking-tight">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 md:mt-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-medium">Next-Gen Intelligence</p>
            </div>
          </div>

          {/* Right Section: Auth Flows */}
          <div className="flex-1 p-10 sm:p-14 flex flex-col justify-center bg-white/[0.01]">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-[340px] mx-auto md:mx-0"
                >
                  <div className="mb-10">
                    <h2 className="text-white text-lg font-light tracking-tight mb-2">Create account</h2>
                    <p className="text-white/30 text-xs font-light">Join the community of founders using AI to master their communication.</p>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div className="relative group">
                      <input
                        ref={emailInputRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Work email address"
                        className="w-full h-11 px-0 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-white transition-all text-sm font-light pb-2 rounded-none"
                        autoFocus
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!email.includes('@')}
                      className="w-full h-11 bg-white text-black rounded-[14px] font-semibold text-sm hover:bg-[#F5F5F5] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-[0.98]"
                    >
                      Continue
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  <div className="mt-12 text-center md:text-left">
                    <button
                      onClick={() => router.push('/auth/signin')}
                      className="text-white/20 hover:text-white text-xs font-light tracking-tight transition-colors"
                    >
                      already registered? <span className="text-white/40 border-b border-white/10 ml-1">sign in</span>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-[340px] mx-auto md:mx-0"
                >
                  <div className="flex flex-col">
                    <button
                      onClick={backToStep1}
                      className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-xs font-light mb-10 group w-fit"
                    >
                      <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                      use different email
                    </button>

                    <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl mb-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium uppercase tracking-widest text-white/20">Identity</span>
                        <span className={`text-[10px] font-medium uppercase tracking-widest ${isWorkspace ? 'text-white/50' : 'text-white/20'}`}>
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
                      onClick={handleGoogleSignUp}
                      disabled={isLoading}
                      className="w-full h-11 bg-white text-black rounded-[14px] font-semibold text-sm hover:bg-[#F5F5F5] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 active:scale-[0.98]"
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
                  </div>

                  {!isWorkspace && (
                    <div className="mt-8 p-4 bg-white/[0.01] border border-white/[0.05] rounded-xl flex gap-3">
                      <AlertCircle className="w-4 h-4 text-white/20 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <p className="text-[11px] text-white/30 leading-relaxed font-light">
                        personal accounts require manual confirmation on the google consent screen. click 'advanced' if prompted.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
