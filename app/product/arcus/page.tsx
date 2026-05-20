"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Cpu, Check, Terminal, Sparkles, ArrowRight, ShieldAlert } from "lucide-react";
import { signIn } from "next-auth/react";

export default function ArcusProductPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col items-center justify-start overflow-x-hidden font-satoshi relative">
      <Navbar />

      {/* Atmospheric backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-[20%] left-1/4 w-[700px] h-[700px] rounded-full bg-neutral-100/40 blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-20 md:pt-48 md:pb-28 px-6 text-center max-w-5xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 shadow-sm mb-6">
          <Cpu className="w-3.5 h-3.5 text-white" />
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-300">Flagship // Arcus AI</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-normal tracking-tight text-neutral-900 mb-6">
          Meet Arcus. <br />
          <span className="font-extralight italic text-neutral-500">Reasoning over your entire graph.</span>
        </h1>

        <p className="text-neutral-500 text-base md:text-lg max-w-2xl font-light leading-relaxed mb-10">
          Meet Arcus — your command-driven flagship AI. Arcus doesn't just read your email; it reasons over your entire relational graph. Ask Arcus to coordinate calendar conflicts, research incoming leads, or summarize weeks of context in a single query.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          className="px-8 py-3.5 rounded-full bg-neutral-950 text-white font-semibold text-xs transition-transform duration-300 hover:scale-[1.02] shadow-md flex items-center gap-1.5"
        >
          Activate Arcus AI
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Arcus Terminal Command Sandbox Showcase */}
      <section className="relative z-10 w-full max-w-4xl px-6 pb-32">
        <div className="rounded-3xl border border-neutral-200 bg-neutral-900 text-white p-6 md:p-12 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.03),_transparent_60%)] pointer-events-none" />

          {/* Detailed Features */}
          <div className="md:w-1/2 space-y-6 relative z-10">
            <h2 className="text-2xl font-light text-white tracking-tight">
              Command-driven agency.
            </h2>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              Arcus is the flagship layer of the Mailient operating system. By consolidating calendar networks, company databases, and outbound tones, Arcus responds to unstructured queries with absolute reasoning.
            </p>
            
            <ul className="space-y-4 pt-2">
              <li className="flex items-start gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span><strong>Relational Search:</strong> Query context from multiple threads simultaneously (e.g., "summarize our last three discussions with Acme").</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span><strong>Deep Multi-Step Actions:</strong> Resolves multi-stage calendar bookings and research actions autonomously.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span><strong>Zero Training Exposure:</strong> Fully SOC2 compliant in-memory query system. Zero retention model policy.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Screen Mockup (Arcus Terminal Sandbox) */}
          <div className="md:w-1/2 w-full bg-black border border-white/10 rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs relative z-10">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 text-[10px] text-neutral-500">
              <span>Arcus Relational Console</span>
              <span className="text-emerald-500 font-bold uppercase tracking-widest animate-pulse">Online</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-1">
                <span className="text-neutral-500">&gt;</span>
                <span className="text-neutral-200">Arcus, summarize weeks of context from Acme threads.</span>
              </div>
              
              <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-neutral-300 space-y-2">
                <p className="text-[10px] text-neutral-500 font-bold">Relational Summary output:</p>
                <p className="text-[11px] leading-relaxed text-neutral-300 font-light">
                  Acme VC is looking to review your SOC2 documentation before signing a term sheet. Sarah Miller suggested meeting next Tuesday at 2 PM PST. Draft replies and calendar proposals have been queued inside Sift.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
