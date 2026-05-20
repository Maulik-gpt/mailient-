"use client";

import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from "framer-motion";
import {
  Zap,
  Bot,
  Layers,
  Calendar,
  ChevronRight,
  Mail,
  ArrowRight,
  Sparkles,
  Inbox,
  Minus,
  Plus,
  Play,
  Lock,
  Globe,
  Server,
  UserCheck,
  Check,
  MessageSquare,
  Terminal,
  Eye,
  Monitor,
  ShieldCheck,
  Clock,
  Briefcase,
  AlertCircle
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PerspectiveMarquee } from "@/components/ui/remocn-perspective-marquee";

const Dithering = lazy(() => 
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
);

function ActiveCounter({ target = 1420 }: { target?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000; // 2s
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, isInView]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

export function LinearLanding() {
  const [activeStep, setActiveStep] = useState(0);
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  // Mouse position tracker for cursor-reactive lighting on cards
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  // Autoplay Three Things cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.title = "Mailient / Hours of email, handled overnight";
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi relative selection:bg-white selection:text-black">
      
      {/* 0. Custom Radar & Orbital Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes radar-pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-12px) scale(1.03) rotate(3deg); }
        }
        @keyframes radar-orbit-1 {
          from { transform: rotate(0deg) translateX(110px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(110px) rotate(-360deg); }
        }
        @keyframes radar-orbit-2-a {
          from { transform: rotate(120deg) translateX(170px) rotate(-120deg); }
          to { transform: rotate(480deg) translateX(170px) rotate(-480deg); }
        }
        @keyframes radar-orbit-2-b {
          from { transform: rotate(240deg) translateX(170px) rotate(-240deg); }
          to { transform: rotate(600deg) translateX(170px) rotate(-600deg); }
        }
        @keyframes radar-orbit-3-a {
          from { transform: rotate(0deg) translateX(230px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(230px) rotate(-360deg); }
        }
        @keyframes radar-orbit-3-b {
          from { transform: rotate(180deg) translateX(230px) rotate(-180deg); }
          to { transform: rotate(540deg) translateX(230px) rotate(-540deg); }
        }
      `}} />

      {/* Atmospheric lighting */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute top-[4%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-neutral-900/10 blur-[180px]" />
        <div className="absolute top-[25%] left-[5%] w-[500px] h-[500px] rounded-full bg-white/[0.005] blur-[150px]" />
        <div className="absolute bottom-[20%] right-[5%] w-[800px] h-[800px] rounded-full bg-neutral-950/20 blur-[200px]" />
      </div>

      {/* Sticky Translucent Header */}
      <Navbar theme="dark" />

      {/* 1. HERO SECTION */}
      <section className="relative w-full pt-40 pb-20 md:pt-48 px-6 flex flex-col items-center text-center max-w-7xl mx-auto z-10">
        
        {/* WebGL Backing Shader */}
        <Suspense fallback={<div className="absolute inset-0 bg-[#000000] pointer-events-none" />}>
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] blur-[90px] scale-[1.05] mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_85%)]">
            <Dithering
              colorBack="#000000" 
              colorFront="#ffffff"
              shape="warp"
              type="4x4"
              speed={0.15}
              className="size-full"
              minPixelRatio={1}
            />
          </div>
        </Suspense>

        <div className="w-full flex flex-col items-center max-w-5xl z-10">
          
          {/* Eyebrow Platform Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] shadow-2xl mb-8">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neutral-300"></span>
            </span>
            <span className="text-[10px] font-medium tracking-[0.15em] text-[#8a8f98] uppercase font-mono">
              Arcus Inbox Agent Loop v3.2
            </span>
          </div>

          {/* Headline & Subtitle */}
          <h1 className="text-4xl md:text-[68px] font-medium tracking-[-0.03em] text-white leading-[1.08] max-w-4xl">
            Hours of email, <br />handled overnight.
          </h1>

          <p className="text-base md:text-[18px] text-[#8a8f98] leading-relaxed max-w-2xl mt-6 font-light font-sans">
            Arcus by Mailient reads your threads, writes custom drafts in your voice, and schedules calendar events — fully autonomously.
          </p>

          {/* Premium CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="px-8 py-3 rounded-full bg-white text-black font-semibold text-xs tracking-tight transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center gap-2 cursor-pointer"
            >
              Connect Gmail
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <a
              href="#sample-brief"
              className="px-8 py-3 rounded-full bg-transparent border border-white/10 text-white font-medium text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <Play className="w-3 h-3 fill-white" />
              See a sample brief
            </a>
          </div>

          {/* 16:9 Floating Obsidian Demo Video Window */}
          <div className="w-full max-w-4xl aspect-[16/9] bg-[#050505] border border-white/[0.08] rounded-[24px] mt-20 shadow-[0_50px_100px_rgba(0,0,0,0.85)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.015),transparent_60%)] pointer-events-none" />
            
            {/* Visual Demo Elements */}
            <div className="absolute inset-8 flex flex-col justify-between text-left font-mono">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-neutral-800" />
                  <span className="w-3 h-3 rounded-full bg-neutral-800" />
                  <span className="w-3 h-3 rounded-full bg-neutral-800" />
                  <span className="text-[10px] text-neutral-500 ml-4">arcus-agent-loop.js</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 text-[9px]">ACTIVE Overnight Loop</span>
              </div>

              {/* Live typing webhook log mock */}
              <div className="flex-1 flex flex-col justify-center space-y-3 font-mono text-xs text-neutral-400">
                <p className="text-neutral-500">&gt; Initializing schedule sweep for timezone America/New_York...</p>
                <p className="text-neutral-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span>Sifting inbox thread [TKT-2187]... Category identified: Priority Client</span>
                </p>
                <p className="text-neutral-400">&gt; Building high-fidelity Voice Profile signature context...</p>
                <p className="text-white font-semibold">&gt; Response draft compiled. Calendars checked. Meeting slot logged for May 22 14:00.</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/[0.04] text-[10px] text-neutral-500">
                <span>INTAKE TRIAGE SYSTEM</span>
                <span>CTRL + \ TO ACTIVATE PANEL</span>
              </div>
            </div>
            
            {/* Glass Reflector Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>

        </div>

        {/* 1.5 TRUSTED BY COMPANIES PERSPECTIVE MARQUEE */}
        <div className="w-full mt-36 relative h-28 overflow-hidden bg-black border-y border-white/[0.05]">
          <PerspectiveMarquee 
            fontSize={26} 
            color="#a3a3a3" 
            rotateY={-14} 
            rotateX={5} 
            perspective={1100} 
            fadeColor="#000000"
            background="#000000"
            className="w-full h-full"
          />
        </div>
      </section>

      {/* 2. THREE THINGS IT DOES INTERACTIVE SECTION */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative text-left">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Left panel: cycle controls */}
          <div className="lg:col-span-5 space-y-6">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">CORE CAPABILITIES</span>
            <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] text-white leading-tight">
              One coordinate loop. <br />Three pillars.
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed font-light font-sans max-w-md pb-6 border-b border-white/[0.06]">
              Mailient replaces scattered assistants with a robust, integrated multi-agent sequence that operates directly on top of your standard communication platforms.
            </p>

            <div className="flex flex-col space-y-4">
              {/* Pillar 1 */}
              <div 
                onClick={() => setActiveStep(0)}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col space-y-1.5",
                  activeStep === 0 
                    ? "border-white/10 bg-white/[0.02]" 
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs">📂</span>
                  <span className="text-sm font-semibold text-white">Sift Intake Triage</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-light font-sans">
                  Isolates noise, tags priorities, and routes customer queries. Links to <Link href="/product/sift" className="text-white hover:underline">/product/sift</Link>.
                </p>
              </div>

              {/* Pillar 2 */}
              <div 
                onClick={() => setActiveStep(1)}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col space-y-1.5",
                  activeStep === 1 
                    ? "border-white/10 bg-white/[0.02]" 
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs">✍️</span>
                  <span className="text-sm font-semibold text-white">Tone-Matched Drafts</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-light font-sans">
                  Constructs a Stylistic Signature of your tone. Links to <Link href="/product/drafts" className="text-white hover:underline">/product/drafts</Link>.
                </p>
              </div>

              {/* Pillar 3 */}
              <div 
                onClick={() => setActiveStep(2)}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col space-y-1.5",
                  activeStep === 2 
                    ? "border-white/10 bg-white/[0.02]" 
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs">📅</span>
                  <span className="text-sm font-semibold text-white">Autonomous Scheduling</span>
                </div>
                <p className="text-[11px] text-neutral-400 font-light font-sans">
                  Schedules client slots, manages bookings, and logs meeting adapters silently.
                </p>
              </div>
            </div>
          </div>

          {/* Right panel: dynamic animated video visualization */}
          <div className="lg:col-span-7 bg-[#050505] border border-white/[0.06] rounded-[24px] p-8 shadow-2xl h-[480px] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.01),transparent_60%)] pointer-events-none" />

            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div
                  key="sift"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                  className="flex-1 flex flex-col justify-between font-mono h-full"
                >
                  <div>
                    <span className="text-[10px] text-neutral-500 font-bold tracking-widest block mb-4">INBOX CLASSIFIER SIMULATOR</span>
                    <h3 className="text-base font-bold text-white mb-2">Sift AI Classifier</h3>
                  </div>

                  <div className="space-y-3 bg-[#0a0a0a] border border-white/[0.04] p-5 rounded-xl text-xs text-neutral-400">
                    <div className="flex items-center justify-between border-b border-white/[0.03] pb-2 text-[10px]">
                      <span>INCOMING EMAIL</span>
                      <span className="text-yellow-500">Triage Pending</span>
                    </div>
                    <p className="text-white font-semibold">From: support@capital-vcs.com</p>
                    <p className="text-neutral-400">"Hey Austin, reviewing your pitch deck drafts. Can we align on a slot tomorrow at 10 AM EST?"</p>
                    <div className="flex gap-2 pt-2">
                      <span className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-900/60 uppercase text-[8px] font-bold">Pitch Desk</span>
                      <span className="px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/60 uppercase text-[8px] font-bold">Priority T1</span>
                    </div>
                  </div>

                  <span className="text-[9.5px] text-neutral-500 pt-4 border-t border-white/[0.03]">SUCCESS // CLASSIFICATION RECORD LOGGED</span>
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  key="drafts"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                  className="flex-1 flex flex-col justify-between font-mono h-full"
                >
                  <div>
                    <span className="text-[10px] text-neutral-500 font-bold tracking-widest block mb-4">VOICE PROFILER SYSTEM</span>
                    <h3 className="text-base font-bold text-white mb-2">Stylistic Response Signatures</h3>
                  </div>

                  <div className="space-y-3 bg-[#0a0a0a] border border-white/[0.04] p-5 rounded-xl text-xs text-neutral-400">
                    <div className="flex items-center justify-between border-b border-white/[0.03] pb-2 text-[10px]">
                      <span>OUTBOX DRAFT ENGINE</span>
                      <span className="text-emerald-500">Draft Compiled</span>
                    </div>
                    <p className="text-white font-semibold">Subject: Re: review capital slot</p>
                    <p className="text-neutral-300 italic">"Hey Sarah, tomorrow at 10 AM works great. Austin is scheduling the Google Meet link shortly. Let's sync then. Best, Austin."</p>
                    <span className="text-[9px] text-[#8a8f98]">Tone Signature Match: 99.4% (Direct, Minimalist)</span>
                  </div>

                  <span className="text-[9.5px] text-neutral-500 pt-4 border-t border-white/[0.03]">SUCCESS // RESPONSE DRAFT PUSHED TO OUTBOX</span>
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  key="book"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                  className="flex-1 flex flex-col justify-between font-mono h-full"
                >
                  <div>
                    <span className="text-[10px] text-neutral-500 font-bold tracking-widest block mb-4">CALENDAR ADAPTER ENGINE</span>
                    <h3 className="text-base font-bold text-white mb-2">Autonomous Meeting Booking</h3>
                  </div>

                  <div className="space-y-3 bg-[#0a0a0a] border border-white/[0.04] p-5 rounded-xl text-xs text-neutral-400">
                    <div className="flex items-center justify-between border-b border-white/[0.03] pb-2 text-[10px]">
                      <span>SCHEDULER AGENT LOOP</span>
                      <span className="text-blue-400">Confirmed Booking</span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-white font-semibold">Event: Capital VCS / Mailient Pitch Sync</p>
                      <p className="text-neutral-400">Date: Tomorrow, 10:00 AM - 10:30 AM EST</p>
                      <p className="text-neutral-500">Platform: Google Meet (Link generated in invite)</p>
                    </div>
                  </div>

                  <span className="text-[9.5px] text-neutral-500 pt-4 border-t border-white/[0.03]">SUCCESS // CALENDAR LOG CONFIRMED</span>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>
      </section>

      {/* 3. RADAR CIRCULAR APP ORBITS INTEGRATIONS */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative text-center flex flex-col items-center">
        
        <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold mb-6">INTEGRATIONS RADAR</span>
        <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] text-white leading-tight max-w-2xl mb-24">
          Integrated directly with <br />your favourite platforms.
        </h2>

        {/* Orbit Radar Display Box */}
        <div className="relative w-[500px] h-[500px] flex items-center justify-center select-none pointer-events-none mb-12 scale-90 md:scale-100">
          
          {/* Inner Ambient Glow Radar Ring */}
          <div className="absolute w-[200px] h-[200px] rounded-full border border-white/[0.02] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015),transparent_60%)]" style={{ animation: "radar-pulse 4s infinite ease-in-out" }} />

          {/* Concentric Orbit Circles */}
          <div className="absolute w-[220px] h-[220px] rounded-full border border-white/[0.03]" />
          <div className="absolute w-[340px] h-[340px] rounded-full border border-white/[0.02] border-dashed" />
          <div className="absolute w-[460px] h-[460px] rounded-full border border-white/[0.01]" />

          {/* Central Black & White Mailient Grayscale Logo */}
          <div className="absolute w-14 h-14 rounded-full overflow-hidden z-30 shadow-[0_0_40px_rgba(255,255,255,0.25)] border border-neutral-300 bg-white">
            <img 
              src="/mailient-logo-premium.png" 
              alt="Mailient Logo" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Orbit 1 App: Google Calendar */}
          <div 
            className="absolute w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center text-xs z-20 shadow-xl"
            style={{ animation: "radar-orbit-1 12s linear infinite" }}
          >
            📅
          </div>

          {/* Orbit 2 App A: Notion */}
          <div 
            className="absolute w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center text-xs z-20 shadow-xl"
            style={{ animation: "radar-orbit-2-a 18s linear infinite" }}
          >
            📓
          </div>

          {/* Orbit 2 App B: Google Meet */}
          <div 
            className="absolute w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center text-xs z-20 shadow-xl"
            style={{ animation: "radar-orbit-2-b 18s linear infinite" }}
          >
            🎥
          </div>

          {/* Orbit 3 App A: Cal.com */}
          <div 
            className="absolute w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center text-xs z-20 shadow-xl"
            style={{ animation: "radar-orbit-3-a 26s linear infinite" }}
          >
            🗓️
          </div>

          {/* Orbit 3 App B: Slack */}
          <div 
            className="absolute w-8 h-8 rounded-lg bg-neutral-950 border border-white/[0.06] flex items-center justify-center text-xs z-20 shadow-xl"
            style={{ animation: "radar-orbit-3-b 26s linear infinite" }}
          >
            💬
          </div>

        </div>
      </section>

      {/* 4. FLAGSHIP MEET ARCUS SECTION (Sized Larger Than The Rest) */}
      <section className="py-36 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div 
          className="w-full bg-[#050505] border border-white/[0.08] rounded-[32px] p-8 md:p-16 flex flex-col lg:flex-row gap-16 items-center relative overflow-hidden group shadow-[0_50px_120px_rgba(0,0,0,0.95)]"
          onMouseMove={handleMouseMove}
        >
          {/* Card Cursor Lighting Glow spotlight */}
          <motion.div
            className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: useMotionTemplate`radial-gradient(800px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.015), transparent 80%)`,
            }}
          />

          <div className="flex-1 space-y-6 text-left relative z-10">
            <span className="px-3.5 py-1 rounded-full bg-neutral-900 border border-white/[0.08] text-[9px] font-mono tracking-[0.15em] text-[#8a8f98] uppercase">
              PLATFORM FLAGSHIP AGENT
            </span>
            
            <h2 className="text-4xl md:text-[54px] font-medium tracking-[-0.03em] text-white leading-tight font-sans">
              Meet Arcus.
            </h2>

            <p className="text-xs text-neutral-400 leading-relaxed font-light font-sans max-w-xl">
              Arcus is not an email assistant. It does not suggest or summarize. It acts. Connecting deeply with your codebase, calendar adapters, and topic clusters, Arcus handles your entire email footprint overnight, delivering finished briefings and resolved threads before you open your laptop.
            </p>

            <div className="pt-6">
              <Link 
                href="/product/arcus"
                className="px-8 py-3 rounded-full bg-white text-black font-semibold text-xs tracking-tight transition-transform duration-300 hover:scale-[1.02] flex items-center gap-2 w-fit cursor-pointer"
              >
                Review Arcus Flagship
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Glass dashboard preview right side */}
          <div className="flex-1 w-full bg-[#0a0a0a] border border-white/[0.04] p-6 rounded-2xl h-[340px] flex flex-col justify-between font-mono text-left text-xs text-neutral-400 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.01),transparent_60%)] pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/[0.03] pb-3 text-[10px]">
              <span>ARCUS MISSION DEPLOYMENT</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-2.5">
              <p className="text-neutral-500">&gt; Starting scheduled inbox sweep for May 20...</p>
              <p className="text-neutral-400">&gt; Triage category MATCHED: Pitch deck feedback</p>
              <p className="text-neutral-300">&gt; Local PII vault sanitizer completed encryption: AES-256 standard</p>
              <p className="text-white font-semibold">&gt; 4 meetings scheduled. 3 drafts waiting. 0 actions required.</p>
            </div>

            <div className="pt-3 border-t border-white/[0.03] flex items-center justify-between text-[9px] text-neutral-500">
              <span>AGENT RESOLUTION TIME: 4.2 SEC</span>
              <span>100% SUCCESS RATE</span>
            </div>
          </div>

        </div>
      </section>

      {/* 5. THE MORNING SIDE-BY-SIDE: Chaos vs Overnight Clarity */}
      <section id="sample-brief" className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="text-center flex flex-col items-center mb-24">
          <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold mb-6">THE MORNING TRANSITION</span>
          <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] text-white leading-tight max-w-2xl">
            Chaos vs Overnight Clarity.
          </h2>
          <p className="text-xs text-[#8a8f98] leading-relaxed font-light max-w-md mt-4 font-sans">
            Waking up to email is an operational bottleneck. Arcus shifts inbox tasks to overnight cycles, returning control back to founders.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-5xl mx-auto">
          {/* Left panel: Chaos */}
          <div className="bg-[#050505] border border-red-950/20 p-8 rounded-3xl relative overflow-hidden text-left h-[440px] flex flex-col justify-between group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.015),transparent_60%)] pointer-events-none" />
            
            <div>
              <div className="flex items-center gap-2 mb-6 text-red-400 font-mono text-[10px] tracking-wider uppercase font-bold">
                <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                <span>The Chaos of Yesterday</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">High stress inbox pile</h3>
              <p className="text-xs text-[#8a8f98] font-light font-sans max-w-sm mb-8">
                Waking up to 45 unread threads, urgent meeting booking queries, and complex response requirements.
              </p>

              {/* Stress rows */}
              <div className="space-y-3 font-mono text-[11px] text-red-300/80">
                <div className="p-3.5 rounded-xl border border-red-950/30 bg-red-950/5 flex items-center justify-between">
                  <span>&gt; Thread: Pitch update (URGENT)</span>
                  <span className="text-[9px] text-red-500">Unread</span>
                </div>
                <div className="p-3.5 rounded-xl border border-red-950/30 bg-red-950/5 flex items-center justify-between">
                  <span>&gt; Meeting request: slot needed today</span>
                  <span className="text-[9px] text-red-500">Unread</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-neutral-500 pt-4 border-t border-white/[0.03]">
              STATUS // RED ZONE INBOX ACCUMULATION
            </div>
          </div>

          {/* Right panel: Overnight Clarity */}
          <div className="bg-[#050505] border border-white/[0.08] p-8 rounded-3xl relative overflow-hidden text-left h-[440px] flex flex-col justify-between group shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent_60%)] pointer-events-none" />
            
            <div>
              <div className="flex items-center gap-2 mb-6 text-emerald-400 font-mono text-[10px] tracking-wider uppercase font-bold">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Overnight Clarity</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Autonomous Morning Briefing</h3>
              <p className="text-xs text-[#8a8f98] font-light font-sans max-w-sm mb-8">
                Start the morning with resolved outbox drafts, confirmed bookings, and a single dashboard brief.
              </p>

              {/* Clarity rows */}
              <div className="space-y-3 font-mono text-[11px] text-emerald-300/80">
                <div className="p-3.5 rounded-xl border border-emerald-950/30 bg-emerald-950/5 flex items-center justify-between">
                  <span>&gt; 4 Meetings booked automatically</span>
                  <span className="text-[9px] text-emerald-400">Resolved</span>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-950/30 bg-emerald-950/5 flex items-center justify-between">
                  <span>&gt; 3 High-priority drafts waiting in outbox</span>
                  <span className="text-[9px] text-emerald-400">Resolved</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-neutral-500 pt-4 border-t border-white/[0.03]">
              STATUS // GREEN ZONE OPERATIONAL LEVERAGE
            </div>
          </div>

        </div>
      </section>

      {/* 6. SOCIAL PROOF, STAT ROW, SECURITY STRIP */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="max-w-5xl mx-auto">
          
          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24 text-left">
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">Triage Capacity</span>
              <span className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                <ActiveCounter target={100} />k+
              </span>
              <span className="text-[10px] text-neutral-500 font-light font-sans">Processed daily</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">Response Speed</span>
              <span className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                <ActiveCounter target={24} />x
              </span>
              <span className="text-[10px] text-neutral-500 font-light font-sans">Faster triage cycles</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">Accuracy rate</span>
              <span className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                <ActiveCounter target={99} />.4%
              </span>
              <span className="text-[10px] text-neutral-500 font-light font-sans">Noise isolation rate</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">Founder Advantage</span>
              <span className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
                <ActiveCounter target={1240} />h
              </span>
              <span className="text-[10px] text-neutral-500 font-light font-sans">Focus hours saved</span>
            </div>
          </div>

          {/* Quotes grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-24">
            <div className="p-8 rounded-[24px] border border-white/[0.04] bg-[#050505]/40 backdrop-blur-sm relative overflow-hidden">
              <span className="text-4xl text-neutral-700 font-serif absolute top-4 left-4 select-none">“</span>
              <p className="text-xs text-neutral-300 font-light leading-relaxed font-sans relative z-10 pl-4 mb-6">
                Mailient restored my momentum. I wake up to resolved threads and booked calls, not a wall of noise.
              </p>
              <span className="text-[10px] font-semibold text-white pl-4 font-mono block">&mdash; Austin, Founder at Aether Labs</span>
            </div>

            <div className="p-8 rounded-[24px] border border-white/[0.04] bg-[#050505]/40 backdrop-blur-sm relative overflow-hidden">
              <span className="text-4xl text-neutral-700 font-serif absolute top-4 left-4 select-none">“</span>
              <p className="text-xs text-neutral-300 font-light leading-relaxed font-sans relative z-10 pl-4 mb-6">
                Autonomous workflows are the ultimate leverage. Arcus handles the routine, keeping our team focused on shipping.
              </p>
              <span className="text-[10px] font-semibold text-white pl-4 font-mono block">&mdash; Sarah, COO at Linear VCs</span>
            </div>
          </div>

          {/* Security Strip */}
          <div className="w-full py-4 px-6 rounded-2xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-between text-left hover:border-white/[0.08] transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] text-neutral-400 font-sans">
                Vault-grade local PII sanitization with AES-256 local cache protection.
              </span>
            </div>
            <Link href="/security" className="text-[10px] text-white font-semibold hover:underline flex items-center gap-1">
              Read Security Standard
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* 7. PRICING TEASER */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="text-center flex flex-col items-center mb-20">
          <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold mb-6">PRICING TIERS</span>
          <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] text-white leading-tight">
            Transparent plans for modern teams.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mx-auto text-left items-stretch">
          {/* Monthly Plan */}
          <div className="p-8 rounded-[24px] border border-white/[0.04] bg-[#050505] flex flex-col justify-between h-[440px] relative overflow-hidden group">
            <div>
              <span className="text-neutral-500 font-mono text-[9px] tracking-wider uppercase font-bold block mb-4">MONTHLY TIER</span>
              <h3 className="text-lg font-bold text-white mb-2">Solo Builder</h3>
              <p className="text-[11px] text-[#8a8f98] leading-relaxed mb-6 font-light max-w-xs">
                For solo builders looking for autonomous triage. Cancel anytime.
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-3xl font-semibold">$29</span>
                <span className="text-[10px] text-neutral-500 font-mono">/ month</span>
              </div>

              <ul className="space-y-2.5 text-[10.5px] text-neutral-400 font-sans font-light">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Full access to Sift</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Unlimited projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Cancel anytime</span>
                </li>
              </ul>
            </div>

            <Link 
              href="/pricing"
              className="px-6 py-2.5 rounded-full bg-neutral-900 border border-white/10 text-white font-semibold text-center text-[10.5px] hover:bg-neutral-800 transition-colors w-full"
            >
              Start Monthly
            </Link>
          </div>

          {/* Annual Plan */}
          <div className="p-8 rounded-[24px] border border-white/[0.08] bg-[#050505] flex flex-col justify-between h-[440px] relative overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.015),transparent_60%)] pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-mono text-[9px] tracking-wider uppercase font-bold">BEST VALUE TIER</span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 text-[8px] font-bold">RECOMMENDED</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Enterprise Scale</h3>
              <p className="text-[11px] text-[#8a8f98] leading-relaxed mb-6 font-light max-w-xs">
                Full enterprise scale: Sift Triage, Draft Replies, and priority Arcus.
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-3xl font-semibold">$16.58</span>
                <span className="text-[10px] text-neutral-500 font-mono">/ month</span>
              </div>

              <ul className="space-y-2.5 text-[10.5px] text-neutral-350 font-sans font-light">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Advanced Relational Sift</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Draft Replies in your voice</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cal.com & Notion Sync integrations</span>
                </li>
              </ul>
            </div>

            <Link 
              href="/pricing"
              className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-center text-[10.5px] hover:bg-neutral-200 transition-colors w-full"
            >
              Get Best Value
            </Link>
          </div>

          {/* Lifetime Plan */}
          <div className="p-8 rounded-[24px] border border-white/[0.04] bg-[#050505] flex flex-col justify-between h-[440px] relative overflow-hidden group">
            <div>
              <span className="text-neutral-500 font-mono text-[9px] tracking-wider uppercase font-bold block mb-4">FOUNDING TIER</span>
              <h3 className="text-lg font-bold text-white mb-2">Lifetime Access</h3>
              <p className="text-[11px] text-[#8a8f98] leading-relaxed mb-6 font-light max-w-xs">
                Own Mailient forever. Full access, diamond founding status, 500 monthly queries.
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-3xl font-semibold">$499</span>
                <span className="text-[10px] text-neutral-500 font-mono">once</span>
              </div>

              <ul className="space-y-2.5 text-[10.5px] text-neutral-400 font-sans font-light">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Full access forever</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-500" />
                  <span>500 AI queries/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Diamond Founding Badge</span>
                </li>
              </ul>
            </div>

            <Link 
              href="/pricing"
              className="px-6 py-2.5 rounded-full bg-neutral-900 border border-white/10 text-white font-semibold text-center text-[10.5px] hover:bg-neutral-800 transition-colors w-full"
            >
              Own It (Lifetime)
            </Link>
          </div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION SECTION */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          <div className="lg:col-span-4 space-y-4 text-left">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">COMMON QUESTIONS</span>
            <h2 className="text-3xl md:text-[40px] font-medium tracking-[-0.025em] text-white leading-tight">
              Frequently asked questions.
            </h2>
            <p className="text-xs text-[#8a8f98] leading-relaxed font-light font-sans max-w-sm">
              Can't find what you are looking for? Read our documentation page or contact support.
            </p>
          </div>

          <div className="lg:col-span-8 flex flex-col space-y-4 w-full">
            {/* FAQ 1 */}
            <div className="border-b border-white/[0.06] pb-4 text-left">
              <div 
                onClick={() => setActiveAccordion(activeAccordion === 0 ? null : 0)}
                className="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold text-white hover:text-neutral-350 transition-colors"
              >
                <span>How does Arcus write email drafts in my exact voice?</span>
                <span className="text-xs text-neutral-500 font-mono">{activeAccordion === 0 ? "[-]" : "[+]"}</span>
              </div>
              <AnimatePresence>
                {activeAccordion === 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-[#8a8f98] font-light leading-relaxed font-sans pb-4">
                      Our voice-profile engine extracts tone descriptors, structural signatures, and custom terminology from your sent folders. It then writes drafts according to these specific matches.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FAQ 2 */}
            <div className="border-b border-white/[0.06] pb-4 text-left">
              <div 
                onClick={() => setActiveAccordion(activeAccordion === 1 ? null : 1)}
                className="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold text-white hover:text-neutral-350 transition-colors"
              >
                <span>Is my email data secure and private?</span>
                <span className="text-xs text-neutral-500 font-mono">{activeAccordion === 1 ? "[-]" : "[+]"}</span>
              </div>
              <AnimatePresence>
                {activeAccordion === 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-[#8a8f98] font-light leading-relaxed font-sans pb-4">
                      Yes. Mailient utilizes local PII sanitizers to ensure that personally identifiable information is sanitized on-device. All client-side credentials utilize AES-256 standard encryption keys.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FAQ 3 */}
            <div className="border-b border-white/[0.06] pb-4 text-left">
              <div 
                onClick={() => setActiveAccordion(activeAccordion === 2 ? null : 2)}
                className="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold text-white hover:text-neutral-350 transition-colors"
              >
                <span>Do I need to configure scheduling workflows manually?</span>
                <span className="text-xs text-neutral-500 font-mono">{activeAccordion === 2 ? "[-]" : "[+]"}</span>
              </div>
              <AnimatePresence>
                {activeAccordion === 2 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs text-[#8a8f98] font-light leading-relaxed font-sans pb-4">
                      No. Arcus operates fully autonomously. It automatically connects with Cal.com, Zoom, Notion, and Google Meet adapters to crosscheck availability and books slots without prompting.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      </section>

      {/* 9. FINAL CALL TO ACTION FOLD */}
      <section className="py-44 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative flex flex-col items-center text-center space-y-8">
        
        <h2 className="text-4xl md:text-[68px] font-medium tracking-[-0.03em] text-white leading-tight">
          Hours of email, <br />handled overnight.
        </h2>

        <div className="flex items-center justify-center gap-4 mt-4">
          <button 
            onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
            className="px-8 py-3 rounded-full bg-white text-black font-semibold text-xs transition-transform duration-300 hover:scale-[1.02] cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.15)]"
          >
            Connect Gmail
          </button>
          <Link 
            href="/pricing"
            className="px-8 py-3 rounded-full bg-neutral-900 border border-white/10 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
          >
            View pricing
          </Link>
        </div>

      </section>

      {/* 10. FIVE-COLUMN LUXURY FOOTER */}
      <footer className="w-full bg-[#000000] border-t border-white/[0.06] py-20 px-6 z-10 relative text-left">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-12 md:gap-8 mb-16">
          
          {/* Column 1: Product */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Product</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li><Link href="/product/sift" className="hover:text-white transition-colors">Intake Triage</Link></li>
              <li><Link href="/product/drafts" className="hover:text-white transition-colors">Tone Writer</Link></li>
              <li><Link href="/product/arcus" className="hover:text-white transition-colors">Arcus Flagship</Link></li>
              <li className="hover:text-white cursor-pointer transition-colors">Vault Security</li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing Limits</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security Strip</Link></li>
            </ul>
          </div>

          {/* Column 2: Features */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Features</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li className="hover:text-white cursor-pointer transition-colors">Triage Sift</li>
              <li className="hover:text-white cursor-pointer transition-colors">Voice Profiler</li>
              <li className="hover:text-white cursor-pointer transition-colors">Cal.com Booking</li>
              <li className="hover:text-white cursor-pointer transition-colors">Slack Notifications</li>
              <li><Link href="/changelog" className="hover:text-white transition-colors">Platform Changelog</Link></li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Company</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li className="hover:text-white cursor-pointer transition-colors">About Us</li>
              <li className="hover:text-white cursor-pointer transition-colors">Customers</li>
              <li className="hover:text-white cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-white cursor-pointer transition-colors">Press</li>
            </ul>
          </div>

          {/* Column 4: Resources */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Resources</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li className="hover:text-white cursor-pointer transition-colors">API Docs</li>
              <li className="hover:text-white cursor-pointer transition-colors">System Status</li>
              <li className="hover:text-white cursor-pointer transition-colors">PII Vault Specs</li>
            </ul>
          </div>

          {/* Column 5: Legal */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Legal</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li className="hover:text-white cursor-pointer transition-colors">Terms of Service</li>
              <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
              <li className="hover:text-white cursor-pointer transition-colors">GDPR Compliance</li>
            </ul>
          </div>

        </div>

        {/* Bottom footer copyright */}
        <div className="max-w-6xl mx-auto border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-neutral-500 font-light font-mono">
              &copy; {new Date().getFullYear()} Mailient, Inc. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-[#8a8f98] font-light font-sans">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-white cursor-pointer transition-colors">DPA</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
