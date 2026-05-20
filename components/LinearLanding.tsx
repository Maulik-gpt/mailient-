"use client";

import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useMotionTemplate } from "framer-motion";
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
  ShieldCheck
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import AnimatedGradient from "@/components/ui/animated-gradient";
import { PerspectiveMarquee } from "@/components/ui/remocn-perspective-marquee";
import { SpecialText } from "@/components/ui/special-text";
import { BlurFade } from "@/components/ui/blur-fade";

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
  
  // State for active interactive steps

  // Mouse position tracker for cursor-reactive lighting on cards
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  // Simulated Webhook Stream (interactive state)
  const [webhookLogs, setWebhookLogs] = useState([
    { id: 1, type: "Complained", time: "02:37:31", email: "emma@xerox.com", feedback: "Spam", agent: "Yahoo Mail", os: "Windows" },
    { id: 2, type: "Complained", time: "02:37:28", email: "emma@gmail.com", feedback: "Spam", agent: "Gmail", os: "Windows" }
  ]);

  // Terminal API Log Simulator
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'HTTP 200: { "id": "7722ee1d-5c4f-4f57-bd35-02ac8d8e55be" }',
    'HTTP 200: { "id": "db90ae99-4b3b-4e10-a5a0-389854692d5b" }',
    'HTTP 200: { "id": "c78ce76f-d030-4e48-a565-ecca3be68d42" }'
  ]);

  useEffect(() => {
    document.title = "Mailient / Inbox Operations Reimagined";
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi relative selection:bg-white selection:text-black">
      
      {/* 0. Premium Custom Design Keyframes & Volumetric Shading */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes triage-pulse {
          0% { stroke-dashoffset: 80; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes orb-float {
          0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-12px) scale(1.03) rotate(3deg); }
        }
        @keyframes light-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />

      {/* Volumetric Floating Glass AI Orb (Atmospheric Lighting & Fog) */}
      <div 
        className="absolute top-[380px] right-[12%] w-[130px] h-[130px] rounded-full bg-white/[0.01] border border-white/[0.08] shadow-[0_0_60px_rgba(255,255,255,0.03),inset_0_1px_2px_rgba(255,255,255,0.15)] flex items-center justify-center pointer-events-none overflow-hidden select-none z-10 hidden lg:flex" 
        style={{ animation: "orb-float 7s ease-in-out infinite" }}
      >
        <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-blue-500/[0.04] via-neutral-950/80 to-white/[0.03] blur-[4px]" />
        {/* Volumetric Neon Spotlight Glow inside Orb */}
        <div className="absolute -bottom-8 w-24 h-12 bg-blue-500/10 blur-[18px] rounded-full" />
        {/* Shifting glass reflection arc */}
        <div className="absolute top-1.5 left-3 right-3 h-7 bg-gradient-to-b from-white/[0.06] to-transparent rounded-full opacity-70" />
      </div>

      {/* 1. Sticky, Glassy Floating Navigation */}
      <Navbar theme="dark" />

      {/* Cinematic Ambient Spotlights */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-neutral-900/10 blur-[180px]" />
        <div className="absolute top-[25%] left-[5%] w-[500px] h-[500px] rounded-full bg-white/[0.005] blur-[150px]" />
        <div className="absolute bottom-[20%] right-[5%] w-[800px] h-[800px] rounded-full bg-neutral-950/20 blur-[200px]" />
      </div>

      {/* 2. ELITE HERO SECTION WITH DARKER & BLURRED BG SHADER */}
      <section 
        className="relative w-full pt-40 pb-24 md:pt-48 md:pb-36 px-6 flex flex-col items-center text-center max-w-7xl mx-auto z-10"
      >
        {/* Slow Dithering WebGL Gradient behind Hero (Darker & Blurred) */}
        <Suspense fallback={<div className="absolute inset-0 bg-[#000000] pointer-events-none" />}>
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.15] blur-[80px] scale-[1.05] mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_85%)]">
            <Dithering
              colorBack="#000000" 
              colorFront="#4b5563"  // Very dark slate/graphite gray
              shape="warp"
              type="4x4"
              speed={0.15}
              className="size-full"
              minPixelRatio={1}
            />
          </div>
        </Suspense>

        <div
          className="w-full flex flex-col items-center max-w-6xl z-10"
        >
          {/* Handcrafted Status Ring Badge */}
          <BlurFade delay={0.05} duration={0.8} yOffset={10} inView>
            <div className="inline-flex items-center gap-2.5 px-4 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] shadow-2xl mb-8 group cursor-pointer hover:border-white/[0.1] transition-colors">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neutral-300"></span>
              </span>
              <span className="text-[10px] font-medium tracking-[0.15em] text-[#8a8f98] uppercase font-mono">
                ARCUS — AI AGENT FOR YOUR INBOX
              </span>
            </div>
          </BlurFade>

          {/* Tagline / Headline */}
          <BlurFade delay={0.15} duration={0.8} yOffset={15} inView>
            <h1 className="text-4xl md:text-[68px] font-medium tracking-[-0.03em] text-white leading-[1.08] max-w-5xl">
              The inbox agent that <br />works while you don't.
            </h1>
          </BlurFade>

          {/* Subtitle */}
          <BlurFade delay={0.22} duration={0.8} yOffset={15} inView>
            <p className="text-base md:text-[17px] text-[#8a8f98] leading-relaxed max-w-3xl mt-6 font-light font-sans">
              Arcus reads every email, drafts replies in your exact voice, books meetings, and runs silently in the background — delivering results before you ask for them.
            </p>
          </BlurFade>

          {/* Capsule CTAs */}
          <BlurFade delay={0.3} duration={0.8} yOffset={10} inView>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
              <button
                onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
                className="px-8 py-3 rounded-full bg-white text-black font-semibold text-xs tracking-tight transition-transform duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center gap-1.5"
              >
                Try Arcus free
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </button>

              <a
                href="#triage-section"
                className="px-8 py-3 rounded-full bg-transparent border border-white/10 text-white font-medium text-xs hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3 h-3 fill-white" />
                Watch it work
              </a>
            </div>
          </BlurFade>

          {/* What Arcus Is - Single Paragraph Copywriting */}
          <BlurFade delay={0.35} duration={0.8} yOffset={10} inView>
            <div className="max-w-2xl mx-auto mt-16 p-6 rounded-[20px] border border-white/[0.04] bg-[#050505]/40 backdrop-blur-md text-left shadow-2xl relative">
              <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.01),transparent_70%)] rounded-[20px]" />
              <p className="text-[12px] text-neutral-400 font-light leading-relaxed font-sans relative z-10">
                <span className="text-white font-semibold">Arcus is not an email assistant.</span> It does not suggest. It does not summarise. <span className="text-white">It acts.</span> When an email arrives, Arcus reads the full thread, understands the context, checks your calendar, drafts a reply that sounds exactly like you, and — if you want — sends it. When you are not around, it runs on schedule, sweeps your inbox, handles routine workflows, and drops a clean briefing in your Gmail or Slack before you open your laptop. You do not configure it. You do not prompt it. You describe what you want once, in plain English, and Arcus does it.
              </p>
            </div>
          </BlurFade>
                {/* 3. ISOMETRIC OUTLINE WIREFRAME COLUMNS (Exactly Replicating Screenshot 1 Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-5xl mt-36 border-t border-white/[0.06] pt-16 z-10 text-left">
          
          {/* Column 1: Fig 0.2 - Sift AI Classifier */}
          <BlurFade delay={0.4} duration={0.8} yOffset={20} inView>
            <div 
              className="flex flex-col group relative"
              onMouseMove={handleMouseMove}
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] mb-4 uppercase">
                FIG 0.2 // CLASSIFIER
              </span>
              {/* Stacking rounded layers SVG */}
              <div className="w-full h-44 flex items-center justify-center bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4 mb-6 relative overflow-hidden">
                {/* Cursor-reactive spotlight */}
                <motion.div
                  className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: useMotionTemplate`radial-gradient(150px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.04), transparent 80%)`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/[0.01] to-transparent pointer-events-none" />
                <svg viewBox="0 0 200 200" className="w-full h-32 stroke-neutral-700 fill-none stroke-[0.8] transition-transform duration-500 group-hover:scale-105 relative z-10">
                  <path d="M 100,50 L 160,80 L 100,110 L 40,80 Z" className="stroke-neutral-800" />
                  <path d="M 100,70 L 160,100 L 100,130 L 40,100 Z" className="stroke-neutral-700" />
                  <path d="M 100,90 L 160,120 L 100,150 L 40,120 Z" className="stroke-neutral-600" />
                  {/* Highlight Ring */}
                  <path d="M 100,40 L 140,60 L 100,80 L 60,60 Z" className="stroke-white/30 fill-white/[0.02]" />
                  <circle cx="100" cy="60" r="6" className="stroke-white/40 fill-white/10" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm tracking-tight text-white mb-2 font-sans">
                Sift AI Triage Classifier
              </h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed font-light font-sans max-w-sm">
                Runs autonomous intake classification to isolate noise, group priority threads, and sanitize PII locally using vault-grade encryption before passing details to AI layers.
              </p>
            </div>
          </BlurFade>

          {/* Column 2: Fig 0.3 - Voice Profiler */}
          <BlurFade delay={0.48} duration={0.8} yOffset={20} inView>
            <div 
              className="flex flex-col group relative"
              onMouseMove={handleMouseMove}
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] mb-4 uppercase">
                FIG 0.3 // WRITER
              </span>
              {/* Isometric blocks SVG */}
              <div className="w-full h-44 flex items-center justify-center bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4 mb-6 relative overflow-hidden">
                {/* Cursor-reactive spotlight */}
                <motion.div
                  className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: useMotionTemplate`radial-gradient(150px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.04), transparent 80%)`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/[0.01] to-transparent pointer-events-none" />
                <svg viewBox="0 0 200 200" className="w-full h-32 stroke-neutral-700 fill-none stroke-[0.8] transition-transform duration-500 group-hover:scale-105 relative z-10">
                  <path d="M 100,75 L 130,90 L 100,105 L 70,90 Z" />
                  <path d="M 70,90 L 70,120 L 100,135 L 100,105" />
                  <path d="M 130,90 L 130,120 L 100,135" />
                  
                  <path d="M 135,55 L 165,70 L 135,85 L 105,70 Z" className="stroke-neutral-600" />
                  <path d="M 105,70 L 105,95 L 135,110 L 135,85" className="stroke-neutral-600" />
                  <path d="M 165,70 L 165,95 L 135,110" className="stroke-neutral-600" />

                  <path d="M 65,55 L 95,70 L 65,85 L 35,70 Z" className="stroke-neutral-600" />
                  <path d="M 35,70 L 35,95 L 65,110 L 65,85" className="stroke-neutral-600" />
                  <path d="M 95,70 L 95,95 L 65,110" className="stroke-neutral-600" />

                  <circle cx="100" cy="50" r="5" className="stroke-white/40 fill-white/5" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm tracking-tight text-white mb-2 font-sans">
                Voice Profile Signature
              </h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed font-light font-sans max-w-sm">
                Analyzes your sent folder history to model a high-fidelity Personal Voice Profile. Drafts highly customized replies that reflect your exact style, signature, and vocabulary.
              </p>
            </div>
          </BlurFade>

          {/* Column 3: Fig 0.4 - Multi-Agent Coord */}
          <BlurFade delay={0.56} duration={0.8} yOffset={20} inView>
            <div 
              className="flex flex-col group relative"
              onMouseMove={handleMouseMove}
            >
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] mb-4 uppercase">
                FIG 0.4 // LOOP
              </span>
              {/* Ascending staircase bar chart SVG */}
              <div className="w-full h-44 flex items-center justify-center bg-white/[0.01] border border-white/[0.03] rounded-2xl p-4 mb-6 relative overflow-hidden">
                {/* Cursor-reactive spotlight */}
                <motion.div
                  className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: useMotionTemplate`radial-gradient(150px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.04), transparent 80%)`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/[0.01] to-transparent pointer-events-none" />
                <svg viewBox="0 0 200 200" className="w-full h-32 stroke-neutral-700 fill-none stroke-[0.8] transition-transform duration-500 group-hover:scale-105 relative z-10">
                  <path d="M 50,130 L 50,110 L 60,115 L 60,135 Z" />
                  <path d="M 70,135 L 70,100 L 80,105 L 80,140 Z" />
                  <path d="M 90,140 L 90,85 L 100,90 L 100,145 Z" />
                  <path d="M 110,145 L 110,70 L 120,75 L 120,150 Z" />
                  <path d="M 130,150 L 130,55 L 140,60 L 140,155 Z" className="stroke-white/20" />
                  <path d="M 150,155 L 150,40 L 160,45 L 160,160 Z" className="stroke-white/40" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm tracking-tight text-white mb-2 font-sans">
                Multi-Agent Logic Loop
              </h3>
              <p className="text-xs text-[#8a8f98] leading-relaxed font-light font-sans max-w-sm">
                Runs an autonomous, state-driven execution loop. Schedules meetings, pushes tasks, and syncs calendars across Cal.com, Google Meet, Notion, Slack, and Google Tasks.
              </p>
            </div>
          </BlurFade>
        </div>  </div>
      </section>

      {/* 4. SECTION 2: HIGH-FIDELITY INTERACTIVE SHOWCASE (Slack Thread + Kanban Dashboard) */}
      <section 
        id="triage-section"
        className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative"
      >
        {/* Title Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-20 text-left">
          <BlurFade delay={0.1} duration={0.8} yOffset={15} inView>
            <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.02em] text-white leading-tight">
              Make product operations <br />self-driving
            </h2>
          </BlurFade>

          <BlurFade delay={0.2} duration={0.8} yOffset={15} inView>
            <div className="space-y-4">
              <p className="text-[#8a8f98] text-sm md:text-base leading-relaxed font-light max-w-lg">
                Turn client feedback and communication noise into clear, actionable briefs and calendar slots that are routed, labeled, and synchronized with your workspace tools.
              </p>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5 group cursor-pointer">
                <span>1.0 Intake</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </BlurFade>
        </div>

        {/* HIGH-FIDELITY DUAL-PANE INTERACTION BOARD (Replicating Screenshot 2 Exactly) */}
        <BlurFade delay={0.3} duration={1} yOffset={25} inView>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
            
            {/* Left Pane: Slack-style Feedback Intake Thread */}
            <div className="lg:col-span-5 bg-[#090909] border border-white/[0.06] rounded-[24px] p-6 shadow-2xl flex flex-col justify-between text-left relative overflow-hidden h-[480px]">
              {/* Glass subtle spotlight */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-[40px]" />
              
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-800" />
                    <span className="text-[11px] font-mono text-[#8a8f98] tracking-widest uppercase">Thread in #feedback</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-neutral-600" />
                    <span className="w-1 h-1 rounded-full bg-neutral-600" />
                    <span className="w-1 h-1 rounded-full bg-neutral-600" />
                  </div>
                </div>

                {/* Messages stream */}
                <div className="space-y-5">
                  {/* Lena */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400">L</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-white">lena</span>
                        <span className="text-[9px] text-[#555]">2:33 PM</span>
                      </div>
                      <p className="text-xs text-[#8a8f98] leading-relaxed">
                        Anyone else noticing the proposal drafts feel slow to generate when we get custom scheduling inputs?
                      </p>
                    </div>
                  </div>

                  {/* Didier */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400">D</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-white">didier</span>
                        <span className="text-[9px] text-[#555]">2:33 PM</span>
                      </div>
                      <p className="text-xs text-[#8a8f98] leading-relaxed">
                        Yea, we're still manually verifying active calendars on Google Calendar and Cal.com every single time.
                      </p>
                    </div>
                  </div>

                  {/* Andreas */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400">A</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-white">andreas</span>
                        <span className="text-[9px] text-[#555]">2:33 PM</span>
                      </div>
                      <p className="text-xs text-[#8a8f98] leading-relaxed">
                        Feels like we could automate this context ingestion in the background. Probably worth scheduling a sync.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glowing Interactive Input Area */}
              <div className="mt-6 pt-4 border-t border-white/[0.04] relative">
                <div className="bg-[#030303] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-neutral-500 font-mono">
                    <span className="text-white">@Mailient</span> create urgent task and sync calendar...
                  </span>
                  <button className="h-7 px-3 bg-white text-black font-semibold text-[10px] rounded-lg hover:scale-102 transition-transform">
                    Send
                  </button>
                </div>
              </div>

            </div>

            {/* Premium Animated Triage Pipeline Path (Workflow lines) */}
            <div className="absolute left-[38%] right-[55%] top-[55%] -translate-y-1/2 h-12 pointer-events-none hidden lg:block z-20 overflow-visible">
              <svg className="w-full h-full stroke-white/5 fill-none" viewBox="0 0 100 40">
                <path d="M 0,20 Q 50,-5 100,20" className="stroke-white/[0.08] stroke-[1]" />
                {/* Running glass laser pulse representing intelligence speed */}
                <path d="M 0,20 Q 50,-5 100,20" className="stroke-white/[0.4] stroke-[1.5]" strokeDasharray="12 28" strokeDashoffset="80" style={{ animation: "triage-pulse 2.2s linear infinite" }} />
              </svg>
            </div>

            {/* Right Pane: Kanban Task Dashboard Board */}
            <div className="lg:col-span-7 bg-[#050505] border border-white/[0.06] rounded-[24px] p-6 shadow-2xl flex flex-col justify-between text-left relative overflow-hidden h-[480px]">
              
              <div>
                {/* Dashboard Tabs / Tabs outline */}
                <div className="flex items-center gap-6 pb-4 border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-none">
                  <span className="text-xs font-semibold text-white border-b-2 border-white pb-4 -mb-4.5 cursor-pointer">
                    Inbox Items
                  </span>
                  <span className="text-xs font-medium text-neutral-500 hover:text-white cursor-pointer transition-colors pb-4 -mb-4.5">
                    Calendars
                  </span>
                  <span className="text-xs font-medium text-neutral-500 hover:text-white cursor-pointer transition-colors pb-4 -mb-4.5">
                    Integrations
                  </span>
                  <span className="text-xs font-medium text-neutral-500 hover:text-white cursor-pointer transition-colors pb-4 -mb-4.5">
                    History
                  </span>
                </div>

                {/* Kanban grid layout */}
                <div className="grid grid-cols-3 gap-4">
                  
                  {/* Column 1: Todo */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                      <span>Todo 71</span>
                    </div>

                    {/* Todo Card 1 */}
                    <div className="bg-[#0b0b0b] border border-white/[0.04] p-3.5 rounded-xl space-y-3 hover:border-white/[0.08] transition-all duration-300">
                      <div className="flex items-center justify-between text-[9px] font-mono text-[#8a8f98]">
                        <span>OPP-926</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                      </div>
                      <p className="text-[11px] text-neutral-300 font-semibold leading-tight">
                        Remove UI inconsistencies from Q3 layout
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-red-950/20 text-[8px] font-bold text-red-400 uppercase">Bug</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-950/20 text-[8px] font-bold text-blue-400 uppercase">Design</span>
                      </div>
                    </div>

                    {/* Todo Card 2 */}
                    <div className="bg-[#0b0b0b] border border-white/[0.04] p-3.5 rounded-xl space-y-3 opacity-60">
                      <p className="text-[11px] text-neutral-400 font-medium">
                        Optimize cache layers for Google OAuth flow
                      </p>
                    </div>
                  </div>

                  {/* Column 2: In Progress */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      <span>In Progress 3</span>
                    </div>

                    {/* In Progress Card 1 */}
                    <div className="bg-[#0b0b0b] border border-white/[0.04] p-3.5 rounded-xl space-y-3 hover:border-white/[0.08] transition-all duration-300">
                      <div className="flex items-center justify-between text-[9px] font-mono text-[#8a8f98]">
                        <span>TKT-2088</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      </div>
                      <p className="text-[11px] text-neutral-300 font-semibold leading-tight">
                        TypeError: Cannot read properties of undefined
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-red-950/20 text-[8px] font-bold text-red-400 uppercase">Bug</span>
                      </div>
                    </div>

                    {/* In Progress Card 2 */}
                    <div className="bg-[#0b0b0b] border border-white/[0.04] p-3.5 rounded-xl space-y-3 hover:border-white/[0.08] transition-all duration-300">
                      <div className="flex items-center justify-between text-[9px] font-mono text-[#8a8f98]">
                        <span>CAL-2187</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      </div>
                      <p className="text-[11px] text-neutral-300 font-semibold leading-tight">
                        Sync open spots with Aether Capital VC
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-purple-950/20 text-[8px] font-bold text-purple-400 uppercase">AI</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Done */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Done 12</span>
                    </div>

                    {/* Done Card 1 */}
                    <div className="bg-[#0b0b0b] border border-[#10b981]/10 p-3.5 rounded-xl space-y-3 opacity-75">
                      <div className="flex items-center justify-between text-[9px] font-mono text-emerald-400">
                        <span>ENG-1487</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      <p className="text-[11px] text-neutral-350 font-medium leading-tight line-through">
                        Verify AES-256 standard compilation
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/30 text-[8px] font-bold text-emerald-400 uppercase">Done</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Bottom tag / info */}
              <div className="flex items-center justify-between border-t border-white/[0.04] pt-4 mt-6 text-[10px] text-neutral-500">
                <span>Intake pipeline connected · 1.0</span>
                <span className="text-neutral-400 font-semibold">Active Session</span>
              </div>

            </div>

          </div>
        </BlurFade>
      </section>

      {/* 5. SECTION 3: FIRST-CLASS DEV EXPERIENCE (Exactly Replicating Screenshot 5) */}
      <section 
        className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative"
      >
        <div className="text-left mb-20 space-y-4 max-w-3xl">
          <BlurFade delay={0.05} duration={0.8} yOffset={10} inView>
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a8f98] mb-4">
              developer ecosystem // API
            </h2>
          </BlurFade>
          <BlurFade delay={0.15} duration={0.8} yOffset={15} inView>
            <p className="text-3xl md:text-[44px] font-medium text-white tracking-[-0.03em] leading-tight">
              First-class developer experience
            </p>
          </BlurFade>
          <BlurFade delay={0.25} duration={0.8} yOffset={12} inView>
            <p className="text-neutral-400 text-sm md:text-base font-light max-w-2xl leading-relaxed tracking-tight">
              We are a team of engineers who love building tools for other engineers. Our goal is to create the email platform we've always wished we had — one that <span className="italic text-white">just works</span>.
            </p>
          </BlurFade>
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full text-left">
          
          {/* Card Left: Test Mode */}
          <BlurFade delay={0.3} duration={0.8} yOffset={20} inView>
            <div className="bg-[#090909] border border-white/[0.06] rounded-[24px] p-8 shadow-2xl flex flex-col justify-between h-[440px] relative overflow-hidden group">
              <div>
                {/* SVG icon test tube */}
                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/[0.08] flex items-center justify-center mb-6">
                  <span className="text-xs">🧪</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Test mode</h3>
                <p className="text-xs text-[#8a8f98] leading-relaxed font-light mb-8 max-w-sm">
                  Simulate events and experiment with our API without the risk of accidentally sending real emails to real people.
                </p>

                {/* API Request Simulator Container (Screenshot 5 detail) */}
                <div className="bg-black/60 border border-white/[0.06] rounded-xl p-4 font-mono text-[10px] space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.04] mb-2">
                    <span className="text-neutral-400">Simulator Terminal</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-450 border border-emerald-900/60 uppercase text-[8px] font-bold">Active</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/30 text-emerald-400 font-bold uppercase text-[8px]">Delivered</span>
                      <span className="text-neutral-300">delivered@resend.dev</span>
                    </div>
                    <button className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-[8px] border border-white/[0.06]">
                      Send
                    </button>
                  </div>
                  <div className="space-y-1.5 text-neutral-400">
                    <p className="text-neutral-500">&gt; Triggering test payload compile...</p>
                    <p>HTTP 200: &#123; "id": "7722ee1d-5c4f-4f57-bd35-02ac8d8e55be" &#125;</p>
                    <p>HTTP 200: &#123; "id": "db90ae99-4b3b-4e10-a5a0-389854692d5b" &#125;</p>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-neutral-500 font-semibold pt-4 border-t border-white/[0.04] mt-6 flex items-center justify-between">
                <span>API Sandbox</span>
                <span className="hover:text-white cursor-pointer transition-colors">Learn more &rarr;</span>
              </div>
            </div>
          </BlurFade>

          {/* Card Right: Webhooks Timeline */}
          <BlurFade delay={0.38} duration={0.8} yOffset={20} inView>
            <div className="bg-[#090909] border border-white/[0.06] rounded-[24px] p-8 shadow-2xl flex flex-col justify-between h-[440px] relative overflow-hidden group">
              <div>
                {/* SVG icon antenna */}
                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/[0.08] flex items-center justify-center mb-6">
                  <span className="text-xs">🔔</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">Modular webhooks</h3>
                <p className="text-xs text-[#8a8f98] leading-relaxed font-light mb-8 max-w-sm">
                  Receive real-time notifications directly to your server. Every time an email is delivered, opened, bounces, or a link is clicked.
                </p>

                {/* Timeline interface (Screenshot 5 detail) */}
                <div className="space-y-4">
                  {webhookLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 border-l-2 border-neutral-800 pl-4 relative ml-2">
                      <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-yellow-500" />
                      <div className="space-y-1.5 text-left flex-1">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-yellow-950/20 text-yellow-500 border border-yellow-900/60 uppercase text-[8px] font-bold">
                            {log.type}
                          </span>
                          <span className="text-[9px] text-[#555] font-mono">May 20 {log.time}</span>
                        </div>
                        <p className="text-[10px] text-neutral-350 leading-relaxed font-sans">
                          to <span className="font-semibold text-white font-mono">{log.email}</span> with feedback <span className="font-semibold text-white">{log.feedback}</span>
                        </p>
                        <p className="text-[9px] text-neutral-500">
                          on agent <span className="text-neutral-450">{log.agent}</span> running on <span className="text-neutral-450">{log.os}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[10px] text-neutral-500 font-semibold pt-4 border-t border-white/[0.04] mt-6 flex items-center justify-between">
                <span>Webhook Logs</span>
                <span className="hover:text-white cursor-pointer transition-colors">Learn more &rarr;</span>
              </div>
            </div>
          </BlurFade>

        </div>
      </section>

      {/* 6. SECTION 4: CALL TO ACTION FOLD (Exactly Replicating Screenshot 4) */}
      <section 
        className="py-44 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative flex flex-col items-center text-center space-y-8"
      >
        <BlurFade delay={0.1} duration={0.8} yOffset={15} inView>
          <h2 className="text-4xl md:text-[68px] font-medium tracking-[-0.03em] text-white leading-tight">
            Built for the future. <br />Available today.
          </h2>
        </BlurFade>

        {/* Dynamic Cognitive Leverage Metrics */}
        <BlurFade delay={0.18} duration={0.8} yOffset={10} inView>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl mx-auto py-12 border-y border-white/[0.05] my-10 text-left">
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">Triage Capacity</span>
              <span className="text-2xl md:text-3xl font-semibold tracking-tight text-white flex items-center gap-0.5">
                <ActiveCounter target={100} />k+
              </span>
              <span className="text-[10px] text-neutral-500 font-light font-sans">Processed daily</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">Response Speed</span>
              <span className="text-2xl md:text-3xl font-semibold tracking-tight text-white flex items-center gap-0.5">
                <ActiveCounter target={24} />x
              </span>
              <span className="text-[10px] text-neutral-500 font-light font-sans">Faster triage cycles</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">Leverage Factor</span>
              <span className="text-2xl md:text-3xl font-semibold tracking-tight text-white flex items-center gap-0.5">
                <ActiveCounter target={98} />%
              </span>
              <span className="text-[10px] text-neutral-500 font-light font-sans">Noise isolation rate</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">Founder Advantage</span>
              <span className="text-2xl md:text-3xl font-semibold tracking-tight text-white flex items-center gap-0.5">
                <ActiveCounter target={1240} />h
              </span>
              <span className="text-[10px] text-neutral-500 font-light font-sans">Focus hours saved</span>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.25} duration={0.8} yOffset={10} inView>
          <div className="flex items-center justify-center gap-4 mt-4">
            <button 
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="px-8 py-3 rounded-full bg-white text-black font-semibold text-xs transition-transform duration-300 hover:scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.1)]"
            >
              Open app
            </button>
            <button 
              className="px-8 py-3 rounded-full bg-neutral-900 border border-white/10 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              Download
            </button>
          </div>
        </BlurFade>
      </section>

      {/* 7. FIVE-COLUMN LUXURY FOOTER (Exactly Replicating Screenshot 4 Columns) */}
      <footer className="w-full bg-[#000000] border-t border-white/[0.06] py-20 px-6 z-10 relative text-left">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-12 md:gap-8 mb-16">
          
          {/* Column 1: Product */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Product</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li><Link href="/product/sift" className="hover:text-white transition-colors">Intake</Link></li>
              <li><Link href="/product/drafts" className="hover:text-white transition-colors">Plan</Link></li>
              <li><Link href="/product/arcus" className="hover:text-white transition-colors">Build</Link></li>
              <li className="hover:text-white cursor-pointer transition-colors">Diffs</li>
              <li className="hover:text-white cursor-pointer transition-colors">Monitor</li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
            </ul>
          </div>

          {/* Column 2: Features */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Features</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li className="hover:text-white cursor-pointer transition-colors">Asks</li>
              <li className="hover:text-white cursor-pointer transition-colors">Agents</li>
              <li className="hover:text-white cursor-pointer transition-colors">Customer Requests</li>
              <li className="hover:text-white cursor-pointer transition-colors">Insights</li>
              <li className="hover:text-white cursor-pointer transition-colors">Mobile</li>
              <li className="hover:text-white cursor-pointer transition-colors">Integrations</li>
              <li><Link href="/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Company</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li className="hover:text-white cursor-pointer transition-colors">About</li>
              <li className="hover:text-white cursor-pointer transition-colors">Customers</li>
              <li className="hover:text-white cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-white cursor-pointer transition-colors">Blog</li>
              <li className="hover:text-white cursor-pointer transition-colors">Method</li>
              <li className="hover:text-white cursor-pointer transition-colors">Quality</li>
              <li className="hover:text-white cursor-pointer transition-colors">Brand</li>
            </ul>
          </div>

          {/* Column 4: Resources */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Resources</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li className="hover:text-white cursor-pointer transition-colors">Switch</li>
              <li className="hover:text-white cursor-pointer transition-colors">Download</li>
              <li className="hover:text-white cursor-pointer transition-colors">Documentation</li>
              <li className="hover:text-white cursor-pointer transition-colors">Developers</li>
              <li className="hover:text-white cursor-pointer transition-colors">Status</li>
              <li className="hover:text-white cursor-pointer transition-colors">Enterprise</li>
              <li className="hover:text-white cursor-pointer transition-colors">Startups</li>
            </ul>
          </div>

          {/* Column 5: Connect */}
          <div className="flex flex-col space-y-4">
            <h4 className="text-xs font-semibold text-white">Connect</h4>
            <ul className="space-y-3 text-[11px] text-[#8a8f98] font-light">
              <li className="hover:text-white cursor-pointer transition-colors">Contact us</li>
              <li className="hover:text-white cursor-pointer transition-colors">Community</li>
              <li className="hover:text-white cursor-pointer transition-colors">X (Twitter)</li>
              <li className="hover:text-white cursor-pointer transition-colors">GitHub</li>
              <li className="hover:text-white cursor-pointer transition-colors">YouTube</li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright & details */}
        <div className="max-w-6xl mx-auto border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Linear-style minimalist logo icon */}
            <svg viewBox="0 0 20 20" className="w-5 h-5 fill-white">
              <path d="M 10,0 C 4.47,0 0,4.47 0,10 C 0,15.53 4.47,20 10,20 C 15.53,20 20,15.53 20,10 C 20,4.47 15.53,0 10,0 Z M 10,18 C 5.58,18 2,14.42 2,10 C 2,5.58 5.58,2 10,2 C 14.42,2 18,5.58 18,10 C 18,14.42 14.42,18 10,18 Z" />
            </svg>
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
