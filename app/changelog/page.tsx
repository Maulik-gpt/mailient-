"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { LayoutList, Sparkles } from "lucide-react";

export default function ChangelogPage() {
  const currentDate = "May 2026";

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
      <section className="relative z-10 pt-40 pb-16 md:pt-48 md:pb-20 px-6 text-center max-w-5xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200/60 shadow-sm mb-6">
          <LayoutList className="w-3.5 h-3.5 text-neutral-800" />
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-600">Ship log // Changelog</span>
        </div>

        <h1 className="text-4xl md:text-7xl font-normal tracking-tight text-neutral-900 mb-6">
          Product Updates. <br />
          <span className="font-extralight italic text-neutral-500">Shipped often.</span>
        </h1>

        <p className="text-neutral-500 text-base md:text-lg max-w-2xl font-light leading-relaxed">
          We iterate at maximum velocity, publishing continuous platform upgrades, neural network optimizations, and security patches right here.
        </p>
      </section>

      {/* Changelog Entry Section */}
      <section className="relative z-10 w-full max-w-3xl px-6 pb-32">
        <div className="space-y-16">
          
          {/* Entry 1 */}
          <div className="border border-neutral-200 bg-white rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Platform Update v1.0.4</span>
                <h3 className="text-lg font-semibold text-neutral-800 mt-1">Arcus-Node-v3 Relational Reasoner</h3>
              </div>
              <span className="px-3 py-1 rounded bg-neutral-50 border border-neutral-200/60 text-[10px] font-bold text-neutral-500">
                {currentDate}
              </span>
            </div>

            <div className="text-xs text-neutral-500 leading-relaxed font-light space-y-4">
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

          {/* Entry 2 */}
          <div className="border border-neutral-200 bg-white rounded-3xl p-8 shadow-sm space-y-6 opacity-75">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Security Update v1.0.3</span>
                <h3 className="text-lg font-semibold text-neutral-800 mt-1">AES-256 Memory Encryption</h3>
              </div>
              <span className="px-3 py-1 rounded bg-neutral-50 border border-neutral-200/60 text-[10px] font-bold text-neutral-400">
                April 2026
              </span>
            </div>

            <div className="text-xs text-neutral-500 leading-relaxed font-light space-y-4">
              <p>
                As part of our commitment to SOC2 audit controls, we have upgraded our key management system. Keys are now isolated utilizing automated hardware security modules (HSM) with rolling monthly rotations.
              </p>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
