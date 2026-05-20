"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cpu, Check, Terminal, Sparkles, ArrowRight, ShieldCheck, Zap, 
  Layers, MessageSquare, Play, Lock, Eye, Monitor, Settings, Code 
} from "lucide-react";
import { signIn } from "next-auth/react";
import AnimatedGradient from "@/components/ui/animated-gradient";
import { BlurFade } from "@/components/ui/blur-fade";



export default function ArcusProductPage() {
  // Demo states for Section 4 (Live Conversation Demo)
  const [demoStep, setDemoStep] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    document.title = "Arcus Flagship / Mailient";
    runDemoSequence();
  }, []);

  // Live Chat Simulator sequence
  const runDemoSequence = async () => {
    setMessages([]);
    setDemoStep(0);
    setIsTyping(false);

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
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi relative selection:bg-white selection:text-neutral-950">
      
      {/* 1. NAV (Dark Theme Overridden Navbar) */}
      <Navbar theme="dark" />

      {/* Atmospheric dark neon details */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-neutral-900/40 blur-[130px]" />
      </div>

      {/* 2. HERO SECTION */}
      <section className="relative z-10 pt-40 pb-20 md:pt-48 md:pb-28 px-6 text-center max-w-5xl mx-auto flex flex-col items-center rounded-[40px] border border-neutral-900 mt-6 overflow-hidden">
        
        {/* WebGL Animated Background */}
        <AnimatedGradient 
          config={{ preset: "Plasma" }} 
          noise={{ opacity: 0.02 }} 
          className="opacity-20"
        />
        
        {/* Eyebrow */}
        <BlurFade delay={0.05} duration={0.8} yOffset={10} inView>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 shadow-sm mb-6">
            <Cpu className="w-3.5 h-3.5 text-neutral-300" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-300">
              ARCUS — AI AGENT FOR YOUR INBOX
            </span>
          </div>
        </BlurFade>

        {/* Logo */}
        <BlurFade delay={0.1} duration={0.8} yOffset={8} inView>
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-4 block">
            Arcus by Mailient
          </span>
        </BlurFade>

        {/* Headline */}
        <BlurFade delay={0.18} duration={0.8} yOffset={15} inView>
          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white mb-8 leading-[1.02]">
            The inbox agent <br />
            <span className="font-extralight italic text-neutral-400">that works while you don't.</span>
          </h1>
        </BlurFade>

        {/* Subheading */}
        <BlurFade delay={0.28} duration={0.8} yOffset={12} inView>
          <p className="text-neutral-400 text-base md:text-xl font-light max-w-3xl leading-relaxed mb-12">
            Arcus reads every email, drafts replies in your exact voice, books meetings, and runs silently in the background — delivering results before you ask for them.
          </p>
        </BlurFade>

        {/* CTAs */}
        <BlurFade delay={0.35} duration={0.8} yOffset={10} inView>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-20">
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="px-8 py-3.5 rounded-full bg-white text-neutral-950 font-extrabold text-xs transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] border border-white/20 flex items-center gap-2"
            >
              Try Arcus free
              <ArrowRight className="w-4 h-4 text-neutral-950" />
            </button>
            <a
              href="#live-demo-section"
              className="px-8 py-3.5 rounded-full bg-white/[0.02] border border-white/[0.08] text-white font-extrabold text-xs transition-all duration-300 hover:scale-[1.01] hover:bg-white/[0.06] backdrop-blur-md flex items-center gap-1.5 shadow-inner"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Watch it work
            </a>
          </div>
        </BlurFade>

        {/* What Arcus Is (Single Paragraph Description) */}
        <BlurFade delay={0.45} duration={0.8} yOffset={15} inView>
          <div className="w-full max-w-4xl border border-neutral-850 rounded-[32px] bg-neutral-900/60 p-8 md:p-12 text-left relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-900 to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block">
                Core Definition
              </span>
              <p className="text-sm md:text-base text-neutral-300 leading-relaxed font-light font-sans">
                <strong>Arcus is not an email assistant.</strong> It does not suggest. It does not summarise. <strong>It acts.</strong> When an email arrives, Arcus reads the full thread, understands the context, checks your calendar, drafts a reply that sounds exactly like you, and — if you want — sends it. When you are not around, it runs on schedule, sweeps your inbox, handles the routine, and drops a clean briefing in your Gmail or Slack before you open your laptop. You do not configure it. You do not prompt it. You describe what you want once, in plain English, and Arcus does it — every day, without being asked again.
              </p>
            </div>
          </div>
        </BlurFade>

      </section>

      {/* 3. CAPABILITIES */}
      <section className="py-32 px-6 w-full max-w-6xl mx-auto border-t border-neutral-900 relative z-10">
        
        <div className="text-center mb-24">
          <BlurFade delay={0.05} duration={0.8} yOffset={10} inView>
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-neutral-500 mb-4">
              Platform Capabilities
            </h2>
          </BlurFade>
          <BlurFade delay={0.15} duration={0.8} yOffset={15} inView>
            <p className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Designed to execute, not suggest.
            </p>
          </BlurFade>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Block 1: Neural Voice */}
          <BlurFade delay={0.2} duration={0.8} yOffset={20} inView>
            <div className="h-full rounded-3xl border border-neutral-900 bg-neutral-950 p-8 flex flex-col justify-between hover:border-neutral-800 transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-[40px] pointer-events-none" />
              <div>
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-6">
                  <MessageSquare className="w-5 h-5 text-neutral-200" />
                </div>
                <h3 className="text-base font-extrabold text-white mb-4">
                  Replies that sound like you wrote them.
                </h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                  Arcus reads your last 90 days of sent email. It learns how you open messages, how you close them, how formal you are with clients versus collaborators, how long your sentences run, which words you never use. When it drafts a reply, it writes the way you write — not the way AI usually sounds. Your clients will not know. You will barely need to edit.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-neutral-900 flex items-center gap-1.5 text-[9px] uppercase font-black text-neutral-500">
                <Check className="w-3.5 h-3.5 text-white" />
                <span>90-day semantic analysis</span>
              </div>
            </div>
          </BlurFade>

          {/* Block 2: Autonomous Tool Use */}
          <BlurFade delay={0.28} duration={0.8} yOffset={20} inView>
            <div className="h-full rounded-3xl border border-neutral-900 bg-neutral-950 p-8 flex flex-col justify-between hover:border-neutral-800 transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-[40px] pointer-events-none" />
              <div>
                <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-6">
                  <Settings className="w-5 h-5 text-neutral-200" />
                </div>
                <h3 className="text-base font-extrabold text-white mb-4">
                  One instruction. A dozen actions.
                </h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                  Tell Arcus to reply to Priya about tomorrow's meeting. Arcus reads the thread, checks your Google Calendar, finds an open slot, creates the event, generates a Meet link, drafts the reply with the link embedded, and saves it to drafts — waiting for your approval. You typed seven words. Arcus did the rest. That is the difference between a chatbot and an agent.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-neutral-900 flex items-center gap-1.5 text-[9px] uppercase font-black text-neutral-500">
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Full Tool Layer active</span>
              </div>
            </div>
          </BlurFade>

          {/* Block 3: Scheduling Agents */}
          <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 flex flex-col justify-between hover:border-neutral-800 transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-[40px] pointer-events-none" />
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-6">
                <Zap className="w-5 h-5 text-neutral-200" />
              </div>
              <h3 className="text-base font-extrabold text-white mb-4">
                Set it once. Wake up to results.
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                Create an agent in plain English — "every morning at 7am, check my inbox for unanswered client emails, draft replies for each one, and email me a summary." Arcus runs it on schedule. No tab open. No prompt. No babysitting. You wake up to a Gmail with everything handled and a list of drafts ready to send. This is not automation. This is delegation.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-neutral-900 flex items-center gap-1.5 text-[9px] uppercase font-black text-neutral-500">
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Cron scheduled agency</span>
            </div>
          </div>

          {/* Block 4: Full Transparency */}
          <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 flex flex-col justify-between hover:border-neutral-800 transition-all duration-300 relative group overflow-hidden md:col-span-2 lg:col-span-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-[60px] pointer-events-none" />
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-6">
                <Eye className="w-5 h-5 text-neutral-200" />
              </div>
              <h3 className="text-base font-extrabold text-white mb-4">
                You always know what Arcus did and why.
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                Every action Arcus takes is narrated in real time. When it is working, you see a live feed — reading thread, checking calendar, drafting reply, saving to Gmail. When an agent runs overnight, the report it sends you is not a vague summary. It is a precise account: six emails drafted, two meetings booked, one lead flagged, one thread escalated to you. Nothing happens in a black box. Nothing is hidden.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-neutral-900 flex items-center gap-1.5 text-[9px] uppercase font-black text-neutral-500">
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Zero Black-Box processing</span>
            </div>
          </div>

          {/* Block 5: Canvas Panel */}
          <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 flex flex-col justify-between hover:border-neutral-800 transition-all duration-300 relative group overflow-hidden md:col-span-1 lg:col-span-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-[40px] pointer-events-none" />
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white mb-6">
                <Monitor className="w-5 h-5 text-neutral-200" />
              </div>
              <h3 className="text-base font-extrabold text-white mb-4">
                Long-form work, done in one place.
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                When the task is bigger than a reply — a proposal, a weekly digest, a meeting prep document, an analysis of a client thread — Arcus opens Canvas. A full-width workspace that slides in alongside the chat. Arcus writes into it in real time, streaming word by word. You watch it build. You can edit inline, export as PDF, or send directly as an email. Canvas is where Arcus does its best work.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-neutral-900 flex items-center gap-1.5 text-[9px] uppercase font-black text-neutral-500">
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Canvas streaming panel</span>
            </div>
          </div>

        </div>
      </section>

      {/* 4. LIVE CONVERSATION DEMO */}
      <section id="live-demo-section" className="py-24 px-6 w-full bg-neutral-900/40 border-y border-neutral-900 z-10 relative">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          
          <div className="text-center mb-16">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-neutral-500 mb-4">
              Real-Time Execution Simulator
            </h2>
            <p className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Watch Arcus coordinate, draft, and schedule.
            </p>
          </div>

          {/* Interactive Chat Console */}
          <div className="w-full bg-black border border-neutral-800 rounded-3xl p-6 md:p-8 font-mono text-xs shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[480px]">
            
            {/* Header controls */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80 mb-6 text-[10px] text-neutral-500">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-bold tracking-widest uppercase">arcus-agent-terminal // active_session</span>
              <button 
                onClick={runDemoSequence}
                className="px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[9px] hover:border-neutral-500 text-white font-bold"
              >
                Reset Demo
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 space-y-4 mb-6 overflow-y-auto">
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
                        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-inner text-neutral-300 space-y-2 mt-2 font-sans font-light leading-relaxed max-w-xl">
                          <pre className="text-xs text-neutral-200 whitespace-pre-wrap font-sans font-light">
                            {msg.draftContent}
                          </pre>
                          <div className="pt-2 border-t border-neutral-800/80 mt-4 flex items-center justify-between text-[9px] uppercase tracking-wider text-neutral-500 font-bold">
                            <span>Status: {msg.statusText}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 font-black">
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
            <div className="border-t border-neutral-800/85 pt-4 flex items-center justify-between text-neutral-500 text-[10px]">
              <span>Console Sync Status: SECURED</span>
              <span className="animate-pulse">Waiting for Arcus...</span>
            </div>

          </div>

        </div>
      </section>

      {/* 5. HOW ARCUS WORKS */}
      <section className="py-32 px-6 w-full max-w-5xl mx-auto z-10 relative">
        <div className="text-center mb-20">
          <h2 className="text-xs font-black uppercase tracking-[0.25em] text-neutral-500 mb-4">
            System Architecture
          </h2>
          <p className="text-3xl md:text-5xl font-black text-white tracking-tight">
            How Arcus Works
          </p>
        </div>

        {/* Architectural Flow Diagram */}
        <div className="w-full bg-neutral-900/30 border border-neutral-850 rounded-[32px] p-6 md:p-12 mb-20 overflow-x-auto shadow-sm">
          <div className="min-w-[800px] flex items-center justify-between font-mono text-[10px] uppercase font-bold text-neutral-400">
            
            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white shadow-md">
                Your Gmail
              </div>
            </div>

            <span className="text-neutral-700 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white shadow-md text-center">
                Arcus reads context
              </div>
            </div>

            <span className="text-neutral-700 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3.5 rounded-xl border border-emerald-800 bg-emerald-950/20 text-emerald-400 shadow-md text-center">
                Neural Voice Profile
              </div>
            </div>

            <span className="text-neutral-700 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white shadow-md text-center">
                Tool Layer
                <span className="block text-[8px] text-neutral-500 font-normal mt-1">Calendar, Notion, Meet, Slack</span>
              </div>
            </div>

            <span className="text-neutral-700 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3.5 rounded-xl border border-neutral-700 bg-neutral-950 text-white shadow-md">
                Draft or Action
              </div>
            </div>

            <span className="text-neutral-700 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3.5 rounded-xl border border-amber-800 bg-amber-950/20 text-amber-400 shadow-md">
                Your Approval
              </div>
            </div>

            <span className="text-neutral-700 font-black">&rarr;</span>

            <div className="flex flex-col items-center gap-2.5">
              <div className="px-4 py-3.5 rounded-xl border border-neutral-600 bg-white text-neutral-950 shadow-lg">
                Sent
              </div>
            </div>

          </div>
        </div>

        {/* Three Principles grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              1. Absolute Data Custody
            </h4>
            <p className="text-xs text-neutral-450 font-light leading-relaxed">
              Your data never leaves your account. Arcus operates through OAuth — it has access because you granted it, and you can revoke it in one click at any time.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              2. Consented Action Gate
            </h4>
            <p className="text-xs text-neutral-450 font-light leading-relaxed">
              Every action is reversible until you say go. Arcus drafts, books, and prepares — but never sends, posts, or creates without a human in the loop unless you have explicitly turned on autonomous mode for a specific agent.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              3. Zero Retention Scope
            </h4>
            <p className="text-xs text-neutral-450 font-light leading-relaxed">
              The model never trains on your email. What Arcus reads to do its job stays in that session. It is not used to improve any model. It is not stored beyond what the task requires.
            </p>
          </div>

        </div>

      </section>

      {/* 6. USE CASES */}
      <section className="py-32 px-6 w-full bg-neutral-900/20 border-t border-neutral-900 z-10 relative">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-24">
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-neutral-500 mb-4">
              System Alignment
            </h2>
            <p className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Built for high-performance scale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* Case 1 */}
            <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-4">Use Case 01</span>
                <h3 className="text-base font-extrabold text-white mb-4">Solo founders and agency owners</h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                  You have twelve client threads, three proposals out, and two meetings to book. Arcus handles the replies, sets the meetings, and sends you a morning briefing. You spend thirty minutes on email instead of three hours.
                </p>
              </div>
            </div>

            {/* Case 2 */}
            <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-4">Use Case 02</span>
                <h3 className="text-base font-extrabold text-white mb-4">Freelance consultants</h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                  Your livelihood depends on responding fast and sounding sharp. Arcus drafts every reply in your voice, flags anything high-value, and makes sure nothing slips. You look on top of everything. You barely touched your inbox.
                </p>
              </div>
            </div>

            {/* Case 3 */}
            <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-4">Use Case 03</span>
                <h3 className="text-base font-extrabold text-white mb-4">Early-stage startup founders</h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                  You are doing everything. Sales, ops, hiring, product. Arcus takes the inbox off your plate entirely. Background agents sweep it overnight. You wake up to a handled inbox and a list of three things that actually need you.
                </p>
              </div>
            </div>

            {/* Case 4 */}
            <div className="rounded-3xl border border-neutral-900 bg-neutral-950 p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-4">Use Case 04</span>
                <h3 className="text-base font-extrabold text-white mb-4">Executive assistants using Mailient for their principal</h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                  You manage someone else's inbox. Arcus learns their voice, not yours. Drafts go out in their tone. Meetings get booked on their calendar. You review and approve. Your job gets ten times faster.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. PRIVACY BLOCK */}
      <section className="py-32 px-6 w-full max-w-5xl mx-auto z-10 relative">
        <div className="rounded-[40px] border border-neutral-900 bg-neutral-950 p-8 md:p-16 flex flex-col lg:flex-row gap-12 items-start justify-between shadow-2xl relative overflow-hidden">
          
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.02),_transparent_60%)] pointer-events-none" />

          {/* Left Block */}
          <div className="lg:w-1/2 space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-200" />
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-300">
                Security Core
              </span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              Arcus works in your account. <br />
              <span className="font-extralight italic text-neutral-400">Not ours.</span>
            </h2>
            
            <p className="text-xs text-neutral-450 font-light leading-relaxed font-sans">
              Arcus connects to your Gmail, Google Calendar, and Notion through standard OAuth — the same way you connect any trusted app. It reads what it needs to complete the task. It does not store your emails on Mailient servers. It does not use your data to train any AI model. Every session is scoped, time-limited, and tied to your explicit permission.
            </p>
          </div>

          {/* Right Block */}
          <div className="lg:w-1/2 space-y-6 relative z-10 border-l border-neutral-900 pl-0 lg:pl-10 text-xs text-neutral-450 leading-relaxed font-light font-sans">
            <p>
              Your emails are encrypted in your browser using <strong>AES-256-GCM</strong> before anything touches our infrastructure. The AI processes anonymised context — personal data is stripped before it reaches the model. We cannot read your emails even if we wanted to. That is an architecture decision, not a promise.
            </p>
            <p className="pt-4 font-semibold text-white">
              You can disconnect Arcus from any connected app in one click, at any time, from your settings page. No support ticket. No waiting period. Instant.
            </p>
          </div>

        </div>
      </section>

      {/* 8. CROSS-LINK STRIP */}
      <section className="w-full bg-neutral-900 border-y border-neutral-850 py-10 px-6 text-center z-10 relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-450">
            Arcus works with the tools you already use.
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-sm font-extrabold text-white font-mono">
            <span>Gmail</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            <span>Google Calendar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            <span>Google Meet</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            <span>Notion</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            <span>Notion Calendar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            <span>Slack</span>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            <span>Cal.com</span>
          </div>
        </div>
      </section>

      {/* 9. CTA SECTION */}
      <section className="relative py-32 px-6 text-center z-10 overflow-hidden w-full border-t border-neutral-900">
        
        {/* Soft atmospheric gradient in background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.03),_transparent_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          
          <h2 className="text-4xl md:text-7xl font-black tracking-tight text-white leading-[1.1]">
            Your inbox has been running you. <br />
            <span className="font-extralight italic text-neutral-400">Time to run it.</span>
          </h2>

          <p className="text-neutral-450 font-light text-base md:text-lg max-w-xl mx-auto">
            Arcus is free to start. Two minutes to connect. No credit card required.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="px-8 py-3.5 rounded-full bg-white text-neutral-950 font-extrabold text-xs transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] border border-white/20 flex items-center gap-2"
            >
              Try Arcus free
              <ArrowRight className="w-4 h-4 text-neutral-950" />
            </button>

            <a
              href="mailto:maulik@mailient.xyz?subject=A%20Message%20for%20Maulik"
              className="px-8 py-3.5 rounded-full bg-white/[0.02] border border-white/[0.08] text-white font-extrabold text-xs transition-all duration-300 hover:scale-[1.01] hover:bg-white/[0.06] backdrop-blur-md flex items-center gap-1.5 shadow-inner"
            >
              Talk to Maulik
            </a>
          </div>

          <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold pt-4">
            30-day money back guarantee. Direct founder support. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer theme="dark" />
    </div>
  );
}
