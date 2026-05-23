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
  Pause,
  VolumeX,
  Volume2,
  Maximize,
  MoreVertical,
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
import { Footer } from "@/components/Footer";
import { WordBlurStream } from "@/src/WordBlurStream";
import { SpecialText } from "@/components/ui/special-text";
import { BlurFade } from "@/components/ui/blur-fade";
import NumberFlow from "@number-flow/react";
import { EtheralShadow } from "@/components/ui/etheral-shadow";

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

  const DESCRIPTIONS = [
    "Replies sent. Meetings booked. You were asleep.",
    "Your inbox doesn't wait. Neither does Arcus.",
    "Inbox zero. Every morning. No effort.",
    "The email app that works when you don't.",
    "Drafts written. Calendar full. You did nothing.",
    "Your voice. Your replies. Arcus's work.",
    "Hired an AI. Fired your inbox anxiety.",
    "Open Gmail. Everything's already done.",
    "The founder's inbox, on autopilot.",
    "Less email. More everything else."
  ];

  const [descIndex, setDescIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDescIndex((prev) => (prev + 1) % DESCRIPTIONS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Custom video controller state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.log("Play failed:", err));
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable full-screen mode:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const getSubtitles = (time: number) => {
    if (time >= 0 && time < 5) return "Up until now, handling email was a manual chore.";
    if (time >= 5 && time < 10) return "Mailient shifts your inbox operations to autopilot.";
    if (time >= 10 && time < 15) return "Arcus engine reads threads and writes custom drafts in your voice.";
    if (time >= 15 && time < 20) return "All resolved silently overnight, waiting for your approval.";
    if (time >= 20 && time < 25) return "Zero-Knowledge client-side encryption keeps everything secure.";
    if (time >= 25 && time < 35) return "Connect Gmail and experience the future of productivity today.";
    return "";
  };

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

  // Google One Tap — shows the native prompt to unauthenticated visitors.
  // Authenticated users are redirected away from "/" by middleware, so this
  // only ever fires for logged-out visitors. The credential is verified by the
  // `google-one-tap` NextAuth Credentials provider in lib/auth.js.
  useEffect(() => {
    const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!CLIENT_ID) return;

    const handleCredential = async (response: { credential?: string }) => {
      if (!response?.credential) return;
      await signIn("google-one-tap", {
        credential: response.credential,
        callbackUrl: "/home-feed",
      });
    };

    const init = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id) return;
      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: false,
        context: "signin",
        use_fedcm_for_prompt: true,
      });
      g.accounts.id.prompt();
    };

    if (document.getElementById("google-one-tap-script")) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.id = "google-one-tap-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.body.appendChild(script);
  }, []);

  const currentText = DESCRIPTIONS[descIndex];
  const dynamicSpeed = Math.max(4, Math.floor(750 / (currentText.length * 4)));

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start overflow-x-hidden font-inter strichpunkt-theme relative selection:bg-white selection:text-black">
      
      {/* 0. Custom Radar & Orbital Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        .strichpunkt-theme {
          font-family: 'Strichpunkt Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .strichpunkt-theme :not(.font-mono):not([class*="font-mono"]):not(code):not(pre) {
          font-family: 'Strichpunkt Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
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
        @keyframes drift-left {
          0% { transform: translateX(0) scaleY(1); }
          50% { transform: translateX(-25%) scaleY(1.05); }
          100% { transform: translateX(-50%) scaleY(1); }
        }
        @keyframes drift-right {
          0% { transform: translateX(-50%) scaleY(1); }
          50% { transform: translateX(-25%) scaleY(1.08); }
          100% { transform: translateX(0) scaleY(1); }
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
      <section className="relative w-full pt-40 pb-0 md:pt-48 flex flex-col items-center text-center z-10 bg-gradient-to-b from-[#000000] via-[#09090b] to-[#16161a] overflow-hidden">
        {/* White-grey glow from the bottom of the hero section spreading up */}
        <div className="absolute inset-x-0 bottom-0 h-[250px] bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none z-10" />

        {/* Etheral Shadow Background Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen select-none">
          <EtheralShadow
            color="rgba(128, 128, 128, 1)"
            animation={{ scale: 100, speed: 90 }}
            noise={{ opacity: 1, scale: 1.2 }}
            sizing="fill"
          />
        </div>

        <div className="w-full flex flex-col items-center max-w-5xl z-10 mx-auto px-6">
          
          {/* Headline & Subtitle */}
          <BlurFade delay={0.1} duration={0.8} inView>
            <h1 className="text-5xl md:text-[84px] font-medium tracking-[-0.04em] leading-[1.12] max-w-5xl bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent pb-4">
              Handle less, <br />Rest more.
            </h1>
          </BlurFade>

          <BlurFade delay={0.2} duration={0.8} inView>
            <p className="text-lg md:text-[22px] text-[#8a8f98] leading-relaxed max-w-4xl mt-8 font-light min-h-[4rem] flex items-center justify-center">
              <SpecialText speed={dynamicSpeed} delay={0} className="text-lg md:text-[22px] text-[#8a8f98] font-sans font-light tracking-wide text-center">
                {currentText}
              </SpecialText>
            </p>
          </BlurFade>

          {/* Premium CTAs */}
          <BlurFade delay={0.3} duration={0.8} inView>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
              <a
                href="https://tally.so/r/b5KpB6"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-full bg-white text-black font-semibold text-xs tracking-tight transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center gap-2 cursor-pointer"
              >
                Join waitlist
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

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
            <div 
              onClick={(e) => togglePlay(e)} 
              className={cn(
                "w-full max-w-4xl aspect-[16/9] bg-[#050505] border border-white/[0.08] rounded-[24px] mt-20 relative z-20 overflow-hidden group cursor-pointer transition-shadow duration-500",
                isPlaying ? "shadow-none" : "shadow-[0_50px_100px_rgba(0,0,0,0.85)]"
              )}
            >
              <video 
                ref={videoRef}
                src="/cap.mp4" 
                autoPlay 
                loop 
                muted={isMuted} 
                playsInline 
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                className="w-full h-full object-cover relative z-10" 
              />


              {/* Custom Video Controls Overlay */}
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-x-0 bottom-0 p-4 pb-0 flex flex-col justify-end z-35 transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:bg-gradient-to-t group-hover:from-black/90 group-hover:via-black/40 group-hover:to-transparent select-none"
              >
                
                {/* Buttons Row */}
                <div className="flex items-center justify-between px-2 pb-3 text-white/90">
                  {/* Left: Play/Pause & Time */}
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => togglePlay(e)}
                      className="hover:text-white transition-colors focus:outline-none"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-white stroke-none" />
                      ) : (
                        <Play className="w-4 h-4 fill-white stroke-none" />
                      )}
                    </button>
                    <span className="text-[11px] font-mono tracking-wider opacity-85">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Right: Mute & Fullscreen */}
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => toggleMute(e)}
                      className="hover:text-white transition-colors focus:outline-none"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4.5 h-4.5" />
                      ) : (
                        <Volume2 className="w-4.5 h-4.5" />
                      )}
                    </button>
                    <button 
                      onClick={(e) => toggleFullscreen(e)}
                      className="hover:text-white transition-colors focus:outline-none"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Custom Progress Bar / Scrubber at the very bottom */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!videoRef.current || !duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = clickX / rect.width;
                    const newTime = percentage * duration;
                    videoRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                  }}
                  className="w-full h-1 bg-white/20 hover:h-1.5 transition-all duration-200 cursor-pointer relative z-40"
                >
                  <div 
                    className="h-full bg-white relative transition-all duration-100" 
                    style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </BlurFade>

      </div>

      {/* Clear Separation Line at the bottom of the Metallic Hero */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent relative z-25 mt-24" />

      {/* 1.5 TRUSTED BY COMPANIES PERSPECTIVE MARQUEE SECTION ON PURE BLACK */}
      <div className="w-full bg-[#000000] py-16 relative z-10">
        <div className="w-full relative h-28 overflow-hidden bg-[#000000]">
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
                "font-mono text-[10px] tracking-[0.2em] font-medium block transition-all duration-300",
                activeStep === 0 ? "text-[#8a8f98] mb-3" : "text-neutral-700 group-hover:text-neutral-500 mb-1"
              )}>
                01 // Inbox triage
              </span>
              <h3 className={cn(
                "font-medium tracking-tight leading-tight transition-all duration-500",
                activeStep === 0 
                  ? "text-4xl md:text-[48px] text-white" 
                  : "text-2xl md:text-3xl text-neutral-600 hover:text-neutral-400"
              )}>
                Filter out noise.
              </h3>
              {activeStep === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 space-y-4"
                >
                  <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-light font-sans max-w-sm">
                    Automatically filters out notifications and organizes important emails so you can respond faster.
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
                "font-mono text-[10px] tracking-[0.2em] font-medium block transition-all duration-300",
                activeStep === 1 ? "text-[#8a8f98] mb-3" : "text-neutral-700 group-hover:text-neutral-500 mb-1"
              )}>
                02 // Smart drafts
              </span>
              <h3 className={cn(
                "font-medium tracking-tight leading-tight transition-all duration-500",
                activeStep === 1 
                  ? "text-4xl md:text-[48px] text-white" 
                  : "text-2xl md:text-3xl text-neutral-600 hover:text-neutral-400"
              )}>
                Draft in your voice.
              </h3>
              {activeStep === 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 space-y-4"
                >
                  <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-light font-sans max-w-sm">
                    Learns your writing style from past messages to draft natural, custom replies automatically.
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
                "font-mono text-[10px] tracking-[0.2em] font-medium block transition-all duration-300",
                activeStep === 2 ? "text-[#8a8f98] mb-3" : "text-neutral-700 group-hover:text-neutral-500 mb-1"
              )}>
                03 // Autopilot booking
              </span>
              <h3 className={cn(
                "font-medium tracking-tight leading-tight transition-all duration-500",
                activeStep === 2 
                  ? "text-4xl md:text-[48px] text-white" 
                  : "text-2xl md:text-3xl text-neutral-600 hover:text-neutral-400"
              )}>
                Book on autopilot.
              </h3>
              {activeStep === 2 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-4 space-y-4"
                >
                  <p className="text-sm md:text-base text-neutral-400 leading-relaxed font-light font-sans max-w-sm">
                    Coordinates slots, schedules meetings on your calendar, and sets up links overnight.
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
      <section id="connectors" className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative text-center flex flex-col items-center">
        
        {/* Local styled keyframes for smooth kinetic concentric orbits centered on Mailient */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes orbit-inner {
            from { transform: rotate(0deg) translateY(-90px) rotate(0deg); }
            to { transform: rotate(360deg) translateY(-90px) rotate(-360deg); }
          }
          @keyframes orbit-middle {
            from { transform: rotate(120deg) translateY(-160px) rotate(-120deg); }
            to { transform: rotate(480deg) translateY(-160px) rotate(-480deg); }
          }
          @keyframes orbit-outer {
            from { transform: rotate(240deg) translateY(-230px) rotate(-240deg); }
            to { transform: rotate(600deg) translateY(-230px) rotate(-600deg); }
          }
          .orbit-inner-node-1 {
            animation: orbit-inner 14s linear infinite;
          }
          .orbit-inner-node-2 {
            animation: orbit-inner 14s linear infinite;
            animation-delay: -7s;
          }
          .orbit-middle-node-1 {
            animation: orbit-middle 22s linear infinite;
          }
          .orbit-middle-node-2 {
            animation: orbit-middle 22s linear infinite;
            animation-delay: -11s;
          }
          .orbit-outer-node-1 {
            animation: orbit-outer 30s linear infinite;
          }
          .orbit-outer-node-2 {
            animation: orbit-outer 30s linear infinite;
            animation-delay: -15s;
          }
        ` }} />

        <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] leading-tight max-w-2xl mb-24 font-sans bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
          Integrated directly with <br />your favourite platforms.
        </h2>

        {/* Structured Network Map Display Box */}
        <div className="relative w-[600px] h-[400px] flex items-center justify-center mb-12 scale-90 md:scale-100 select-none">
          
          {/* Animated SVG Connections Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Concentric orbit tracks centered at the Mailient Hub bottom center (300, 320) */}
            <circle cx="300" cy="320" r="90" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" strokeDasharray="4, 4" />
            <circle cx="300" cy="320" r="160" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" />
            <circle cx="300" cy="320" r="230" stroke="rgba(255,255,255,0.05)" strokeWidth="1" fill="none" strokeDasharray="8, 4" />
          </svg>

          {/* Central Premium Mailient Hub Node (at the bottom center) */}
          <div className="absolute left-[300px] top-[320px] -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-[25%] overflow-hidden z-30 shadow-[0_0_50px_rgba(255,255,255,0.12)] border border-white/[0.1] bg-neutral-950 flex items-center justify-center group pointer-events-auto cursor-pointer hover:scale-105 transition-transform duration-300">
            <img 
              src="/mailient-logo-premium.png" 
              alt="Mailient Hub" 
              className="w-10 h-10 object-cover"
            />
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-neutral-900 border border-white/10 text-white font-mono text-[9px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-xl">
              Mailient Core Hub
            </div>
          </div>

          {/* Node 1: Gmail (Inner Orbit Track) */}
          <div 
            className="absolute left-[300px] top-[320px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group orbit-inner-node-1"
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-[#ea4335]/40 hover:shadow-[0_0_20px_rgba(234,67,53,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-[#ea4335]/25" />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10">
                <path fill="#EA4335" d="M6 12l18 11L42 12V9H6z"/>
                <path fill="#34A853" d="M42 12v27a3 3 0 01-3 3H9a3 3 0 01-3-3V12l18 11 18-11z"/>
                <path fill="#4285F4" d="M6 12v27a3 3 0 003 3V12H6z"/>
                <path fill="#FBBC04" d="M42 12v30h-3V12l3-3v3z"/>
                <path fill="#EA4335" d="M6 9h36l-3 3H9L6 9z"/>
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Gmail Ingestion (Active)
              </div>
            </div>
          </div>

          {/* Node 2: Slack (Inner Orbit Track) */}
          <div 
            className="absolute left-[300px] top-[320px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group orbit-inner-node-2"
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-[#36c5f0]/40 hover:shadow-[0_0_20px_rgba(54,197,240,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-[#36c5f0]/25" />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10">
                <path d="M27.255 80.719c0 7.33-5.978 13.317-13.309 13.317C6.616 94.036.63 88.049.63 80.719s5.987-13.317 13.317-13.317h13.309zm6.709 0c0-7.33 5.987-13.317 13.317-13.317s13.317 5.986 13.317 13.317v33.335c0 7.33-5.986 13.317-13.317 13.317-7.33 0-13.317-5.987-13.317-13.317zm0 0" fill="#de1c59"/>
                <path d="M47.281 27.255c-7.33 0-13.317-5.978-13.317-13.309C33.964 6.616 39.951.63 47.281.63s13.317 5.987 13.317 13.317v13.309zm0 6.709c7.33 0 13.317 5.987 13.317 13.317s-5.986 13.317-13.317 13.317H13.946C6.616 60.598.63 54.612.63 47.281c0-7.33 5.987-13.317 13.317-13.317zm0 0" fill="#35c5f0"/>
                <path d="M100.745 47.281c0-7.33 5.978-13.317 13.309-13.317 7.33 0 13.317 5.987 13.317 13.317s-5.987 13.317-13.317 13.317h-13.309zm-6.709 0c0 7.33-5.987 13.317-13.317 13.317s-13.317-5.986-13.317-13.317V13.946C67.402 6.616 73.388.63 80.719.63c7.33 0 13.317 5.987 13.317 13.317zm0 0" fill="#2eb57d"/>
                <path d="M80.719 100.745c7.33 0 13.317 5.978 13.317 13.309 0 7.33-5.987 13.317-13.317 13.317s-13.317-5.987-13.317-13.317v-13.309zm0-6.709c-7.33 0-13.317-5.987-13.317-13.317s5.986-13.317 13.317-13.317h33.335c7.33 0 13.317 5.986 13.317 13.317 0 7.33-5.987 13.317-13.317 13.317zm0 0" fill="#ebb02e"/>
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Slack Notifications (Active)
              </div>
            </div>
          </div>

          {/* Node 3: Notion (Middle Orbit Track) */}
          <div 
            className="absolute left-[300px] top-[320px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group orbit-middle-node-1"
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-white/40 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-white/10" />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10">
                <path fill="#fff" d="M12 12h40v40H12z"/>
                <path fill="#000" fillRule="evenodd" d="m5.2,47.56s8,10.37,8.48,10.83c1.16,1.11,2.73,1.69,4.33,1.6,8.37-.42,27.54-1.38,35.57-1.78,3.11-.16,5.55-2.72,5.56-5.83l.1-35.5c0-1.99-1.03-3.83-2.72-4.87t0,0c-2.99-1.84-8.91-5.49-10.7-6.68-1.46-.97-3.2-1.43-4.96-1.32-5.96.38-23.45,1.51-30.85,1.98-2.96.19-5.24,2.62-5.24,5.54v34.78c0,.45.15.89.43,1.24h0Zm50.01-28.91v.02l-.1,33.7c0,.97-.77,1.77-1.74,1.82l-35.57,1.78c-.5.03-.99-.16-1.35-.5-.36-.34-.57-.82-.57-1.32V20.71c0-.97.75-1.77,1.72-1.82l35.67-2.06c.5-.03.99.15,1.36.5.36.34.57.82.57,1.32h0Zm-11.98,21.42v-13.72c-.63-.72-1.63-.67-3.07-1.11-.1-.03-.19-.11-.23-.21-.04-.1-.03-.22.03-.31,1.72-2.53,6.63-.95,9.83-1.96.09-.03.2-.02.28.05.08.07.11.17.09.27-.31,1.39-1.4,2.1-2.95,2.4v22.57c0,.75-.45,1.44-1.15,1.72-.64.26-1.31.54-1.31.54-1.54.8-3.43.29-4.37-1.17l-11.46-17.87v16.27c.62.72,1.63.67,3.07,1.11.1.03.19.11.23.21.04.1.03.22-.03.31-1.73,2.53-6.63.95-9.83,1.96-.09.04-.2.02-.28-.05-.08-.06-.11-.17-.09-.27.31-1.39,1.4-2.1,2.95-2.4v-21.31l-3.02-.29s.21-2.45,3.09-2.73c1.42-.14,5.13-.3,6.47-.36.3-.01.59.13.77.38l10.99,15.95h0ZM15.03,14.28c.55.42,1.24.63,1.93.59,5.09-.29,26.82-1.53,32.21-1.84.17-.01.31-.13.35-.29.04-.16-.03-.33-.17-.42-2.39-1.49-4.74-2.95-5.76-3.63-.73-.48-1.6-.71-2.48-.66,0,0-24.7,1.36-29.78,1.91-.64.07-.78.3-.8.39-.09.31.02.54.27.74,1.02.78,3.07,2.33,4.23,3.21h0Z"/>
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Notion Workspace Sync
              </div>
            </div>
          </div>

          {/* Node 4: Google Calendar (Middle Orbit Track) */}
          <div 
            className="absolute left-[300px] top-[320px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group orbit-middle-node-2"
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-[#4285f4]/40 hover:shadow-[0_0_20px_rgba(66,133,244,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-[#4285f4]/25" />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 141.7 141.7" className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10">
                <path fill="#fff" d="M95.8,45.9H45.9V95.8H95.8Z"></path>
                <path fill="#34a853" d="M95.8,95.8H45.9v22.5H95.8Z"></path>
                <path fill="#4285f4" d="M95.8,23.4H30.9a7.55462,7.55462,0,0,0-7.5,7.5V95.8H45.9V45.9H95.8Z"></path>
                <path fill="#188038" d="M23.4,95.8v15a7.55462,7.55462,0,0,0,7.5,7.5h15V95.8Z"></path>
                <path fill="#fbbc04" d="M118.3,45.9H95.8V95.8h22.5Z"></path>
                <path fill="#1967d2" d="M118.3,45.9v-15a7.55462,7.55462,0,0,0-7.5-7.5h-15V45.9Z"></path>
                <path fill="#ea4335" d="M95.8,118.3l22.5-22.5H95.8Z"></path>
                <polygon fill="#2a83f8" points="77.916 66.381 75.53 63.003 84.021 56.868 87.243 56.868 87.243 85.747 82.626 85.747 82.626 62.772 77.916 66.381"></polygon>
                <path fill="#2a83f8" d="M67.29834,70.55785A7.88946,7.88946,0,0,0,70.78,64.12535c0-4.49-4-8.12-8.94-8.12a8.77525,8.77525,0,0,0-8.74548,6.45379l3.96252,1.58258a4.41779,4.41779,0,0,1,4.473-3.51635,4.138,4.138,0,1,1,.06256,8.24426v.00513h-.0559l-.00666.00061-.00964-.00061H59.15v3.87677h2.70642L61.88,72.65a4.70514,4.70514,0,1,1,0,9.37,5.35782,5.35782,0,0,1-3.96588-1.69354,4.59717,4.59717,0,0,1-.80408-1.2442l-.69757-1.69946L52.23005,79c.62,4.33,4.69,7.68,9.61,7.68,5.36,0,9.7-3.96,9.7-8.83A8.63346,8.63346,0,0,0,67.29834,70.55785Z"></path>
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Google Calendar Sweeper
              </div>
            </div>
          </div>

          {/* Node 5: Google Meet (Outer Orbit Track) */}
          <div 
            className="absolute left-[300px] top-[320px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group orbit-outer-node-1"
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-[#0f9d58]/40 hover:shadow-[0_0_20px_rgba(15,157,88,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-[#0f9d58]/25" />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10">
                <path fill="#00ac47" d="M24,21.45V25a2.0059,2.0059,0,0,1-2,2H9V21h9V16Z"></path>
                <polygon fill="#31a950" points="24 11 24 21.45 18 16 18 11 24 11"></polygon>
                <polygon fill="#ea4435" points="9 5 9 11 3 11 9 5"></polygon>
                <rect width="6" height="11" x="3" y="11" fill="#4285f4"></rect>
                <path fill="#ffba00" d="M24,7v4h-.5L18,16V11H9V5H22A2.0059,2.0059,0,0,1,24,7Z"></path>
                <path fill="#0066da" d="M9,21v6H5a2.0059,2.0059,0,0,1-2-2V21Z"></path>
                <path fill="#00ac47" d="M29,8.26V23.74a.9989.9989,0,0,1-1.67.74L24,21.45,18,16l5.5-5,.5-.45,3.33-3.03A.9989.9989,0,0,1,29,8.26Z"></path>
                <polygon fill="#188038" points="24 10.55 24 21.45 18 16 23.5 11 24 10.55"></polygon>
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Google Meet Video Loop
              </div>
            </div>
          </div>

          {/* Node 6: Cal.com (Outer Orbit Track) */}
          <div 
            className="absolute left-[300px] top-[320px] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group orbit-outer-node-2"
          >
            <div className="bg-[#0c0d12]/95 border border-white/[0.08] shadow-[0_8px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] rounded-[14px] w-12 h-12 flex items-center justify-center hover:scale-110 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all duration-300 cursor-pointer relative">
              <div className="smooth-glow bg-amber-500/20" />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 relative z-10">
                <path d="M458 512H56c-30.4 0-55-24.6-55-55V55C1 24.6 25.6 0 56 0h402c30.4 0 55 24.6 55 55v402c0 30.4-24.6 55-55 55" style={{ fill: '#fff' }}/>
                <path d="M162.8 347.3c-50.4 0-88.4-39.9-88.4-89.3s35.9-89.6 88.4-89.6c27.9 0 47 8.6 62.1 28l-24.3 20.1c-10.1-10.8-22.5-16.2-37.8-16.2-34.1 0-52.8 26.1-52.8 57.6s20.5 57.1 52.8 57.1c15.1 0 28-5.3 38.4-16.2l23.9 21c-14.5 18.9-34.3 27.5-62.3 27.5m166.4-131.2h32.7v128.1h-32.7v-18.7c-6.7 13.2-18.1 22.2-39.7 22.2-34.6 0-62.3-30.1-62.3-66.9 0-37 27.7-66.9 62.3-66.9 21.5 0 33 8.9 39.7 22.2zm1.1 64.5c0-20-13.8-36.6-35.4-36.6-20.8 0-34.4 16.7-34.4 36.6 0 19.4 13.6 36.6 34.4 36.6 21.4 0 35.4-16.7 35.4-36.6M385 164.3h32.7v179.6H385z" style={{ fill: '#242424' }}/>
              </svg>
              <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-neutral-950 border border-white/10 text-white font-mono text-[8px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-30">
                Cal.com Booking Engine
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

      {/* 8.5 MODULAR PRICING SECTION */}
      <section className="w-full border-t border-white/[0.06] z-10 relative">
        <PricingSection3 
          handleSelectPlan={(planId) => {
            router.push("/pricing");
          }} 
        />
      </section>

      {/* Core Capability Grid */}
      <Features8 />

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
