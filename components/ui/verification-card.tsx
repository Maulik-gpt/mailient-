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
  idNumber = "FREE 0000 0000",
  name = "THE BUILDER MAULIK",
  validThru = "03/26",
  label = "VERIFICATION CARD",
}: VerificationCardProps) {
  // Split idNumber into two lines if it contains spaces (matches the wrap in the screenshot)
  const idParts = idNumber.split(' ');
  const line1 = idParts.slice(0, 2).join(' ');
  const line2 = idParts.slice(2).join(' ');

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative h-[225px] w-[355px] rounded-[42px] p-10 shadow-2xl text-white flex flex-col justify-between overflow-hidden select-none group"
      )}
      style={{
        background: "#080809",
        boxShadow: "0 40px 100px -20px rgba(0, 0, 0, 0.8)"
      }}
    >
      {/* Background Glow - matches the subtle indigo wash on the left side */}
      <div 
        className="absolute -bottom-[20%] -left-[10%] w-[120%] h-[120%] blur-[100px] opacity-30 pointer-events-none transition-opacity duration-1000 group-hover:opacity-40"
        style={{
          background: "radial-gradient(circle at 20% 80%, #201a5e 0%, transparent 60%)",
        }}
      />

      {/* Top Labels */}
      <div className="relative z-10 flex justify-between items-center text-[11px] font-bold tracking-[0.18em] text-white/50 uppercase">
        <span>{label}</span>
        <span>VALID</span>
      </div>

      {/* Main ID - Bold, Wrapped (matches screenshot) */}
      <div className="relative z-10 mt-1">
        <h2 className="text-[36px] font-extrabold tracking-tight text-white leading-[1.05] uppercase">
          {line1}<br />
          {line2}
        </h2>
      </div>

      {/* Bottom Info Row */}
      <div className="relative z-10 flex justify-between items-end uppercase">
        <span className="text-[17px] font-bold tracking-[0.1em] text-white/80">
          {name}
        </span>
        <span className="text-[19px] font-bold tracking-[0.05em] text-white/80">
          {validThru}
        </span>
      </div>

      {/* Subtle interactive shine */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.03] to-transparent pointer-events-none" />
    </motion.div>
  );
}
