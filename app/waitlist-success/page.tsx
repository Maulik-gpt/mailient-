"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, CheckCircle2, Copy, Check, Flame, Award, Lock, ShieldCheck, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

// Premium X logo icon SVG
const XIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function WaitlistSuccessPage() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate a short unique string for default link code
  useEffect(() => {
    const randomHex = Math.random().toString(36).substring(2, 7);
    setReferralCode(`founder_${randomHex}`);
  }, []);

  // Fire elegant black/white/silver theme confetti shower on success landing
  useEffect(() => {
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

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only alphanumeric characters, underscores and dashes
    const sanitized = val.replace(/[^a-zA-Z0-9_-]/g, "");
    if (sanitized.length <= 15) {
      setReferralCode(sanitized);
    }
  };

  const referralLink = `https://mailient.com/?ref=${referralCode || "founder"}`;
  
  const shareText = `Hey! I just secured my spot on the Mailient waitlist. They’re building AI automation specifically for founders. Only 85 spots left in beta, and I'm pushing to get in. If you're tired of inbox chaos, check it out here: ${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      // Small sparkle confetti on copy click
      confetti({
        particleCount: 15,
        spread: 40,
        origin: { y: 0.8 },
        colors: ["#ffffff", "#e4e4e7"]
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleShareOnX = () => {
    const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, "_blank");
  };

  /* 
    ========================================================================
    HIGH TECH REFERRAL INTEGRATION GUIDE (ViralLoops / KickoffLabs / Rewardful)
    ========================================================================
    To completely automate referral tracking and queue jumping in the future:
    
    1. VIRAL-LOOPS INTEGRATION:
       Embed their JS script dynamically in layout.tsx or in this page:
       
       useEffect(() => {
         window.viralLoops = window.viralLoops || [];
         window.viralLoops.push({
           campaignId: "YOUR_CAMPAIGN_ID",
         });
         
         const script = document.createElement("script");
         script.src = "https://viral-loops.com/widgets.js";
         script.async = true;
         document.body.appendChild(script);
         
         return () => {
           document.body.removeChild(script);
         };
       }, []);
       
       Get user's tracking link using the Viral Loops Javascript API:
       const userReferralLink = window.viralLoops?.getUser()?.referralLink || referralLink;

    2. REWARDFUL INTEGRATION:
       Embed their tracking script tag in Next.js. Visitor clicks on custom links
       ending in `?via=code` will be recorded automatically via cookies and synced
       with Stripe/CRM.
    ========================================================================
  */

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start py-12 px-4 md:px-8 relative overflow-hidden font-satoshi">
      {/* Dynamic Background Ambient Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/10 w-[500px] h-[500px] bg-white/[0.01] blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/10 w-[500px] h-[500px] bg-white/[0.01] blur-[150px] rounded-full pointer-events-none" />

      {/* Success Notification Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8"
      >
        <Sparkles className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400">Position Secured & Confirmed</span>
      </motion.div>

      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-[56px] font-black tracking-tight leading-[1.08] mb-5 bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent"
        >
          You’re in. Want to skip the wait?
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed"
        >
          Invite 3 fellow founders to unlock your{" "}
          <span className="text-white font-semibold">Founding Operator badge</span>, early access, and a lifetime discount.
        </motion.p>
      </div>

      {/* Main Referral Board / Queue Jumper Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 90, delay: 0.4 }}
        className="relative z-10 max-w-2xl w-full bg-zinc-950/40 backdrop-blur-3xl border border-white/10 p-6 md:p-10 rounded-[36px] shadow-[0_30px_70px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Glowing Ambient Corners */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.03] blur-[30px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/[0.03] blur-[30px] rounded-full pointer-events-none" />

        {/* Gamified Reward Tracker Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Your Status</p>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white">Founding Operator</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-zinc-900 border border-white/10 text-zinc-400">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              </div>
            </div>
          </div>

          {/* Gamified progress indicator */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Referral Progress</p>
              <p className="text-xs font-bold text-white"><span className="text-zinc-400">0 of 3</span> invited</p>
            </div>
            <div className="w-20 bg-zinc-900 h-2 rounded-full overflow-hidden border border-white/5">
              <div className="bg-white h-full w-[10%] rounded-full" />
            </div>
          </div>
        </div>

        {/* STEP 1: Personalize Referral Link */}
        <div className="mb-6">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
            1. Personalize Your Invite Link
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 text-xs font-medium text-zinc-600 select-none">
              mailient.com/?ref=
            </span>
            <input
              type="text"
              value={referralCode}
              onChange={handleCodeChange}
              placeholder="yourname"
              id="referral-input"
              className="w-full h-12 bg-white/[0.03] border border-white/10 focus:border-white/30 rounded-xl pl-[124px] pr-4 text-sm font-semibold focus:outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1.5 ml-1">
            Alphanumeric characters, underscores, and dashes only.
          </p>
        </div>

        {/* STEP 2: Pre-written template */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              2. Pre-written Template
            </label>
            <span className="text-[10px] text-zinc-500 italic">Copy to send in DMs or emails</span>
          </div>

          <div className="relative group/template rounded-2xl bg-white/[0.02] border border-white/5 p-4 md:p-5 transition-colors hover:bg-white/[0.04]">
            <p className="text-xs text-zinc-300 leading-relaxed font-sans pr-12">
              &quot;Hey! I just secured my spot on the Mailient waitlist. They’re building AI automation specifically for founders. Only 85 spots left in beta, and I&apos;m pushing to get in. If you&apos;re tired of inbox chaos, check it out here:{" "}
              <span className="text-white font-mono underline decoration-zinc-600 select-all font-semibold">
                {referralLink}
              </span>&quot;
            </p>

            <button
              onClick={handleCopy}
              id="copy-snippet-btn"
              className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Copy snippet"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <Copy className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* STEP 3: Share Broadcast CTA */}
        <div className="mb-8">
          <Button
            onClick={handleShareOnX}
            id="share-on-x-btn"
            className="w-full h-14 bg-white text-black hover:bg-zinc-200 border border-transparent rounded-2xl font-bold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-[0_20px_45px_rgba(255,255,255,0.06)] active:scale-98"
          >
            <XIcon className="w-4 h-4 fill-current" />
            Share on X
          </Button>
        </div>

        {/* STEP 4: Technical Gap / Low Tech CRM Notice */}
        <div className="pt-6 border-t border-white/5">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 flex gap-3.5">
            <ShieldCheck className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="text-xs font-bold text-white mb-1 uppercase tracking-wide">Founding Operator Verification</h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Once the 3 founders you invited secure their spot, simply{" "}
                <a 
                  href="https://x.com/maulik_5" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-white underline hover:text-zinc-200 inline-flex items-center gap-0.5"
                >
                  DM us on X @maulik_5 <ExternalLink className="w-2.5 h-2.5" />
                </a>{" "}
                or reply to your verification email with their names. We will manually authenticate your referrals and tag your account!
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Secondary Bottom Navigation Controls */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 z-10 flex items-center gap-4"
      >
        <button
          onClick={() => router.push("/")}
          className="px-6 py-2.5 text-xs text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 rounded-xl transition-all active:scale-95 bg-white/[0.02]"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => window.open("https://x.com/maulik_5", "_blank")}
          className="px-6 py-2.5 text-xs text-zinc-400 hover:text-white border border-white/5 hover:border-white/10 rounded-xl transition-all active:scale-95 bg-white/[0.02] flex items-center gap-1.5"
        >
          Follow @maulik_5
        </button>
      </motion.div>

      {/* Decorative Large Background Label */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.02 }}
        transition={{ delay: 0.8, duration: 1.5 }}
        className="mt-16 text-white text-[12vw] font-black uppercase select-none pointer-events-none absolute bottom-0 leading-none whitespace-nowrap"
      >
        FOUNDING OPERATOR • SKIP THE QUEUE
      </motion.p>
    </div>
  );
}
