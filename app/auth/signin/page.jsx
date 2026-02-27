"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';

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

  // Check for OAuth errors (e.g., admin blocked the app)
  useEffect(() => {
    const urlError = searchParams?.get('error');
    if (urlError) {
      if (urlError === 'access-denied' || urlError === 'org_internal') {
        // Likely blocked by Workspace admin
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

  // Handle email submission
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

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn('google', {
        redirectTo: '/onboarding',
        login_hint: email.trim().toLowerCase(),
      });
    } catch (error) {
      console.error('Sign in error:', error);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Generate admin email template
  const adminEmailTemplate = `Hi,

I'd like to use Mailient (mailient.xyz) for AI-powered email management with our team.

Could you please approve it in our Google Workspace Admin Console? Here's how:

1. Go to admin.google.com → Security → API Controls → App Access Control
2. Click "Add app" → "OAuth App Name or Client ID"
3. Search for Client ID: ${CLIENT_ID || '[Ask your developer for the OAuth Client ID]'}
4. Set access to "Trusted"

This takes about 60 seconds. Once done, our team can sign in immediately.

More info: https://mailient.xyz

Thanks!`;

  // Reset to email input
  const handleBack = () => {
    setStep(1);
    setIsWorkspace(null);
    setEmailDomain('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 animate-float" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#404040]/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#404040]/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-[#171717]/40 backdrop-blur-xl border border-gray-600/30 rounded-2xl p-8 shadow-2xl animate-fade-in">

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* ─── STEP 1: Email Input ─── */}
          {step === 1 && (
            <>
              <div className="text-center mb-8">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl border border-white/10 overflow-hidden">
                  <img src="/logo-new.png" alt="Mailient" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-2xl font-bold text-gray-100">
                  Sign in to Mailient
                </h1>
                <p className="text-gray-500 text-sm mt-2">
                  Enter your work email to get started
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full h-12 px-4 bg-black/60 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all text-sm"
                    autoFocus
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-white text-black hover:bg-gray-200 font-semibold transition-all duration-300 hover:scale-[1.01]"
                  disabled={!email.includes('@')}
                >
                  Continue
                </Button>
              </form>

              {/* Workspace badge */}
              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-gray-600">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Built for Google Workspace teams
              </div>
            </>
          )}

          {/* ─── STEP 2: Connect or Blocked ─── */}
          {step === 2 && (
            <>
              {/* Back button */}
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-6 group"
              >
                <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Change email
              </button>

              {isWorkspace ? (
                /* ── Workspace domain detected ── */
                <>
                  <div className="text-center mb-8">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      Workspace detected
                    </h2>
                    <p className="text-gray-500 text-sm mt-2">
                      Signing in as <span className="text-gray-300 font-medium">{email.trim().toLowerCase()}</span>
                    </p>
                  </div>

                  <Button
                    onClick={handleGoogleSignIn}
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

                  {/* What if blocked */}
                  <button
                    onClick={() => setShowAdminModal(true)}
                    className="w-full mt-4 text-center text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Blocked by your organization? Get admin approval →
                  </button>
                </>
              ) : (
                /* ── Personal email detected ── */
                <>
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      Personal email detected
                    </h2>
                    <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
                      Mailient is optimized for <span className="text-white font-medium">Google Workspace</span> teams.
                      Personal accounts like <span className="text-gray-300">@{emailDomain}</span> will see an extra verification step from Google.
                    </p>
                  </div>

                  {/* Continue anyway */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="w-full h-12 bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all duration-300 font-medium"
                      size="lg"
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          Continue with @{emailDomain}
                        </>
                      )}
                    </Button>

                    <p className="text-[10px] text-gray-600 text-center leading-relaxed px-4">
                      You'll see a "Google hasn't verified this app" screen.
                      Click <span className="text-gray-400">Advanced</span> → <span className="text-gray-400">Go to Mailient</span> to continue safely.
                    </p>
                  </div>

                  {/* Separator */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700/50" />
                    </div>
                    <div className="relative flex justify-center text-[10px]">
                      <span className="px-3 bg-[#171717] text-gray-600 uppercase tracking-widest font-bold">
                        Recommended
                      </span>
                    </div>
                  </div>

                  {/* Use work email instead */}
                  <button
                    onClick={handleBack}
                    className="w-full h-12 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm font-semibold hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Use a work email instead
                  </button>
                </>
              )}
            </>
          )}

          {/* Sign up / Sign in toggle (step 1 only) */}
          {step === 1 && (
            <>
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600/50" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#171717] text-gray-100">New to Mailient?</span>
                </div>
              </div>
              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/auth/signup')}
                  className="text-gray-100 hover:text-white transition-colors"
                >
                  Create an account
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Admin Approval Modal ─── */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowAdminModal(false)}>
          <div
            className="w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Admin Approval Required</h3>
                    <p className="text-xs text-gray-500">Share these instructions with your IT admin</p>
                  </div>
                </div>
                <button onClick={() => setShowAdminModal(false)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* 3-Step Guide */}
              <div className="space-y-4">
                {[
                  {
                    num: 1,
                    title: "Open API Controls",
                    desc: "Go to admin.google.com → Security → API Controls → App Access Control",
                  },
                  {
                    num: 2,
                    title: "Add Mailient by Client ID",
                    desc: `Click "Add app" → "OAuth App Name or Client ID" → paste:`,
                    copyable: CLIENT_ID,
                  },
                  {
                    num: 3,
                    title: 'Set to "Trusted"',
                    desc: "Select Mailient, set access to Trusted. Your entire team can now sign in.",
                  },
                ].map((s) => (
                  <div key={s.num} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-sm font-bold text-white">
                      {s.num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                      {s.copyable && (
                        <div className="mt-2 flex items-center gap-2">
                          <code className="flex-1 text-xs text-white font-mono bg-black/50 border border-white/10 rounded-lg px-3 py-2 truncate">
                            {s.copyable}
                          </code>
                          <button
                            onClick={() => copyToClipboard(s.copyable, 'clientId')}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                          >
                            {copiedField === 'clientId' ? (
                              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5" />

              {/* Copy Email Template */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email template for your admin</p>
                  <button
                    onClick={() => copyToClipboard(adminEmailTemplate, 'email')}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    {copiedField === 'email' ? (
                      <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> Copy email</>
                    )}
                  </button>
                </div>
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-xs text-gray-400 leading-relaxed whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                  {adminEmailTemplate}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Takes ~60 seconds for your admin
              </div>
              <Button
                onClick={() => setShowAdminModal(false)}
                className="bg-white text-black hover:bg-gray-200 rounded-xl px-6 h-9 text-sm font-semibold"
              >
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
