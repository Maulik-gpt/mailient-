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
import PricingSection3 from "@/components/ui/pricing-section-3";
import { useRouter } from "next/navigation";
import { FloatingNavbar } from "@/components/FloatingNavbar";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { Features8 } from "@/components/ui/features-8";
import { CTASection } from "@/components/ui/hero-dithering-card";
import { WordBlurStream } from "@/src/WordBlurStream";
import { BlurFade } from "@/components/ui/blur-fade";
import NumberFlow from "@number-flow/react";

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
    if (isInView) {
      setCount(target);
    } else {
      setCount(0);
    }
  }, [target, isInView]);

  return (
    <span ref={ref} className="inline-flex items-center">
      <NumberFlow value={count} />
    </span>
  );
}

const landingFaqs = [
  {
    q: "Is there a free plan?",
    a: "No — Mailient is a single plan with full access to everything. You can choose monthly at $29, annual at $199 (two months free), or grab a Lifetime Founding Member seat for $499 while they last. Every plan includes Arcus, Sift AI, Voice Profile, background agents, and Zero-Knowledge encryption. No free tier, no feature gating, no surprises - just the full product from day one."
  },
  {
    q: "Does Mailient replace Gmail?",
    a: "No. Mailient works on top of your existing Gmail account through a secure OAuth connection. Your emails still live in Gmail. Mailient makes them intelligent. You can use both side by side or live entirely inside Mailient — your choice."
  },
  {
    q: "How does Mailient learn my writing style?",
    a: "When you connect Gmail, Mailient reads your last 90 days of sent emails and builds a Neural Voice Profile — your tone, your greeting style, your typical sign-off, how formal you are with different types of people. Every draft Arcus writes uses this profile. It improves the more you use it."
  },
  {
    q: "Is my email data private?",
    a: "Yes — and not just as a policy. Your emails are encrypted inside your own browser using AES-256-GCM before they ever reach Mailient's servers. Personal data is stripped before the AI processes anything. We cannot read your emails. That is an architecture decision, not a promise."
  },
  {
    q: "Can I cancel anytime?",
    a: "Monthly plan cancels at the end of your billing period. Annual plan can be cancelled anytime — you keep full access for the year you paid for. No retention calls. No dark patterns. One click in settings."
  },
  {
    q: "What happens when I hit my usage limit on the free plan?",
    a: "AI features pause until your daily limit resets at midnight. Your inbox, traditional email view, and all non-AI features remain fully accessible. Nothing is locked — just throttled until tomorrow."
  },
  {
    q: "How long does setup take?",
    a: "Two minutes. Connect your Google account, grant Gmail and Calendar access, and Mailient starts working immediately. There is nothing to configure. Arcus begins learning your voice in the background from the moment you connect."
  },
  {
    q: "Does Mailient work for teams?",
    a: "Currently Mailient is built for individual founders, freelancers, and consultants — one Gmail account per workspace. Team and multi-seat support is on the roadmap. If you need it sooner, email Maulik directly at maulik@mailient.xyz."
  },
  {
    q: "What if I'm not satisfied?",
    a: "Email Maulik within 30 days of your first payment and get a full refund — no questions asked. This is a founder-to-founder promise backed by a real human, not a support ticket system."
  },
  {
    q: "Who built Mailient?",
    a: "Maulik — a 14-year-old founder who built Mailient because he watched smart people lose deals, miss opportunities, and burn hours on email every single day. The product exists because the problem is real. You can talk to him directly at @mailientz on X or maulikbuilder@gmail.com."
  }
];

export function LinearLanding() {
  const router = useRouter();
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
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.title = "Mailient";
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
        @keyframes laser-pulse {
          from { stroke-dashoffset: 170; }
          to { stroke-dashoffset: 0; }
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
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.25] blur-[50px] scale-[1.05] mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_85%)]">
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
          
          {/* Headline & Subtitle */}
          <BlurFade delay={0.1} duration={0.8} inView>
            <h1 className="text-5xl md:text-[84px] font-medium tracking-[-0.04em] leading-[1.05] max-w-5xl bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
              Hours of email, <br />handled overnight.
            </h1>
          </BlurFade>

          <BlurFade delay={0.2} duration={0.8} inView>
            <p className="text-lg md:text-[22px] text-[#8a8f98] leading-relaxed max-w-3xl mt-8 font-light font-sans min-h-[4rem]">
              <WordBlurStream
                text="Arcus by Mailient reads your threads, writes custom drafts in your voice, and schedules calendar events — fully autonomously."
                msPerWord={80}
                startupMs={400}
                holdMs={4500}
              />
            </p>
          </BlurFade>

          {/* Premium CTAs */}
          <BlurFade delay={0.3} duration={0.8} inView>
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
          </BlurFade>

          {/* 16:9 Floating Obsidian Demo Video Window */}
          <BlurFade delay={0.4} duration={1.0} inView>
            <div className="w-full max-w-4xl aspect-[16/9] bg-[#050505] border border-white/[0.08] rounded-[24px] mt-20 shadow-[0_50px_100px_rgba(0,0,0,0.85)] relative overflow-hidden group">
              <video 
                src="/cap.mp4" 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover relative z-10" 
              />
              {/* Soft atmospheric overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none z-20" />
            </div>
          </BlurFade>

        </div>

        {/* Metallic reflection shimmer and fine separation divider */}
        <div className="w-full relative flex flex-col items-center mt-20 pointer-events-none select-none">
          <div className="absolute top-[-110px] w-full max-w-6xl h-[180px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_65%)] z-0" />
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent z-10" />
        </div>

        {/* 1.5 TRUSTED BY COMPANIES PERSPECTIVE MARQUEE */}
        <div className="w-full relative h-28 overflow-hidden bg-black border-b border-white/[0.05]">
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
          
          {/* Left panel: Vertical connected capability selectors */}
          <BlurFade delay={0.1} duration={0.8} inView className="lg:col-span-5 w-full">
            <div className="space-y-12">
              {/* Step 1 */}
              <div 
                onClick={() => setActiveStep(0)}
                className="group cursor-pointer select-none text-left"
              >
              <span className={cn(
                "font-mono text-[10px] tracking-[0.2em] uppercase font-bold block transition-all duration-300",
                activeStep === 0 ? "text-[#8a8f98] mb-3" : "text-neutral-700 group-hover:text-neutral-500 mb-1"
              )}>
                01 // Sift Intake Triage
              </span>
              <h3 className={cn(
                "font-medium tracking-tight leading-tight transition-all duration-500",
                activeStep === 0 
                  ? "text-4xl md:text-[48px] text-white" 
                  : "text-2xl md:text-3xl text-neutral-600 hover:text-neutral-400"
              )}>
                Isolate noise. Route priorities.
              </h3>
              {activeStep === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 space-y-4"
                >
                  <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-light font-sans max-w-sm">
                    Sift isolates notifications, tags priority customer queries, and drops them into structured queues autonomously.
                  </p>
                  <Link 
                    href="/product/sift" 
                    className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-white hover:text-neutral-300 transition-colors"
                  >
                    Explore Sift Engine
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              )}
            </div>

            {/* Step 2 */}
            <div 
              onClick={() => setActiveStep(1)}
              className="group cursor-pointer select-none text-left"
            >
              <span className={cn(
                "font-mono text-[10px] tracking-[0.2em] uppercase font-bold block transition-all duration-300",
                activeStep === 1 ? "text-[#8a8f98] mb-3" : "text-neutral-700 group-hover:text-neutral-500 mb-1"
              )}>
                02 // Tone-Matched Drafts
              </span>
              <h3 className={cn(
                "font-medium tracking-tight leading-tight transition-all duration-500",
                activeStep === 1 
                  ? "text-4xl md:text-[48px] text-white" 
                  : "text-2xl md:text-3xl text-neutral-600 hover:text-neutral-400"
              )}>
                Drafts compiled in your voice.
              </h3>
              {activeStep === 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 space-y-4"
                >
                  <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-light font-sans max-w-sm">
                    Extracts a Stylistic Tone Signature from your historic outbound emails to compose custom, context-aware drafts automatically.
                  </p>
                  <Link 
                    href="/product/drafts" 
                    className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-white hover:text-neutral-300 transition-colors"
                  >
                    Explore Drafts Engine
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              )}
            </div>

            {/* Step 3 */}
            <div 
              onClick={() => setActiveStep(2)}
              className="group cursor-pointer select-none text-left"
            >
              <span className={cn(
                "font-mono text-[10px] tracking-[0.2em] uppercase font-bold block transition-all duration-300",
                activeStep === 2 ? "text-[#8a8f98] mb-3" : "text-neutral-700 group-hover:text-neutral-500 mb-1"
              )}>
                03 // Autonomous Scheduling
              </span>
              <h3 className={cn(
                "font-medium tracking-tight leading-tight transition-all duration-500",
                activeStep === 2 
                  ? "text-4xl md:text-[48px] text-white" 
                  : "text-2xl md:text-3xl text-neutral-600 hover:text-neutral-400"
              )}>
                Meeting sweeps on autopilot.
              </h3>
              {activeStep === 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 space-y-4"
                >
                  <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-light font-sans max-w-sm">
                    Schedules meetings directly in your calendar, coordinates with client slots, and generates Google Meet links silently overnight.
                  </p>
                  <a 
                    href="#pricing" 
                    className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-white hover:text-neutral-300 transition-colors"
                  >
                    Unlock Autonomous Engine
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </motion.div>
              )}
            </div>
          </div>
        </BlurFade>

          {/* Right panel: dynamic high-contrast visual display */}
          <BlurFade delay={0.25} duration={0.8} inView className="lg:col-span-7 w-full h-[500px]">
            <div className="bg-[#050505] border border-white/[0.08] rounded-[24px] p-8 md:p-10 shadow-2xl h-full flex flex-col justify-between relative overflow-hidden">
            {/* Custom Dither Dot Grid Overlay */}
            <div className="absolute inset-y-0 left-0 w-[45%] pointer-events-none opacity-[0.08] mix-blend-screen select-none"
                 style={{
                   backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                   backgroundSize: "16px 16px",
                 }}
            />
            
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
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/85" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/85" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85" />
                      <span className="text-[10px] text-neutral-500 ml-4 font-mono">sift-triage.log</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 text-[9px] font-bold">TRIAGE ACTIVE</span>
                  </div>

                  <div className="space-y-4 my-6 bg-black/40 border border-white/[0.04] p-6 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] border-b border-white/[0.04] pb-3 text-neutral-500">
                      <span>INCOMING INBOX STREAM</span>
                      <span>3 MATCHES FOUND</span>
                    </div>
                    
                    {/* Item 1 */}
                    <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-white font-medium">review-capital-rounds.eml</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 text-[8px] font-mono">PRIORITY T1</span>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.02]">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-white font-medium">deck-application-feedback.eml</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-950/20 text-blue-400 border border-blue-900/40 text-[8px] font-mono">VENTURE ROUND</span>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-650" />
                        <span className="text-neutral-400">marketing-promotions-digest.eml</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-neutral-900/50 text-neutral-500 border border-white/[0.04] text-[8px] font-mono">MUTED</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.04] text-[10px] text-neutral-500">
                    <span>INBOX STREAM ACTIVE</span>
                    <span>SECURE IN-MEMORY SWEEP</span>
                  </div>
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
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/85" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/85" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85" />
                      <span className="text-[10px] text-neutral-500 ml-4 font-mono">voice-profiler.js</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 text-[9px] font-bold">99.4% SIGNATURE MATCH</span>
                  </div>

                  <div className="my-6 bg-black/40 border border-white/[0.04] p-6 rounded-2xl relative overflow-hidden space-y-4">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 border-b border-white/[0.04] pb-2">
                      <span>STYLISTIC CONTEXT SIGNATURE</span>
                      <span className="text-emerald-400">Direct / Minimalist</span>
                    </div>
                    <div className="text-xs leading-relaxed space-y-2 text-neutral-400">
                      <p className="text-neutral-300 font-sans italic">"Hey Sarah, tomorrow at 10 AM works great. Austin is scheduling the Google Meet link shortly. Let's sync then."</p>
                      <div className="flex items-center gap-4 text-[10px] pt-2 border-t border-white/[0.02]">
                        <span className="text-white">Sentences: 3</span>
                        <span className="text-white">Pronouns: Minimal</span>
                        <span className="text-white">Valediction: Best, Austin</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.04] text-[10px] text-neutral-500">
                    <span>DRAFT GENERATED SUCCESFULLY</span>
                    <span>SYNCED TO OUTBOX</span>
                  </div>
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
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/85" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/85" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85" />
                      <span className="text-[10px] text-neutral-500 ml-4 font-mono">calendar-adapter.py</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-950/20 text-blue-400 border border-blue-900/60 text-[9px] font-bold">BOOKING CONFIRMED</span>
                  </div>

                  <div className="my-6 bg-black/40 border border-white/[0.04] p-6 rounded-2xl relative overflow-hidden space-y-4">
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 border-b border-white/[0.04] pb-2">
                      <span>RESOLVING TIMEZONE CONFLICTS</span>
                      <span className="text-blue-400">America/New_York</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400 font-medium">Event: Venture round alignment sync</span>
                        <span className="text-neutral-500 font-mono">30 Min</span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-400">
                        <span>Time: May 22 14:00 EST (Tomorrow)</span>
                        <span className="text-emerald-400">CONFLICT FREE</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.04] text-[10px] text-neutral-500">
                    <span>GOOGLE MEET LINK GENERATED</span>
                    <span>OUTBOX DEPLOY CONFIRMED</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </BlurFade>

      </div>
    </section>

      {/* 3. RADAR CIRCULAR APP ORBITS INTEGRATIONS */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative text-center flex flex-col items-center">
        
        <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] text-white leading-tight max-w-2xl mb-24">
          Integrated directly with <br />your favourite platforms.
        </h2>

        {/* Structured Network Map Display Box */}
        <div className="relative w-[600px] h-[400px] flex items-center justify-center mb-12 scale-90 md:scale-100 select-none">
          
          {/* Animated SVG Connections Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Structural connection lines with subtle premium opacity */}
            <path d="M 90,80 Q 195,140 300,200" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
            <path d="M 60,200 L 300,200" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
            <path d="M 90,320 Q 195,260 300,200" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
            <path d="M 510,80 Q 405,140 300,200" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
            <path d="M 540,200 L 300,200" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
            <path d="M 510,320 Q 405,260 300,200" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />

            {/* Glowing animated pulsing data laser beams */}
            <path 
              d="M 90,80 Q 195,140 300,200" 
              stroke="url(#laser-gradient)" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="25, 140" 
              style={{ animation: "laser-pulse 4s linear infinite" }}
            />
            <path 
              d="M 300,200 L 60,200" 
              stroke="url(#laser-gradient)" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="25, 140" 
              style={{ animation: "laser-pulse 5.2s linear infinite reverse" }}
            />
            <path 
              d="M 90,320 Q 195,260 300,200" 
              stroke="url(#laser-gradient)" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="25, 140" 
              style={{ animation: "laser-pulse 6.2s linear infinite" }}
            />
            <path 
              d="M 300,200 Q 405,140 510,80" 
              stroke="url(#laser-gradient)" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="25, 140" 
              style={{ animation: "laser-pulse 4.6s linear infinite" }}
            />
            <path 
              d="M 540,200 L 300,200" 
              stroke="url(#laser-gradient)" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="25, 140" 
              style={{ animation: "laser-pulse 5.7s linear infinite" }}
            />
            <path 
              d="M 300,200 Q 405,260 510,320" 
              stroke="url(#laser-gradient)" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="25, 140" 
              style={{ animation: "laser-pulse 4.9s linear infinite reverse" }}
            />

            <defs>
              <linearGradient id="laser-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Premium Mailient Hub Node */}
          <div className="absolute left-[300px] top-[200px] -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-[25%] overflow-hidden z-30 shadow-[0_0_50px_rgba(255,255,255,0.12)] border border-white/[0.1] bg-neutral-950 flex items-center justify-center group pointer-events-auto cursor-pointer hover:scale-105 transition-transform duration-300">
            <img 
              src="/mailient-logo-premium.png" 
              alt="Mailient Hub" 
              className="w-10 h-10 object-cover"
            />
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-neutral-900 border border-white/10 text-white font-mono text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-xl">
              Mailient Core Hub
            </div>
          </div>

          {/* Node 1: Gmail */}
          <div 
            className="absolute left-[90px] top-[80px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group"
            style={{ animation: "float-node 5.5s ease-in-out infinite", animationDelay: "0.2s" }}
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-[#ea4335]/40 hover:shadow-[0_0_20px_rgba(234,67,53,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-[#ea4335]/25" />
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" fill="#EA4335" />
                <path d="M20 6L12 11L4 6V8L12 13L20 8V6Z" fill="#ffffff" opacity="0.85" />
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Gmail Ingestion (Active)
              </div>
            </div>
          </div>

          {/* Node 2: Slack */}
          <div 
            className="absolute left-[60px] top-[200px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group"
            style={{ animation: "float-node 6.2s ease-in-out infinite", animationDelay: "0.8s" }}
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-[#36c5f0]/40 hover:shadow-[0_0_20px_rgba(54,197,240,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-[#36c5f0]/25" />
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52 2.528 2.528 0 0 1-2.522 2.523H8.823a2.528 2.528 0 0 1-2.52-2.523z" fill="#E01E5A"/>
                <path d="M8.823 5.043a2.528 2.528 0 0 1 2.52-2.52 2.528 2.528 0 0 1 2.522 2.52v2.52h-2.522a2.528 2.528 0 0 1-2.52-2.52zm0 1.26a2.528 2.528 0 0 1 2.52 2.522v5.043a2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.523-2.522V8.825a2.528 2.528 0 0 1 2.523-2.522z" fill="#2EB67D"/>
                <path d="M18.958 8.825a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52 2.528 2.528 0 0 1 2.522-2.523h5.043a2.528 2.528 0 0 1 2.52 2.523z" fill="#36C5F0"/>
                <path d="M15.177 18.957a2.528 2.528 0 0 1-2.522 2.52 2.528 2.528 0 0 1-2.52-2.52v-2.52h2.52a2.528 2.528 0 0 1 2.522 2.52zm0-1.262a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.523 2.522v5.043a2.528 2.528 0 0 1-2.523 2.52z" fill="#ECB22E"/>
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Slack Notifications
              </div>
            </div>
          </div>

          {/* Node 3: Notion */}
          <div 
            className="absolute left-[90px] top-[320px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group"
            style={{ animation: "float-node 5.8s ease-in-out infinite", animationDelay: "1.4s" }}
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-white/10" />
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4.2C3 3.53726 3.53726 3 4.2 3H19.8C20.4627 3 21 3.53726 21 4.2V19.8C21 20.4627 20.4627 21 19.8 21H4.2C3.53726 21 3 20.4627 3 19.8V4.2ZM6.5 6.2V17.8H8.4V9.6L14.1 17.8H16V6.2H14.1V14.4L8.4 6.2H6.5Z" fill="#ffffff" />
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Notion Workspace Sync
              </div>
            </div>
          </div>

          {/* Node 4: Google Calendar */}
          <div 
            className="absolute right-[90px] top-[80px] translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group"
            style={{ animation: "float-node 6s ease-in-out infinite", animationDelay: "0.5s" }}
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-[#4285f4]/40 hover:shadow-[0_0_20px_rgba(66,133,244,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-[#4285f4]/25" />
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3 4.9 3 6V20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4Z" fill="#4285F4" />
                <path d="M5 9H19V20H5V9Z" fill="#ffffff" />
                <path d="M12 12H7V17H12V12Z" fill="#4285F4" />
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Google Calendar Sweeper
              </div>
            </div>
          </div>

          {/* Node 5: Cal.com */}
          <div 
            className="absolute right-[60px] top-[200px] translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group"
            style={{ animation: "float-node 5.7s ease-in-out infinite", animationDelay: "1.1s" }}
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-amber-500/20" />
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="5" fill="#111111" />
                <path d="M6 8h12M6 12h12M6 16h8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Cal.com Booking Engine
              </div>
            </div>
          </div>

          {/* Node 6: Google Meet */}
          <div 
            className="absolute right-[90px] top-[320px] translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group"
            style={{ animation: "float-node 6.4s ease-in-out infinite", animationDelay: "1.7s" }}
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-[#0f9d58]/40 hover:shadow-[0_0_20px_rgba(15,157,88,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-[#0f9d58]/25" />
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 8V12L19 8V16L15 12V16C15 17.1 14.1 18 13 18H5C3.9 18 3 17.1 3 16V8C3 6.9 3.9 6 5 6H13C14.1 6 15 6.9 15 8Z" fill="#0F9D58" />
                <path d="M6 10H12V14H6V10Z" fill="#ffffff" opacity="0.9" />
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Google Meet Video Loop
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FLAGSHIP MEET ARCUS SECTION (Sized Larger Than The Rest) */}
      <section className="py-36 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <BlurFade delay={0.1} duration={0.9} inView>
          <div 
            className="w-full linear-grid-card p-8 md:p-16 flex flex-col lg:flex-row gap-16 items-center relative group"
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
              
              <h2 className="text-5xl md:text-[66px] font-medium tracking-[-0.03em] leading-tight font-sans bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
                Meet Arcus.
              </h2>

              <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-light font-sans max-w-xl">
                Arcus is not an email assistant. It does not suggest or summarize. It acts. Connecting deeply with your codebase, calendar adapters, and topic clusters, Arcus handles your entire email footprint overnight, delivering finished briefings and resolved threads before you open your laptop.
              </p>

              <div className="pt-6">
                <Link 
                  href="/product/arcus"
                  className="px-8 py-3 linear-cta text-white text-xs tracking-tight flex items-center gap-2 w-fit cursor-pointer"
                >
                  Review Arcus Flagship
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Glass dashboard preview right side */}
            <div className="flex-1 w-full linear-grid-card !rounded-2xl p-6 h-[340px] flex flex-col justify-between font-mono text-left text-xs text-neutral-400 relative">
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
        </BlurFade>
      </section>

      {/* 5. THE MORNING SIDE-BY-SIDE: Chaos vs Overnight Clarity */}
      <section id="sample-brief" className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <BlurFade delay={0.1} duration={0.8} inView>
          <div className="text-center flex flex-col items-center mb-24">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold mb-6">THE MORNING TRANSITION</span>
            <h2 className="text-4xl md:text-[56px] font-medium tracking-[-0.025em] leading-tight max-w-2xl bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
              Chaos vs Overnight Clarity.
            </h2>
            <p className="text-sm md:text-base text-[#8a8f98] leading-relaxed font-light max-w-xl mt-4 font-sans min-h-[2.5rem]">
              <WordBlurStream
                text="Waking up to email is an operational drag. Arcus shifts inbox tasks to overnight autopilot, delivering focus leverage back to founders."
                msPerWord={80}
                startupMs={300}
                holdMs={5000}
              />
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-5xl mx-auto">
            {/* Left panel: Chaos */}
            <div className="p-8 rounded-[28px] border border-red-950/20 bg-[#0c0d12]/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] hover:shadow-[0_25px_60px_rgba(239,68,68,0.06)] transition-all duration-300 relative overflow-hidden text-left h-[460px] flex flex-col justify-between group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.025),transparent_60%)] pointer-events-none" />
              
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/20 border border-red-900/30 text-[9px] font-mono tracking-wider uppercase text-red-400 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>The Chaos of Yesterday</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Reactive Intake Fatigue</h3>
                <p className="text-xs text-[#8a8f98] font-light font-sans max-w-sm mb-8">
                  Waking up to 45 unread threads, urgent meeting booking queries, and complex response drag.
                </p>

                {/* Stress rows with beautiful high-fidelity styling */}
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="p-4 rounded-xl border border-red-950/30 bg-black/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-neutral-300 font-semibold">Thread: Pitch deck update (Venture Partner)</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-950/40 border border-red-900/50 text-red-400">14h Drag</span>
                  </div>
                  <div className="p-4 rounded-xl border border-red-950/30 bg-black/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-neutral-300 font-semibold">Meeting request: slots needed today</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-950/40 border border-red-900/50 text-red-400">8h Delay</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-neutral-500 pt-4 border-t border-white/[0.03] flex items-center justify-between font-mono">
                <span>STATUS // RED ZONE INBOX ACCUMULATION</span>
                <span className="text-red-400 font-semibold">FATIGUE: 100%</span>
              </div>
            </div>

            {/* Right panel: Overnight Clarity */}
            <div className="p-8 rounded-[28px] border border-emerald-950/20 bg-[#0c0d12]/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] hover:shadow-[0_25px_60px_rgba(16,185,129,0.06)] transition-all duration-300 relative overflow-hidden text-left h-[460px] flex flex-col justify-between group shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.025),transparent_60%)] pointer-events-none" />
              
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/20 border border-emerald-900/30 text-[9px] font-mono tracking-wider uppercase text-emerald-400 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Overnight Clarity</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Autonomous Morning Briefing</h3>
                <p className="text-xs text-[#8a8f98] font-light font-sans max-w-sm mb-8">
                  Start the morning with resolved outbox drafts, confirmed bookings, and a single dashboard brief.
                </p>

                {/* Clarity rows with premium detailed cards */}
                <div className="space-y-3 font-mono text-[11px]">
                  <div className="p-4 rounded-xl border border-emerald-950/30 bg-black/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-950 border border-emerald-400 flex items-center justify-center text-[7px] text-emerald-400">✓</span>
                      <span className="text-neutral-200">Venture partner pitch reply drafted & queued</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 font-sans">TONE SIGNED</span>
                  </div>
                  <div className="p-4 rounded-xl border border-emerald-950/30 bg-black/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-950 border border-emerald-400 flex items-center justify-center text-[7px] text-emerald-400">✓</span>
                      <span className="text-neutral-200">Venture round alignment sync booked automatically</span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-950/40 border border-blue-900/50 text-blue-400 font-sans">CAL.COM</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-neutral-500 pt-4 border-t border-white/[0.03] flex items-center justify-between font-mono">
                <span>STATUS // GREEN ZONE OPERATIONAL LEVERAGE</span>
                <span className="text-emerald-400 font-semibold">NO ACTION REQUIRED</span>
              </div>
            </div>

          </div>
        </BlurFade>
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
            <div className="linear-grid-card p-8 transition-all duration-300 relative text-left">
              <span className="text-4xl text-neutral-700 font-serif absolute top-4 left-4 select-none">“</span>
              <p className="text-xs text-neutral-300 font-light leading-relaxed font-sans relative z-10 pl-4 mb-6">
                Mailient restored my momentum. I wake up to resolved threads and booked calls, not a wall of noise.
              </p>
              <span className="text-[10px] font-semibold text-white pl-4 font-mono block">&mdash; Austin, Founder at Aether Labs</span>
            </div>

            <div className="linear-grid-card p-8 transition-all duration-300 relative text-left">
              <span className="text-4xl text-neutral-700 font-serif absolute top-4 left-4 select-none">“</span>
              <p className="text-xs text-neutral-300 font-light leading-relaxed font-sans relative z-10 pl-4 mb-6">
                Autonomous workflows are the ultimate leverage. Arcus handles the routine, keeping our team focused on shipping.
              </p>
              <span className="text-[10px] font-semibold text-white pl-4 font-mono block">&mdash; Sarah, COO at Linear VCs</span>
            </div>
          </div>

          {/* Security Strip */}
          <div className="w-full linear-grid-card !rounded-[20px] py-4 px-6 hover:shadow-[0_20px_40px_rgba(16,185,129,0.06)] hover:border-white/[0.1] transition-all duration-300 flex items-center justify-between text-left cursor-pointer">
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



      {/* 8. FAQ ACCORDION SECTION */}
      <section className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          <div className="lg:col-span-4 space-y-4 text-left">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#8a8f98] uppercase font-bold">COMMON QUESTIONS</span>
            <h2 className="text-3xl md:text-[40px] font-medium tracking-[-0.025em] leading-tight bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
              Frequently asked questions.
            </h2>
            <p className="text-xs text-[#8a8f98] leading-relaxed font-light font-sans max-w-sm">
              Can't find what you are looking for? Read our documentation page or contact support.
            </p>
          </div>

          <div className="lg:col-span-8 flex flex-col space-y-4 w-full">
            {landingFaqs.map((faq, index) => (
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

      {/* 8.5 MODULAR PRICING SECTION */}
      <section className="w-full border-t border-white/[0.06] z-10 relative">
        <PricingSection3 
          handleSelectPlan={(planId) => {
            router.push("/pricing");
          }} 
        />
      </section>

      {/* WHY MAILIENT MANIFESTO SECTION */}
      <section className="py-32 px-6 w-full max-w-4xl mx-auto border-t border-white/[0.06] z-10 relative flex flex-col items-center text-left">
        <div className="w-full space-y-12">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-4 py-1.5 text-xs font-mono tracking-wider text-emerald-400 uppercase backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              Why Mailient?
            </div>
            <h2 className="text-4xl md:text-6xl font-medium tracking-tight leading-tight font-sans">
              <span className="bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
                Email was supposed to be a tool.
              </span>
              <br />
              <span className="text-neutral-500">For most founders, it became the job.</span>
            </h2>
          </div>

          <div className="space-y-8 text-neutral-400 font-sans font-light leading-relaxed text-base md:text-lg">
            <p className="text-white font-normal text-lg md:text-xl tracking-tight leading-snug">
              You already know the problem. You have felt it.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
              <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 space-y-2">
                <span className="text-xs font-mono text-neutral-500">PAIN POINT 01</span>
                <p className="text-sm text-neutral-200">The email that sat in your inbox for three days while you meant to reply.</p>
              </div>
              <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 space-y-2">
                <span className="text-xs font-mono text-neutral-500">PAIN POINT 02</span>
                <p className="text-sm text-neutral-200">The client who went cold because you got buried in other threads.</p>
              </div>
              <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 space-y-2">
                <span className="text-xs font-mono text-neutral-500">PAIN POINT 03</span>
                <p className="text-sm text-neutral-200">The meeting that never got booked because the scheduling back-and-forth took a week.</p>
              </div>
              <div className="border border-white/[0.04] bg-white/[0.01] rounded-2xl p-6 space-y-2">
                <span className="text-xs font-mono text-neutral-500">PAIN POINT 04</span>
                <p className="text-sm text-neutral-200">The Sunday night dread of opening Gmail and seeing 200 unread messages staring back.</p>
              </div>
            </div>

            <p>
              The average founder spends <span className="text-white font-medium">13 hours a week on inbox management</span>. That is a part-time position — one you never hired for, never budgeted for, and never wanted. And unlike every other part of your business, the inbox does not scale. The more successful you get, the worse it becomes. More clients. More threads. More opportunities buried under newsletters you never asked for.
            </p>

            <p>
              Every other solution asks you to work harder at email. Keyboard shortcuts to move faster. AI that suggests a reply you still have to write. Filters you have to set up and maintain. Tools that make you more efficient at a job you should not be doing in the first place.
            </p>

            <p className="text-white font-normal text-lg md:text-xl tracking-tight leading-snug pt-4">
              Mailient does not make you faster at email. It removes email from your to-do list entirely.
            </p>

            <p>
              When a client emails you at midnight, Mailient reads it. When you wake up, a draft is already waiting in your voice. When someone asks to meet, your calendar has already been checked and a slot has been held. When your inbox fills up overnight, an agent has already swept it, handled the routine, and left you a clean briefing of the three things that actually need your eyes.
            </p>

            <p>
              You do not configure this. You do not prompt it every morning. You connect your Gmail, spend two minutes letting Arcus learn your voice, and then you stop thinking about your inbox.
            </p>

            <div className="border-l-2 border-white/20 pl-6 my-8 py-2 italic text-neutral-300 text-lg">
              "That is the product. That is why it exists."
            </div>

            <p>
              There are smarter email tools. There are faster email tools. There is no other tool that simply takes the inbox off your hands — that wakes up before you do, does the work, and gets out of your way.
            </p>

            <p className="text-white font-medium">
              Mailient is not a feature. It is a hire.
            </p>
            
            <p>
              The most reliable employee you will ever bring on board. One who never sleeps, never misses a message, never forgets a follow-up, and costs less per month than a single client lunch.
            </p>

            <div className="pt-6 font-mono text-xs text-neutral-500 uppercase tracking-widest">
              Your inbox has been running you long enough.
            </div>

          </div>

        </div>
      </section>

      {/* Core Capability Grid */}
      <Features8 />

      {/* Premium Dithered CTA Section */}
      <CTASection />

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

      {/* Premium Progressive Blurs for Top/Bottom edges */}
      <ProgressiveBlur position="top" backgroundColor="#000000" height="120px" blurAmount="10px" className="fixed z-40" />
      <ProgressiveBlur position="bottom" backgroundColor="#000000" height="80px" blurAmount="10px" className="fixed z-40" />

      {/* Premium Liquid Glass Floating Navigation Overlay */}
      <FloatingNavbar />
    </div>
  );
}
