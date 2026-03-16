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
  backgroundImage = "https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?q=80&w=1000&auto=format&fit=crop",
  idNumber = "ID **** 4590",
  name = "JANE DOE",
  validThru = "11/29",
  label = "IDENTITY CARD",
}: VerificationCardProps) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "relative h-44 w-72 rounded-2xl p-6 shadow-2xl text-white flex flex-col justify-between bg-cover bg-center overflow-hidden"
      )}
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-2xl" />

      {/* Card Content */}
      <div className="relative z-10 flex justify-between items-start text-[10px] font-bold tracking-[0.2em] uppercase opacity-80">
        <span>{label}</span>
        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">VALID</span>
      </div>

      <div className="relative z-10 space-y-3">
        <p className="text-xl tracking-[4px] font-mono font-medium">{idNumber}</p>
        <div className="flex justify-between items-end border-t border-white/10 pt-3">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase tracking-widest opacity-50 mb-0.5">Card Holder</span>
            <span className="text-sm font-medium tracking-wide uppercase">{name}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] uppercase tracking-widest opacity-50 mb-0.5">Expiry</span>
            <span className="text-sm font-medium tracking-wide font-mono">{validThru}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
