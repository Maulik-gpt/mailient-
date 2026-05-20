"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionTemplate, useMotionValue } from "framer-motion";
import {
  Zap,
  Bot,
  Layers,
  Cpu,
  Clock,
  ShieldCheck,
  Lock,
  Check,
  ChevronDown,
  Mail,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Calendar,
  Sparkles,
  Inbox,
  Minus,
  Plus
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import AnimatedGradient from "@/components/ui/animated-gradient";
import { PerspectiveMarquee } from "@/components/ui/remocn-perspective-marquee";
import { SpecialText } from "@/components/ui/special-text";


// Re-map premium company metadata
const PARTNERS = [
  { name: "Vercel", type: "Hosting" },
  { name: "Linear", type: "Issue Tracker" },
  { name: "Stripe", type: "Payments" },
  { name: "Figma", type: "Design" },
  { name: "Notion", type: "Workspace" },
  { name: "Cursor", type: "Editor" }
];

export function LinearLanding() {
  const [activeStep, setActiveStep] = useState(0); // 0: Sift, 1: Draft, 2: Book
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Spotlight mouse effect on luxury cards
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  // Scroll animations for cinematic depth
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.97]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0.9]);

  useEffect(() => {
    // Autoplay feature slides slowly
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#030303] text-white selection:bg-white selection:text-[#030303] font-satoshi overflow-x-hidden scroll-smooth"
    >
      {/* Subtle Floating Noise Texture Overlay */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwBAMAAAClLOS0AAAAElBMVEUAAAAAAAAAAAAAAAAAAAAAAADgKxmiAAAABnRSTlMCCgkGBAVJOAVJAAAASklEQVQ4y2NgGAWjYBSMglEwCgY/YGRgZBQUYmJiZGQEkYwMjIyMgoKCjIyMIJKBgRFIMjIyAklGRkYGRkFBYEcwMDIyMjAOUQAA1I4HwVwZAkYAAAAASUVORK5CYII=")`,
          backgroundSize: "128px 128px"
        }}
      />

      {/* 1. Translucent Navigation */}
      <Navbar theme="dark" />

      {/* Cinematic Ambient Spotlights */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full bg-neutral-900/20 blur-[150px]" />
        <div className="absolute top-[30%] left-[10%] w-[600px] h-[600px] rounded-full bg-white/[0.01] blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[800px] h-[800px] rounded-full bg-neutral-900/10 blur-[160px]" />
      </div>

      {/* 2. ELITE HERO SECTION */}
      <section 
        className="relative pt-44 pb-24 md:pt-56 md:pb-36 px-6 flex flex-col items-center text-center max-w-7xl mx-auto z-10"
      >
        {/* Slow Chromatic WebGL Gradient behind Hero */}
        <AnimatedGradient 
          config={{ preset: "Prism", speed: 12 }} 
          noise={{ opacity: 0.01 }} 
          className="opacity-[0.22] pointer-events-none"
        />

        <motion.div
          style={{ scale: heroScale, opacity: heroOpacity }}
          className="w-full flex flex-col items-center max-w-5xl"
        >
          {/* Handcrafted Status Ring Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-white/[0.02] backdrop-blur-md border border-white/[0.06] shadow-2xl mb-10 group cursor-pointer hover:border-white/[0.12] transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-medium tracking-[0.2em] text-neutral-300 uppercase">
              Autonomous Intelligence Layer v1.0
            </span>
          </motion.div>

          {/* Tagline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-8xl font-medium tracking-[-0.04em] text-white leading-[0.98] w-full"
          >
            Hours of email, <br />
            <span className="font-extralight italic text-neutral-450 tracking-[-0.04em]">handled overnight.</span>
          </motion.h1>

          {/* Subheadline (Clean, luxury spacing) */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="text-neutral-400 text-base md:text-lg font-light max-w-2xl mt-10 leading-relaxed tracking-tight"
          >
            Mailient operates silently in memory. It triage-filters incoming threads, models reply drafts in your proprietary voice, and coordinates calendars without headcount.
          </motion.p>

          {/* CTAs with glass/liquid tactile border shadows */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-center gap-5 mt-12"
          >
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="relative group overflow-hidden px-9 py-4 rounded-full bg-white text-black text-xs font-bold tracking-tight transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_35px_rgba(255,255,255,0.2)] flex items-center gap-2 border border-white/20"
            >
              <Mail className="w-3.5 h-3.5 text-black" />
              Connect Gmail
              <ArrowRight className="w-3.5 h-3.5 text-black transition-transform duration-300 group-hover:translate-x-1" />
            </button>

            <a
              href="#triage-fold"
              className="px-9 py-4 rounded-full bg-white/[0.02] border border-white/[0.08] text-white text-xs font-semibold tracking-tight hover:bg-white/[0.06] backdrop-blur-md transition-all duration-300 flex items-center gap-1.5 shadow-inner hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]"
            >
              Review specifications
            </a>
          </motion.div>
        </motion.div>

        {/* Handcrafted Liquid Glass Dashboard Preview Frame */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl mt-24 aspect-video rounded-[36px] border border-white/[0.06] bg-white/[0.01] backdrop-blur-2xl p-4 shadow-[0_0_120px_rgba(0,0,0,0.8)] overflow-hidden group"
        >
          {/* Specular highlights */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] via-transparent to-white/[0.05] pointer-events-none z-10 rounded-[36px]" />
          
          {/* Glass Inner Frame */}
          <div className="relative w-full h-full rounded-[22px] bg-black/80 border border-white/[0.05] shadow-inner overflow-hidden flex items-center justify-center">
            <iframe
              src="https://cap.so/embed/rpter2vmzaz3vyk?autoplay=1&muted=1&controls=0&loop=1&playsinline=1"
              title="Mailient Premium Interface"
              className="absolute inset-0 w-full h-full border-none opacity-85 scale-[1.005] select-none pointer-events-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </motion.div>

        {/* Premium Tilted 3D Marquee Integration */}
        <div className="w-full mt-32 h-40 overflow-hidden border-y border-white/[0.04] relative rounded-[28px] bg-white/[0.01]">
          <PerspectiveMarquee 
            items={["Vercel", "Linear", "Stripe", "Figma", "Notion", "Raycast", "Arc", "Cursor"]}
            rotateY={-18}
            rotateX={4}
            perspective={1200}
            pixelsPerFrame={1}
            background="transparent"
            fadeColor="#030303"
            color="#a3a3a3"
            fontSize={36}
          />
        </div>
      </section>

      {/* 3. DYNAMIC CORE CAPABILITIES (HANDCRAFTED GLASS SELECTOR) */}
      <section 
        id="triage-fold" 
        className="py-44 px-6 max-w-7xl mx-auto border-t border-white/[0.04] z-10 relative"
      >
        <div className="text-center mb-28 max-w-3xl mx-auto space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            Platform Capabilities
          </h2>
          <p className="text-3xl md:text-6xl font-light tracking-[-0.04em] text-white leading-tight">
            Handcrafted for <span className="font-medium italic text-neutral-300">elite focus.</span>
          </p>
        </div>

        {/* Liquid Glass Interactive Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-16 items-center">
          
          {/* Left Controls (Glassmorphic List) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Step 1: Sift */}
            <div
              onClick={() => setActiveStep(0)}
              className={cn(
                "p-6 rounded-[24px] border transition-all duration-500 cursor-pointer relative overflow-hidden group",
                activeStep === 0
                  ? "bg-white/[0.02] border-white/[0.08] shadow-[0_0_50px_rgba(255,255,255,0.02)]"
                  : "bg-transparent border-transparent opacity-60 hover:opacity-100"
              )}
            >
              {activeStep === 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />
              )}
              <div className="flex items-start gap-5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white flex-shrink-0">
                  <Layers className="w-4 h-4 text-neutral-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-medium text-white text-sm tracking-tight">Sift Ingestion</h3>
                    <Link href="/product/sift" className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-0.5 font-bold transition-colors">
                      Specifications &rarr;
                    </Link>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed font-light">
                    Sift reads inbound semantics programmatically. It isolates VC queries, client tasks, and scheduling options from standard transactional noise automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Draft Reply */}
            <div
              onClick={() => setActiveStep(1)}
              className={cn(
                "p-6 rounded-[24px] border transition-all duration-500 cursor-pointer relative overflow-hidden group",
                activeStep === 1
                  ? "bg-white/[0.02] border-white/[0.08] shadow-[0_0_50px_rgba(255,255,255,0.02)]"
                  : "bg-transparent border-transparent opacity-60 hover:opacity-100"
              )}
            >
              {activeStep === 1 && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />
              )}
              <div className="flex items-start gap-5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white flex-shrink-0">
                  <Bot className="w-4 h-4 text-neutral-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-medium text-white text-sm tracking-tight">Draft Reply</h3>
                    <Link href="/product/drafts" className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-0.5 font-bold transition-colors">
                      Specifications &rarr;
                    </Link>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed font-light">
                    Our semantic modeling engine drafts highly accurate responses inside your standard Gmail folder. Your tone is preserved completely; requiring simple approval.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Book Meetings */}
            <div
              onClick={() => setActiveStep(2)}
              className={cn(
                "p-6 rounded-[24px] border transition-all duration-500 cursor-pointer relative overflow-hidden group",
                activeStep === 2
                  ? "bg-white/[0.02] border-white/[0.08] shadow-[0_0_50px_rgba(255,255,255,0.02)]"
                  : "bg-transparent border-transparent opacity-60 hover:opacity-100"
              )}
            >
              {activeStep === 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.01] to-transparent pointer-events-none" />
              )}
              <div className="flex items-start gap-5">
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white flex-shrink-0">
                  <Calendar className="w-4 h-4 text-neutral-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-medium text-white text-sm tracking-tight">Book Meetings</h3>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 font-medium text-neutral-400 uppercase tracking-widest">
                      Cal-API
                    </span>
                  </div>
                  <p className="text-xs text-neutral-450 leading-relaxed font-light">
                    Mailient continuously validates active booking paths. It cross-checks Cal.com slots and Google Calendar databases to insert conflict-free options instantly.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Sandbox Display (Translucent Chrome Module) */}
          <div className="lg:col-span-7 bg-[#080808] border border-white/[0.05] rounded-[32px] p-6 md:p-10 aspect-[4/3] flex flex-col justify-between overflow-hidden relative shadow-2xl">
            
            {/* Spotlight shimmer */}
            <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-white/[0.01] rounded-full blur-[80px]" />

            {/* Sandbox Top Command Line */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.05]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.05]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.05]" />
              </div>
              <span className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase">
                mailient // intelligence_sandbox
              </span>
            </div>

            {/* Sandbox Screen */}
            <div className="flex-1 flex flex-col justify-center mt-6">
              <AnimatePresence mode="wait">
                
                {/* STEP 0: SIFT DEMO */}
                {activeStep === 0 && (
                  <motion.div
                    key="sift"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4 font-mono text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-0.5 rounded bg-emerald-950/20 text-[9px] font-semibold text-emerald-450 tracking-widest uppercase border border-emerald-900/60">
                        OPPORTUNITY
                      </span>
                      <h4 className="text-xs font-medium text-white font-sans">
                        Re: Partnership Pitch - Aether Capital
                      </h4>
                    </div>
                    
                    <div className="bg-black/40 border border-white/[0.04] p-4 rounded-2xl text-[11px] text-neutral-400 font-sans leading-relaxed">
                      "We tracked your security posture audit, Maulik. Would love to run a seed-round expansion proposal discussion setup next Thursday..."
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black border border-white/[0.03] p-3.5 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Signal Score</p>
                        <p className="text-xs font-semibold text-white">9.8 / HIGH-IMPACT</p>
                      </div>
                      <div className="bg-black border border-white/[0.03] p-3.5 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Context Tag</p>
                        <p className="text-xs font-semibold text-neutral-350">VC / CAPITAL ROUND</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1: DRAFT DEMO */}
                {activeStep === 1 && (
                  <motion.div
                    key="draft"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.03]">
                      <span className="text-neutral-400 font-sans">Sender: Maulik</span>
                      <span className="text-[10px] text-neutral-500">Draft saved to Gmail</span>
                    </div>

                    <div className="bg-[#050505] border border-white/[0.06] p-5 rounded-2xl space-y-3 font-sans font-light text-xs text-neutral-300 relative overflow-hidden shadow-inner">
                      <p className="font-bold text-white text-[11px]">Subject: Re: Partnership Pitch - Aether Capital</p>
                      <p className="leading-relaxed text-neutral-400">
                        Hi team, <br /><br />
                        Appreciate you tracking our architecture details. We completed our SOC2 compliance path with AES-256 standards intact. Let's block out Thursday. Tuesday 2pm PST fits best.
                      </p>
                      <div className="absolute right-4 bottom-4 flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-900/60 px-2.5 py-0.5 rounded-full">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Awaiting Manual Click</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: BOOK DEMO */}
                {activeStep === 2 && (
                  <motion.div
                    key="book"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 font-sans">Cal.com API Sync</span>
                      <span className="text-[9px] uppercase text-emerald-450 font-bold tracking-widest animate-pulse">Synced</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/60 border border-white/[0.04] p-4 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Calendar Confirmed</p>
                        <p className="text-xs font-semibold text-neutral-200">No overlap detected</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-xl">
                        <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-bold mb-1">Proposed Slots</p>
                        <p className="text-xs font-bold text-white">Thursday 3:00 PM</p>
                      </div>
                    </div>

                    <div className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl text-neutral-500 font-sans font-light">
                      Proposed calendar parameters are parsed, mapped to time slots, and nested dynamically inside the outgoing draft.
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Sandbox Bottom Embed Clip */}
            <div className="relative mt-4 aspect-video h-10 w-fit border border-white/[0.06] rounded-lg bg-black overflow-hidden select-none">
              <iframe
                src="https://cap.so/embed/58ekyq8enhrfq3z?autoplay=1&muted=1&controls=0&loop=1&playsinline=1"
                title="Secondary Loop Clip"
                className="absolute inset-0 w-full h-full border-none pointer-events-none scale-110 opacity-70"
              />
            </div>

          </div>

        </div>
      </section>

      {/* 4. RADAR ORBITAL DYNAMIC INTEGRATION SECTION */}
      <section className="py-36 px-6 border-t border-white/[0.04] bg-white/[0.01] z-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-20">
          
          {/* Left Text */}
          <div className="max-w-lg space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.06] shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[9px] font-medium tracking-widest text-neutral-300 uppercase">Synchronicity</span>
            </div>
            <h2 className="text-3xl md:text-6xl font-light tracking-[-0.04em] text-white leading-tight">
              Connect your <br />
              <span className="font-medium italic text-neutral-300">relational stack.</span>
            </h2>
            <p className="text-neutral-400 font-light text-sm md:text-base leading-relaxed tracking-tight">
              Mailient bridges safely with your calendar targets and daily workflow nodes. By processing in-memory via secure OAuth parameters, your data stays in your custody under bank-level encryption scope.
            </p>
          </div>

          {/* Right Interactive Radar Grid */}
          <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center bg-[#050505] rounded-full border border-white/[0.04] shadow-2xl">
            
            {/* Center Mailient Node */}
            <div className="z-10 w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg relative border border-white/[0.12]">
              <span className="text-black font-extrabold text-2xl tracking-tighter">M</span>
              <div className="absolute -inset-1.5 rounded-2xl border border-dashed border-neutral-700 animate-spin-slow opacity-60" />
            </div>

            {/* Orbit 1: Inner (Dashed) */}
            <motion.div
              className="absolute w-44 h-44 rounded-full border border-dashed border-white/[0.03]"
              animate={{ rotate: 360 }}
              transition={{ ease: "linear", duration: 18, repeat: Infinity }}
            >
              {/* Notion App */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black border border-white/[0.06] shadow-sm flex items-center justify-center font-bold text-xs text-white">
                N
              </div>
              {/* Cal.com App */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-8 rounded-lg bg-black border border-white/[0.06] shadow-sm flex items-center justify-center font-bold text-[9px] text-white">
                Cal
              </div>
            </motion.div>

            {/* Orbit 2: Outer (Solid) */}
            <motion.div
              className="absolute w-72 h-72 rounded-full border border-white/[0.02]"
              animate={{ rotate: -360 }}
              transition={{ ease: "linear", duration: 32, repeat: Infinity }}
            >
              {/* Calendar App */}
              <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-black border border-white/[0.06] shadow-sm flex items-center justify-center text-xs">
                📅
              </div>
              {/* Meet App */}
              <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-black border border-white/[0.06] shadow-sm flex items-center justify-center text-xs">
                📹
              </div>
            </motion.div>

            {/* Slow sweeping light indicator */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent animate-spin" style={{ animationDuration: "8s" }} />

          </div>

        </div>
      </section>

      {/* 5. MEET ARCUS KEYNOTE SECTION */}
      <section className="py-44 px-6 max-w-7xl mx-auto z-10 relative">
        
        {/* Luxury Obsidian Box Panel */}
        <div className="relative rounded-[48px] border border-white/[0.05] bg-[#070707] text-white p-8 md:p-20 overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-16">
          
          {/* Subtle inside grid and specular highlights */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.02),_transparent_70%)] pointer-events-none" />
          <div className="absolute bottom-[-150px] left-[-150px] w-96 h-96 rounded-full bg-white/[0.01] blur-[120px] pointer-events-none" />

          {/* Left Text */}
          <div className="max-w-xl space-y-8 relative z-10 lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm">
              <Cpu className="w-3.5 h-3.5 text-neutral-200" />
              <span className="text-[10px] font-medium tracking-wider text-neutral-300 uppercase">
                Arcus Flagship v3.2
              </span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-light tracking-[-0.04em] text-white leading-tight">
              Meet Arcus.
            </h2>
            
            <p className="text-neutral-400 font-light text-sm md:text-base leading-relaxed tracking-tight font-sans">
              Meet Arcus — your command-driven flagship AI. Arcus does not just parse your parameters; it reasons over your entire company directory graph. Ask Arcus to resolve scheduling, draft complex executive documentation, or index weeks of client threads automatically.
            </p>

            <div className="pt-4">
              <Link
                href="/product/arcus"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-white text-black font-semibold text-xs transition-transform duration-300 hover:scale-[1.01] shadow-lg"
              >
                Explore Arcus
                <ArrowRight className="w-4 h-4 text-black" />
              </Link>
            </div>
          </div>

          {/* Right Interactive terminal simulation */}
          <div className="lg:w-1/2 w-full max-w-lg bg-black border border-white/[0.06] rounded-[28px] p-6 md:p-8 relative z-10 font-mono text-xs space-y-5 shadow-xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04] text-[10px] text-neutral-500">
              <span>SYSTEM_NODE // arcus-v3</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-4">
              <p className="text-neutral-300">
                <span className="text-white font-bold">&gt;</span> Arcus, draft a follow-up detailing our security policy
              </p>
              
              <div className="text-[10px] text-neutral-500 space-y-1">
                <p>Executing semantic graph lookup...</p>
                <p>Validating SOC2 Type II cert files...</p>
              </div>

              <div className="p-4 bg-white/[0.01] rounded-xl border border-white/[0.06] text-neutral-300 space-y-3 font-sans font-light">
                <p className="font-bold text-[10px] text-white">Draft Saved (Sarah Miller):</p>
                <p className="text-[11px] leading-relaxed text-neutral-400">
                  Hi Sarah, Mailient implements AES-256 standard encryption. Parsed text data is kept transiently in browser memory; we never retain information to train public AI models.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. BEFORE / AFTER INBOX VISUAL (LUXURY EDITORIAL COMPARISON) */}
      <section className="py-32 px-6 bg-[#050505]/40 border-t border-white/[0.04] z-10 relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-24 space-y-4 max-w-2xl mx-auto">
            <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
              Comparative Analysis
            </h2>
            <p className="text-3xl md:text-6xl font-light tracking-[-0.04em] text-white leading-tight">
              The workflow, <span className="font-medium italic text-neutral-300">redefined.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
            
            {/* Legacy Inbox Card (Before) */}
            <div className="rounded-[32px] border border-white/[0.03] bg-black/60 p-8 flex flex-col justify-between relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.01] rounded-full blur-[80px]" />
              
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-white/[0.04] mb-6 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="font-bold uppercase text-red-550 tracking-wider text-[10px]">Legacy Triage</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">142 unread threads</span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.01] rounded-2xl border border-white/[0.03] flex items-center justify-between text-xs opacity-75">
                    <div>
                      <p className="font-bold text-neutral-300">Google Storage Update</p>
                      <p className="font-light text-neutral-500 mt-1">"Your monthly billing plan details are..."</p>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-500 font-bold font-mono">Newsletter</span>
                  </div>

                  <div className="p-4 bg-white/[0.01] rounded-2xl border border-white/[0.03] flex items-center justify-between text-xs opacity-75">
                    <div>
                      <p className="font-bold text-neutral-300">Operations Bot Alert</p>
                      <p className="font-light text-neutral-500 mt-1">"Deployment pipeline test completed..."</p>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-500 font-bold font-mono">System</span>
                  </div>

                  <div className="p-4 bg-red-950/5 rounded-2xl border border-red-900/30 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        Sarah Miller (Acme VC)
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      </p>
                      <p className="font-light text-neutral-400 mt-1">"Would love to set up meeting Thursday..."</p>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold font-mono uppercase">Buried Pitch</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-5 border-t border-white/[0.04] text-center">
                <p className="text-xs text-neutral-500 italic font-sans font-light">
                  Result: Missing key partnerships in clutter.
                </p>
              </div>
            </div>

            {/* Mailient Triage Card (After) */}
            <div className="rounded-[32px] border border-white/[0.06] bg-[#070707] p-8 flex flex-col justify-between relative shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-[80px]" />

              <div>
                <div className="flex items-center justify-between pb-5 border-b border-white/[0.04] mb-6 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span className="font-bold uppercase text-white tracking-wider text-[10px]">Mailient Grid</span>
                  </div>
                  <span className="text-[10px] text-emerald-450 font-bold">1 High-Value Lead Queued</span>
                </div>

                <div className="space-y-4">
                  <div className="p-4.5 bg-white/[0.02] rounded-2xl border border-white/[0.08] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white flex items-center gap-1.5">
                        Sarah Miller (Acme VC)
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </p>
                      <p className="font-light text-neutral-400 mt-1">"Would love to set up meeting Thursday..."</p>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold uppercase tracking-wider font-mono">
                      Draft Saved
                    </span>
                  </div>

                  <div className="p-4 bg-white/[0.01] rounded-2xl border border-white/[0.03] flex items-center justify-between text-xs opacity-60">
                    <p className="font-light text-neutral-500">141 transactional emails archived</p>
                    <span className="text-[8px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-500 font-mono">Silenced</span>
                  </div>

                  <div className="p-4.5 bg-white/[0.02] rounded-2xl border border-white/[0.08] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">Calendar Scheduled</p>
                      <p className="font-light text-neutral-400 mt-1">Thursday 3:00 PM (Calendar conflict resolved)</p>
                    </div>
                    <span className="text-[8px] px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 font-mono">Confirmed</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-5 border-t border-white/[0.04] text-center">
                <p className="text-xs text-neutral-300 font-semibold uppercase tracking-wider flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-450" />
                  0 Minutes spent triaging noise today
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. EDITORIAL REVIEWS & METRIC BLOCKS */}
      <section className="py-32 px-6 max-w-7xl mx-auto z-10 relative">
        
        {/* Editorial Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-5xl mx-auto">
          
          <div className="space-y-6">
            <span className="text-3xl text-neutral-700 font-serif">“</span>
            <p className="text-lg md:text-xl font-light text-neutral-300 leading-relaxed italic">
              Mailient has completely shifted how we manage strategic relationships. Opportunities that used to sit buried for days are now answered in minutes in my exact personal phrasing.
            </p>
            <div>
              <p className="font-bold text-sm text-white">Marcus Thorne</p>
              <p className="text-xs text-neutral-500">Founder, Aether Tech</p>
            </div>
          </div>

          <div className="space-y-6">
            <span className="text-3xl text-neutral-700 font-serif">“</span>
            <p className="text-lg md:text-xl font-light text-neutral-300 leading-relaxed italic">
              Building a large engineering company means zero time for inbox maintenance. Mailient operates in the background, sifting through the clutter to queue up drafts and lock in meetings automatically.
            </p>
            <div>
              <p className="font-bold text-sm text-white">Evelyn Vance</p>
              <p className="text-xs text-neutral-500">CEO, Retooling Corp</p>
            </div>
          </div>

        </div>

        {/* Minimal Metrics Grid */}
        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-28 border-t border-white/[0.04] pt-20 text-center">
          <div>
            <p className="text-3xl md:text-6xl font-light tracking-[-0.04em] text-white font-mono">
              <SpecialText inView speed={25}>1.2M+</SpecialText>
            </p>
            <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mt-3">Emails Sifted</p>
          </div>
          <div>
            <p className="text-3xl md:text-6xl font-light tracking-[-0.04em] text-white font-mono">
              <SpecialText inView speed={25}>94%</SpecialText>
            </p>
            <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mt-3">Triage Speed</p>
          </div>
          <div>
            <p className="text-3xl md:text-6xl font-light tracking-[-0.04em] text-white font-mono">
              <SpecialText inView speed={25}>14h</SpecialText>
            </p>
            <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mt-3">Saved / Founder / wk</p>
          </div>
        </div>

      </section>

      {/* 8. SECURITY DIRECTIVE STRIP */}
      <section className="bg-white/[0.01] border-y border-white/[0.04] py-5 px-6 text-center z-10 relative">
        <Link 
          href="/security"
          className="inline-flex items-center gap-2 group text-xs text-neutral-450 hover:text-white transition-colors"
        >
          <Lock className="w-3.5 h-3.5 text-neutral-500" />
          <span>
            Enterprise data custody: SOC2 standard, AES-256 in-transit encryption, zero retention models.
          </span>
          <span className="font-bold text-white group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
            Learn more &rarr;
          </span>
        </Link>
      </section>

      {/* 9. PRICING TEASER PANEL */}
      <section className="py-32 px-6 text-center z-10 relative">
        <div className="max-w-4xl mx-auto rounded-[36px] border border-white/[0.05] bg-[#070707] p-10 md:p-14 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.01),_transparent_60%)] pointer-events-none" />
          
          <div className="text-left space-y-2 relative z-10">
            <span className="text-[9px] px-2.5 py-0.5 rounded bg-white/5 font-medium uppercase text-neutral-400 tracking-wider">
              Subscription Scope
            </span>
            <h3 className="text-2xl md:text-3xl font-light tracking-[-0.04em] text-white">
              One subscription. <span className="font-medium italic text-neutral-350">Absolute access.</span>
            </h3>
            <p className="text-neutral-450 font-light text-xs max-w-sm">
              Standardized plans built to scale seamlessly with your inbound database traffic.
            </p>
          </div>
          
          <div className="flex flex-col items-end shrink-0 gap-3 relative z-10">
            <div className="text-right">
              <span className="text-xs text-neutral-500">Starting at</span>
              <p className="text-3xl md:text-4xl font-light tracking-tight text-white">$16.58/mo</p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-7 py-3.5 rounded-full bg-white text-black font-semibold text-xs transition-transform duration-300 hover:scale-[1.01] shadow-lg"
            >
              Explore plans
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. ELITE ACCOMODATION ACCORDIONS (FAQ) */}
      <section className="py-32 px-6 max-w-4xl mx-auto z-10 relative">
        <div className="text-center mb-20 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
            System Inquiries
          </h2>
          <p className="text-3xl md:text-5xl font-light tracking-[-0.04em] text-white">
            Frequently Asked Questions
          </p>
        </div>

        {/* Custom Glass Accordions */}
        <div className="space-y-4">
          {[
            {
              q: "How quickly can systems be deployed?",
              a: "Mailient integrates with your Google Workspace in under 2 minutes. Once authorized via secure OAuth, our autonomous indexers begin ingestion immediately. Your first inbox analysis is ready within 180 seconds, and background drafting begins overnight."
            },
            {
              q: "Can AI integrate into existing workflows?",
              a: "Yes. Mailient sits directly on top of Gmail and Google Calendar, with native Webhook triggers and integrations for Slack, Notion, and Cal.com. It enhances your current email routine without requiring you to switch to a new communication client."
            },
            {
              q: "Is enterprise data secure?",
              a: "Absolutely. Mailient is SOC2 Type II compliant and employs AES-256 bank-grade encryption at rest and in transit. Your emails are parsed in memory, and we enforce a zero-retention policy for model training: we never train public AI models on your private data."
            },
            {
              q: "Do you build custom systems?",
              a: "Yes. For our enterprise partners, we offer custom fine-tuned models that mimic your company's proprietary tone, sync with internal CRMs (like Salesforce or HubSpot), and enforce custom business logic for autonomous scheduling."
            }
          ].map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="rounded-[24px] border border-white/[0.04] bg-[#070707] overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full px-7 py-6 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-semibold text-xs md:text-sm text-white">
                    {faq.q}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 flex-shrink-0">
                    {isOpen ? (
                      <Minus className="w-3 h-3 text-neutral-300" />
                    ) : (
                      <Plus className="w-3 h-3 text-neutral-300" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden border-t border-white/[0.04]"
                    >
                      <div className="px-7 py-6 text-xs md:text-sm text-neutral-400 font-light leading-relaxed bg-white/[0.01]">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 11. LUXURY FINAL CTA SECTION */}
      <section className="relative py-44 px-6 text-center border-t border-white/[0.04] bg-black z-10 overflow-hidden">
        
        {/* Specular bottom glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.03),_transparent_75%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-neutral-200" />
            <span className="text-[9px] font-medium tracking-wider text-neutral-300 uppercase">
              Operations
            </span>
          </div>

          <h2 className="text-4xl md:text-7xl font-light tracking-[-0.04em] text-white leading-[1.05]">
            Build the system <br />
            your inbox <span className="font-medium italic text-neutral-300">deserves.</span>
          </h2>

          <p className="text-neutral-450 font-light text-base md:text-lg max-w-xl mx-auto tracking-tight">
            Modern institutions do not scale with headcount anymore. Connect Gmail to automate your inbox now.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="relative group overflow-hidden px-9 py-4 rounded-full bg-white text-black text-xs font-bold tracking-tight transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_35px_rgba(255,255,255,0.2)] border border-white/20"
            >
              Connect Gmail
            </button>

            <a
              href="mailto:partner@mailient.xyz?subject=Strategy%20Setup"
              className="px-9 py-4 rounded-full bg-white/[0.02] border border-white/[0.08] text-white text-xs font-semibold tracking-tight hover:bg-white/[0.06] backdrop-blur-md transition-all duration-300 flex items-center gap-1.5 shadow-inner hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]"
            >
              Book Strategy Setup
            </a>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <Footer theme="dark" />
    </div>
  );
}
