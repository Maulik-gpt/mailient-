"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Billion-Dollar UI Shimmer Animation
const ShimmerStyles = () => (
    <style jsx global>{`
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
    `}</style>
);
import {
    ChevronRight, ChevronDown, CheckCircle2, XCircle,
    Loader2, Brain, Search, Mail, Send, Calendar,
    MessageSquare, Sparkles, Clock, ArrowRight, Activity
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { AgentStep, StepType, StepStatus } from '@/lib/agent-executor';

// Re-using types purely for clarity
interface AgentStepsProps {
    steps: AgentStep[];
    goal: string;
    isComplete: boolean;
}

const STEP_ICON: Record<StepType, React.ReactNode> = {
    think: <Brain className="w-3.5 h-3.5" />,
    clarify: <MessageSquare className="w-3.5 h-3.5" />,
    search_email: <Search className="w-3.5 h-3.5" />,
    read_email: <Mail className="w-3.5 h-3.5" />,
    create_draft: <Sparkles className="w-3.5 h-3.5" />,
    send_email: <Send className="w-3.5 h-3.5" />,
    book_meeting: <Calendar className="w-3.5 h-3.5" />,
    done: <CheckCircle2 className="w-3.5 h-3.5" />,
};

const STEP_COLORS: Record<StepType, string> = {
    think: 'text-purple-400',
    clarify: 'text-orange-400',
    search_email: 'text-blue-400',
    read_email: 'text-cyan-400',
    create_draft: 'text-emerald-400',
    send_email: 'text-indigo-400',
    book_meeting: 'text-rose-400',
    done: 'text-emerald-400',
};

const STEP_LABEL_RUNNING: Record<StepType, string> = {
    think: 'De-constructing intent...',
    clarify: 'Re-aligning with context...',
    search_email: 'Scanning secure inbox...',
    read_email: 'Analyzing thread semantics...',
    create_draft: 'Synthesizing response...',
    send_email: 'Dispatching secure packet...',
    book_meeting: 'Calibrating schedules...',
    done: 'Goal achieved.',
};

function Shimmer() {
    return (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
    );
}

function StatusDot({ status }: { status: StepStatus }) {
    return (
        <div className="relative flex items-center justify-center w-5 h-5">
            <AnimatePresence mode="wait">
                {status === 'done' && (
                    <motion.div
                        key="done"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-emerald-400"
                    >
                        <CheckCircle2 className="w-4 h-4 shadow-[0_0_10px_rgba(52,211,153,0.3)]" />
                    </motion.div>
                )}
                {status === 'failed' && (
                    <motion.div
                        key="failed"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-red-400"
                    >
                        <XCircle className="w-4 h-4" />
                    </motion.div>
                )}
                {status === 'running' && (
                    <motion.div
                        key="running"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="relative"
                    >
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <div className="absolute inset-0 bg-blue-400/20 blur-md rounded-full animate-pulse" />
                    </motion.div>
                )}
                {status === 'pending' && (
                    <motion.div
                        key="pending"
                        className="w-2 h-2 rounded-full border border-white/20 bg-white/5"
                    />
                )}
                {status === 'waiting' && (
                    <motion.div
                        key="waiting"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2.5 h-2.5 rounded-full bg-orange-400/50 border border-orange-400/30"
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function StepRow({ step, index }: { step: AgentStep; index: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const isRunning = step.status === 'running';
    const isDone = step.status === 'done';
    const hasDetail = !!(step.detail || step.error || step.result);

    useEffect(() => {
        if (isRunning) setIsOpen(true);
        if (isDone && step.type !== 'create_draft' && step.type !== 'book_meeting') {
            const t = setTimeout(() => setIsOpen(false), 2000);
            return () => clearTimeout(t);
        }
    }, [isRunning, isDone, step.type]);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className={`
                group relative rounded-xl border transition-all duration-500 overflow-hidden mb-1.5
                ${isRunning ? 'border-blue-500/30 bg-blue-500/[0.04] shadow-[0_0_20px_rgba(59,130,246,0.05)]' : 'border-white/[0.04] bg-white/[0.01]'}
                ${isDone ? 'opacity-60' : ''}
                ${step.status === 'pending' ? 'opacity-30 grayscale' : ''}
            `}
        >
            {isRunning && <Shimmer />}

            <div className="relative flex items-center gap-3 px-4 py-3">
                <StatusDot status={step.status} />

                <div className={`
                    flex items-center justify-center w-8 h-8 rounded-lg border transition-colors duration-500
                    ${isRunning ? 'border-blue-500/20 bg-blue-500/10' : 'border-white/[0.05] bg-white/[0.03]'}
                    ${STEP_COLORS[step.type]}
                `}>
                    {STEP_ICON[step.type]}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`
                            text-[13px] font-medium tracking-tight transition-colors duration-500
                            ${isRunning ? 'text-white' : 'text-white/60'}
                            ${isDone ? 'line-through decoration-white/20' : ''}
                        `}>
                            {isRunning ? STEP_LABEL_RUNNING[step.type] : step.label}
                        </span>

                        {step.completed_at && step.started_at && (
                            <span className="text-[10px] text-white/10 font-mono">
                                {Math.round(new Date(step.completed_at).getTime() - new Date(step.started_at).getTime())}ms
                            </span>
                        )}
                    </div>

                    {step.status === 'running' && (
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="h-[1px] bg-gradient-to-r from-blue-500/50 to-transparent mt-1"
                        />
                    )}
                </div>

                {hasDetail && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 px-2 rounded-md hover:bg-white/5 text-white/20 hover:text-white/40 transition-all"
                    >
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isOpen && hasDetail && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white/5 border-t border-white/[0.03]"
                    >
                        <div className="p-4 pl-12">
                            <div className="border-l-2 border-white/5 pl-4 space-y-2">
                                {step.detail && (
                                    <p className="text-[12px] text-white/40 leading-relaxed font-light italic">
                                        "{step.detail}"
                                    </p>
                                )}

                                {step.error && (
                                    <div className="flex items-start gap-2 p-2 rounded bg-red-500/5 text-red-400/80 text-[11px] border border-red-500/10">
                                        <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <span>{step.error}</span>
                                    </div>
                                )}

                                {step.result && step.type === 'search_email' && step.result.emails?.length > 0 && (
                                    <div className="grid gap-1">
                                        {step.result.emails.slice(0, 2).map((email: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 text-[11px] text-white/20 hover:text-white/40 transition-colors">
                                                <ArrowRight className="w-2.5 h-2.5" />
                                                <span className="truncate font-medium text-white/30">{email.from.split('<')[0]}</span>
                                                <span className="truncate">{email.subject}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {step.result && step.type === 'book_meeting' && step.result.bookingUrl && (
                                    <motion.a
                                        whileHover={{ x: 5 }}
                                        href={step.result.bookingUrl}
                                        target="_blank"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium"
                                    >
                                        <Calendar className="w-3 h-3" />
                                        Confirm Meeting Link
                                    </motion.a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function AgentSteps({ steps, goal, isComplete }: AgentStepsProps) {
    const [isHeaderOpen, setIsHeaderOpen] = useState(true);
    const activeStep = steps.find(s => s.status === 'running');
    const doneCount = steps.filter(s => s.status === 'done').length;
    const progress = (doneCount / steps.length) * 100;
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isComplete) {
            confetti({
                particleCount: 40,
                spread: 70,
                origin: { y: 0.8 },
                colors: ['#3b82f6', '#10b981', '#ffffff'],
                zIndex: 1000,
                disableForReducedMotion: true
            });
            const t = setTimeout(() => setIsHeaderOpen(false), 4000);
            return () => clearTimeout(t);
        }
    }, [isComplete]);

    if (steps.length === 0) return null;

    return (
        <motion.div
            layout
            ref={containerRef}
            className="group rounded-2xl border border-white/[0.08] bg-[#080808] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden"
        >
            <ShimmerStyles />
            {/* Real-time Progress Bar */}
            <div className="h-0.5 w-full bg-white/[0.03] overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full transition-all duration-1000 ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`}
                />
            </div>

            {/* Premium Header */}
            <div
                className="relative flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
                onClick={() => setIsHeaderOpen(!isHeaderOpen)}
            >
                <div className="relative">
                    <AnimatePresence mode="wait">
                        {isComplete ? (
                            <motion.div key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <CheckCircle2 className="w-4 h-4" />
                            </motion.div>
                        ) : (
                            <motion.div key="l" initial={{ scale: 0 }} animate={{ scale: 1 }} className="p-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                <Activity className="w-4 h-4 animate-pulse" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {!isComplete && (
                        <div className="absolute -inset-1 bg-blue-500/10 blur-xl animate-pulse rounded-full" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className={`text-[14px] font-semibold tracking-tight transition-colors duration-500 ${isComplete ? 'text-emerald-400/90' : 'text-white/90'}`}>
                        {isComplete ? 'Mission Accomplished' : activeStep ? `Executing: ${activeStep.label}` : goal}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
                            {isComplete ? 'Execution cycle finished' : 'Cognitive thread active'}
                        </span>
                        <div className="flex gap-0.5">
                            {steps.map((s, i) => (
                                <div key={i} className={`w-1 h-1 rounded-full ${s.status === 'done' ? 'bg-emerald-500/50' : s.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-white/5'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="text-[11px] font-medium text-white/40">{Math.round(progress)}%</div>
                        <div className="text-[9px] text-white/10 uppercase tracking-tighter">Verified Logic</div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/20 transition-transform duration-500 ${isHeaderOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* List */}
            <AnimatePresence>
                {isHeaderOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 space-y-1.5"
                    >
                        {steps.map((step, i) => (
                            <StepRow key={step.id} step={step} index={i} />
                        ))}

                        <div className="mt-4 pt-3 border-t border-white/[0.03] flex items-center justify-between text-[10px] text-white/10 italic px-2">
                            <span>Audit Log ID: {steps[0]?.id.split('_').pop()}</span>
                            <span>Standard Protocol v2.4</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
