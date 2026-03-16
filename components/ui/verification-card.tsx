"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VerificationCardProps {
  idNumber?: string;
  name?: string;
  validThru?: string;
  label?: string;
}

export function VerificationCard({
  idNumber,
  name,
  validThru,
  label,
}: VerificationCardProps) {
  if (!idNumber || !name || !validThru) return null;

  // Split idNumber into two lines for that specific high-fidelity look
  const idParts = idNumber.split(' ');
  const line1 = idParts.slice(0, 2).join(' ');
  const line2 = idParts.slice(2).join(' ');

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative h-[250px] w-[420px] rounded-[48px] p-12 shadow-2xl text-white flex flex-col justify-between overflow-hidden select-none group"
      )}
      style={{
        background: "#0a0a0b",
        boxShadow: "0 50px 100px -20px rgba(0, 0, 0, 0.9), inset 0 0 0 1px rgba(255, 255, 255, 0.03)"
      }}
    >
      {/* Deep Indigo/Blue Glow - Precise placement for that premium wash */}
      <div 
        className="absolute -bottom-[30%] -left-[10%] w-[130%] h-[130%] blur-[120px] opacity-25 pointer-events-none transition-opacity duration-1000 group-hover:opacity-35"
        style={{
          background: "radial-gradient(circle at 25% 85%, #2a228c 0%, transparent 60%)",
        }}
      />

      {/* Top Section - Pushed to Absolute Corners */}
      <div className="relative z-10 flex justify-between items-center text-[12px] font-bold tracking-[0.2em] text-white/40 uppercase">
        <span>{label}</span>
        <span>VALID</span>
      </div>

      {/* Hero Section - The Big Bold Numbers */}
      <div className="relative z-10 -mt-2">
        <h2 className="text-[44px] font-black tracking-tight text-white leading-[1] uppercase">
          {line1}<br />
          {line2}
        </h2>
      </div>

      {/* Bottom Section - Pushed to Absolute Corners */}
      <div className="relative z-10 flex justify-between items-end">
        <span className="text-[18px] font-bold tracking-[0.08em] text-white/90 uppercase">
          {name}
        </span>
        <span className="text-[20px] font-bold tracking-[0.05em] text-white/90">
          {validThru}
        </span>
      </div>

      {/* Subtle Refraction Layer */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
      
      {/* Interactive Hover Glow Overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none bg-[radial-gradient(circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(255,255,255,0.05)_0%,transparent_50%)]" />
    </motion.div>
  );
}
