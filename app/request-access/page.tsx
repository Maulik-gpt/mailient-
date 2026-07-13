"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Mail,
  User,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";

export default function RequestAccessPage() {
  const [step, setStep] = useState<"form" | "submitting" | "success">("form");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [hasCard, setHasCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [slotsRemaining, setSlotsRemaining] = useState(45);
  const emailRef = useRef<HTMLInputElement>(null);

  // Focus email input on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Fetch live slot count
  useEffect(() => {
    fetch("/api/access-request/count")
      .then((r) => r.json())
      .then((d) => {
        if (d.remaining != null) setSlotsRemaining(d.remaining);
      })
      .catch(() => {
        // Fallback to default
      });
  }, []);

  // Fire confetti on success
  useEffect(() => {
    if (step !== "success") return;
    const duration = 2.5 * 1000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ["#ffffff", "#a1a1aa", "#52525b"],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ["#ffffff", "#a1a1aa", "#52525b"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!hasCard) {
      setError(
        "Mailient requires an international payment card (Visa, Mastercard, or Amex) to start a trial."
      );
      return;
    }

    setStep("submitting");

    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          name: trimmedName,
          xHandle: xHandle.trim(),
          hasInternationalCard: hasCard,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setStep("form");
        return;
      }

      setSuccessMessage(data.message);

      if (data.slotsRemaining != null) {
        setSlotsRemaining(data.slotsRemaining);
      }

      setStep("success");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStep("form");
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start relative overflow-x-hidden font-inter strichpunkt-theme selection:bg-white selection:text-black">
      
      {/* Liquid Glass / Strichpunkt font styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .strichpunkt-theme {
          font-family: 'Strichpunkt Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .strichpunkt-theme :not(.font-mono):not([class*="font-mono"]):not(code):not(pre) {
          font-family: 'Strichpunkt Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
      `}} />

      {/* SVG filter for glass distortion */}
      <svg className="hidden pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <filter id="glass-liquid-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="1" seed="5" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Atmospheric lighting */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_60%)]" />
        <div className="absolute top-[30%] left-[10%] w-[400px] h-[400px] bg-white/[0.005] blur-[150px] rounded-full" />
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-white/[0.005] blur-[150px] rounded-full" />
      </div>

      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl mx-auto px-6 pt-10 z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180 text-neutral-500" />
          Back to Mailient
        </Link>
      </motion.div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 w-full max-w-xl mx-auto z-10">
        
        {/* Frosted Glass Card Wrapper */}
        <div className="relative w-full rounded-[28px] p-8 md:p-10 shadow-[0_50px_100px_rgba(0,0,0,0.85)] border border-white/[0.08] overflow-hidden bg-neutral-950/20">
          
          {/* Glass Distortion Layers */}
          <div 
            className="absolute inset-0 z-0 backdrop-blur-[24px]"
            style={{
              filter: "url(#glass-liquid-filter)",
              isolation: "isolate",
            }}
          />
          <div className="absolute inset-0 z-[1] bg-white/[0.02]" />
          <div 
            className="absolute inset-0 z-[2] rounded-[28px] pointer-events-none"
            style={{
              boxShadow: "inset 1px 1px 1px 0 rgba(255, 255, 255, 0.1), inset -1px -1px 1px 1px rgba(255, 255, 255, 0.02)"
            }}
          />

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              
              {/* ─── FORM STATE ─── */}
              {(step === "form" || step === "submitting") && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  {/* Slots badge */}
                  <div className="flex justify-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      <span className="text-[10px] font-medium text-neutral-400">
                        {slotsRemaining} of 45 founding slots remaining
                      </span>
                    </div>
                  </div>

                  {/* Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-2.5">
                      Request founding access
                    </h1>
                    <p className="text-neutral-400 text-sm leading-relaxed max-w-sm mx-auto font-light">
                      Mailient is currently in private beta. Submit your details to request access to our autonomous email client.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Name Input */}
                    <div className="space-y-1.5">
                      <label htmlFor="request-name" className="block text-[11px] font-medium text-neutral-500 ml-1">
                        Full name
                      </label>
                      <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] focus-within:border-white/20 transition-all duration-300">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                        <input
                          id="request-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Patrick Jane"
                          disabled={step === "submitting"}
                          className="w-full h-11 bg-transparent pl-11 pr-4 text-sm font-light text-white focus:outline-none placeholder:text-neutral-700 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label htmlFor="request-email" className="block text-[11px] font-medium text-neutral-500 ml-1">
                        Email address
                      </label>
                      <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] focus-within:border-white/20 transition-all duration-300">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                        <input
                          ref={emailRef}
                          id="request-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="jane@company.com"
                          disabled={step === "submitting"}
                          className="w-full h-11 bg-transparent pl-11 pr-4 text-sm font-light text-white focus:outline-none placeholder:text-neutral-700 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* X Handle Input */}
                    <div className="space-y-1.5">
                      <label htmlFor="request-x-handle" className="block text-[11px] font-medium text-neutral-500 ml-1">
                        X Handle (Optional)
                      </label>
                      <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] focus-within:border-white/20 transition-all duration-300">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 font-medium text-xs flex items-center justify-center">@</span>
                        <input
                          id="request-x-handle"
                          type="text"
                          value={xHandle}
                          onChange={(e) => setXHandle(e.target.value)}
                          placeholder="maulik_5"
                          disabled={step === "submitting"}
                          className="w-full h-11 bg-transparent pl-11 pr-4 text-sm font-light text-white focus:outline-none placeholder:text-neutral-700 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* International Card Checkbox */}
                    <div className="pt-2">
                      <label htmlFor="intl-card-check" className="flex items-start gap-3 cursor-pointer group select-none">
                        <div className="relative mt-0.5 shrink-0">
                          <input
                            id="intl-card-check"
                            type="checkbox"
                            checked={hasCard}
                            onChange={(e) => setHasCard(e.target.checked)}
                            disabled={step === "submitting"}
                            className="sr-only peer"
                          />
                          <div className="w-5 h-5 rounded-md border border-white/[0.12] bg-white/[0.02] peer-checked:bg-white peer-checked:border-white transition-all duration-300 flex items-center justify-center">
                            {hasCard && <Check className="w-3.5 h-3.5 text-black" />}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-neutral-300 font-light group-hover:text-white transition-colors">
                            I have an international payment card
                          </span>
                          <span className="text-[11px] text-neutral-600 mt-0.5 flex items-center gap-1.5 font-light">
                            <CreditCard className="w-3 h-3 text-neutral-600" />
                            Visa, Mastercard, or Amex required for trial activation
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Error display */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/[0.04] border border-rose-500/20">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-rose-300 leading-relaxed font-light">
                              {error}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={step === "submitting"}
                      id="request-access-submit"
                      className="w-full h-12 mt-4 bg-white text-black rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-neutral-200 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {step === "submitting" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Request early access
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Direct Contact / X option for instant review */}
                  <div className="mt-6 pt-5 border-t border-white/[0.06] text-center">
                    <p className="text-xs text-neutral-500 font-light">
                      Want to skip the queue? Chat with Maulik directly on X{" "}
                      <a
                        href="https://x.com/messages/compose?recipient_id=maulik_5"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-300 hover:text-white underline underline-offset-2 transition-all inline-flex items-center gap-0.5"
                      >
                        @maulik_5 <ExternalLink className="w-2.5 h-2.5" />
                      </a>{" "}
                      to get approved instantly.
                    </p>
                  </div>

                  {/* Trust Signals */}
                  <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-neutral-600 font-light">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Client-side encrypted
                    </span>
                    <span className="w-px h-2.5 bg-neutral-800" />
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> Gmail compatible
                    </span>
                  </div>

                  {/* Back to sign in */}
                  <p className="text-center mt-6 text-xs text-neutral-500 font-light">
                    Already approved?{" "}
                    <Link
                      href="/auth/signin"
                      className="text-neutral-300 hover:text-white underline underline-offset-2 transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </motion.div>
              )}

              {/* ─── SUCCESS STATE ─── */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full text-center"
                >
                  <div className="flex justify-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-neutral-300 animate-pulse" />
                    </div>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-3">
                    Request submitted
                  </h1>

                  <p className="text-neutral-400 text-sm leading-relaxed max-w-sm mx-auto mb-6 font-light">
                    {successMessage || "We will review your request and send you a link within 24 hours."}
                  </p>

                  {/* Direct validation helper */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 text-left mb-6">
                    <p className="text-[11px] font-medium text-neutral-500 mb-3.5">
                      What happens next
                    </p>
                    <div className="space-y-3">
                      {[
                        { num: "1", text: "We review your request details." },
                        { num: "2", text: "You get approved and receive the onboarding link." },
                        { num: "3", text: "Connect Gmail, active your trial, and start shipping." },
                      ].map((item) => (
                        <div key={item.num} className="flex items-start gap-3 text-xs font-light">
                          <span className="w-5 h-5 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[10px] text-neutral-400 shrink-0 mt-0.5">
                            {item.num}
                          </span>
                          <span className="text-neutral-400 leading-relaxed">
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skip Queue with X message */}
                  <div className="mb-6 p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] text-xs text-neutral-400 font-light leading-relaxed">
                    Want instant approval? Message Maulik at{" "}
                    <a
                      href="https://x.com/messages/compose?recipient_id=maulik_5"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white underline underline-offset-2 hover:text-neutral-200"
                    >
                      @maulik_5 on X
                    </a>{" "}
                    with your request email to skip the review queue.
                  </div>

                  {/* Back Link */}
                  <Link
                    href="/"
                    className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors inline-flex items-center gap-1.5 font-light"
                  >
                    ← Back to Mailient
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
