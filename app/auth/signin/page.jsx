"use client";

import { useEffect, useState, Suspense, useRef } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, AlertCircle, Copy, ArrowLeft, Shield, ExternalLink, Building2, UserCog, CheckCircle2 } from 'lucide-react';

const PERSONAL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in',
  'outlook.com', 'hotmail.com', 'live.com', 'aol.com',
  'icloud.com', 'me.com', 'protonmail.com', 'proton.me',
  'zoho.com', 'mail.com', 'yandex.com', 'gmx.com',
  'fastmail.com', 'tutanota.com', 'hey.com'
];

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

// Admin email template for requesting Mailient approval
const ADMIN_EMAIL_TEMPLATE = `Subject: Approve Mailient for Google Workspace

Hi [Admin Name],

I'd like to use Mailient — an AI email assistant — with our Google Workspace.

It requires admin approval to connect. Here's what's needed:

1. Go to Google Admin → Security → API Controls
2. Select "Manage Third-Party App Access"
3. Add Mailient using Client ID: ${CLIENT_ID}
4. Set access to "Trusted"

It takes about 2 minutes. Mailient only requests read and send access to Gmail — no data is stored externally.

Thanks!`;

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [emailDomain, setEmailDomain] = useState('');
  const [isWorkspace, setIsWorkspace] = useState(null);
  const [isGmail, setIsGmail] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [step, setStep] = useState(1);
  const [showAdminGuide, setShowAdminGuide] = useState(false);
  const emailInputRef = useRef(null);

  const callbackUrl = searchParams?.get('callbackUrl') || '/onboarding';

  useEffect(() => {
    const urlError = searchParams?.get('error');
    if (urlError) {
      if (urlError === 'access-denied' || urlError === 'org_internal') {
        // OAuth was blocked — show admin approval modal
        setShowAdminModal(true);
        setStep(2);
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

    // Robust email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    const domain = trimmed.split('@')[1];
    setEmailDomain(domain);

    // Check if it's a personal Gmail (not workspace)
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      setIsGmail(true);
      setIsWorkspace(false);
      setStep(2); // Show the Gmail notice/button on step 2
      return;
    }

    const isPersonal = PERSONAL_DOMAINS.includes(domain);
    setIsGmail(false);
    setIsWorkspace(!isPersonal);

    if (!isPersonal) {
      // Step 2 for Workspace: Redirect to setup page
      router.push(`/workspace-setup?email=${encodeURIComponent(trimmed)}`);
    } else {
      // Other personal domains (@yahoo, @outlook, etc.)
      setStep(2);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use next-auth signIn with options for better error handling
      const result = await signIn('google', {
        callbackUrl: '/onboarding',
        login_hint: email.trim().toLowerCase()
      });

      // Note: If redirect is true (default), this might not be reached on success
      if (result?.error) {
        handleAuthError(result.error);
        setIsLoading(false);
      }
    } catch (err) {
      setError("A connection error occurred. Please check your network and try again.");
      setIsLoading(false);
    }
  };

  const handleAuthError = (errorType) => {
    switch (errorType) {
      case 'OAuthAccountNotLinked':
        setError("This email is already associated with another account.");
        break;
      case 'AccessDenied':
        setError("Access was denied. Please grant the required permissions to continue.");
        break;
      case 'Verification':
        setError("The verification link has expired or has already been used.");
        break;
      default:
        setError("An authentication error occurred. Please try again.");
    }
  };

  const copyToClipboard = (text, field) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (err) {
      setError("Failed to copy to clipboard.");
    }
  };

  const backToStep1 = () => {
    setStep(1);
    setError(null);
    setIsGmail(false);
    setShowAdminModal(false);
    setShowAdminGuide(false);
  };

  const benefits = [
    "100 AI-handled emails free",
    "Founder-grade response engine",
    "No credit card required",
    "Enterprise-level automation"
  ];

  // Components for Step 2
  const GmailWarning = () => (
    <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl mb-6">
      <div className="flex gap-3">
        <Shield className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" strokeWidth={2} />
        <div className="space-y-1">
          <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Unverified Application</h4>
          <p className="text-[11px] text-orange-200/50 block leading-relaxed font-light">
            Google has not yet verified this application for personal accounts. Accessing Mailient with a <span className="text-orange-300 font-medium">@gmail.com</span> address may trigger security warnings. By continuing, you acknowledge you understand the potential privacy implications as outlined in our security documentation.
          </p>
        </div>
      </div>
    </div>
  );

  const PremiumGoogleButton = () => (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="group relative w-full h-[52px] bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] rounded-[18px] transition-all duration-500 flex items-center justify-center p-[2px] overflow-hidden active:scale-[0.982]"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] via-transparent to-white/[0.02] pointer-events-none" />
      <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent skew-x-[25deg] -translate-x-full group-hover:translate-x-full transition-all duration-[1200ms] ease-out pointer-events-none" />

      <div className="relative w-full h-full bg-[#111111]/40 backdrop-blur-3xl rounded-[16px] flex items-center justify-center gap-3 border border-white/[0.05]">
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white/20 border-t-white animate-spin rounded-full" />
        ) : (
          <>
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform duration-500">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </div>
            <span className="text-[13px] text-white font-semibold tracking-tight">Sign in with Google</span>
          </>
        )}
      </div>
    </button>
  );

  // Step indicator
  const StepIndicator = ({ currentStep }) => (
    <div className="flex items-center gap-2 mb-10">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`
            w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-500
            ${s < currentStep ? 'bg-white text-black' :
              s === currentStep ? 'bg-white/10 text-white border border-white/20' :
                'bg-white/[0.03] text-white/20 border border-white/[0.06]'}
          `}>
            {s < currentStep ? <Check className="w-3 h-3" strokeWidth={2.5} /> : s}
          </div>
          {s < 3 && (
            <div className={`w-8 h-px transition-all duration-500 ${s < currentStep ? 'bg-white/30' : 'bg-white/[0.06]'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Dynamic blurred background accents */}
      <div className="absolute top-[20%] left-[10%] w-[40vw] h-[40vw] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[35vw] h-[35vw] bg-white/[0.015] rounded-full blur-[100px] pointer-events-none" />

      {/* Ultra-subtle monochrome film grain */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[940px] bg-white/[0.015] backdrop-blur-[60px] border border-white/[0.08] border-t-white/[0.12] rounded-[32px] shadow-[0_50px_120px_-20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden"
      >
        <div className="flex flex-col md:flex-row min-h-[540px]">

          {/* Left Section: Branding & Benefits */}
          <div className="md:w-[48%] p-10 sm:p-14 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/[0.05]">
            <div>
              <div className="mb-16 relative h-32 w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                <div
                  className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[20s] ease-linear group-hover:scale-110"
                  style={{ backgroundImage: "url('/cinematic-grain.png')" }}
                />
                <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat scale-150 group-hover:scale-100 transition-transform duration-[10s] ease-linear" />
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[3s] ease-in-out" />
                <div className="relative z-10 w-full h-full flex items-end justify-start p-6">
                  <span className="text-white text-2xl font-light tracking-[0.3em] lowercase select-none">mailient</span>
                </div>
              </div>

              <h1 className="text-4xl sm:text-5xl font-medium text-white mb-8 tracking-tighter leading-[1.1]">
                Sign in to <br /> continue
              </h1>

              <p className="text-white/40 text-sm font-medium tracking-tight max-w-[280px] leading-relaxed mb-12">
                Accelerate your email workflow with founder-grade artificial intelligence.
              </p>

              <div className="space-y-6">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm text-white/70">
                    <div className="w-5 h-5 rounded-full border border-white/5 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" strokeWidth={2} />
                    </div>
                    <span className="font-medium tracking-tight">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Section: Auth Flows */}
          <div className="flex-1 p-10 sm:p-14 flex flex-col justify-center bg-white/[0.01]">
            <AnimatePresence mode="wait">

              {/* ──────────── STEP 1: Email Entry ──────────── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-[340px] mx-auto md:mx-0"
                >
                  <StepIndicator currentStep={1} />

                  <div className="mb-10">
                    <h2 className="text-white text-lg font-medium tracking-tight mb-2">Welcome back</h2>
                    <p className="text-white/30 text-xs font-medium">Enter your email address to access your workspace.</p>
                  </div>

                  {error && (
                    <div className="mb-6 p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex gap-3 items-center">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" strokeWidth={1.5} />
                      <p className="text-[11px] text-red-200/60 font-medium">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div className="relative group">
                      <input
                        ref={emailInputRef}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className="w-full h-11 px-0 bg-transparent border-b border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-white transition-all text-sm font-medium pb-2 rounded-none"
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
                      onClick={() => router.push('/auth/signup')}
                      className="text-white/20 hover:text-white text-xs font-medium tracking-tight transition-colors"
                    >
                      no account? <span className="text-white/40 border-b border-white/10 ml-1">create one</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ──────────── STEP 2: Identity Handling ──────────── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-[340px] mx-auto md:mx-0"
                >
                  <StepIndicator currentStep={2} />

                  <button
                    onClick={backToStep1}
                    className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-xs font-light mb-8 group w-fit"
                  >
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                    use different email
                  </button>

                  {/* Email identity card */}
                  <div className="p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium uppercase tracking-widest text-white/20">Identity</span>
                      <span className={`text-[10px] font-medium uppercase tracking-widest ${isGmail ? 'text-white/40' : 'text-white/20'}`}>
                        {isGmail ? 'Personal Gmail' : 'Personal'}
                      </span>
                    </div>
                    <div className="text-white font-medium truncate text-sm tracking-tight">
                      {email}
                    </div>
                  </div>

                  {/* Error display for Step 2 */}
                  {error && (
                    <div className="mb-6 p-3 bg-red-500/5 border border-red-500/20 rounded-lg flex gap-3 items-center">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" strokeWidth={1.5} />
                      <p className="text-[11px] text-red-200/60 font-medium">{error}</p>
                    </div>
                  )}

                  {/* ── Gmail path ── */}
                  {isGmail ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="space-y-4"
                    >
                      <GmailWarning />
                      <PremiumGoogleButton />
                    </motion.div>
                  ) : (
                    /* ── Other Personal path ── */
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl space-y-5">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-white/40" strokeWidth={1.5} />
                          </div>
                          <div>
                            <h3 className="text-white text-sm font-medium tracking-tight mb-2">Workspace Preferred</h3>
                            <p className="text-white/35 text-xs leading-relaxed font-light">
                              Mailient is optimized for <span className="text-white/60">Google Workspace</span>.
                              Personal accounts may experience limited functionality or security warnings.
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-white/[0.06] pt-5 space-y-3">
                          <PremiumGoogleButton />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* ──────────── STEP 3: Admin Direct Install ──────────── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full max-w-[340px] mx-auto md:mx-0"
                >
                  <StepIndicator currentStep={3} />

                  <button
                    onClick={() => { setStep(2); setShowAdminGuide(false); }}
                    className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-xs font-light mb-8 group w-fit"
                  >
                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                    back
                  </button>

                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                        <UserCog className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                      </div>
                      <h2 className="text-white text-base font-light tracking-tight">Admin Setup</h2>
                    </div>
                    <p className="text-white/30 text-xs font-light leading-relaxed">
                      Since you&apos;re the admin, follow these steps to approve Mailient for your workspace, then connect your account.
                    </p>
                  </div>

                  {/* Admin steps */}
                  <div className="space-y-4 mb-8">
                    {[
                      {
                        step: '1',
                        title: 'Open Google Admin Console',
                        desc: 'Navigate to Security → API Controls → Manage Third-Party App Access',
                        link: 'https://admin.google.com/ac/owl/list?tab=configuredApps',
                        linkText: 'Open Admin Console'
                      },
                      {
                        step: '2',
                        title: 'Add Mailient',
                        desc: 'Click "Configure new app" → search by Client ID:',
                        copyable: CLIENT_ID
                      },
                      {
                        step: '3',
                        title: 'Set access to Trusted',
                        desc: 'Select the app, choose your organizational unit, and set access to "Trusted".'
                      }
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-semibold text-white/50">{item.step}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 text-xs font-medium tracking-tight mb-1">{item.title}</p>
                            <p className="text-white/30 text-[11px] leading-relaxed font-light">{item.desc}</p>

                            {item.copyable && (
                              <div className="mt-2 flex items-center gap-2">
                                <code className="flex-1 text-[10px] font-mono text-white/60 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 truncate">
                                  {item.copyable || 'unconfigured'}
                                </code>
                                <button
                                  onClick={() => copyToClipboard(item.copyable, `step${item.step}`)}
                                  className="shrink-0 p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-all"
                                >
                                  {copiedField === `step${item.step}` ? (
                                    <CheckCircle2 className="w-3 h-3 text-white/60" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-white/40" />
                                  )}
                                </button>
                              </div>
                            )}

                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors font-light"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {item.linkText}
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* After approval, connect */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                  >
                    <button
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="w-full h-12 bg-white text-black rounded-[14px] font-semibold text-sm hover:bg-[#F5F5F5] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50 active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          I&apos;ve approved — Connect now
                        </>
                      )}
                    </button>
                    <p className="text-center text-[10px] text-white/15 mt-3 font-light">
                      Make sure you&apos;ve completed the steps above before connecting.
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div >

      {/* ──────────── Admin Approval Modal (shown on OAuth block) ──────────── */}
      < AnimatePresence >
        {showAdminModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-[#0E0E0E] border border-white/[0.08] border-t-white/10 rounded-[20px] shadow-[0_45px_120px_rgba(0,0,0,0.95)] overflow-hidden"
            >
              <div className="p-10 sm:p-12 space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                      <Shield className="w-6 h-6 text-white/50" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h2 className="text-xl text-white font-light tracking-tight">Admin Approval Required</h2>
                      <p className="text-white/25 text-xs font-light mt-1">
                        Your workspace admin must authorize Mailient.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowAdminModal(false)} className="text-white/15 hover:text-white/50 transition-colors p-1">
                    <ArrowRight className="w-5 h-5 rotate-[-45deg]" strokeWidth={1.5} />
                  </button>
                </div>

                {/* Email Template */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/25">Email Template for Admin</span>
                    <button
                      onClick={() => copyToClipboard(ADMIN_EMAIL_TEMPLATE, 'template')}
                      className="text-[10px] font-semibold uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-2"
                    >
                      {copiedField === 'template' ? (
                        <><CheckCircle2 className="w-3 h-3" /> copied</>
                      ) : (
                        <><Copy className="w-3 h-3" /> copy template</>
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-white/50 bg-white/[0.02] p-5 border border-white/[0.06] rounded-xl leading-relaxed max-h-[160px] overflow-y-auto whitespace-pre-wrap custom-scrollbar">
                    {ADMIN_EMAIL_TEMPLATE}
                  </div>
                </div>

                {/* Admin Guide Steps */}
                <div className="space-y-3">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-white/25">Admin Guide (3 Steps)</span>
                  <div className="space-y-2">
                    {[
                      'Open Google Admin → Security → API Controls',
                      "Select 'Manage Third-Party App Access' → Add Mailient by Client ID",
                      "Set access level to 'Trusted' for your organization"
                    ].map((stepText, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.015] border border-white/[0.05] rounded-xl">
                        <div className="w-5 h-5 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-white/50">{i + 1}</span>
                        </div>
                        <p className="text-[11px] text-white/40 font-light leading-relaxed">{stepText}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Client ID for reference */}
                <div className="p-4 bg-white/[0.015] border border-white/[0.06] rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-white/25">OAuth Client ID</span>
                    <button
                      onClick={() => copyToClipboard(CLIENT_ID, 'clientid')}
                      className="text-[10px] font-semibold uppercase tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-2"
                    >
                      {copiedField === 'clientid' ? 'copied' : 'copy'}
                    </button>
                  </div>
                  <code className="text-[11px] font-mono text-white/60 break-all leading-relaxed">
                    {CLIENT_ID || 'unconfigured_client_id'}
                  </code>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowAdminModal(false)}
                    className="flex-1 h-11 bg-white/[0.04] hover:bg-white/[0.08] text-white/60 rounded-[14px] font-medium text-sm transition-all border border-white/[0.06]"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowAdminModal(false);
                      setStep(3);
                    }}
                    className="flex-1 h-11 bg-white text-black rounded-[14px] font-semibold text-sm hover:bg-[#F5F5F5] hover:-translate-y-0.5 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <UserCog className="w-4 h-4" />
                    I am the Admin
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )
        }
      </AnimatePresence >
    </div >
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-4 h-4 border border-white/20 border-t-white animate-spin rounded-full" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
