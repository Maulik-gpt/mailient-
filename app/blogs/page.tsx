"use client";

import React, { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BookOpen } from "lucide-react";
import AnimatedGradient from "@/components/ui/animated-gradient";
import { BlurFade } from "@/components/ui/blur-fade";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

export default function BlogsPage() {
  useEffect(() => {
    document.title = "Platform Insights // Mailient";
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi strichpunkt-theme relative selection:bg-white selection:text-black">
      {/* Top Navbar */}
      <Navbar theme="dark" />

      {/* Atmospheric backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />
        {/* Soft, beautiful mesh blurs */}
        <div className="absolute top-[15%] left-1/4 w-[800px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.015),transparent_70%)] blur-[100px]" />
        <div className="absolute top-[45%] right-1/4 w-[700px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.01),transparent_70%)] blur-[120px]" />
      </div>

      <AnimatedGradient 
        config={{ preset: "Prism", speed: 6 }} 
        noise={{ opacity: 0.008 }} 
        className="opacity-15 pointer-events-none"
      />

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-16 md:pt-48 md:pb-20 px-6 text-center max-w-4xl mx-auto flex flex-col items-center space-y-4">
        <BlurFade delay={0.05} duration={0.8} yOffset={10} inView>
          <div className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] shadow-2xl mb-4 group cursor-pointer hover:border-white/[0.12] transition-colors">
            <BookOpen className="w-3.5 h-3.5 text-neutral-300 animate-pulse" />
            <span className="text-[10px] font-medium tracking-[0.2em] text-neutral-300 uppercase">
              Platform Insights // Blogs
            </span>
          </div>
        </BlurFade>

        <BlurFade delay={0.15} duration={0.8} yOffset={15} inView>
          <h1 className="text-4xl md:text-7xl font-light tracking-[-0.04em] text-white leading-tight">
            Engineering Mailient. <br />
            <span className="font-medium italic text-neutral-300 bg-gradient-to-r from-neutral-200 via-neutral-350 to-neutral-500 bg-clip-text text-transparent">Deep Dives & Essays.</span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.28} duration={0.8} yOffset={12} inView>
          <p className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed tracking-tight">
            Explore articles written by our engineering team covering AI model orchestration, secure local-first compilation, and high-leverage business automation.
          </p>
        </BlurFade>
      </section>

      {/* Blog Cards Placeholder */}
      <section className="relative z-10 w-full max-w-2xl px-6 pb-40">
        <BlurFade delay={0.4} duration={0.8} yOffset={20} inView>
          <div className="border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl rounded-3xl p-12 shadow-2xl flex flex-col items-center text-center space-y-4">
            <BookOpen className="w-8 h-8 text-neutral-500 animate-pulse" />
            <h3 className="text-xl font-medium text-white tracking-tight">Coming soon</h3>
            <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans max-w-sm">
              Our engineering team is compiling deep-dive articles, architectural reviews, and essays. Platform insights will appear here shortly.
            </p>
          </div>
        </BlurFade>
      </section>

      {/* Footer */}
      <Footer />

      {/* Progressive edge blurs */}
      <ProgressiveBlur position="top" backgroundColor="#000000" height="120px" blurAmount="10px" className="fixed z-40" />
      <ProgressiveBlur position="bottom" backgroundColor="#000000" height="80px" blurAmount="10px" className="fixed z-40" />
    </div>
  );
}
