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

// X logo icon
const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function RequestAccessPage() {
  const [step, setStep] = useState<"form" | "submitting" | "success">("form");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
        // keep default
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
          hasInternationalCard: hasCard,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setStep("form");
        return;
      }

      if (data.alreadyApproved) {
        setSuccessMessage(data.message);
      } else if (data.alreadyRequested) {
        setSuccessMessage(data.message);
      } else {
        setSuccessMessage(data.message);
      }

      if (data.slotsRemaining != null) {
        setSlotsRemaining(data.slotsRemaining);
      }

      setStep("success");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStep("form");
    }
  };

  const shareText = `Just requested founding access to @mailient — AI that runs your inbox while you build your company. Only ${slotsRemaining} spots left. Check it out: https://mailient.xyz`;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start relative overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_60%)]" />
        <div className="absolute top-1/3 left-[10%] w-[500px] h-[500px] bg-white/[0.008] blur-[150px] rounded-full" />
        <div className="absolute bottom-1/4 right-[10%] w-[500px] h-[500px] bg-white/[0.008] blur-[150px] rounded-full" />
      </div>

      {/* Back to home */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-2xl mx-auto px-6 pt-8 z-10"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          Back to Mailient
        </Link>
      </motion.div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 w-full max-w-2xl mx-auto z-10">
        <AnimatePresence mode="wait">
          {/* ─── FORM STATE ─── */}
          {(step === "form" || step === "submitting") && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md"
            >
              {/* Slots badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="flex justify-center mb-8"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    {slotsRemaining} of 45 founding slots remaining
                  </span>
                </div>
              </motion.div>

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center mb-10"
              >
                <h1 className="text-3xl md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1] mb-4 bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent">
                  Request Founding Access
                </h1>
                <p className="text-zinc-500 text-sm md:text-[15px] leading-relaxed max-w-sm mx-auto font-light">
                  Mailient is in private beta. Submit your details and we'll
                  review your request within 24 hours.
                </p>
              </motion.div>

              {/* Form */}
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Name */}
                <div>
                  <label
                    htmlFor="request-name"
                    className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2 ml-1"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      id="request-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      disabled={step === "submitting"}
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] focus:border-white/20 rounded-xl pl-11 pr-4 text-sm font-medium focus:outline-none transition-all placeholder:text-zinc-700 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="request-email"
                    className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2 ml-1"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                    <input
                      ref={emailRef}
                      id="request-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@company.com"
                      disabled={step === "submitting"}
                      className="w-full h-12 bg-white/[0.03] border border-white/[0.08] focus:border-white/20 rounded-xl pl-11 pr-4 text-sm font-medium focus:outline-none transition-all placeholder:text-zinc-700 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* International Card Checkbox */}
                <div className="pt-2">
                  <label
                    htmlFor="intl-card-check"
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        id="intl-card-check"
                        type="checkbox"
                        checked={hasCard}
                        onChange={(e) => setHasCard(e.target.checked)}
                        disabled={step === "submitting"}
                        className="sr-only peer"
                      />
                      <div className="w-5 h-5 rounded-md border border-white/[0.12] bg-white/[0.03] peer-checked:bg-white peer-checked:border-white transition-all flex items-center justify-center">
                        {hasCard && (
                          <Check className="w-3.5 h-3.5 text-black" />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-300 font-medium leading-snug group-hover:text-white transition-colors">
                        I have an international payment card
                      </span>
                      <span className="text-[11px] text-zinc-600 mt-0.5 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        Visa, Mastercard, or Amex required for trial activation
                      </span>
                    </div>
                  </label>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/[0.08] border border-red-500/20">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300 leading-relaxed">
                          {error}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={step === "submitting"}
                  id="request-access-submit"
                  className="w-full h-13 mt-4 bg-white text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-[0_20px_40px_rgba(255,255,255,0.06)]"
                >
                  {step === "submitting" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Request Early Access
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>

              {/* Trust signals */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-8 flex items-center justify-center gap-5 text-[10px] text-zinc-600 uppercase tracking-[0.15em] font-bold"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" /> Encrypted
                </span>
                <span className="w-px h-3 bg-zinc-800" />
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Gmail Compatible
                </span>
                <span className="w-px h-3 bg-zinc-800" />
                <span>SOC-2 Ready</span>
              </motion.div>

              {/* Already have access? */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center mt-6 text-xs text-zinc-600"
              >
                Already approved?{" "}
                <Link
                  href="/auth/signin"
                  className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Sign in here
                </Link>
              </motion.p>
            </motion.div>
          )}

          {/* ─── SUCCESS STATE ─── */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-md text-center"
            >
              {/* Success badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", damping: 15 }}
                className="flex justify-center mb-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-zinc-300" />
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl md:text-[40px] font-bold tracking-[-0.03em] leading-[1.1] mb-4 bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent"
              >
                Request Submitted
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-zinc-400 text-sm md:text-[15px] leading-relaxed max-w-sm mx-auto mb-8"
              >
                {successMessage ||
                  "We'll review your request and send you a sign-up link within 24 hours."}
              </motion.p>

              {/* What happens next */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 mb-8 text-left"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-4">
                  What happens next
                </p>
                <div className="space-y-3">
                  {[
                    {
                      num: "1",
                      text: "We review your request (usually within a few hours)",
                    },
                    {
                      num: "2",
                      text: "You'll receive an approval email with a sign-up link",
                    },
                    {
                      num: "3",
                      text: "Connect Gmail, complete onboarding, start your trial",
                    },
                    {
                      num: "4",
                      text: "Wake up to your first morning briefing — not Gmail",
                    },
                  ].map((item) => (
                    <div
                      key={item.num}
                      className="flex items-start gap-3 text-[13px]"
                    >
                      <span className="w-5 h-5 rounded-md bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 mt-0.5">
                        {item.num}
                      </span>
                      <span className="text-zinc-400 leading-relaxed">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Share on X */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={() => {
                    window.open(
                      `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
                      "_blank"
                    );
                  }}
                  id="share-request-on-x"
                  className="w-full h-13 bg-white text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 hover:bg-zinc-200 transition-all active:scale-[0.98] cursor-pointer shadow-[0_20px_40px_rgba(255,255,255,0.06)]"
                >
                  <XIcon className="w-4 h-4" />
                  Share on X to skip the queue
                </button>
              </motion.div>

              {/* Bottom links */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 flex items-center justify-center gap-4"
              >
                <Link
                  href="/"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Back to Mailient
                </Link>
                <span className="w-px h-3 bg-zinc-800" />
                <a
                  href="https://x.com/maulik_5"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
                >
                  Follow @maulik_5
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative watermark */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.015 }}
        transition={{ delay: 0.8, duration: 1.5 }}
        className="text-white text-[10vw] font-black uppercase select-none pointer-events-none absolute bottom-0 leading-none whitespace-nowrap"
      >
        FOUNDING ACCESS • MAILIENT
      </motion.p>
    </div>
  );
}
