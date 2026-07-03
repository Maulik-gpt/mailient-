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
import { ArcusLogo } from "@/components/ui/arcus-logo";
import { WordBlurStream } from "@/src/WordBlurStream";
import { CTASection } from "@/components/ui/hero-dithering-card";
import { Footer } from "@/components/Footer";
import { CircleExpandButton } from "@/components/CircleExpandButton";

const Dithering = lazy(() => 
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
);

const arcusFaqs = [
  {
    q: "What exactly is Arcus?",
    a: "Arcus is Mailient's AI agent — the part that takes action, not just answers. It reads your email threads, drafts replies in your voice, books meetings on your calendar, searches the web, reads your Notion, and runs scheduled tasks in the background while you sleep. It is the difference between an inbox tool and an inbox employee."
  },
  {
    q: "Does Arcus actually send emails on my behalf?",
    a: "Only when you explicitly approve it. Arcus drafts everything first and shows it to you before anything goes out. If you set up a background agent and turn on autonomous mode for that specific agent, it can send — but that is a deliberate choice you make per agent, not a default. You are always in control."
  },
  {
    q: "How does Arcus learn to write like me?",
    a: "Arcus reads your last 90 days of sent emails to understand how you write — your greeting, your sign-off, your tone with clients versus partners, your sentence length, your vocabulary. Every draft it writes goes through that voice profile. Your clients should not be able to tell the difference."
  },
  {
    q: "What are Scheduling Agents?",
    a: "Scheduling Agents are autonomous tasks you create once in plain English and forget about. You tell Arcus what to do, when to do it, and where to send the results — Gmail, Slack, or both. Arcus runs it on schedule with no tab open, no prompt, no reminder needed. You wake up to the results in your inbox."
  },
  {
    q: "Can Arcus access my Google Calendar and Notion?",
    a: "Yes — if you grant it access. Arcus uses standard OAuth to connect to Google Calendar and Notion. It reads your schedule to check availability and book meetings, and reads your Notion to pull context when drafting or reporting. You can revoke access to any connected app instantly from your settings."
  },
  {
    q: "Does Arcus train on my emails?",
    a: "Never. What Arcus reads to complete a task stays in that session. Your emails are not used to train any AI model — not Mailient's, not Anthropic's, not anyone else's. Your data exists to serve you, not to improve a product you did not consent to contribute to."
  },
  {
    q: "What is the Canvas Panel?",
    a: "Canvas is a full workspace that slides open alongside the Arcus chat when a task is too big for a single reply — a proposal, a weekly digest, a meeting prep document, a client analysis. Arcus writes into it in real time. You can edit it inline, export it as a PDF, or send it directly as an email from inside Canvas."
  },
  {
    q: "What happens if Arcus makes a mistake?",
    a: "Arcus never sends anything without your approval unless you have explicitly enabled autonomous mode for a specific agent. If a draft is wrong, you edit it or discard it. If an agent produces a bad report, you tell Arcus and it adjusts. Nothing is irreversible until you say so."
  },
  {
    q: "How many Arcus queries do I get?",
    a: "All paid plans — Monthly ($29/mo), Annual ($16.58/mo billed $199/year), and Lifetime Founder ($499) — include unlimited Arcus queries. There is no free tier. Subscribe to any plan and get full, unrestricted access to Arcus."
  },
  {
    q: "Can I use Arcus without the rest of Mailient?",
    a: "Arcus is built into Mailient and works alongside Sift AI and the inbox view. You cannot use it as a standalone product — but you do not need to use every feature. Many users open Mailient purely to talk to Arcus and never look at anything else."
  }
];

export default function ArcusProductPage() {
  // Simulator sequence states
  const [activeStep, setActiveStep] = useState(0);
  const [selectedThread, setSelectedThread] = useState("q3-proposal");
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);

  // Mouse position tracker for spotlight glowing effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  useEffect(() => {
    document.title = "Arcus — the AI running your inbox | Mailient";
    // Loop steps to show active execution simulation in the middle console
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi strichpunkt-theme relative selection:bg-white selection:text-black">
      
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

        <div className="w-full flex flex-col items-center text-center max-w-5xl z-10">
          
          {/* Eyebrow Platform Badge */}
          <BlurFade delay={0.05} duration={0.8} yOffset={10} inView>
            <div className="inline-flex items-center gap-2.5 px-4 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] shadow-2xl mb-8">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-300"></span>
              </span>
              <span className="text-[10px] font-medium tracking-[0.15em] text-[#8a8f98] uppercase font-mono">
                Product // Arcus Flagship
              </span>
            </div>
          </BlurFade>

          {/* Headline & Subtitle */}
          <BlurFade delay={0.15} duration={0.8} yOffset={15} inView>
            <h1 className="text-4xl md:text-[68px] font-medium tracking-[-0.03em] text-white leading-[1.08] max-w-4xl">
              Inbox Employee. <br />On autopilot.
            </h1>
          </BlurFade>

          {/* Sleek Detailed Word Blur Streaming Subtitle */}
          <BlurFade delay={0.25} duration={0.8} yOffset={12} inView>
            <div className="text-base md:text-[20px] text-[#8a8f98] leading-relaxed max-w-2xl mt-4 font-light font-sans tracking-tight">
              <WordBlurStream
                text="It reads every thread, drafts replies in your voice, books your meetings, and runs on schedule while you sleep. Nothing sends without your approval."
                msPerWord={80}
                startupMs={400}
                loop={false}
              />
            </div>
          </BlurFade>

          {/* Thick Solid Black Clean Pill Button */}
          <BlurFade delay={0.35} duration={0.8} yOffset={10} inView>
            <div className="flex flex-col items-center gap-12 mt-10">
              <CircleExpandButton href="/auth/signup">
                Start free trial
              </CircleExpandButton>
            </div>
          </BlurFade>

        </div>
      </section>

      {/* 2. CORE WORKSPACE APPLICATION MOCKUP (Codex-Inspired Triple Pane Interface) */}
      <section className="py-24 px-6 w-full max-w-7xl mx-auto z-10 relative">
        <div className="text-center mb-16">
          <span className="font-mono text-[9px] tracking-[0.2em] text-indigo-400 uppercase font-bold block mb-4">
            EVERY DECISION IN THE OPEN
          </span>
          <h2 className="text-3xl md:text-[42px] font-medium tracking-[-0.025em] leading-tight font-sans bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
            Watch it work. Approve what goes out.
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
                <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Active Outboxes</div>
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
                    Voice: learned from your last 90 days of sent mail
                  </div>
                  <div className="text-neutral-500">
                    Sounds like: you
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
            WHAT YOUR NEW EMPLOYEE DOES
          </span>
          <h2 className="text-4xl md:text-[54px] font-medium tracking-[-0.035em] leading-tight font-sans bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
            It does the work. You approve it.
          </h2>
        </div>

        <div className="space-y-36 max-w-5xl mx-auto">
          
          {/* Row 1: Visual Card on the right */}
          <div className="flex flex-col lg:flex-row items-center gap-16 text-left">
            <div className="flex-1 space-y-6">
              <h3 className="text-2xl md:text-[28px] font-medium tracking-tight text-white leading-snug">
                From one reply to a full inbox sweep.
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed font-light font-sans">
                Ask for a single draft or hand it the whole morning. It finds the open slot, books the call, and writes the reply the way you would have written it.
              </p>
              <div className="pt-2">
                <Link href="/product/sift" className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline">
                  See how it picks what matters
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
                  <span>Voice profile</span>
                  <span className="text-emerald-400 font-bold">LEARNED</span>
                </div>
                <div className="space-y-1.5 font-sans">
                  <div className="font-semibold text-white font-mono">&gt; What it learned from your sent mail:</div>
                  <div className="pl-3.5 text-neutral-400 text-[9.5px] leading-relaxed">
                    • Average length: 34 words per message<br />
                    • Warm but direct with clients<br />
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
                It works while the tab is closed.
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed font-light font-sans">
                No tab open, no prompt, no reminder. It runs on schedule in the background — sweeping your inbox, chasing follow-ups, watching your calendar — and reports back every morning.
              </p>
              <div className="pt-2">
                <Link href="/product/drafts" className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline">
                  See drafts in your voice
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
                  <span>Agent Orchestrator</span>
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
                Plugged into what you already use.
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed font-light font-sans">
                Gmail, Google Calendar, Cal.com, Notion. It turns messy email threads into booked meetings, reminders, and clean notes — filed where you already keep them.
              </p>
              <div className="pt-2">
                <Link href="/pricing" className="inline-flex items-center gap-1 text-xs font-semibold text-white hover:underline">
                  See pricing — everything included
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
              Your emails are encrypted in your browser before they leave it. Personal data is stripped before any AI sees it.
            </span>
          </div>
          <Link href="/security" className="text-[10px] text-white font-semibold hover:underline flex items-center gap-1">
            Read Security Standard
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ARCUS FAQ ACCORDION SECTION */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          <div className="lg:col-span-4 space-y-4 text-left">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">COMMON QUESTIONS</span>
            <h2 className="text-3xl md:text-[40px] font-medium tracking-[-0.025em] leading-tight bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
              Frequently asked questions.
            </h2>
            <p className="text-xs text-[#8a8f98] leading-relaxed font-light font-sans max-w-sm">
              The short version: it runs your inbox, and nothing sends without you. Details below.
            </p>
          </div>

          <div className="lg:col-span-8 flex flex-col space-y-4 w-full">
            {arcusFaqs.map((faq, index) => (
              <div key={index} className="border-b border-white/[0.06] pb-4 text-left">
                <div 
                  onClick={() => setActiveAccordion(activeAccordion === index ? null : index)}
                  className="flex items-center justify-between py-4 cursor-pointer text-sm font-semibold text-white hover:text-neutral-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="text-xs text-neutral-500 font-mono">{activeAccordion === index ? "[-]" : "[+]"}</span>
                </div>
                <AnimatePresence>
                  {activeAccordion === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="text-sm text-[#8a8f98] font-light leading-relaxed font-sans pb-4 min-h-[3rem]">
                        <WordBlurStream
                          text={faq.a}
                          msPerWord={20}
                          loop={false}
                          startupMs={100}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Premium Dithered CTA Section */}
      <CTASection />

      <Footer />

      {/* Premium Progressive Blurs for Top/Bottom edges */}
      <ProgressiveBlur position="top" backgroundColor="#000000" height="120px" blurAmount="10px" className="fixed z-40" />
      <ProgressiveBlur position="bottom" backgroundColor="#000000" height="80px" blurAmount="10px" className="fixed z-40" />

      {/* Premium Liquid Glass Floating Navigation Overlay */}
      <FloatingNavbar />
    </div>
  );
}
