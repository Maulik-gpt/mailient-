"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
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
  Globe,
  Calendar,
  Sparkles,
  Inbox,
  Minus,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";


declare global {
  interface Window {
    google: any;
  }
}

// ----------------------------------------------------------------------
// DATA & CONFIG
// ----------------------------------------------------------------------

const PARTNER_LOGOS = [
  { name: "Google", stat: "Google Cloud Partner" },
  { name: "Notion", stat: "10,000+ Syncs" },
  { name: "Linear", stat: "SOC2 Compliance" },
  { name: "Stripe", stat: "PCI Level 1" },
  { name: "Vercel", stat: "99.99% Uptime" },
  { name: "Retool", stat: "Enterprise Security" },
  { name: "Cal.com", stat: "0ms Calendar Sync" },
  { name: "OpenAI", stat: "Enterprise LLM Gateway" }
];

const FAQS = [
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
];

export function LinearLanding() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeStep, setActiveStep] = useState(0); // 0: Sift, 1: Draft, 2: Book
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive Mouse position for glowing light effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [heroHover, setHeroHover] = useState(false);

  // Background Grid ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  // Google One Tap Login Initialization
  useEffect(() => {
    if (status !== "unauthenticated") return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn("One Tap Login skipped: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing.");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const google = (window as any).google;
      if (google) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            console.log("🚀 One Tap Credential Received. Bridging Login...");
            await signIn("google-one-tap", {
              credential: response.credential,
              callbackUrl: "/onboarding",
              redirect: true,
            });
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: "signin",
        });
        google.accounts.id.prompt();
      }
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [status]);

  // Autoplay step animations
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-white text-neutral-900 selection:bg-neutral-900 selection:text-white font-satoshi overflow-x-hidden scroll-smooth"
    >
      {/* 1. Translucent Navigation */}
      <Navbar />

      {/* Global Background Grid & Atmospheric Fog */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        {/* Fine Linear Grid */}
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />
        {/* Soft atmospheric radial gradients */}
        <div className="absolute top-[10%] left-[20%] w-[800px] h-[800px] rounded-full bg-neutral-100/40 blur-[120px] pointer-events-none" />
        <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] rounded-full bg-neutral-50/60 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[10%] w-[900px] h-[900px] rounded-full bg-neutral-100/30 blur-[150px] pointer-events-none" />
      </div>

      {/* 2. HERO SECTION */}
      <section 
        className="relative pt-40 pb-20 md:pt-48 md:pb-32 px-6 flex flex-col items-center text-center max-w-7xl mx-auto z-10 overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHeroHover(true)}
        onMouseLeave={() => setHeroHover(false)}
      >
        {/* Ambient Mouse Lighting */}
        {heroHover && (
          <div 
            className="absolute pointer-events-none w-[600px] h-[600px] rounded-full bg-neutral-100/50 blur-[80px] -z-10 transition-opacity duration-500"
            style={{
              left: mousePos.x - 300,
              top: mousePos.y - 300
            }}
          />
        )}

        <motion.div
          style={{ scale: heroScale, opacity: heroOpacity }}
          className="w-full flex flex-col items-center"
        >
          {/* Subheader Badge */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200/50 shadow-sm mb-8"
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-800" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-700">
              Autonomous Email Agent
            </span>
          </motion.div>

          {/* Tagline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-8xl font-normal tracking-tight text-neutral-900 max-w-4xl leading-[1.05]"
          >
            Hours of email, <br />
            <span className="font-extralight italic text-neutral-500">handled overnight.</span>
          </motion.h1>

          {/* Subheadline (one line on what it does) */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-neutral-500 text-lg md:text-xl font-light max-w-2xl mt-8 leading-relaxed"
          >
            Mailient sifts your inbox, drafts contextual replies in your personal voice, and books your calendar meetings automatically.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center justify-center gap-4 mt-10"
          >
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="relative group overflow-hidden px-8 py-3.5 rounded-full bg-neutral-950 text-white text-[13px] font-semibold tracking-tight transition-all duration-300 hover:bg-black hover:shadow-[0_4px_30px_rgba(0,0,0,0.15)] flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Connect Gmail
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000 ease-out" />
            </button>

            <a
              href="#sift-reply-section"
              className="px-8 py-3.5 rounded-full bg-white border border-neutral-200 text-neutral-800 text-[13px] font-semibold tracking-tight hover:bg-neutral-50 hover:border-neutral-300 shadow-sm transition-all duration-300 flex items-center gap-1.5"
            >
              See a sample brief
            </a>
          </motion.div>
        </motion.div>

        {/* Hero Video Visual (translucent glass frame) */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl mt-20 aspect-video rounded-[32px] border border-neutral-200 bg-neutral-50/50 backdrop-blur-md p-3 md:p-4 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.08),0_0_1px_1px_rgba(255,255,255,0.8)_inset] overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-neutral-200/10 pointer-events-none z-10 rounded-[32px]" />
          
          {/* Glass Inner Frame */}
          <div className="relative w-full h-full rounded-[20px] bg-white border border-neutral-100 shadow-sm overflow-hidden flex items-center justify-center">
            {/* Embed Space */}
            <iframe
              src="https://cap.so/embed/rpter2vmzaz3vyk?autoplay=1&muted=1&controls=1&loop=1&playsinline=1"
              title="Mailient Product Demo"
              className="absolute inset-0 w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </motion.div>

        {/* Trusted by companies - Animated Marquee */}
        <div className="w-full mt-24 overflow-hidden border-y border-neutral-200/50 py-8 relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
          
          <motion.div 
            className="flex gap-20 whitespace-nowrap"
            animate={{ x: [0, -1200] }}
            transition={{ ease: "linear", duration: 35, repeat: Infinity }}
          >
            {/* Repeat partner list twice to ensure infinite scroll */}
            {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 shrink-0">
                <span className="text-[14px] font-semibold text-neutral-800 font-satoshi uppercase tracking-widest">
                  {item.name}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                <span className="text-[11px] font-medium text-neutral-400 font-satoshi tracking-tight">
                  {item.stat}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 3. THREE THINGS IT DOES SECTION */}
      <section 
        id="sift-reply-section" 
        className="py-32 px-6 max-w-7xl mx-auto border-t border-neutral-100 z-10 relative"
      >
        <div className="text-center mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400 mb-4">
            Intelligence in Action
          </h2>
          <p className="text-3xl md:text-5xl font-light text-neutral-900 tracking-tight">
            An email engine built to execute.
          </p>
        </div>

        {/* Feature Row / Interaction Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
          
          {/* Menu Column (Left) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Feature 1: Sift */}
            <div
              onClick={() => setActiveStep(0)}
              className={cn(
                "p-6 rounded-2xl border cursor-pointer transition-all duration-300",
                activeStep === 0
                  ? "bg-neutral-50/80 border-neutral-300/80 shadow-sm"
                  : "bg-white border-neutral-100 hover:border-neutral-200"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-neutral-800 text-sm">Sift</h3>
                    <Link href="/product/sift" className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-0.5">
                      View details <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed font-light">
                    Mailient autonomous intelligence parses and labels every incoming thread. Important opportunities are grouped into action items, eliminating noise instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2: Draft Reply */}
            <div
              onClick={() => setActiveStep(1)}
              className={cn(
                "p-6 rounded-2xl border cursor-pointer transition-all duration-300",
                activeStep === 1
                  ? "bg-neutral-50/80 border-neutral-300/80 shadow-sm"
                  : "bg-white border-neutral-100 hover:border-neutral-200"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-neutral-800 text-sm">Draft Reply</h3>
                    <Link href="/product/drafts" className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-0.5">
                      View details <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed font-light">
                    Neural context mapping drafts highly accurate, professional replies mirroring your personal phrasing. Ready in your drafts folder; requires one click to approve.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3: Book Meetings */}
            <div
              onClick={() => setActiveStep(2)}
              className={cn(
                "p-6 rounded-2xl border cursor-pointer transition-all duration-300",
                activeStep === 2
                  ? "bg-neutral-50/80 border-neutral-300/80 shadow-sm"
                  : "bg-white border-neutral-100 hover:border-neutral-200"
              )}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-neutral-800 text-sm">Book Meetings</h3>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 font-medium text-neutral-500 uppercase tracking-wider">
                      Auto Slot
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed font-light">
                    When clients request calendar availability, Mailient cross-checks Cal.com and Google Calendar to propose conflict-free booking links automatically.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Live Screen Column (Right) */}
          <div className="lg:col-span-7 bg-neutral-50/60 border border-neutral-200/50 rounded-3xl p-6 md:p-8 aspect-video flex flex-col justify-between overflow-hidden relative shadow-[0_15px_40px_-20px_rgba(0,0,0,0.05)]">
            
            {/* Top Bar for Card Mockup */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200/50">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
              </div>
              <span className="text-[10px] text-neutral-400 font-mono tracking-tight uppercase">
                mailient-agent-core // live_sandbox
              </span>
            </div>

            {/* Dynamic Card Content */}
            <div className="flex-1 flex flex-col justify-center mt-6">
              <AnimatePresence mode="wait">
                
                {/* STEP 0: SIFT DISPLAY */}
                {activeStep === 0 && (
                  <motion.div
                    key="sift"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded bg-amber-50 text-[10px] font-bold text-amber-700 tracking-wide uppercase border border-amber-200/50">
                        Urgent Deal
                      </span>
                      <h4 className="text-sm font-semibold text-neutral-800">
                        Investment Inquiry: Seed Extension Round
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-500 font-mono italic">
                      Parsing inbound message signature... Extracting partner credentials...
                    </p>
                    {/* Live Sorted Indicator Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white border border-neutral-200 p-3 rounded-xl shadow-sm text-center">
                        <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">Priority</p>
                        <p className="text-xs font-bold text-emerald-600">HIGH-SIGNAL</p>
                      </div>
                      <div className="bg-white border border-neutral-200 p-3 rounded-xl shadow-sm text-center">
                        <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">Opportunity</p>
                        <p className="text-xs font-bold text-neutral-800">$250,000</p>
                      </div>
                      <div className="bg-white border border-neutral-200 p-3 rounded-xl shadow-sm text-center">
                        <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold mb-1">Time Action</p>
                        <p className="text-xs font-bold text-neutral-800">2 Hours</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1: DRAFT DISPLAY */}
                {activeStep === 1 && (
                  <motion.div
                    key="draft"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px]">
                        AI
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-800">Drafting reply to Sarah Miller...</h4>
                    </div>
                    <div className="bg-white border border-neutral-200 p-4 rounded-xl shadow-sm text-xs text-neutral-600 font-light space-y-2 relative">
                      <p className="font-medium text-neutral-800">Subject: Re: Partner Meeting Setup</p>
                      <p>
                        Hi Sarah, <br />
                        Thanks for reaching out. I'd love to chat. Our system security fits SOC2 specs perfectly. Does next Tuesday at 2 PM PST work? Here is my booking link.
                      </p>
                      <div className="absolute right-3 bottom-3 flex items-center gap-1 bg-neutral-50 px-2 py-1 rounded border border-neutral-200">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[9px] text-neutral-500 font-semibold uppercase">Manual Approve Ready</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: BOOK MEETINGS */}
                {activeStep === 2 && (
                  <motion.div
                    key="book"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-neutral-800">Conflict-Free Calendar Parsing</h4>
                      <span className="text-[10px] text-neutral-400 font-mono">Cal.com active API</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-neutral-200 p-3 rounded-xl shadow-sm space-y-1">
                        <p className="text-[9px] uppercase tracking-wider text-neutral-400">Incoming Request</p>
                        <p className="text-xs font-semibold text-neutral-800">"Let's chat next week"</p>
                      </div>
                      <div className="bg-white border border-emerald-200 p-3 rounded-xl shadow-sm space-y-1 bg-emerald-50/10">
                        <p className="text-[9px] uppercase tracking-wider text-emerald-600 font-semibold">Suggested Options</p>
                        <p className="text-xs font-bold text-neutral-800">Mon 10am, Tue 3pm</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-100/50 p-2.5 rounded-lg border border-neutral-200/50">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Proposed calendar slots automatically queued for outbound message draft.</span>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
            
            {/* Embedded Mini Video Placeholder */}
            <div className="relative mt-4 aspect-video h-12 w-fit border border-neutral-200/50 rounded-lg bg-neutral-100 flex items-center justify-center overflow-hidden">
              <iframe
                src="https://cap.so/embed/58ekyq8enhrfq3z?autoplay=1&muted=1&controls=0&loop=1&playsinline=1"
                title="Mini Feature Clip"
                className="absolute inset-0 w-full h-full border-none pointer-events-none scale-105"
              />
            </div>

          </div>

        </div>
      </section>

      {/* 4. RADAR ORBIT INTEGRATIONS SECTION */}
      <section className="py-24 px-6 border-t border-neutral-100 bg-neutral-50/30 z-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16">
          
          {/* Left Text */}
          <div className="max-w-md space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 shadow-sm">
              <Activity className="w-3 h-3 text-neutral-800" />
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600">Integrations</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-neutral-900 leading-tight">
              Connect your favorite apps.
            </h2>
            <p className="text-neutral-500 font-light text-sm leading-relaxed">
              Mailient syncs securely with your entire digital suite. By maintaining constant in-memory integration, your relational calendars, notes, and workflows are processed autonomously with bank-level encryption.
            </p>
          </div>

          {/* Right Radar Canvas (Orbital Animation) */}
          <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center bg-white rounded-full border border-neutral-200/60 shadow-[0_15px_40px_-20px_rgba(0,0,0,0.05)]">
            
            {/* Center Mailient Logo */}
            <div className="z-10 w-16 h-16 rounded-2xl bg-neutral-950 flex items-center justify-center shadow-lg border border-neutral-800 relative">
              <span className="text-white font-extrabold text-2xl tracking-tighter">M</span>
              <div className="absolute -inset-1 rounded-2xl border border-dashed border-neutral-300 animate-spin-slow opacity-60" />
            </div>

            {/* Orbit 1: Inner (Dashed) */}
            <motion.div
              className="absolute w-44 h-44 rounded-full border border-dashed border-neutral-200"
              animate={{ rotate: 360 }}
              transition={{ ease: "linear", duration: 15, repeat: Infinity }}
            >
              {/* App: Notion */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white border border-neutral-200 shadow-sm flex items-center justify-center font-bold text-xs text-neutral-800">
                N
              </div>
              {/* App: Cal.com */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-8 rounded-lg bg-white border border-neutral-200 shadow-sm flex items-center justify-center font-bold text-[10px] text-neutral-800">
                Cal
              </div>
            </motion.div>

            {/* Orbit 2: Outer (Solid) */}
            <motion.div
              className="absolute w-68 h-68 md:w-72 md:h-72 rounded-full border border-neutral-200/60"
              animate={{ rotate: -360 }}
              transition={{ ease: "linear", duration: 25, repeat: Infinity }}
            >
              {/* App: Google Calendar */}
              <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-xs">
                📅
              </div>
              {/* App: Google Meet */}
              <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-lg bg-white border border-neutral-200 shadow-sm flex items-center justify-center text-xs">
                📹
              </div>
            </motion.div>

            {/* Radar Sweeper Visual Effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-neutral-100/10 to-transparent animate-spin" style={{ animationDuration: "6s" }} />

          </div>

        </div>
      </section>

      {/* 5. ARCUS FLAGSHIP SECTION */}
      <section className="py-32 px-6 max-w-7xl mx-auto z-10 relative">
        
        {/* Large Flagship Container (frosted dark grey palette for elite tech vibe) */}
        <div className="relative rounded-[40px] border border-neutral-200 bg-neutral-900 text-white p-8 md:p-16 overflow-hidden shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-12 group">
          
          {/* Subtly moving background gradients inside dark card */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_60%)] pointer-events-none" />
          <div className="absolute bottom-[-150px] left-[-150px] w-96 h-96 rounded-full bg-neutral-800/40 blur-[100px] pointer-events-none" />

          {/* Text content */}
          <div className="max-w-xl space-y-6 relative z-10 lg:w-1/2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 shadow-sm">
              <Cpu className="w-3.5 h-3.5 text-neutral-200" />
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-300">
                Flagship Model
              </span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-light tracking-tight text-white leading-tight">
              Meet Arcus.
            </h2>
            
            <p className="text-neutral-400 font-light text-sm md:text-base leading-relaxed">
              Meet Arcus — your command-driven flagship AI. Arcus doesn't just read your email; it reasons over your entire relational graph. Ask Arcus to coordinate calendar conflicts, research incoming leads, or summarize weeks of context in a single query.
            </p>

            <div className="pt-4">
              <Link
                href="/product/arcus"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-neutral-950 font-semibold text-xs transition-transform duration-300 hover:scale-[1.02] shadow-md group-hover:bg-neutral-50"
              >
                Explore Arcus
                <ArrowRight className="w-4 h-4 text-neutral-950" />
              </Link>
            </div>
          </div>

          {/* Terminal / Chat Simulator Widget (Right) */}
          <div className="lg:w-1/2 w-full max-w-lg bg-black/60 rounded-3xl p-6 border border-white/10 relative z-10 font-mono text-xs space-y-4 shadow-xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/5 text-[10px] text-neutral-500">
              <span>SYSTEM: Arcus-Node-v3</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-3">
              <p className="text-neutral-400">
                <span className="text-white font-bold">&gt;</span> Arcus, draft a follow-up detailing our security policy
              </p>
              
              <div className="text-neutral-500 space-y-1">
                <p className="text-[10px] text-neutral-500">Executing relational context mapping...</p>
                <p className="text-[10px] text-neutral-500">Ingesting encryption certificates...</p>
              </div>

              <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-neutral-300 space-y-2">
                <p className="font-semibold text-[10px] text-white">Proposed Draft Reply (Sarah Miller):</p>
                <p className="text-[11px] leading-relaxed text-neutral-300 font-light">
                  Hi Sarah, Mailient ensures SOC2 Type II standard encryption at rest (AES-256) and in-memory execution. No email is sent without human approval.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. BEFORE / AFTER INBOX VISUAL (Side-by-side) */}
      <section className="py-24 px-6 bg-neutral-50/20 border-t border-neutral-100 z-10 relative">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
              The Morning Triage
            </h2>
            <p className="text-3xl md:text-5xl font-light text-neutral-900 tracking-tight">
              The morning, side by side.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* Left Card: BEFORE (Chaotic Inbox) */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-8 flex flex-col justify-between shadow-sm relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/[0.01] rounded-full blur-[60px] pointer-events-none" />
              
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="font-bold text-xs uppercase text-red-500 tracking-wider">Before Mailient</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">142 unread threads</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between text-xs text-neutral-600 opacity-80">
                    <div>
                      <p className="font-semibold text-neutral-800">Google Workspace Newsletter</p>
                      <p className="font-light">Update on storage capabilities...</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-neutral-200">Updates</span>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between text-xs text-neutral-600 opacity-80">
                    <div>
                      <p className="font-semibold text-neutral-800">Support Ticket #82921</p>
                      <p className="font-light">Client asking for dashboard query reload...</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-neutral-200">Support</span>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-red-100 flex items-center justify-between text-xs text-neutral-600 relative overflow-hidden bg-red-50/5">
                    <div>
                      <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                        Sarah Miller (Acme VC)
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      </p>
                      <p className="font-light text-neutral-500">"Is your security package SOC2 compliant? Ready..."</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">Buried Opportunity</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 text-center">
                <p className="text-[11px] font-medium text-neutral-400 italic">
                  Average morning focus: Lost in noise, missing high-value partnerships.
                </p>
              </div>
            </div>

            {/* Right Card: AFTER (Sieved Mailient) */}
            <div className="rounded-3xl border border-neutral-300 bg-white p-6 md:p-8 flex flex-col justify-between shadow-[0_15px_40px_-20px_rgba(0,0,0,0.05)] relative group overflow-hidden">
              {/* Premium Glow effect */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-neutral-100 rounded-full blur-[80px] opacity-100" />

              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-900" />
                    <span className="font-bold text-xs uppercase text-neutral-800 tracking-wider">After Mailient</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 font-bold">3 High-Priority Briefs ready</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
                    <div>
                      <p className="font-bold text-neutral-900 flex items-center gap-1.5">
                        Sarah Miller (Acme VC)
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </p>
                      <p className="font-light text-neutral-500">"Is your security package SOC2 compliant?..."</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
                      Draft Prepared
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-100 flex items-center justify-between text-xs text-neutral-400 opacity-60">
                    <p className="font-light">139 Noise & Newsletters archived automatically</p>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-500">Auto Archived</span>
                  </div>

                  <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
                    <div>
                      <p className="font-bold text-neutral-900">1 Calendar Appointment Scheduled</p>
                      <p className="font-light text-neutral-500">Sarah Miller // Tuesday at 2 PM PST</p>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-neutral-200 font-semibold">Scheduled</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 text-center">
                <p className="text-[11px] font-semibold text-neutral-800 uppercase tracking-widest flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />
                  0 Minutes spent triaging noise today
                </p>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 7. SOCIAL PROOF (Founder Quotes & Metrics) */}
      <section className="py-28 px-6 max-w-7xl mx-auto z-10 relative">
        
        {/* Quotes Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          
          <div className="space-y-6">
            <span className="text-4xl text-neutral-200 font-serif">“</span>
            <p className="text-lg md:text-xl font-light text-neutral-800 leading-relaxed italic">
              Mailient has completely shifted how we manage VC and strategic relationships. Opportunities that used to sit buried for days are now answered in minutes in my exact personal phrasing.
            </p>
            <div>
              <p className="font-semibold text-sm text-neutral-800">Marcus Thorne</p>
              <p className="text-xs text-neutral-400">Founder, Aether Tech</p>
            </div>
          </div>

          <div className="space-y-6">
            <span className="text-4xl text-neutral-200 font-serif">“</span>
            <p className="text-lg md:text-xl font-light text-neutral-800 leading-relaxed italic">
              Building a large engineering company means zero time for inbox maintenance. Mailient operates in the background, sifting through the clutter to queue up drafts and lock in meetings automatically.
            </p>
            <div>
              <p className="font-semibold text-sm text-neutral-800">Evelyn Vance</p>
              <p className="text-xs text-neutral-400">CEO, Retooling Corp</p>
            </div>
          </div>

        </div>

        {/* Metric Row */}
        <div className="grid grid-cols-3 gap-6 md:gap-8 max-w-3xl mx-auto mt-24 border-t border-neutral-200/60 pt-16 text-center">
          <div>
            <p className="text-3xl md:text-5xl font-extralight text-neutral-900 font-satoshi">1.2M+</p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mt-2">Emails Sifted</p>
          </div>
          <div>
            <p className="text-3xl md:text-5xl font-extralight text-neutral-900 font-satoshi">94%</p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mt-2">Response Velocity</p>
          </div>
          <div>
            <p className="text-3xl md:text-5xl font-extralight text-neutral-900 font-satoshi">14h</p>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mt-2">Saved / Founder / wk</p>
          </div>
        </div>

      </section>

      {/* 8. SECURITY STRIP */}
      <section className="bg-neutral-50 border-y border-neutral-200/50 py-4 px-6 text-center z-10 relative">
        <Link 
          href="/security"
          className="inline-flex items-center gap-2 group text-xs text-neutral-600 hover:text-neutral-950 transition-colors"
        >
          <Lock className="w-3.5 h-3.5 text-neutral-400" />
          <span>
            Enterprise-grade data security: SOC2 compliant, AES-256 encryption, zero model training.
          </span>
          <span className="font-semibold text-neutral-800 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
            Learn more &rarr;
          </span>
        </Link>
      </section>

      {/* 9. PRICING TEASER */}
      <section className="py-24 px-6 text-center z-10 relative">
        <div className="max-w-4xl mx-auto rounded-[32px] border border-neutral-200 bg-white p-8 md:p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 group">
          <div className="text-left space-y-2">
            <span className="text-[9px] px-2 py-0.5 rounded bg-neutral-100 font-black uppercase text-neutral-600 tracking-wider">
              PRICING
            </span>
            <h3 className="text-2xl md:text-3xl font-light text-neutral-900 tracking-tight">
              One subscription. Every feature.
            </h3>
            <p className="text-neutral-500 font-light text-xs max-w-md">
              Start with our flexible subscription structure designed to scale with your inbox output velocity.
            </p>
          </div>
          
          <div className="flex flex-col items-end shrink-0 gap-3">
            <div className="text-right">
              <span className="text-sm text-neutral-400 font-medium">Starting at</span>
              <p className="text-3xl md:text-4xl font-extrabold text-neutral-900">$16.58/mo</p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-neutral-950 text-white font-semibold text-xs transition-transform duration-300 hover:scale-[1.02] shadow-md"
            >
              View pricing plans
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. FAQ SECTION */}
      <section className="py-24 px-6 max-w-4xl mx-auto z-10 relative">
        <div className="text-center mb-16 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-400">
            Frequently Asked
          </h2>
          <p className="text-3xl md:text-5xl font-light text-neutral-900 tracking-tight">
            Frequently Asked Questions
          </p>
        </div>

        {/* Expandable Accordions */}
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div 
                key={idx} 
                className="rounded-2xl border border-neutral-200 bg-white overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-semibold text-xs md:text-sm text-neutral-800">
                    {faq.q}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-neutral-50 flex items-center justify-center border border-neutral-100 flex-shrink-0">
                    {isOpen ? (
                      <Minus className="w-3.5 h-3.5 text-neutral-500" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-neutral-500" />
                    )}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden border-t border-neutral-100"
                    >
                      <div className="px-6 py-5 text-xs md:text-sm text-neutral-500 font-light leading-relaxed bg-neutral-50/50">
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

      {/* 11. FINAL CTA SECTION */}
      <section className="relative py-32 px-6 text-center border-t border-neutral-100 bg-neutral-50/40 z-10 overflow-hidden">
        
        {/* Soft atmospheric gradient in background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(240,240,240,0.5),_transparent_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 shadow-sm">
            <Zap className="w-3.5 h-3.5 text-neutral-800" />
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600">
              Operating Scale
            </span>
          </div>

          <h2 className="text-4xl md:text-7xl font-light tracking-tight text-neutral-900 leading-[1.1]">
            Build the operating system <br />
            your company deserves.
          </h2>

          <p className="text-neutral-500 font-light text-base md:text-lg max-w-xl mx-auto">
            Modern companies don’t scale with headcount anymore. Connect Gmail to automate your inbox now.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="relative group overflow-hidden px-8 py-3.5 rounded-full bg-neutral-950 text-white text-[13px] font-semibold tracking-tight transition-all duration-300 hover:bg-black hover:shadow-[0_4px_30px_rgba(0,0,0,0.15)] flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Connect Gmail
            </button>

            <a
              href="mailto:partner@mailient.xyz?subject=Strategy%20Call"
              className="px-8 py-3.5 rounded-full bg-white border border-neutral-200 text-neutral-800 text-[13px] font-semibold tracking-tight hover:bg-neutral-50 hover:border-neutral-300 shadow-sm transition-all duration-300 flex items-center gap-1.5"
            >
              Book Strategy Call
            </a>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <Footer />
    </div>
  );
}
