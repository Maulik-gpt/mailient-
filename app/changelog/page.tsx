"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Bug, Rocket, ChevronLeft, ArrowRight, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const LOG_ENTRIES = [
    {
        date: "March 28, 2026",
        version: "v2.4.0",
        title: "The Intelligence Update",
        updates: [
            { type: "new", text: "Introduced Arcus Mission History — a persistent indexed timeline of all agentic operations.", icon: Rocket },
            { type: "improved", text: "Overhauled Chat Interface with perfect ergonomic vertical symmetry and fluid spring physics.", icon: Zap },
            { type: "improved", text: "Integrated Floating Feedback Utility with ⌘+Enter rapid submission bypass.", icon: Sparkles }
        ]
    },
    {
        date: "March 24, 2026",
        version: "v2.3.5",
        title: "Protocol Refinement",
        updates: [
            { type: "new", text: "High-contrast 'Intelligence Tiers' pricing system for optimized membership routing.", icon: Star },
            { type: "fixed", text: "Resolved deep-linking latency when navigating between distant mission records.", icon: Bug },
            { type: "improved", text: "Enhanced glassmorphic textures for all top-level dashboard control panels.", icon: Zap }
        ]
    },
    {
        date: "March 18, 2026",
        version: "v2.2.0",
        title: "Aether Engine v2",
        updates: [
            { type: "new", text: "Launched Aether: the multi-agent orchestration engine for complex mission planning.", icon: Rocket },
            { type: "improved", text: "Reduced AI response latency by 40% through localized intelligence streaming.", icon: Zap }
        ]
    }
];

export default function ChangelogPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-y-auto pb-32">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>
            <div className="fixed top-[-20%] right-[-10%] w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[150px] pointer-events-none" />
            
            <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-16">
                    <button 
                        onClick={() => router.back()}
                        className="group flex items-center gap-2 text-white/40 hover:text-white transition-all text-sm"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>
                    <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                        Operational Log
                    </div>
                </div>

                <div className="mb-24">
                    <h1 className="text-6xl font-bold tracking-tighter mb-6">Changelog</h1>
                    <p className="text-white/40 text-xl max-w-lg font-medium">Tracking the evolution of agentic intelligence and workspace utility at Mailient.</p>
                </div>

                {/* Timeline */}
                <div className="space-y-32">
                    {LOG_ENTRIES.map((entry, entryIdx) => (
                        <motion.div 
                            key={entry.version}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, delay: entryIdx * 0.1 }}
                            className="relative grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-16"
                        >
                            {/* Date & Version */}
                            <div className="flex flex-col gap-2 pt-1">
                                <span className="text-[14px] font-bold text-white/20 uppercase tracking-widest">{entry.date}</span>
                                <div className="text-sm font-medium text-white/40">{entry.version}</div>
                            </div>

                            {/* Content */}
                            <div className="flex flex-col gap-8">
                                <h2 className="text-3xl font-bold tracking-tight">{entry.title}</h2>
                                <div className="space-y-6">
                                    {entry.updates.map((update, idx) => (
                                        <div key={idx} className="group flex items-start gap-5">
                                            <div className="mt-1 w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/[0.06] transition-all">
                                                <update.icon className="w-4 h-4 text-white/60" />
                                            </div>
                                            <div className="flex flex-col gap-1.5 pt-1">
                                                <div className={cn(
                                                    "text-[10px] font-black uppercase tracking-[0.2em] w-fit px-2 py-0.5 rounded border",
                                                    update.type === 'new' ? "text-emerald-500/80 border-emerald-500/20 bg-emerald-500/5" :
                                                    update.type === 'improved' ? "text-blue-500/80 border-blue-500/20 bg-blue-500/5" :
                                                    "text-orange-500/80 border-orange-500/20 bg-orange-500/5"
                                                )}>
                                                    {update.type}
                                                </div>
                                                <p className="text-[15px] leading-relaxed text-white/50 font-medium group-hover:text-white/80 transition-colors">
                                                    {update.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top divider */}
                            {entryIdx !== LOG_ENTRIES.length - 1 && (
                                <div className="absolute left-0 right-0 -bottom-16 h-px bg-white/[0.05]" />
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Footer CTA */}
                <div className="mt-40 p-12 rounded-[48px] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 text-center flex flex-col items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-2xl">
                        <Rocket className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight">Ready for your next mission?</h3>
                    <button 
                        onClick={() => router.push('/dashboard/agent-talk')}
                        className="px-8 py-3.5 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all active:scale-95"
                    >
                        Start Operations
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
