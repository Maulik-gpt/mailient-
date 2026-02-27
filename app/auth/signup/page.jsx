"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "../../../components/ui/button";

// Domains that are personal (not Workspace)
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

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await signIn('google', {
        redirectTo: '/onboarding',
        login_hint: email.trim().toLowerCase(),
      });
    } catch (error) {
      console.error('Sign up error:', error);
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setIsWorkspace(null);
    setEmailDomain('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 animate-float" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#383838]/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#383838]/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-[#242424]/20 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8 shadow-2xl animate-fade-in">

          {/* ─── STEP 1: Email Input ─── */}
          {step === 1 && (
            <>
              <div className="text-center mb-8">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl border border-white/10 overflow-hidden">
                  <img src="/logo-new.png" alt="Mailient" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-2xl font-bold text-gray-100">
                  Get started with Mailient
                </h1>
                <p className="text-gray-500 text-sm mt-2">
                  Enter your work email to create an account
                </p>
              </div>

              {/* Features */}
              <div className="mb-6 space-y-2.5">
                {[
                  "AI email prioritization for your team",
                  "Secure Google Workspace integration",
                  "Draft replies in your voice",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2.5 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-400">{feature}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full h-12 px-4 bg-black/60 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all text-sm"
                  autoFocus
                  required
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-white text-black hover:bg-gray-200 font-semibold transition-all duration-300 hover:scale-[1.01]"
                  disabled={!email.includes('@')}
                >
                  Continue
                </Button>
              </form>

              {/* Workspace badge */}
              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-gray-600">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Built for Google Workspace teams
              </div>

              {/* Already have account */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600/50" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-900 text-gray-100">Already have an account?</span>
                </div>
              </div>
              <div className="text-center">
                <Button variant="ghost" onClick={() => router.push('/auth/signin')} className="text-gray-100 hover:text-white transition-colors">
                  Sign in instead
                </Button>
              </div>

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center mt-6 leading-relaxed">
                By continuing, you agree to our{" "}
                <Link href="/terms-of-service" className="underline hover:text-white transition-colors">Terms</Link>
                {" "}and{" "}
                <Link href="/privacy-policy" className="underline hover:text-white transition-colors">Privacy Policy</Link>
              </p>
            </>
          )}

          {/* ─── STEP 2: Connect ─── */}
          {step === 2 && (
            <>
              <button onClick={handleBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-6 group">
                <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Change email
              </button>

              {isWorkspace ? (
                <>
                  <div className="text-center mb-8">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Workspace detected</h2>
                    <p className="text-gray-500 text-sm mt-2">
                      Creating account for <span className="text-gray-300 font-medium">{email.trim().toLowerCase()}</span>
                    </p>
                  </div>
                  <Button
                    onClick={handleGoogleSignUp}
                    disabled={isLoading}
                    className="w-full h-12 bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 hover:border-gray-400 transition-all duration-300 hover:scale-[1.01] font-medium"
                    size="lg"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-gray-600/30 border-t-gray-900 rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Connect Workspace Account
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Personal email detected</h2>
                    <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                      Mailient is optimized for <span className="text-white font-medium">Google Workspace</span> teams.
                      Personal accounts like <span className="text-gray-300">@{emailDomain}</span> will see an extra verification step.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleGoogleSignUp}
                      disabled={isLoading}
                      className="w-full h-12 bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all duration-300 font-medium"
                      size="lg"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Continue with @{emailDomain}</>
                      )}
                    </Button>
                    <p className="text-[10px] text-gray-600 text-center leading-relaxed px-4">
                      Click <span className="text-gray-400">Advanced</span> → <span className="text-gray-400">Go to Mailient</span> on Google's verification screen.
                    </p>
                  </div>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700/50" /></div>
                    <div className="relative flex justify-center text-[10px]">
                      <span className="px-3 bg-[#242424] text-gray-600 uppercase tracking-widest font-bold">Recommended</span>
                    </div>
                  </div>

                  <button onClick={handleBack} className="w-full h-12 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Use a work email instead
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}