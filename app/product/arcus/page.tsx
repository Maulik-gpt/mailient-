"use client";

import React, { useEffect, useState, Suspense, lazy } from "react";
import { Navbar } from "@/components/Navbar";
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from "framer-motion";
import { 
  Cpu, Check, Terminal, Sparkles, ArrowRight, ShieldCheck, Zap, 
  Layers, MessageSquare, Play, Lock, Eye, Monitor, Settings, Code, ChevronRight
} from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const Dithering = lazy(() => 
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
);

export default function ArcusProductPage() {
  // Demo states for Live Conversation Demo
  const [demoStep, setDemoStep] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);

  // Mouse position tracker for cursor-reactive lighting on card
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  useEffect(() => {
    document.title = "Arcus Flagship / Mailient";
    runDemoSequence();
  }, []);

  // Live Chat Simulator sequence
  const runDemoSequence = async () => {
    setMessages([]);
    setDemoStep(0);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 1. User First Request
    await sleep(1000);
    setMessages(prev => [...prev, { sender: "user", text: "Draft a reply to Priya about the Q3 proposal. Set up a call too." }]);
    setDemoStep(1);

    // 2. Action Logs
    await sleep(1500);
    setMessages(prev => [...prev, { sender: "system", text: "— Reading Priya's thread... —" }]);
    await sleep(1000);
    setMessages(prev => [...prev, { sender: "system", text: "— Checking your calendar... —" }]);
    await sleep(1000);
    setMessages(prev => [...prev, { sender: "system", text: "— Creating Google Meet link... —" }]);
    await sleep(1000);
    setMessages(prev => [...prev, { sender: "system", text: "— Drafting in your voice... —" }]);
    setDemoStep(2);

    // 3. Arcus Response
    await sleep(1500);
    setMessages(prev => [...prev, { 
      sender: "arcus", 
      text: "Done. Tuesday 3pm works — I've booked it and added the Meet link. Here's the draft:",
      isDraft: true,
      draftContent: `Hi Priya,
Thanks for the kind words — really glad the proposal landed well.

Tuesday at 3pm works great on my end. I've sent a calendar invite with a Google Meet link attached — feel free to ping me if you need to reschedule.

Looking forward to it.
Maulik`,
      statusText: "Draft saved · Meeting created · Waiting for your approval"
    }]);
    setDemoStep(3);

    // 4. User Second Request
    await sleep(3500);
    setMessages(prev => [...prev, { sender: "user", text: "Also remind me to follow up with James if he hasn't replied by Friday." }]);
    setDemoStep(4);

    // 5. Arcus Second Response
    await sleep(2000);
    setMessages(prev => [...prev, { 
      sender: "arcus", 
      text: "Got it. I've set a reminder agent — if James hasn't replied by Friday 5pm, I'll draft a follow-up and flag it for you." 
    }]);
    setDemoStep(5);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi relative selection:bg-white selection:text-black">
      
      {/* Sticky Translucent Header */}
      <Navbar theme="dark" />

      {/* Atmospheric lighting */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute top-[4%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-neutral-900/10 blur-[180px]" />
        <div className="absolute top-[25%] left-[5%] w-[500px] h-[500px] rounded-full bg-white/[0.005] blur-[150px]" />
        <div className="absolute bottom-[20%] right-[5%] w-[800px] h-[800px] rounded-full bg-neutral-950/20 blur-[200px]" />
      </div>

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
              ARCUS — AI AGENT FOR YOUR INBOX
            </span>
          </div>

          {/* Headline & Subtitle */}
          <h1 className="text-4xl md:text-[68px] font-medium tracking-[-0.03em] text-white leading-[1.08] max-w-4xl">
            The inbox agent <br />
            <span className="font-extralight italic text-neutral-400">that works while you don't.</span>
          </h1>

          <p className="text-base md:text-[18px] text-[#8a8f98] leading-relaxed max-w-2xl mt-6 font-light font-sans">
            Arcus reads every email, drafts replies in your exact voice, books meetings, and runs silently in the background — delivering results before you ask for them.
          </p>

          {/* Premium CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="px-8 py-3 rounded-full bg-white text-black font-semibold text-xs tracking-tight transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center gap-2 cursor-pointer"
            >
              Try Arcus free
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <a
              href="#live-demo-section"
              className="px-8 py-3 rounded-full bg-transparent border border-white/10 text-white font-medium text-xs hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <Play className="w-3 h-3 fill-white" />
              Watch it work
            </a>
          </div>

          {/* Core Definition Description Box */}
          <div className="w-full max-w-4xl border border-white/[0.06] rounded-[32px] bg-[#050505] p-8 md:p-12 text-left mt-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/10 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <span className="text-[9px] font-mono tracking-widest text-[#8a8f98] uppercase block">
                CORE DEFINITION
              </span>
              <p className="text-sm text-neutral-300 leading-relaxed font-light font-sans">
                <strong>Arcus is not an email assistant.</strong> It does not suggest. It does not summarise. <strong>It acts.</strong> When an email arrives, Arcus reads the full thread, understands the context, checks your calendar, drafts a reply that sounds exactly like you, and — if you want — sends it. When you are not around, it runs on schedule, sweeps your inbox, handles the routine, and drops a clean briefing in your Gmail or Slack before you open your laptop. You do not configure it. You do not prompt it. You describe what you want once, in plain English, and Arcus does it — every day, without being asked again.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 3. CAPABILITIES GRID */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        
        <div className="text-left mb-20 max-w-2xl">
          <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold block mb-4">
            PLATFORM CAPABILITIES
          </span>
          <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] text-white leading-tight">
            Designed to execute, <br />not suggest.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Block 1: Neural Voice */}
          <div className="h-full rounded-3xl border border-white/[0.06] bg-[#050505] p-8 flex flex-col justify-between hover:border-white/[0.1] transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.005] rounded-full blur-[40px] pointer-events-none" />
            <div>
              <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-white/[0.04] flex items-center justify-center text-white mb-6">
                <MessageSquare className="w-4 h-4 text-neutral-300" />
              </div>
              <h3 className="text-base font-bold text-white mb-4">
                Replies that sound like you.
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                Arcus reads your last 90 days of sent email. It learns how you open messages, how you close them, how formal you are with clients versus collaborators, how long your sentences run, which words you never use.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center gap-1.5 text-[9px] uppercase font-bold text-neutral-500 font-mono">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>90-day semantic analysis</span>
            </div>
          </div>

          {/* Block 2: Autonomous Tool Use */}
          <div className="h-full rounded-3xl border border-white/[0.06] bg-[#050505] p-8 flex flex-col justify-between hover:border-white/[0.1] transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.005] rounded-full blur-[40px] pointer-events-none" />
            <div>
              <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-white/[0.04] flex items-center justify-center text-white mb-6">
                <Settings className="w-4 h-4 text-neutral-300" />
              </div>
              <h3 className="text-base font-bold text-white mb-4">
                One instruction. A dozen actions.
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                Tell Arcus to reply to Priya about tomorrow's meeting. Arcus reads the thread, checks your Google Calendar, finds an open slot, creates the event, generates a Meet link, drafts the reply with the link embedded.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center gap-1.5 text-[9px] uppercase font-bold text-neutral-500 font-mono">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Tool Layer active</span>
            </div>
          </div>

          {/* Block 3: Scheduling Agents */}
          <div className="h-full rounded-3xl border border-white/[0.06] bg-[#050505] p-8 flex flex-col justify-between hover:border-white/[0.1] transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.005] rounded-full blur-[40px] pointer-events-none" />
            <div>
              <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-white/[0.04] flex items-center justify-center text-white mb-6">
                <Zap className="w-4 h-4 text-neutral-300" />
              </div>
              <h3 className="text-base font-bold text-white mb-4">
                Set it once. Wake up to results.
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                Create an agent in plain English — "every morning at 7am, check my inbox for unanswered client emails, draft replies for each one." Arcus runs it on schedule without requiring the browser to be open.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center gap-1.5 text-[9px] uppercase font-bold text-neutral-500 font-mono">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cron scheduled agency</span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. LIVE CONVERSATION DEMO */}
      <section id="live-demo-section" className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="w-full flex flex-col items-center">
          
          <div className="text-center mb-16">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold block mb-4">
              REAL-TIME EXECUTION SIMULATOR
            </span>
            <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] text-white leading-tight">
              Watch Arcus coordinate, draft, and schedule.
            </h2>
          </div>

          {/* Interactive Chat Console */}
          <div className="w-full bg-[#050505] border border-white/[0.08] rounded-[32px] p-6 md:p-8 font-mono text-xs shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[480px]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.01),transparent_60%)] pointer-events-none" />

            {/* Header controls */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.04] mb-6 text-[10px] text-neutral-500 relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-bold tracking-widest uppercase">arcus-agent-terminal // active_session</span>
              <button 
                onClick={runDemoSequence}
                className="px-2.5 py-1 rounded border border-white/[0.08] bg-[#0c0c0c] text-[9px] hover:border-white/[0.2] text-white font-bold transition-colors cursor-pointer"
              >
                Reset Demo
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 space-y-4 mb-6 overflow-y-auto relative z-10 text-left">
              <AnimatePresence>
                {messages.map((msg, idx) => {
                  if (msg.sender === "user") {
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={idx}
                        className="flex items-start gap-2"
                      >
                        <span className="text-neutral-500 font-bold">&gt;</span>
                        <span className="text-white font-semibold font-sans">{msg.text}</span>
                      </motion.div>
                    );
                  }

                  if (msg.sender === "system") {
                    return (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                        key={idx}
                        className="text-[10px] text-amber-500 italic pl-4"
                      >
                        {msg.text}
                      </motion.div>
                    );
                  }

                  // Arcus agent response
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={idx}
                      className="space-y-3 pl-4"
                    >
                      <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Arcus:</span>
                        <span className="text-neutral-300 font-normal font-sans">{msg.text}</span>
                      </div>

                      {msg.isDraft && (
                        <div className="bg-[#0c0c0c] border border-white/[0.04] p-5 rounded-xl shadow-inner text-neutral-300 space-y-2 mt-2 font-sans font-light leading-relaxed max-w-xl">
                          <pre className="text-xs text-neutral-200 whitespace-pre-wrap font-sans font-light">
                            {msg.draftContent}
                          </pre>
                          <div className="pt-3 border-t border-white/[0.03] mt-4 flex items-center justify-between text-[9px] uppercase tracking-wider text-neutral-500 font-bold">
                            <span>Status: {msg.statusText}</span>
                            <span className="px-2 py-1 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 font-black">
                              Approve Draft
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Command Input Area */}
            <div className="border-t border-white/[0.04] pt-4 flex items-center justify-between text-neutral-500 text-[10px] relative z-10">
              <span>Console Sync Status: SECURED</span>
              <span className="animate-pulse">Waiting for Arcus...</span>
            </div>

          </div>

        </div>
      </section>

      {/* 5. SYSTEM ARCHITECTURE & DIAGRAM */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="text-left mb-20 max-w-2xl">
          <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold block mb-4">
            SYSTEM ARCHITECTURE
          </span>
          <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] text-white leading-tight">
            How Arcus operates.
          </h2>
        </div>

        {/* Architectural Flow Diagram */}
        <div className="w-full bg-[#050505] border border-white/[0.08] rounded-[32px] p-6 md:p-12 mb-20 overflow-x-auto shadow-sm">
          <div className="min-w-[800px] flex items-center justify-between font-mono text-[10px] uppercase font-bold text-neutral-400">
            
            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3 rounded-xl border border-white/[0.04] bg-[#0c0c0c] text-white shadow-md">
                Your Gmail
              </div>
            </div>

            <span className="text-neutral-600 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3 rounded-xl border border-white/[0.04] bg-[#0c0c0c] text-white shadow-md text-center">
                Arcus reads context
              </div>
            </div>

            <span className="text-neutral-600 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3 rounded-xl border border-emerald-900/40 bg-emerald-950/20 text-emerald-400 shadow-md text-center">
                Neural Voice Profile
              </div>
            </div>

            <span className="text-neutral-600 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3 rounded-xl border border-white/[0.04] bg-[#0c0c0c] text-white shadow-md text-center">
                Google Calendar adapter
              </div>
            </div>

            <span className="text-neutral-600 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3 rounded-xl border border-white/[0.08] bg-white text-black shadow-md">
                Gmail Draft Saved
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. SECURITY STRIP */}
      <section className="py-20 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
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
      </section>

      {/* 7. FIVE-COLUMN LUXURY FOOTER */}
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

    </div>
  );
}
