"use client";

import React, { useState, useEffect } from 'react';
import { X, Target, Zap, Shield, ArrowRight } from 'lucide-react';

interface UpdateCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  delay: string;
}

const updateCards: UpdateCard[] = [
  {
    title: "Mission Engine",
    description: "Launch goal-oriented workflows that run through strategic loops.",
    icon: <Target className="w-5 h-5" />,
    color: "bg-blue-500",
    delay: "delay-0"
  },
  {
    title: "Agentic Planner",
    description: "Arcus now understands your goals and drafts sequential steps.",
    icon: <Zap className="w-5 h-5" />,
    color: "bg-amber-400",
    delay: "delay-75"
  },
  {
    title: "Autopilot Mode",
    description: "Set rules for auto-drafting while you focus on high-level decisions.",
    icon: <Shield className="w-5 h-5" />,
    color: "bg-emerald-400",
    delay: "delay-150"
  }
];

export function MissionUpdateOnboarding() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const hasSeenUpdate = localStorage.getItem('seen_mission_update_v2');
    if (!hasSeenUpdate) {
      setMounted(true);
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      localStorage.setItem('seen_mission_update_v2', 'true');
      setMounted(false);
    }, 500);
  };

  if (!mounted) return null;

  return (
    <div className={`fixed right-8 top-24 bottom-24 z-[100] flex flex-col gap-4 pointer-events-none transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>
      <div className="flex items-center justify-between mb-2 px-1 pointer-events-auto">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-normal">System Update: Mission Control</span>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-all"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-3 h-full overflow-y-auto pr-2 custom-scrollbar pointer-events-auto">
        {updateCards.map((card, i) => (
          <div
            key={i}
            className={`w-64 flex-1 min-h-[160px] bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col justify-between group hover:border-white/20 transition-all duration-500 shadow-2xl shadow-black/40 animate-in slide-in-from-right-12 ${card.delay}`}
          >
            <div className={`w-10 h-10 ${card.color} rounded-2xl flex items-center justify-center text-black shadow-lg shadow-current/20`}>
              {card.icon}
            </div>

            <div className="space-y-2 mt-4">
              <h3 className="text-white text-sm font-normal tracking-tight">{card.title}</h3>
              <p className="text-white/40 text-[11px] leading-relaxed font-normal">
                {card.description}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] text-white/60 tracking-wider flex items-center gap-2">
                ACTIVE NOW <ArrowRight size={10} />
              </span>
            </div>
          </div>
        ))}

        <button
          onClick={handleClose}
          className="w-full py-4 mt-2 bg-white text-black text-[10px] uppercase tracking-[0.2em] rounded-2xl border border-white/10 hover:bg-neutral-200 transition-all pointer-events-auto shadow-xl shadow-white/5"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
}
