"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BookOpen, ArrowRight, Clock, Calendar, ShieldCheck, Cpu, Sparkles } from "lucide-react";
import AnimatedGradient from "@/components/ui/animated-gradient";
import { BlurFade } from "@/components/ui/blur-fade";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";

const blogPosts = [
  {
    tag: "Architecture",
    icon: Cpu,
    title: "The Architecture of Autonomous Outboxes",
    subtitle: "How we built the Arcus flagship neural orchestrator to delegate calendar slots, thread context, and outbox operations overnight.",
    content: "Waking up to email is an operational drag. In this deep dive, we explore how Arcus shifts inbox tasks to overnight autopilot, detailing our concurrency controllers, task schedulers, and calendar conflicts handling that yield green zone focus leverage for founders.",
    date: "May 20, 2026",
    readTime: "5 min read",
    glowColor: "rgba(99,102,241,0.15)", // Indigo glow
  },
  {
    tag: "Deep Learning",
    icon: Sparkles,
    title: "AI Voice Profiling: The Death of Generic Templates",
    subtitle: "Why auto-generated email suggestions feel hollow and how we train style models over 90-day outbound histories.",
    content: "Standard templates alienate recipients. We review our Neural Voice Profile architecture, showing how we analyze sentence lengths, pronoun ratios, semantic tone signatures, and custom vocabulary over your recent email archives to draft authentic replies.",
    date: "April 15, 2026",
    readTime: "4 min read",
    glowColor: "rgba(16,185,129,0.15)", // Emerald glow
  },
  {
    tag: "Security",
    icon: ShieldCheck,
    title: "Vault Security: Shielding PII inside Automated Sweeps",
    subtitle: "A deep dive into local AES-256 cache sanitizers and client-side encryption layers protecting client datasets.",
    content: "Data security is non-negotiable. Learn how Mailient isolates client datasets, utilizing local-first memory sweeps, AES-256 encryption envelopes, and automated SOC2-grade key rotations to keep your emails private and secure.",
    date: "March 8, 2026",
    readTime: "6 min read",
    glowColor: "rgba(239,68,68,0.15)", // Red glow
  }
];

export default function BlogsPage() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

      {/* Blog Cards Grid */}
      <section className="relative z-10 w-full max-w-5xl px-6 pb-40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {blogPosts.map((post, index) => {
            const Icon = post.icon;
            const isHovered = hoveredIndex === index;

            return (
              <BlurFade key={index} delay={0.4 + index * 0.1} duration={0.8} yOffset={20} inView>
                <div 
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="group relative border border-white/[0.04] bg-neutral-950/[0.4] backdrop-blur-2xl rounded-[24px] p-7 shadow-2xl flex flex-col justify-between h-[420px] transition-all duration-500 hover:scale-[1.02] hover:border-white/[0.08]"
                >
                  {/* Custom graphite hover spotlight glow */}
                  <div 
                    className="absolute inset-0 pointer-events-none rounded-[24px] transition-opacity duration-700 opacity-0 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(400px circle at 50% 50%, ${post.glowColor}, transparent 80%)`,
                    }}
                  />
                  
                  {/* Post Content */}
                  <div className="space-y-4 relative z-10 text-left">
                    {/* Header Tag and Icon */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] text-[9px] font-mono tracking-wider uppercase text-neutral-400">
                        {post.tag}
                      </span>
                      <Icon className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors duration-300" />
                    </div>

                    {/* Titles */}
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-white group-hover:text-neutral-100 transition-colors leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-neutral-400 font-light leading-relaxed group-hover:text-neutral-300 transition-colors">
                        {post.subtitle}
                      </p>
                    </div>

                    {/* Summary text */}
                    <p className="text-[11px] text-neutral-500 font-light leading-relaxed font-sans line-clamp-4 pt-2">
                      {post.content}
                    </p>
                  </div>

                  {/* Footer Stats and CTA */}
                  <div className="flex items-center justify-between border-t border-white/[0.04] pt-4 relative z-10 text-[10px] text-neutral-500 font-mono">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-500" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        {post.readTime}
                      </span>
                    </div>
                    
                    {/* Premium kinetic arrow jump */}
                    <span className="text-white font-bold flex items-center gap-1 cursor-pointer group-hover:text-indigo-400 transition-colors duration-300">
                      Read
                      <ArrowRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>

                </div>
              </BlurFade>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Progressive edge blurs */}
      <ProgressiveBlur position="top" backgroundColor="#000000" height="120px" blurAmount="10px" className="fixed z-40" />
      <ProgressiveBlur position="bottom" backgroundColor="#000000" height="80px" blurAmount="10px" className="fixed z-40" />
    </div>
  );
}
