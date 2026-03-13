'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Binary, Sparkles, BrainCircuit, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ThinkingStep = {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error' | 'blocked_approval';
    type: 'think' | 'search' | 'read' | 'analyze' | 'draft' | 'execute';
    detail?: string;
    expandedContent?: string;
};

interface ThinkingLayerProps {
    steps: ThinkingStep[];
    isVisible: boolean;
    currentThought?: string;
    isGenerating?: boolean;
    generatingLabel?: string;
    onStop?: () => void;
}

/**
 * ThinkingLayer — Modern, premium "Mono" reasoning display.
 * Inspired by high-end diagnostic tools and Apple's interface guidelines.
 */
export function ThinkingLayer({ steps, isVisible, currentThought, isGenerating, generatingLabel, onStop }: ThinkingLayerProps) {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

    if (!isVisible || steps.length === 0) return null;

    const toggleStep = (id: string) => {
        setExpandedSteps((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const completedSteps = steps.filter(s => s.status === 'completed');
    const activeStep = steps.find(s => s.status === 'active');
    const blockedStep = steps.find(s => s.status === 'blocked_approval');

    return (
        <div className="space-y-1 my-2">
            {/* Completed steps */}
            {completedSteps.map((step, idx) => (
                <motion.div 
                    key={step.id} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className="group"
                >
                    <button
                        onClick={() => step.expandedContent && toggleStep(step.id)}
                        className="flex items-center gap-2 py-1.5 w-full text-left col-span-full hover:bg-graphite-surface-2/40 rounded-xl transition-all -mx-2 px-2 group"
                    >
                        <div className="w-1 h-1 rounded-full bg-graphite-muted-2 flex-shrink-0 group-hover:bg-graphite-muted transition-colors" />
                        <span className="text-graphite-muted text-[13px] tracking-tight flex-1 font-medium group-hover:text-graphite-text transition-colors">{step.label}</span>
                        {step.expandedContent && (
                            <div className="flex items-center gap-2 text-graphite-muted-2 group-hover:text-graphite-muted transition-colors bg-white/[0.04] px-2 py-1 rounded-lg">
                                <span className="text-[10px] tracking-tight uppercase">Detail</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${expandedSteps.has(step.id) ? 'rotate-180' : ''}`} />
                            </div>
                        )}
                    </button>

                    {/* Expanded detail content */}
                    <AnimatePresence>
                        {step.expandedContent && expandedSteps.has(step.id) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="ml-0.5 pl-4 border-l border-graphite-border py-2 my-1">
                                    <div className="bg-graphite-surface/50 border border-graphite-border rounded-xl p-4 shadow-inner">
                                        <p className="text-graphite-muted text-[13px] leading-relaxed whitespace-pre-wrap selection:bg-white/10">
                                            {step.expandedContent}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ))}

            {/* Active step */}
            {activeStep && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 py-2 -mx-2 px-2 relative bg-graphite-surface border border-graphite-border rounded-xl"
                >
                    <div className="relative flex items-center justify-center w-2 h-2 shrink-0">
                        <div className="absolute inset-x-[-4px] inset-y-[-4px] bg-white/10 rounded-full blur-[2px] animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                            <span className="text-graphite-text text-[13px] font-bold tracking-tight">{activeStep.label}</span>
                            <div className="flex gap-[5px]">
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="w-[4px] h-[4px] rounded-full bg-white/80"
                                        style={{
                                            animation: `thinkingPulseCustom 0.8s ease-in-out ${i * 0.12}s infinite`,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 opacity-60">
                            <Sparkles className="w-3 h-3 text-graphite-muted-2" />
                            <span className="text-[9px] text-graphite-muted-2 tracking-wide">Working on task</span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Blocked for Approval step */}
            {blockedStep && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 py-2.5 -mx-2 px-2 relative bg-amber-500/5 border border-amber-500/10 rounded-xl"
                >
                    <div className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                            <span className="text-amber-200/80 text-[13px] font-bold tracking-tight">{blockedStep.label}</span>
                            <div className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                                <span className="text-[8px] text-amber-500 font-bold tracking-tightcaps">PAUSED</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 opacity-60">
                            <AlertCircle className="w-3 h-3 text-amber-500/60" />
                            <span className="text-[10px] text-amber-500/60 tracking-wide">Waiting for your approval</span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Note: Pending steps are intentionally omitted to provide a "step-by-step" discovery experience */}

            {currentThought && (
                <div className="flex items-start gap-2 pt-2 px-2">
                    <div className="text-white/20 text-[10px] mt-0.5">{'>'}</div>
                    <p className="text-white/40 text-[12px] tracking-tight leading-relaxed">
                        {currentThought}
                    </p>
                </div>
            )}

            {/* Generation overlay with Stop */}
            {isGenerating && generatingLabel && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-[#080808]/40 border border-white/[0.05] rounded-xl px-4 py-3 mt-4"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent animate-pulse" />
                            <BrainCircuit className="w-4 h-4 text-white/50 animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white/80 text-[12px] font-medium tracking-tight">{generatingLabel}</span>
                            <span className="text-[8px] text-white/20 tracking-wide">Processing...</span>
                        </div>
                    </div>
                    {onStop && (
                        <button
                            onClick={onStop}
                            className="bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white/80 text-[9px] tracking-widest px-3 py-1.5 rounded-lg transition-all"
                        >
                            Stop
                        </button>
                    )}
                </motion.div>
            )}

            <style jsx>{`
                @keyframes thinkingPulse {
                    0%, 100% { opacity: 0.2; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.4); }
                }
            `}</style>
        </div>
    );
}

/**
 * ArtifactCard — Premium glassmorphism card for Arcus creations
 */
interface ArtifactCardProps {
    type: string;
    title: string;
    version?: string;
    onView: () => void;
}

const artifactIcons: Record<string, any> = {
    email_draft: <Sparkles className="w-3.5 h-3.5" />,
    summary: <div className="w-3.5 h-3.5 border-2 border-white/20 rounded-sm" />,
    research: <Binary className="w-3.5 h-3.5" />,
    action_plan: <div className="w-3.5 h-3.5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white/50 rounded-full" /></div>,
    reply: <div className="w-3.5 h-3.5 border border-white/30 rounded-full" />,
    notes: <div className="w-3.5 h-3.5 bg-white/10 rotate-45" />,
};

const artifactLabels: Record<string, string> = {
    email_draft: 'Email draft',
    summary: 'Summary',
    research: 'Research report',
    action_plan: 'Action plan',
    reply: 'Suggested reply',
    notes: 'Note',
};

export function ArtifactCard({ type, title, version = 'v2.4', onView }: ArtifactCardProps) {
    return (
        <button
            onClick={onView}
            className="group relative flex items-center gap-4 bg-[#141416]/50 hover:bg-[#1A1A1E]/80 border border-white/[0.06] rounded-xl px-4 py-3 mt-3 mb-2 w-full max-w-[340px] transition-all duration-300 overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* Animated border reveal */}
            <div className="absolute inset-0 border border-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[0.5px]" />

            <div className="w-10 h-10 rounded-xl bg-[#0A0A0B] border border-white/[0.05] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-500">
                <div className="text-white/30 group-hover:text-white/90 transition-all duration-500">
                    {artifactIcons[type] || <Sparkles className="w-5 h-5" />}
                </div>
            </div>

            <div className="flex flex-col items-start gap-1 flex-1 min-w-0 z-10">
                <div className="flex items-center gap-2 w-full">
                    <span className="text-white/90 text-[14px] font-bold tracking-tight truncate group-hover:text-white transition-colors">
                        {title || (artifactLabels[type] || 'Resource').replace('_', ' ')}
                    </span>
                </div>
                <div className="flex items-center gap-2.5">
                    <span className="text-[9px] text-white/30 tracking-wide">
                        {artifactLabels[type] || 'Resource'}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[9px] text-white/20 font-bold">{version}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 text-white/20 group-hover:text-white/60 transition-all duration-500 transform group-hover:translate-x-1 z-10">
                <span className="text-[10px] font-bold tracking-tight">View</span>
                <ChevronRight className="w-4 h-4" />
            </div>
        </button>
    );
}
