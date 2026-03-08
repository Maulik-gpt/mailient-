'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Binary, Sparkles, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ThinkingStep = {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error';
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

    return (
        <div className="space-y-1 my-4">
            {/* Completed steps */}
            {completedSteps.map((step, idx) => (
                <div key={step.id} className="group">
                    <button
                        onClick={() => step.expandedContent && toggleStep(step.id)}
                        className="flex items-center gap-3 py-1.5 w-full text-left hover:bg-white/[0.03] rounded-xl transition-all -mx-2 px-2"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0 group-hover:bg-white/40 transition-colors" />
                        <span className="text-white/40 text-[13px] tracking-tight flex-1 font-medium">{step.label}</span>
                        {step.expandedContent && (
                            <div className="flex items-center gap-1.5 text-white/10 group-hover:text-white/30 transition-colors">
                                <span className="text-[9px] font-mono tracking-widest uppercase">DATA_LOG</span>
                                {expandedSteps.has(step.id) ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
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
                                <div className="ml-0.5 pl-6 border-l border-white/[0.05] py-3 my-1">
                                    <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                                        <p className="text-white/40 text-[12px] leading-relaxed whitespace-pre-wrap font-mono selection:bg-white/10">
                                            {step.expandedContent}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}

            {/* Active step */}
            {activeStep && (
                <div className="flex items-center gap-3 py-2 -mx-2 px-2 relative">
                    <div className="relative flex items-center justify-center w-1.5 h-1.5 shrink-0">
                        <div className="absolute inset-x-[-4px] inset-y-[-4px] bg-white/10 rounded-full blur-[2px] animate-pulse" />
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white text-[13px] font-semibold tracking-tight">{activeStep.label}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-mono text-white/20 tracking-widest uppercase">STATUS_OK:</span>
                            <div className="flex gap-[3px]">
                                {[0, 1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="w-[2px] h-[2px] rounded-full bg-white/40"
                                        style={{
                                            animation: `thinkingPulse 1.2s ease-in-out ${i * 0.1}s infinite`,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {currentThought && (
                <p className="text-white/45 text-xs font-mono tracking-tight pt-2 px-2 uppercase opacity-60">
                    <span className="text-white/20 mr-2">{'>'}</span>
                    {currentThought}
                </p>
            )}

            {/* Generation overlay with Stop */}
            {isGenerating && generatingLabel && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-[#080808]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-5 py-4 mt-6 shadow-2xl shadow-black/40"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent animate-pulse" />
                            <BrainCircuit className="w-4 h-4 text-white/50 animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white/80 text-[13px] font-medium tracking-tight">{generatingLabel}</span>
                            <span className="text-[9px] font-mono text-white/20 tracking-[0.2em] uppercase">SYSTEM_NEURAL_STREAM</span>
                        </div>
                    </div>
                    {onStop && (
                        <button
                            onClick={onStop}
                            className="bg-white/5 hover:bg-white/10 border border-white/5 text-white/40 hover:text-white/80 text-[10px] font-mono uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                        >
                            Stop_Process
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
    email_draft: 'EMAIL_PROTOCOL',
    summary: 'CONTENT_RECAP',
    research: 'INTELLIGENCE_REPORT',
    action_plan: 'STRATEGIC_PLAN',
    reply: 'RESPONSE_VECTOR',
    notes: 'THOUGHT_LOG',
};

export function ArtifactCard({ type, title, version = 'v1.0', onView }: ArtifactCardProps) {
    return (
        <button
            onClick={onView}
            className="group relative flex items-center gap-4 bg-[#0a0a0a]/40 hover:bg-[#0f0f0f]/60 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.15] rounded-2xl px-5 py-4 mt-4 mb-2 w-full max-w-[340px] transition-all duration-500 shadow-xl shadow-black/20 overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-500">
                <div className="text-white/40 group-hover:text-white/80 transition-colors">
                    {artifactIcons[type] || <Sparkles className="w-4 h-4" />}
                </div>
            </div>

            <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 w-full">
                    <span className="text-white/80 text-[14px] font-semibold tracking-tight truncate">
                        {title || (artifactLabels[type] || 'ARTIFACT_CORE').replace('_', ' ')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-white/20 tracking-widest uppercase">
                        {artifactLabels[type] || 'ARTIFACT_CORE'}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[9px] font-mono text-white/20">{version}</span>
                </div>
            </div>

            <div className="flex items-center gap-1.5 text-white/20 group-hover:text-white/60 transition-all transform group-hover:translate-x-1">
                <span className="text-[10px] font-mono font-bold tracking-tighter uppercase">VIEW</span>
                <ChevronRight className="w-3.5 h-3.5" />
            </div>
        </button>
    );
}
