"use client";

import React, { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ShieldCheck, Check, Lock, Globe, Server, UserCheck } from "lucide-react";
import AnimatedGradient from "@/components/ui/animated-gradient";

export default function SecurityPage() {
  useEffect(() => {
    document.title = "Security / Mailient";
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi relative">
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
        config={{ preset: "Mist", speed: 6 }} 
        noise={{ opacity: 0.01 }} 
        className="opacity-20 pointer-events-none"
      />

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-20 md:pt-48 md:pb-24 px-6 text-center max-w-3xl mx-auto flex flex-col items-center space-y-4">
        <div className="inline-flex items-center gap-2.5 px-4.5 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] shadow-2xl mb-4 group cursor-pointer hover:border-white/[0.12] transition-colors">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-300" />
          <span className="text-[10px] font-medium tracking-[0.2em] text-neutral-300 uppercase">
            Enterprise Security
          </span>
        </div>

        <h1 className="text-4xl md:text-7xl font-light tracking-[-0.04em] text-white leading-tight">
          Zero-trust protocols. <br />
          <span className="font-medium italic text-neutral-350">Bank-grade isolation.</span>
        </h1>

        <p className="text-neutral-400 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed tracking-tight">
          Mailient is engineered to protect your private corporate data. We maintain SOC2 Type II compliance standards and enforce absolute data segregation at every stage of ingestion.
        </p>
      </section>

      {/* Security Architecture Grid */}
      <section className="relative z-10 w-full max-w-5xl px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Data Encryption */}
          <div className="rounded-3xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl p-8 shadow-2xl flex flex-col justify-between hover:border-white/[0.08] transition-all duration-300">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-white mb-6 shadow-2xl">
                <Lock className="w-5 h-5 text-neutral-350" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-4">AES-256 Encryption</h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                All records, indexing details, and cached tokens are encrypted utilizing military-grade AES-256 standard protocols at rest and in transit. Your email content is processed strictly in-memory during real-time classification.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center gap-1.5 text-[9px] uppercase font-bold text-neutral-500 tracking-wider">
              <Check className="w-4 h-4 text-emerald-450" />
              <span>Full compliance</span>
            </div>
          </div>

          {/* Card 2: Zero Retention Policy */}
          <div className="rounded-3xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl p-8 shadow-2xl flex flex-col justify-between hover:border-white/[0.08] transition-all duration-300">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-white mb-6 shadow-2xl">
                <Server className="w-5 h-5 text-neutral-350" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-4">Zero LLM Retention</h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                We strictly enforce a zero-data-retention policy for large language model (LLM) training. Under no circumstances is your outbound tone, corporate vocabulary, or inbound relational emails utilized to train public models.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center gap-1.5 text-[9px] uppercase font-bold text-neutral-500 tracking-wider">
              <Check className="w-4 h-4 text-emerald-450" />
              <span>segregated training</span>
            </div>
          </div>

          {/* Card 3: Secure Google OAuth */}
          <div className="rounded-3xl border border-white/[0.04] bg-white/[0.01] backdrop-blur-2xl p-8 shadow-2xl flex flex-col justify-between hover:border-white/[0.08] transition-all duration-300">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-white mb-6 shadow-2xl">
                <UserCheck className="w-5 h-5 text-neutral-350" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-4">Secure Google OAuth</h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed font-sans">
                Mailient links directly with your Gmail via Google's secure OAuth client. We only read and draft emails, and we require your manual authorization at onboarding. Mailient does not store your Google password.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center gap-1.5 text-[9px] uppercase font-bold text-neutral-500 tracking-wider">
              <Check className="w-4 h-4 text-emerald-450" />
              <span>Isolated OAuth token</span>
            </div>
          </div>

        </div>

        {/* Closing trust strip */}
        <div className="mt-16 rounded-3xl border border-white/[0.04] bg-white/[0.01] p-8 text-center space-y-4 shadow-2xl">
          <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-xl mx-auto font-sans">
            Our SOC2 audit was completed by certified independent evaluators, validating our administrative, technical, and physical security parameters. For direct security inquiries, email us at <span className="font-semibold text-white">security@mailient.xyz</span>.
          </p>
        </div>
      </section>

      {/* Footer */}
      <Footer theme="dark" />
    </div>
  );
}
