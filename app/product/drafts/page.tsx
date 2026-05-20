"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Bot, Check, Send, Sparkles, ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";

export default function DraftsProductPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-start overflow-x-hidden font-satoshi relative selection:bg-white selection:text-neutral-950">
      
      {/* 1. NAV */}
      <Navbar theme="dark" />

      {/* Atmospheric backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
            backgroundSize: "24px 24px"
          }}
        />
        <div className="absolute top-[20%] left-1/4 w-[700px] h-[700px] rounded-full bg-neutral-900/40 blur-[120px]" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-20 md:pt-48 md:pb-28 px-6 text-center max-w-5xl mx-auto flex flex-col items-center">
        
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 shadow-sm mb-6">
          <Bot className="w-3.5 h-3.5 text-neutral-350" />
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-350">
            Product // Draft Reply
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white mb-8 leading-[1.02]">
          Elite context. <br />
          <span className="font-extralight italic text-neutral-400">Approve in one click.</span>
        </h1>

        {/* Subheading */}
        <p className="text-neutral-450 text-base md:text-lg max-w-2xl font-light leading-relaxed mb-10">
          Draft Reply learns your personal tone, technical lexicon, and corporate policies to draft high-fidelity responses in your Gmail drafts folder automatically.
        </p>

        {/* CTA */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
          className="px-8 py-3.5 rounded-full bg-white text-neutral-950 font-extrabold text-xs transition-transform duration-300 hover:scale-[1.02] shadow-lg flex items-center gap-1.5"
        >
          Connect Gmail for Drafts
          <ArrowRight className="w-4 h-4 text-neutral-950" />
        </button>
      </section>

      {/* Interactive Showcase */}
      <section className="relative z-10 w-full max-w-4xl px-6 pb-32">
        <div className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 md:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          
          {/* Detailed Features */}
          <div className="md:w-1/2 space-y-6">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Perfect replies, queued silently.
            </h2>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              You never have to log into another app to send emails. Mailient drafts replies directly inside Gmail, ready for your approval. You retain full control: no automated message ever exits your account without manual confirmation.
            </p>
            
            <ul className="space-y-4 pt-2">
              <li className="flex items-start gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span><strong>Voice Mimicking:</strong> Analyses your past outbound threads to match your greeting styles, paragraph structures, and sign-offs.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span><strong>Relational Context:</strong> Matches timelines and scheduling queries with Google Calendar availability dynamically.</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-neutral-300 font-light">
                <Check className="w-4 h-4 text-white shrink-0 mt-0.5" />
                <span><strong>Full Consent Check:</strong> Mailient is built as a collaborative drafts co-pilot. Sending is entirely manual.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Screen Mockup (Draft Process) */}
          <div className="md:w-1/2 w-full bg-black border border-neutral-900 rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-[10px] text-neutral-500">
              <span>Gmail Draft Queue</span>
              <span className="text-emerald-500 font-bold uppercase tracking-widest animate-pulse">Synced</span>
            </div>

            <div className="space-y-2 p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2 text-[10px] text-neutral-500">
                <span>To: Sarah Miller (Acme VC)</span>
                <span>Subject: Re: Funding Specs</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-300 font-sans font-light">
                Hi Sarah, <br /><br />
                Thanks for reaching out! Yes, we have our SOC2 audit complete and fully encrypted via AES-256. I've attached our audit details below. <br /><br />
                Best,<br />
                Marcus
              </p>
              <div className="flex justify-end pt-2 border-t border-neutral-800 mt-4">
                <span className="px-2.5 py-1 rounded bg-white text-neutral-950 text-[9px] font-black uppercase flex items-center gap-1 cursor-pointer">
                  Approve & Send
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <Footer theme="dark" />
    </div>
  );
}
