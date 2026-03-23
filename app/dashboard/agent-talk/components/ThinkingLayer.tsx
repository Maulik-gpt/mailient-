'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Binary, Sparkles, BrainCircuit, AlertCircle, Mail, FileText, Search, Zap, Calendar, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { cn } from "@/lib/utils";

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

    if (!isVisible || (steps.length === 0 && !isGenerating)) return null;

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
        <div className="relative pl-1 py-1">
            {/* Vertical Guide Line */}
            <div className="absolute left-1.5 top-3 bottom-0 w-[1px] bg-white/[0.05] z-0" />

            <div className="space-y-1 relative z-10 pt-2 transition-all duration-500">
                {/* Completed steps */}
                {completedSteps.map((step, idx) => (
                    <motion.div 
                        key={step.id} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.05 }}
                        className="group"
                    >
                        <button
                            onClick={() => step.expandedContent && toggleStep(step.id)}
                            className="flex items-center gap-3 py-1.5 w-full text-left col-span-full hover:bg-white/[0.02] rounded-lg transition-all -mx-1 px-1 group"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-white/20 border border-white/10 flex-shrink-0 group-hover:bg-white/40 transition-colors z-10" />
                            <span className="text-white/40 text-[12px] tracking-tight flex-1 font-medium group-hover:text-white/70 transition-colors font-mono">{step.label}</span>
                            
                            {step.expandedContent && (
                                <div className="flex items-center gap-2 text-white/20 group-hover:text-white/40 transition-colors bg-white/[0.03] px-1.5 py-0.5 rounded-md">
                                    <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${expandedSteps.has(step.id) ? 'rotate-180' : ''}`} />
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
                                    <div className="ml-0.5 pl-4 border-l border-white/10 py-1 my-1">
                                        <p className="text-white/50 text-[12px] leading-relaxed whitespace-pre-wrap selection:bg-white/10 italic">
                                            {step.expandedContent}
                                        </p>
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
                        className="flex items-center gap-3 py-2 -mx-1 px-1 relative"
                    >
                        <div className="relative flex items-center justify-center w-1.5 h-1.5 shrink-0 z-10">
                            <div className="absolute inset-x-[-4px] inset-y-[-4px] bg-white/20 rounded-full blur-[2px] animate-pulse" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        </div>
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center justify-between">
                                <TextShimmer className="text-white/90 text-[12px] font-bold tracking-tight font-mono" duration={1.2}>
                                    {activeStep.label}
                                </TextShimmer>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Blocked step */}
                {blockedStep && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 py-2 -mx-1 px-1 relative"
                    >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] z-10" />
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center justify-between">
                                <span className="text-amber-200/80 text-[12px] font-bold tracking-tight font-mono">{blockedStep.label}</span>
                                <span className="text-[8px] text-amber-500 font-bold tracking-widest uppercase">WAITING</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {currentThought && (
                <div className="flex items-start gap-2 pt-2 px-2">
                    <div className="text-white/20 text-[10px] mt-0.5">{'>'}</div>
                    <p className="text-white/40 text-[12px] tracking-tight leading-relaxed">
                        {currentThought}
                    </p>
                </div>
            )}

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
    email_draft: <Mail className="w-4 h-4" />,
    summary: <FileText className="w-4 h-4" />,
    research: <Search className="w-4 h-4" />,
    action_plan: <Zap className="w-4 h-4" />,
    reply: <Mail className="w-4 h-4" />,
    notes: <FileText className="w-4 h-4" />,
    meeting_schedule: <Calendar className="w-4 h-4" />,
    analytics: <BarChart3 className="w-4 h-4" />,
};

const artifactLabels: Record<string, string> = {
    email_draft: 'Email draft',
    summary: 'Email summary',
    research: 'Research report',
    action_plan: 'Action plan',
    reply: 'Suggested reply',
    notes: 'Drafted notes',
    meeting_schedule: 'Meeting schedule',
    analytics: 'Email analytics',
};

const artifactColors: Record<string, string> = {
    email_draft: '#6366f1',
    summary: '#8b5cf6',
    research: '#06b6d4',
    action_plan: '#f59e0b',
    reply: '#10b981',
    notes: '#ec4899',
    meeting_schedule: '#3b82f6',
    analytics: '#f97316',
};

export function ArtifactCard({ type, title, version = 'v2.4', onView }: ArtifactCardProps) {
    const color = artifactColors[type] || '#a855f7';
    
    return (
        <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={onView}
            className="group relative flex items-center gap-4 p-4 mt-4 mb-4 w-full max-w-[400px] bg-white/[0.03] border border-white/[0.06] rounded-2xl transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10 shadow-2xl overflow-hidden"
        >
            {/* Background Glow */}
            <div className="absolute -right-4 -top-4 w-24 h-24 blur-[40px] opacity-10 rounded-full transition-opacity group-hover:opacity-20 pointer-events-none" style={{ backgroundColor: color }} />
            
            {/* Left Icon Section */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 relative"
                 style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                <div className="absolute inset-0 blur-[10px] opacity-0 group-hover:opacity-40 transition-opacity rounded-xl" style={{ backgroundColor: color }} />
                <div className="relative z-10" style={{ color: color }}>
                    {artifactIcons[type] || <Sparkles className="w-5 h-5" />}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0 z-10">
                <div className="flex items-center gap-2 w-full">
                    <span className="text-white/90 text-[15px] font-semibold tracking-tight truncate group-hover:text-white transition-colors">
                        {title || (artifactLabels[type] || 'Resource').replace('_', ' ')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase opacity-30 group-hover:opacity-50 transition-opacity" style={{ color: color }}>
                        {artifactLabels[type] || 'Resource'}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[10px] text-white/15 font-mono">{version}</span>
                </div>
            </div>

            {/* Action Section */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.05] text-white/20 group-hover:text-white/80 group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-500 mr-1">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </motion.button>
    );
}
