'use client';

import { ChevronRight, Binary, Sparkles, BrainCircuit, Mail, FileText, Search, Zap, Calendar, BarChart3, Pencil, Terminal, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

export type ThinkingStep = {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed' | 'error' | 'blocked_approval';
    type: 'think' | 'search' | 'read' | 'analyze' | 'draft' | 'execute' | 'code';
    detail?: string;
};

export type ThinkingBlock = {
    id: string;
    title: string;
    status: 'pending' | 'active' | 'completed';
    initialContext?: string;
    steps: ThinkingStep[];
    interimConclusion?: string;
    nextActionContext?: string;
    isPreviewable?: boolean;
    previewData?: any;
};

interface ThinkingLayerProps {
    blocks: ThinkingBlock[];
    isVisible: boolean;
    currentThought?: string;
    isGenerating?: boolean;
    onStop?: () => void;
}

/**
 * ThinkingLayer — Redesigned "Managed AI" Flow inspired by Manus.
 * Groups activity pills under major objectives with human-like transitions.
 */
export function ThinkingLayer({ blocks, isVisible, currentThought, isGenerating }: ThinkingLayerProps) {
    if (!isVisible || (blocks.length === 0 && !isGenerating)) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'search': return <Search className="w-3 h-3" />;
            case 'read': return <FileText className="w-3 h-3" />;
            case 'analyze': return <Binary className="w-3 h-3" />;
            case 'think': return <BrainCircuit className="w-3 h-3" />;
            case 'draft': return <Pencil className="w-3 h-3" />;
            case 'execute': return <Terminal className="w-3 h-3" />;
            case 'code': return <Binary className="w-3 h-3" />;
            default: return <Sparkles className="w-3 h-3" />;
        }
    };

    return (
        <div className="relative pt-2 pb-2 space-y-6">
            <AnimatePresence mode="popLayout">
                {blocks.map((block) => (
                    <motion.div
                        key={block.id}
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="group flex flex-col gap-3 relative"
                    >
                        {/* Major Objective Header */}
                        <div className="flex items-start gap-2.5 group/header cursor-default">
                            <div className={cn(
                                "mt-1 flex items-center justify-center w-4 h-4 rounded-full border shrink-0 transition-all duration-700",
                                block.status === 'completed' 
                                    ? "bg-white/10 border-white/20 text-white/50" 
                                    : "bg-white/5 border-white/10 text-white/20 ring-1 ring-white/10 ring-offset-0"
                            )}>
                                {block.status === 'completed' ? (
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                                )}
                            </div>
                            <h3 className={cn(
                                "text-[14px] font-bold tracking-tight py-0.5 transition-all duration-500",
                                block.status === 'completed' ? "text-white/60" : "text-white/95"
                            )}>
                                {block.title}
                            </h3>
                        </div>

                        {/* Initial Context Statement */}
                        {block.initialContext && block.status !== 'pending' && (
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="pl-6.5 text-[14px] text-white/50 leading-relaxed tracking-tight max-w-[95%] font-medium"
                            >
                                {block.initialContext}
                            </motion.p>
                        )}

                        {/* Nested Activity Pills */}
                        <div className="pl-6.5 flex flex-wrap gap-2 py-1">
                            {block.steps.map((step) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={cn(
                                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500",
                                        step.status === 'completed' 
                                            ? "bg-white/[0.03] border-white/[0.06] text-white/25" 
                                            : "bg-white/[0.06] border-white/15 text-white/90 shadow-[0_0_20px_rgba(255,255,255,0.03)]"
                                    )}
                                >
                                    <div className={cn(
                                        "p-0.5 rounded shrink-0",
                                        step.status === 'active' ? "text-white/80" : "text-white/15"
                                    )}>
                                        {getIcon(step.type)}
                                    </div>
                                    <span className="text-[12px] font-semibold tracking-tight">
                                        {step.label}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Transition/Conclusion Context */}
                        {(block.interimConclusion || block.nextActionContext) && block.status !== 'pending' && (
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="pl-6.5 text-[14px] text-white/50 leading-relaxed tracking-tight max-w-[95%] font-medium"
                            >
                                {block.interimConclusion} {block.nextActionContext}
                            </motion.p>
                        )}
                        
                        {/* Preview (Small Data Square) */}
                        {block.isPreviewable && block.previewData && (
                            <div className="pl-6.5 mt-1">
                                <div className="w-12 h-12 bg-white/[0.02] border border-white/10 rounded-lg flex flex-col items-center justify-center p-2 group hover:bg-white/5 transition-all cursor-pointer">
                                    <div className="w-full h-0.5 bg-white/10 rounded-full mb-1" />
                                    <div className="w-3/4 h-0.5 bg-white/10 rounded-full mb-1" />
                                    <div className="w-full h-0.5 bg-white/10 rounded-full" />
                                    <span className="text-[6px] text-white/20 mt-1 uppercase font-black tracking-tighter">PREVIEW</span>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Live Thought Stream (Footer) */}
            {currentThought && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="pl-6.5 py-1"
                >
                    <p className="text-[13px] text-white/40 italic font-medium tracking-tight leading-relaxed flex items-center gap-2">
                        <span className="w-1 h-3 bg-white/10 rounded-full animate-pulse" />
                        {currentThought}
                    </p>
                </motion.div>
            )}
        </div>
    );
}

/**
 * ResultCard — Simple and clear card for Arcus execution results
 */
interface ResultCardProps {
    type: string;
    title: string;
    onView: () => void;
}

const resultIcons: Record<string, any> = {
    email_draft: <Mail className="w-4 h-4" />,
    summary: <FileText className="w-4 h-4" />,
    research: <Search className="w-4 h-4" />,
    action_plan: <Zap className="w-4 h-4" />,
    reply: <Mail className="w-4 h-4" />,
    notes: <FileText className="w-4 h-4" />,
    meeting_schedule: <Calendar className="w-4 h-4" />,
    analytics: <BarChart3 className="w-4 h-4" />,
};

const resultLabels: Record<string, string> = {
    email_draft: 'Draft',
    summary: 'Summary',
    research: 'Report',
    action_plan: 'Plan',
    reply: 'Reply',
    notes: 'Notes',
    meeting_schedule: 'Schedule',
    analytics: 'Analytics',
};

export function ResultCard({ type, title, onView }: ResultCardProps) {
    const label = resultLabels[type] || 'View Result';
    
    return (
        <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onView}
            className="group relative flex items-center gap-4 p-5 mt-4 mb-4 w-full max-w-[400px] bg-[#111111] border border-white/5 rounded-2xl transition-all hover:bg-[#161616] hover:border-white/10"
        >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:border-white/10 group-hover:bg-white/10 transition-all text-white/40 group-hover:text-white/80">
                {resultIcons[type] || <Sparkles className="w-4 h-4" />}
            </div>

            <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
                <span className="text-white/90 text-[14px] font-bold tracking-tight truncate group-hover:text-white transition-colors">
                    {title || label}
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/20 group-hover:text-white/40 transition-colors">
                    {label}
                </span>
            </div>

            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-white/10 group-hover:text-white/40 transition-all">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
        </motion.button>
    );
}
