"use client";

import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from "framer-motion";
import { Layers, Check, Shield, Zap, Sparkles, ArrowRight, Mail, Play, AlertCircle, ShieldCheck, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BlurFade } from "@/components/ui/blur-fade";
import { FloatingNavbar } from "@/components/FloatingNavbar";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

const Dithering = lazy(() => 
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
);

export default function SiftProductPage() {
  const [activeTab, setActiveTab] = useState(0);

  // Mouse position tracker for cursor-reactive lighting on card
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  useEffect(() => {
    document.title = "Sift Intake / Mailient";
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi strichpunkt-theme relative selection:bg-white selection:text-black">
      
      {/* 0. Custom Radar & Orbital Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes radar-pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.8; }
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
          <BlurFade delay={0.05} duration={0.8} yOffset={10} inView>
            <div className="inline-flex items-center gap-2.5 px-4 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] shadow-2xl mb-8">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neutral-300"></span>
              </span>
              <span className="text-[10px] font-medium tracking-[0.15em] text-[#8a8f98] uppercase font-mono">
                Product // Sift Intake Triage
              </span>
            </div>
          </BlurFade>

          {/* Headline & Subtitle */}
          <BlurFade delay={0.15} duration={0.8} yOffset={15} inView>
            <h1 className="text-4xl md:text-[68px] font-medium tracking-[-0.03em] text-white leading-[1.08] max-w-4xl">
              Autonomous Triage. <br />Quiet control.
            </h1>
          </BlurFade>

          <BlurFade delay={0.28} duration={0.8} yOffset={12} inView>
            <p className="text-base md:text-[18px] text-[#8a8f98] leading-relaxed max-w-2xl mt-6 font-light font-sans">
              Sift maps the semantics of your inbound messages to separate high-ticket deals, support bottlenecks, and calendar requests from newsletters automatically.
            </p>
          </BlurFade>

          {/* Premium CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="px-8 py-3 rounded-full bg-white text-black font-semibold text-xs tracking-tight transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] flex items-center gap-2 cursor-pointer"
            >
              Connect Gmail for Sift
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <a
              href="#sift-showcase"
              className="px-8 py-3 linear-cta text-white font-medium text-xs flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-white" />
              Watch Sift work
            </a>
          </div>

        </div>
      </section>

      {/* 2. INTERACTIVE WIDGET SHOWCASE */}
      <section id="sift-showcase" className="py-32 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div 
          className="w-full linear-grid-card !rounded-[32px] p-8 md:p-16 flex flex-col lg:flex-row gap-16 items-center relative group"
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
              TRIAGE INGESTION ENGINE
            </span>
            
            <h2 className="text-4xl md:text-[54px] font-medium tracking-[-0.03em] text-white leading-tight font-sans">
              A smarter way to index.
            </h2>

            <p className="text-xs text-neutral-400 leading-relaxed font-light font-sans max-w-xl">
              Every message is parsed and categorized using secure, low-latency neural classifiers. Instead of basic subject keywords, Sift reads with human-like comprehension, mapping corporate structure, opportunity scale, and relational urgency.
            </p>

            <ul className="space-y-4 pt-2">
              <li className="flex items-start gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Opportunity Extraction:</strong> Instantly detects VC queries, prospective leads, and high-value partnerships.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Zero-Noise Ingestion:</strong> Automated newsletter and spam filters archive promotional junk silently.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Urgency Triage:</strong> Signals critical action-items based on project timelines and direct customer requests.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Screen Mockup (Sift Process) */}
          <div className="flex-1 w-full linear-grid-card !rounded-2xl p-6 h-[340px] flex flex-col justify-between font-mono text-left text-xs text-neutral-400 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.01),transparent_60%)] pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-white/[0.03] text-[10px] text-neutral-500">
              <span>Sift Ingestion Engine</span>
              <span className="text-emerald-500 font-bold uppercase tracking-widest animate-pulse">Running</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#0c0c0c] rounded-lg border border-white/[0.04] relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-[11px]">Sarah Miller (Acme VC)</p>
                  <p className="text-[10px] text-neutral-500">"Meeting request next week..."</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 text-[9px] font-bold uppercase">
                  Priority Deal
                </span>
              </div>

              <div className="p-3 bg-[#0c0c0c] rounded-lg border border-white/[0.04] relative overflow-hidden flex items-center justify-between opacity-50">
                <div>
                  <p className="font-semibold text-neutral-400 text-[11px]">Marketing Digest weekly</p>
                  <p className="text-[10px] text-neutral-500">"Check our updated metrics..."</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-500 text-[9px] font-medium uppercase">
                  Archived
                </span>
              </div>

              <div className="p-3 bg-[#0c0c0c] rounded-lg border border-white/[0.04] relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-[11px]">Dev Ops Alert</p>
                  <p className="text-[10px] text-neutral-500">"Uptime report successful..."</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-350 text-[9px] font-semibold border border-white/[0.06] uppercase">
                  Operational
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.03] flex items-center justify-between text-[9px] text-neutral-500">
              <span>Vault-grade local PII shield</span>
              <span>100% SECURE</span>
            </div>
          </div>

        </div>
      </section>

      {/* 3. SECURITY STRIP */}
      <section className="py-20 px-6 w-full max-w-7xl mx-auto border-t border-white/[0.06] z-10 relative">
        <div className="w-full linear-grid-card !rounded-[20px] py-4 px-6 hover:shadow-[0_20px_40px_rgba(99,102,241,0.06)] hover:border-white/[0.1] transition-all duration-300 flex items-center justify-between text-left cursor-pointer">
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

      {/* 4. FIVE-COLUMN LUXURY FOOTER */}
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
