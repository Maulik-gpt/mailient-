"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { ShieldCheck, Check, Lock, Globe, Server, UserCheck } from "lucide-react";

export default function SecurityPage() {
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
      <section className="relative z-10 pt-40 pb-20 md:pt-48 md:pb-24 px-6 text-center max-w-5xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200/60 shadow-sm mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-800" />
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600">Enterprise Security</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-normal tracking-tight text-neutral-900 mb-6">
          Zero-trust protocols. <br />
          <span className="font-extralight italic text-neutral-500">Bank-grade isolation.</span>
        </h1>

        <p className="text-neutral-500 text-base md:text-lg max-w-2xl font-light leading-relaxed mb-6">
          Mailient is engineered to protect your private corporate data. We maintain SOC2 Type II compliance standards and enforce absolute data segregation at every stage of ingestion.
        </p>
      </section>

      {/* Security Architecture Grid */}
      <section className="relative z-10 w-full max-w-5xl px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Data Encryption */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-800 mb-6 shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">AES-256 Encryption</h3>
              <p className="text-xs text-neutral-500 font-light leading-relaxed">
                All records, indexing details, and cached tokens are encrypted utilizing military-grade AES-256 standard protocols at rest and in transit. Your email content is processed strictly in-memory during real-time classification.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[10px] uppercase font-bold text-neutral-400">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Full compliance</span>
            </div>
          </div>

          {/* Card 2: Zero Retention Policy */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-800 mb-6 shadow-sm">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Zero LLM Retention</h3>
              <p className="text-xs text-neutral-500 font-light leading-relaxed">
                We strictly enforce a zero-data-retention policy for large language model (LLM) training. Under no circumstances is your outbound tone, corporate vocabulary, or inbound relational emails utilized to train public models.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[10px] uppercase font-bold text-neutral-400">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>segregated training</span>
            </div>
          </div>

          {/* Card 3: Secure Google OAuth */}
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-800 mb-6 shadow-sm">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">Secure Google OAuth</h3>
              <p className="text-xs text-neutral-500 font-light leading-relaxed">
                Mailient links directly with your Gmail via Google's secure OAuth client. We only read and draft emails, and we require your manual authorization at onboarding. Mailient does not store your Google password.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center gap-1.5 text-[10px] uppercase font-bold text-neutral-400">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Isolated OAuth token</span>
            </div>
          </div>

        </div>

        {/* Closing trust strip */}
        <div className="mt-16 rounded-3xl border border-neutral-200 bg-neutral-50/50 p-8 text-center space-y-4">
          <p className="text-xs text-neutral-500 font-light leading-relaxed max-w-xl mx-auto">
            Our SOC2 audit was completed by certified independent evaluators, validating our administrative, technical, and physical security parameters. For direct security inquiries, email us at <span className="font-semibold text-neutral-800">security@mailient.xyz</span>.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
