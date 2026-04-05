'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, AlertCircle, Terminal, Cpu } from 'lucide-react';

export type PlanStep = {
    step: number;
    action: string;
    description: string;
    type: string;
    status: 'pending' | 'active' | 'completed' | 'error';
};

interface TaskPlanProps {
    plan: PlanStep[];
    isVisible: boolean;
    title?: string;
}

export function TaskPlan({ plan, isVisible, title }: TaskPlanProps) {
    if (!isVisible || plan.length === 0) return null;

    const completedCount = plan.filter(s => s.status === 'completed').length;
    const progress = Math.round((completedCount / plan.length) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="bg-white dark:bg-[#0a0a0a]/40 blur-backdrop-md border border-white/[0.05] rounded-xl overflow-hidden my-4 max-w-lg group"
        >
            {/* Header / Meta Info */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/[0.03]">
                <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                        <Cpu className="w-2.5 h-2.5 text-black/30 dark:text-white/30" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[8.5px] font-bold uppercase tracking-tight text-black/20 dark:text-white/20 leading-tight">Plan</span>
                        {title && <span className="text-black/60 dark:text-white/60 text-[10px] font-medium tracking-tight truncate max-w-[150px]">{title}</span>}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-black/20 dark:text-white/20 tabular-nums tracking-tighter">
                            {completedCount}/{plan.length}
                        </span>
                        <div className="w-20 h-[2px] rounded-full bg-white/[0.03] overflow-hidden">
                            <motion.div
                                className="h-full bg-black/[0.020] dark:bg-white/40 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
                            />
                        </div>
                    </div>
                    <span className="text-[8px] text-black/10 dark:text-white/10 tracking-widest uppercase">{progress}% complete</span>
                </div>
            </div>

            {/* Steps Log */}
            <div className="p-2 space-y-0.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {plan.map((step, i) => (
                        <motion.div
                            key={step.step}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                            className={`flex items-start gap-3.5 py-2.5 px-3 rounded-xl transition-all duration-300 ${step.status === 'active'
                                    ? 'bg-white/[0.04] border border-white/[0.03]'
                                    : 'border border-transparent'
                                }`}
                        >
                            {/* Technical Index */}
                            <span className="text-[9px] text-black/10 dark:text-white/10 mt-1 w-4 shrink-0">
                                {step.step}
                            </span>

                            {/* Status Icon */}
                            <div className="mt-0.5 shrink-0">
                                {step.status === 'completed' ? (
                                    <motion.div
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: 'spring', damping: 20 }}
                                    >
                                        <div className="w-4 h-4 rounded-full bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5 flex items-center justify-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-black/[0.030] dark:bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
                                        </div>
                                    </motion.div>
                                ) : step.status === 'active' ? (
                                    <div className="relative flex items-center justify-center">
                                        <div className="absolute inset-0 w-4 h-4 rounded-full border border-neutral-300 dark:border-white/20 animate-ping opacity-20" />
                                        <Loader2 className="w-4 h-4 text-black/60 dark:text-white/60 animate-spin" strokeWidth={1.5} />
                                    </div>
                                ) : step.status === 'error' ? (
                                    <AlertCircle className="w-4 h-4 text-red-500/50" strokeWidth={1.5} />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border border-white/[0.05]" />
                                )}
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <span className={`text-[12px] leading-snug tracking-tight font-medium transition-colors duration-500 ${step.status === 'completed' ? 'text-black/20 dark:text-white/20 line-through decoration-white/10' :
                                        step.status === 'active' ? 'text-black/90 dark:text-white/90' :
                                            step.status === 'error' ? 'text-red-400/60' :
                                                'text-black/30 dark:text-white/30'
                                    }`}>
                                    {step.description}
                                </span>
                                {step.status === 'active' && (
                                    <span className="text-[9px] text-black/20 dark:text-white/20 tracking-wide animate-pulse">
                                        Processing...
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Footer / Terminal Look */}
            <div className="px-4 py-1.5 bg-white/[0.01] border-t border-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal className="w-2.5 h-2.5 text-black/10 dark:text-white/10" />
                    <span className="text-[8px] text-black/10 dark:text-white/10 tracking-wide uppercase">Log</span>
                </div>
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-black/[0.03] dark:bg-black/[0.03] dark:bg-white/5" />
                    ))}
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 10px;
                }
            `}</style>
        </motion.div>
    );
}
