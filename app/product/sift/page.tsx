"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Layers, Check, Shield, Zap, Sparkles, ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SiftProductPage() {
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200/60 shadow-sm mb-6">
          <Layers className="w-3.5 h-3.5 text-neutral-800" />
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600">Product // Sift</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-normal tracking-tight text-neutral-900 mb-6">
          Autonomous Triage. <br />
          <span className="font-extralight italic text-neutral-500">Quiet control.</span>
        </h1>

        <p className="text-neutral-500 text-base md:text-lg max-w-2xl font-light leading-relaxed mb-10">
          Sift maps the semantics of your inbound messages to separate high-ticket deals, support bottlenecks, and calendar requests from newsletters automatically.
        </p>

        <button
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          className="px-8 py-3.5 rounded-full bg-neutral-950 text-white font-semibold text-xs transition-transform duration-300 hover:scale-[1.02] shadow-md flex items-center gap-1.5"
        >
          Connect Gmail for Sift
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Interactive Sift Widget Showcase */}
      <section className="relative z-10 w-full max-w-4xl px-6 pb-32">
        <div className="rounded-3xl border border-neutral-200 bg-neutral-50/50 p-6 md:p-12 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.06)] relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          
          {/* Detailed Features */}
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-2xl font-light text-neutral-900 tracking-tight">
              A smarter way to index.
            </h2>
            <p className="text-xs text-neutral-500 font-light leading-relaxed">
              Every message is contextualized using secure, low-latency neural classifiers. Instead of basic subject keywords, Sift reads with human-like comprehension, mapping corporate structure, opportunity scale, and relational context.
            </p>
            
            <ul className="space-y-4 pt-2">
              <li className="flex items-start gap-3 text-xs text-neutral-700 font-light">
                <Check className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
                <span><strong>Opportunity Extraction:</strong> Instantly detects VC queries, prospective leads, and high-value partnerships.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-neutral-700 font-light">
                <Check className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
                <span><strong>Zero-Noise Ingestion:</strong> Automated newsletter and spam filters archive promotional junk silently.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-neutral-700 font-light">
                <Check className="w-4 h-4 text-neutral-900 shrink-0 mt-0.5" />
                <span><strong>Urgency Triage:</strong> Signals critical action-items based on project timelines and direct customer requests.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Screen Mockup (Sift Process) */}
          <div className="md:w-1/2 w-full bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 text-[10px] text-neutral-400">
              <span>Sift Ingestion Engine</span>
              <span className="text-emerald-600 font-bold uppercase tracking-widest animate-pulse">Running</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60 relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="font-semibold text-neutral-800 text-[11px]">Sarah Miller (Acme VC)</p>
                  <p className="text-[10px] text-neutral-500">"Meeting request next week..."</p>
                </div>
                <motion.span 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-100 uppercase"
                >
                  Priority Deal
                </motion.span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100 relative overflow-hidden flex items-center justify-between opacity-50">
                <div>
                  <p className="font-semibold text-neutral-500 text-[11px]">Marketing Digest weekly</p>
                  <p className="text-[10px] text-neutral-400">"Check our updated metrics..."</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-400 text-[9px] font-medium uppercase">
                  Archived
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60 relative overflow-hidden flex items-center justify-between">
                <div>
                  <p className="font-semibold text-neutral-800 text-[11px]">Dev Ops Alert</p>
                  <p className="text-[10px] text-neutral-500">"Uptime report successful..."</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[9px] font-semibold border border-neutral-200 uppercase">
                  Operational
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
