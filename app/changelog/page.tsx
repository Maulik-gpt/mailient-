"use client";

import React, { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LayoutList } from "lucide-react";
import AnimatedGradient from "@/components/ui/animated-gradient";
import { BlurFade } from "@/components/ui/blur-fade";

export default function ChangelogPage() {
  const currentDate = "May 2026";

  useEffect(() => {
    document.title = "Changelog / Mailient";
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi strichpunkt-theme relative">
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
        <div className="absolute top-[20%] left-1/4 w-[700px] h-[700px] rounded-full bg-neutral-900/10 blur-[130px]" />
      </div>

      <AnimatedGradient 
        config={{ preset: "Prism", speed: 8 }} 
        noise={{ opacity: 0.01 }} 
        className="opacity-20 pointer-events-none"
      />

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-16 md:pt-48 md:pb-20 px-6 text-center max-w-3xl mx-auto flex flex-col items-center space-y-4">
        <BlurFade delay={0.05} duration={0.8} yOffset={10} inView>
          <div className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] shadow-2xl mb-4 group cursor-pointer hover:border-white/[0.12] transition-colors">
            <LayoutList className="w-3.5 h-3.5 text-neutral-300" />
            <span className="text-[10px] font-medium tracking-[0.2em] text-neutral-300 uppercase">
              Ship log // Changelog
            </span>
          </div>
        </BlurFade>

        <BlurFade delay={0.15} duration={0.8} yOffset={15} inView>
          <h1 className="text-4xl md:text-7xl font-light tracking-[-0.04em] text-white leading-tight">
            Product Updates. <br />
            <span className="font-medium italic text-neutral-350">Shipped often.</span>
          </h1>
        </BlurFade>

        <BlurFade delay={0.28} duration={0.8} yOffset={12} inView>
          <p className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed tracking-tight">
            We iterate at maximum velocity, publishing continuous platform upgrades, neural network optimizations, and security patches right here.
          </p>
        </BlurFade>
      </section>

      {/* Changelog Entry Section */}
      <section className="relative z-10 w-full max-w-2xl px-6 pb-32">
        <BlurFade delay={0.4} duration={0.8} yOffset={20} inView>
          <div className="border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl rounded-3xl p-12 shadow-2xl flex flex-col items-center text-center space-y-4">
            <LayoutList className="w-8 h-8 text-neutral-500 animate-pulse" />
            <h3 className="text-xl font-medium text-white tracking-tight">Coming soon</h3>
            <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans max-w-sm">
              We are compiling our next major feature release notes. Continuous platform optimization and security ship logs will appear here shortly.
            </p>
          </div>
        </BlurFade>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
