"use client";

import React, { useEffect, useState, Suspense, lazy } from "react";
import { Navbar } from "@/components/Navbar";
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from "framer-motion";
import { 
  Cpu, Check, Terminal, Sparkles, ArrowRight, ShieldCheck, Zap, 
  Layers, MessageSquare, Play, Lock, Eye, Monitor, Settings, Code, ChevronRight,
  Mail, Calendar, RefreshCw, Plus, Minus, Inbox, User, Clock, ArrowDown
} from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BlurFade } from "@/components/ui/blur-fade";
import { FloatingNavbar } from "@/components/FloatingNavbar";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

const Dithering = lazy(() => 
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
);

export default function ArcusProductPage() {
  // Simulator sequence states
  const [activeStep, setActiveStep] = useState(0);
  const [selectedThread, setSelectedThread] = useState("q3-proposal");

  // Mouse position tracker for spotlight glowing effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  useEffect(() => {
    document.title = "Arcus Flagship / Mailient";
    // Loop steps to show active execution simulation in the middle console
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi relative selection:bg-white selection:text-black">
      
      {/* Sticky Translucent Header */}
      <Navbar theme="dark" />

      {/* Atmospheric dark premium monochrome meshes */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        {/* Massive top glowing backdrop blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.025),rgba(255,255,255,0.01),transparent_70%)] blur-[120px]" />
        
        {/* Subtle dynamic warm mesh spotlights */}
        <div className="absolute top-[15%] left-[10%] w-[600px] h-[600px] rounded-full bg-white/[0.003] blur-[160px]" />
        <div className="absolute top-[35%] right-[5%] w-[800px] h-[800px] rounded-full bg-white/[0.002] blur-[200px]" />
      </div>

      {/* 1. HERO SECTION */}
      <section className="relative w-full pt-44 pb-20 md:pt-52 px-6 flex flex-col items-center text-center max-w-7xl mx-auto z-10">
        
        {/* WebGL Backing Shader */}
        <Suspense fallback={<div className="absolute inset-0 bg-[#000000] pointer-events-none" />}>
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.05] blur-[100px] scale-[1.05] mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_85%)]">
            <Dithering
              colorBack="#000000" 
              colorFront="#ffffff"
              shape="warp"
              type="4x4"
              speed={0.12}
              className="size-full"
              minPixelRatio={1}
            />
          </div>
        </Suspense>

        <div className="w-full flex flex-col items-center max-w-5xl z-10">
          
          {/* Premium Logo and Title Sideways Container */}
          <BlurFade delay={0.15} duration={0.8} yOffset={15} inView>
            <div className="flex items-center gap-5 mb-8 justify-center">
              {/* Arcus Logo - Stylized Geometric Cat Head */}
              <div className="relative w-16 h-16 rounded-[20px] bg-[#0d0e12] border border-white/[0.08] flex items-center justify-center shadow-[0_15px_45px_rgba(255,255,255,0.05)] overflow-hidden group flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-white/[0.02] to-transparent opacity-100 transition-opacity" />
                <svg className="w-9 h-9 text-white relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-4.418 0-8-3.582-8-8 0-1.62.48-3.13 1.3-4.4L3 3l5.6 2.3A7.95 7.95 0 0112 5c1.4 0 2.73.36 3.9 1L21 3.7l-2.3 5.6c.82 1.27 1.3 2.78 1.3 4.4 0 4.418-3.582 8-8 8z" />
                  <path strokeLinecap="round" d="M9.5 13h.01M14.5 13h.01M9 16c1 1 5 1 6 0" />
                </svg>
              </div>
              
              <h1 className="text-5xl md:text-[80px] font-medium tracking-[-0.035em] text-white leading-[1.05] font-sans">
                Arcus
              </h1>
            </div>
          </BlurFade>

          {/* Sleek Subtitle */}
          <BlurFade delay={0.25} duration={0.8} yOffset={12} inView>
            <p className="text-base md:text-[20px] text-[#8a8f98] leading-relaxed max-w-2xl mt-6 font-light font-sans tracking-tight">
              An inbox agent that helps you build and ship with AI—powered by Mailient.
            </p>
          </BlurFade>

          {/* Thick Solid Black Clean Pill Button */}
          <BlurFade delay={0.35} duration={0.8} yOffset={10} inView>
            <div className="flex flex-col items-center gap-12 mt-10">
              <button
                onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
                className="px-9 py-4 rounded-full bg-white text-black font-semibold text-xs tracking-tight transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center gap-2.5 cursor-pointer shadow-lg"
              >
                Connect Gmail for Arcus
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Trusted Logos Strip matching image layout */}
              <div className="space-y-6">
                <span className="text-[10px] font-mono tracking-[0.2em] text-[#555861] uppercase font-bold">
                  Trusted by top teams
                </span>
                <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-[0.35] grayscale hover:opacity-50 transition-opacity">
                  <span className="font-extrabold text-[14px] tracking-tight font-sans text-white">instacart</span>
                  <span className="font-extrabold text-[14px] tracking-tight font-sans text-white">duolingo</span>
                  <span className="font-semibold text-[14px] tracking-tight font-sans text-white">Vanta</span>
                  <span className="font-normal text-[14px] tracking-tight font-sans text-white">virgin atlantic</span>
                  <span className="font-bold text-[14px] tracking-tight font-sans text-white">miro</span>
                </div>
              </div>
            </div>
          </BlurFade>

        </div>
      </section>

      {/* 2. CORE WORKSPACE APPLICATION MOCKUP (Codex-Inspired Triple Pane Interface) */}
      <section className="py-24 px-6 w-full max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <span className="font-mono text-[9px] tracking-[0.2em] text-indigo-400 uppercase font-bold block mb-4">
            ARCUS FLAGSPACE // CONTROL PANEL
          </span>
          <h2 className="text-3xl md:text-[42px] font-medium tracking-[-0.025em] text-white leading-tight font-sans">
            A real-time command center for your outbox.
          </h2>
        </div>

        {/* Triple Pane Obsidian Mockup Box */}
        <div className="w-full linear-grid-card !rounded-[24px] overflow-hidden font-mono text-[11px] text-neutral-300 relative flex flex-col md:flex-row h-[580px]">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.005] to-white/[0.02] pointer-events-none" />

          {/* Pane 1: Left Threads Sidebar */}
          <div className="w-full md:w-[220px] bg-[#08090d]/90 border-r border-white/[0.06] p-5 flex flex-col justify-between select-none">
            <div className="space-y-6 text-left">
              {/* Window controls */}
              <div className="flex items-center gap-1.5 pb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>

              <div className="space-y-3">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Active Loops</div>
                <div className="space-y-1">
                  <button 
                    onClick={() => setSelectedThread("q3-proposal")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all font-sans font-medium text-[11px]",
                      selectedThread === "q3-proposal" 
                        ? "bg-white/[0.05] text-white border border-white/[0.05]" 
                        : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                    <span className="truncate">Q3 Proposal Followup</span>
                  </button>
                  <button 
                    onClick={() => setSelectedThread("james-reminder")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all font-sans font-medium text-[11px]",
                      selectedThread === "james-reminder" 
                        ? "bg-white/[0.05] text-white border border-white/[0.05]" 
                        : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span className="truncate">James Friday Sweep</span>
                  </button>
                  <button 
                    onClick={() => setSelectedThread("pitch-deck")}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-all font-sans font-medium text-[11px]",
                      selectedThread === "pitch-deck" 
                        ? "bg-white/[0.05] text-white border border-white/[0.05]" 
                        : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <Inbox className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span className="truncate">Investor Pitch Update</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Integrations</div>
                <div className="space-y-1 font-sans text-[10.5px] text-neutral-400 pl-3">
                  <div className="flex items-center gap-2">✓ Google Calendar</div>
                  <div className="flex items-center gap-2">✓ Gmail outbox</div>
                  <div className="flex items-center gap-2">✓ Notion Workspace</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.04] text-[10px] text-neutral-500 font-sans">
              SYNC STATUS: ACTIVE
            </div>
          </div>

          {/* Pane 2: Middle Execution Console (Narrator step-by-step logs) */}
          <div className="flex-1 bg-[#050608] p-6 flex flex-col justify-between text-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                <span className="text-[10px] tracking-wider uppercase text-neutral-400 font-bold">Execution Console</span>
                <span className="text-[9px] px-2 py-0.5 rounded bg-indigo-950/20 text-indigo-400 border border-indigo-900/30">LOOPING</span>
              </div>

              {/* Dynamic steps inside console */}
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <div className="text-[10px] text-neutral-500 font-bold">&gt; INCOMING EMAIL IDENTIFIED</div>
                  <div className="bg-[#0b0c10] border border-white/[0.04] p-3 rounded-lg text-neutral-200 font-sans leading-relaxed text-[10px]">
                    {selectedThread === "q3-proposal" && "Hi Maulik, The Q3 proposal layout looks solid. Can we lock in a brief sync session sometime next Tuesday afternoon? Let me know. - Priya"}
                    {selectedThread === "james-reminder" && "No recent response from James. Triggering automated check loop."}
                    {selectedThread === "pitch-deck" && "Draft complete for Austin regarding Aether Labs capital structure changes."}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-neutral-500 font-bold">&gt; AGENT EXECUTION LOG</div>
                  <div className="space-y-2.5 font-mono text-[10.5px]">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                      <span>Thought 4s: Analyzing thread context...</span>
                    </div>
                    
                    {/* Simulated timeline steps */}
                    <div className="space-y-1.5 pl-3.5 text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Explored sent mail history</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Google Calendar: slot located (Tue 3:00 PM)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Generated secure Google Meet bridge link</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.04] flex items-center justify-between text-neutral-500 text-[10px]">
              <span>Console Sync Status: SECURED</span>
              <span className="animate-pulse">Active loop thread synced</span>
            </div>
          </div>

          {/* Pane 3: Right Pane Outbox Diff View (Matching code-diff view from image) */}
          <div className="w-full md:w-[380px] bg-[#08090d]/90 border-l border-white/[0.06] p-6 flex flex-col justify-between text-left">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                <span className="text-[10px] tracking-wider uppercase text-neutral-400 font-bold">Gmail Draft Diff</span>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-0.5 rounded bg-white text-black font-bold text-[9px] transition-colors hover:bg-neutral-200">
                    Approve
                  </button>
                  <button className="px-2 py-0.5 rounded bg-[#16171b] border border-white/[0.08] text-white font-bold text-[9px] transition-colors hover:border-white/[0.2]">
                    Discard
                  </button>
                </div>
              </div>

              {/* Diff Code Layout matching the provided Codex concept */}
              <div className="space-y-4">
                <div className="text-[9.5px] text-neutral-500 font-bold uppercase tracking-wider">src/draft_reply.eml <span className="text-emerald-400 pl-2">+9 -2</span></div>
                <div className="bg-[#050608] border border-white/[0.04] rounded-lg p-3 font-mono text-[10px] space-y-1.5 text-neutral-400 overflow-y-auto max-h-[300px]">
                  
                  {/* Draft body structured like a code diff card */}
                  <div>
                    <span className="text-neutral-500">To:</span> priya@aetherlabs.co
                  </div>
                  <div>
                    <span className="text-neutral-500">Subject:</span> Re: Q3 Proposal Layout
                  </div>
                  <hr className="border-white/[0.03] my-2" />
                  
                  <div className="text-[#a51d2d] bg-[#ffeef0]/5 px-1 py-0.5 rounded">
                    - Let me review and follow up with a slot.
                  </div>
                  
                  <div className="text-[#22863a] bg-[#f0fff4]/5 px-1 py-0.5 rounded">
                    + Tuesday at 3:00 PM works perfect on my end.
                  </div>
                  <div className="text-[#22863a] bg-[#f0fff4]/5 px-1 py-0.5 rounded">
                    + I've locked in the slot and added a calendar
                  </div>
                  <div className="text-[#22863a] bg-[#f0fff4]/5 px-1 py-0.5 rounded">
                    + invite containing the Google Meet link below:
                  </div>
                  
                  <div className="pl-4 text-indigo-400 bg-indigo-950/10 px-1 py-0.5 rounded mt-2 border-l-2 border-indigo-500">
                    meet.google.com/q3-proposal-bridge
                  </div>

                  <div className="text-neutral-500 pt-3">
                    Learn style: 90-day outbound semantic analysis
                  </div>
                  <div className="text-neutral-500">
                    Voice Signature: Formal leadership profile
                  </div>

                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.04] text-[10px] text-neutral-500 font-sans">
              Status: waiting_for_manual_approval_or_autocommit
            </div>
          </div>

        </div>
      </section>

      {/* 3. ALTERNATING FEATURES GRID (Matching Codex image structured layout with gradient background wrapper cards) */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative text-center">
        
        <div className="mb-24">
          <span className="font-mono text-[9px] tracking-[0.2em] text-indigo-400 uppercase font-bold block mb-4">
            THE BEST WAY TO MANAGE WITH AGENTS
          </span>
          <h2 className="text-4xl md:text-[54px] font-medium tracking-[-0.035em] text-white leading-tight font-sans">
            Built to drive real leverage.
          </h2>
        </div>

        <div className="space-y-36 max-w-5xl mx-auto">
          
          {/* Row 1: Visual Card on the right */}
          <div className="flex flex-col lg:flex-row items-center gap-16 text-left">
            <div className="flex-1 space-y-6">
              <h3 className="text-2xl md:text-[28px] font-medium tracking-tight text-white leading-snug">
                Built to drive real engineering work.
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed font-light font-sans">
                From simple scheduling to complex multi-step updates, Arcus reliably completes outbox sweeps, calendar invites, and draft creation in your exact voice signatures.
              </p>
              <div className="pt-2">
                <Link href="/product/sift" className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline">
                  Explore triage integration
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Gradient Wrapper Mockup Panel */}
            <div className="flex-1 w-full flex items-center justify-center p-8 rounded-[24px] bg-gradient-to-br from-indigo-500/10 via-blue-600/5 to-transparent border border-white/[0.06] relative overflow-hidden group h-[320px]">
              {/* Mesh background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none" />
              
              {/* Floating elegant terminal mockup card */}
              <div className="w-[340px] bg-[#08090c] border border-white/[0.08] rounded-xl p-4 shadow-2xl space-y-3 font-mono text-[10px] text-neutral-300 relative z-10 transition-transform group-hover:scale-[1.02] duration-300">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-neutral-500">
                  <span>Voice Profiler V1</span>
                  <span className="text-emerald-400 font-bold">ANALYZED</span>
                </div>
                <div className="space-y-1.5 font-sans">
                  <div className="font-semibold text-white font-mono">&gt; Semantic analysis parameters:</div>
                  <div className="pl-3.5 text-neutral-400 text-[9.5px] leading-relaxed">
                    • Average length: 34 words per message<br />
                    • Formality bias: 84% collaboration tone<br />
                    • Favorite sign-off: "Looking forward to it"
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Visual Card on the left */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16 text-left">
            <div className="flex-1 space-y-6">
              <h3 className="text-2xl md:text-[28px] font-medium tracking-tight text-white leading-snug">
                Designed for multi-agent loops.
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed font-light font-sans">
                Arcus doesn't run in a single tab. It runs in secure background loops, sweeping your outbox on schedule, monitoring reminders, and coordinating calendars.
              </p>
              <div className="pt-2">
                <Link href="/product/drafts" className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline">
                  Learn about Tone Writing
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Gradient Wrapper Mockup Panel */}
            <div className="flex-1 w-full flex items-center justify-center p-8 rounded-[24px] bg-gradient-to-br from-indigo-500/10 via-blue-600/5 to-transparent border border-white/[0.06] relative overflow-hidden group h-[320px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none" />
              
              {/* Floating elegant concurrent loop card */}
              <div className="w-[340px] bg-[#08090c] border border-white/[0.08] rounded-xl p-4 shadow-2xl space-y-3 font-mono text-[10px] text-neutral-300 relative z-10 transition-transform group-hover:scale-[1.02] duration-300">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-neutral-500">
                  <span>Loop Orchestrator</span>
                  <span className="text-indigo-400 font-bold">RUNNING</span>
                </div>
                <div className="space-y-2 text-neutral-400">
                  <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                    <span>Inbox Triage sweep</span>
                    <span className="text-emerald-400">Every 5m</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                    <span>Friday James check-in</span>
                    <span className="text-neutral-500">Starts in 3h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Visual Card on the right */}
          <div className="flex flex-col lg:flex-row items-center gap-16 text-left">
            <div className="flex-1 space-y-6">
              <h3 className="text-2xl md:text-[28px] font-medium tracking-tight text-white leading-snug">
                Adapts to how your team builds.
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed font-light font-sans">
                Plugs natively into Google Workspace, Cal.com, and Notion, translating unstructured emails into clean calendar links, reminders, and synced database sheets.
              </p>
              <div className="pt-2">
                <Link href="/pricing" className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline">
                  View plans and limits
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Gradient Wrapper Mockup Panel */}
            <div className="flex-1 w-full flex items-center justify-center p-8 rounded-[24px] bg-gradient-to-br from-indigo-500/10 via-blue-600/5 to-transparent border border-white/[0.06] relative overflow-hidden group h-[320px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent_60%)] pointer-events-none" />
              
              {/* Floating elegant integration card */}
              <div className="w-[340px] bg-[#08090c] border border-white/[0.08] rounded-xl p-4 shadow-2xl space-y-3 font-mono text-[10px] text-neutral-300 relative z-10 transition-transform group-hover:scale-[1.02] duration-300">
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 text-neutral-500">
                  <span>Connector Hub</span>
                  <span className="text-emerald-400 font-bold">CONNECTED</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#0d0e12] border border-white/[0.04] p-2 rounded flex flex-col items-center justify-center text-center">
                    <Mail className="w-4 h-4 text-indigo-400 mb-1" />
                    <span className="text-[8px]">Gmail</span>
                  </div>
                  <div className="bg-[#0d0e12] border border-white/[0.04] p-2 rounded flex flex-col items-center justify-center text-center">
                    <Calendar className="w-4 h-4 text-emerald-400 mb-1" />
                    <span className="text-[8px]">GCal</span>
                  </div>
                  <div className="bg-[#0d0e12] border border-white/[0.04] p-2 rounded flex flex-col items-center justify-center text-center">
                    <RefreshCw className="w-4 h-4 text-amber-400 mb-1 animate-spin-slow" />
                    <span className="text-[8px]">Cal.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. SECURITY & INTEGRITY STRIP */}
      <section className="py-20 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="w-full linear-grid-card !rounded-[20px] py-4 px-6 hover:shadow-[0_20px_40px_rgba(99,102,241,0.06)] hover:border-white/[0.1] transition-all duration-300 flex items-center justify-between text-left cursor-pointer">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="text-[11px] text-neutral-400 font-sans">
              Vault-grade local PII sanitization with AES-256 local cache protection.
            </span>
          </div>
          <Link href="/security" className="text-[10px] text-white font-semibold hover:underline flex items-center gap-1">
            Read Security Standard
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 5. FIVE-COLUMN PREMIUM FOOTER */}
      <footer className="w-full bg-[#000000] border-t border-white/[0.06] py-20 px-6 z-10 relative text-left">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-12 md:gap-8 mb-16">
          
          {/* Column 1: Brand details */}
          <div className="flex flex-col space-y-4 col-span-2 md:col-span-1 text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-white">
                <img src="/mailient-logo-premium.png" alt="Mailient Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-extrabold text-[14px] tracking-tight text-white font-satoshi">
                Mailient
              </span>
            </div>
            <p className="text-[10px] text-[#8a8f98] font-light leading-relaxed font-sans max-w-[160px]">
              Hours of email, handled overnight. Multi-agent inbox loop purpose-built for modern teams.
            </p>
          </div>

          {/* Column 2: Product */}
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

          {/* Column 3: Features */}
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

          {/* Column 4: Company */}
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
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </footer>

      {/* Premium Progressive Blurs for Top/Bottom edges */}
      <ProgressiveBlur position="top" backgroundColor="#000000" height="120px" blurAmount="10px" className="fixed z-40" />
      <ProgressiveBlur position="bottom" backgroundColor="#000000" height="80px" blurAmount="10px" className="fixed z-40" />

      {/* Premium Liquid Glass Floating Navigation Overlay */}
      <FloatingNavbar />
    </div>
  );
}
