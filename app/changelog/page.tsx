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
      <section className="relative z-10 w-full max-w-3xl px-6 pb-32">
        <div className="space-y-12">
          
          {/* Entry 1 */}
          <BlurFade delay={0.4} duration={0.8} yOffset={20} inView>
            <div className="border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Platform Update v1.0.4</span>
                  <h3 className="text-lg font-semibold text-white mt-1">Arcus-Node-v3 Relational Reasoner</h3>
                </div>
                <span className="px-3 py-1 rounded bg-white/[0.02] border border-white/[0.06] text-[9px] font-bold text-neutral-300 font-mono">
                  {currentDate}
                </span>
              </div>

              <div className="text-xs text-neutral-400 leading-relaxed font-light space-y-4 font-sans">
                <p>
                  We have deployed the third iteration of the Arcus flagship neural compiler. Arcus now reasons recursively over your relational calendar connections to proactively highlight multi-party calendar gaps.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Upgraded semantic indexing parsing speed by 44%.</li>
                  <li>Segregated query caches inside isolated in-memory Docker layers.</li>
                  <li>Fixed Google OAuth refresh token timeout bug in background sync handlers.</li>
                </ul>
              </div>
            </div>
          </BlurFade>

          {/* Entry 2 */}
          <BlurFade delay={0.5} duration={0.8} yOffset={20} inView>
            <div className="border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl rounded-3xl p-8 shadow-2xl space-y-6 opacity-75">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Security Update v1.0.3</span>
                  <h3 className="text-lg font-semibold text-white mt-1">AES-256 Memory Encryption</h3>
                </div>
                <span className="px-3 py-1 rounded bg-white/[0.02] border border-white/[0.06] text-[9px] font-bold text-neutral-400 font-mono">
                  April 2026
                </span>
              </div>

              <div className="text-xs text-neutral-400 leading-relaxed font-light space-y-4 font-sans">
                <p>
                  As part of our commitment to SOC2 audit controls, we have upgraded our key management system. Keys are now isolated utilizing automated hardware security modules (HSM) with rolling monthly rotations.
                </p>
              </div>
            </div>
          </BlurFade>

        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
