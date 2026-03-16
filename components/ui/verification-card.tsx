"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VerificationCardProps {
  backgroundImage?: string;
  idNumber?: string;
  name?: string;
  validThru?: string;
  label?: string;
}

export function VerificationCard({
  idNumber = "**** **** **** 7421",
  name = "RUIXEN UI",
  validThru = "07/31",
  label = "VERIFICATION CARD",
}: VerificationCardProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative h-[210px] w-[335px] rounded-[24px] p-8 shadow-2xl text-white flex flex-col justify-between overflow-hidden group select-none"
      )}
      style={{
        background: "#080808",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.05)"
      }}
    >
      {/* The Glowing Arc (matched to image) */}
      <div 
        className="absolute -bottom-[60px] left-1/2 -translate-x-1/2 w-[400px] h-[200px] blur-[60px] opacity-40 pointer-events-none transition-opacity duration-1000 group-hover:opacity-60"
        style={{
          background: "radial-gradient(ellipse at center, #2d26ff 0%, transparent 70%)",
          borderRadius: "100%",
        }}
      />
      
      {/* Secondary Glow for depth */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] blur-[40px] opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, #7c3aed 0%, transparent 80%)",
          borderRadius: "100%",
        }}
      />

      {/* Top Section */}
      <div className="relative z-10 flex justify-between items-center">
        <span className="text-[12px] font-medium tracking-[0.1em] text-white/90">
          {label}
        </span>
        <span className="text-[12px] font-medium tracking-[0.1em] text-white/90">
          VALID
        </span>
      </div>

      {/* Middle Section (Card Number) */}
      <div className="relative z-10">
        <motion.p 
            initial={{ letterSpacing: "0.2em", opacity: 0 }}
            animate={{ letterSpacing: "0.3em", opacity: 1 }}
            transition={{ delay: 0.2, duration: 1 }}
            className="text-[22px] font-semibold text-white tracking-[0.3em]"
        >
          {idNumber}
        </motion.p>
      </div>

      {/* Bottom Section */}
      <div className="relative z-10 flex justify-between items-center">
        <span className="text-[16px] font-medium tracking-[0.05em] text-white/95 uppercase">
          {name}
        </span>
        <span className="text-[16px] font-medium tracking-[0.05em] text-white/95 font-mono">
          {validThru}
        </span>
      </div>

      {/* Glass Overlay for sheen */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Interactive Shine Effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.2) 50%, transparent 80%)",
          transform: "translateX(-100%)",
        }}
        animate={{
          translateX: ["-100%", "200%"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
          delay: 1
        }}
      />
    </motion.div>
  );
}
