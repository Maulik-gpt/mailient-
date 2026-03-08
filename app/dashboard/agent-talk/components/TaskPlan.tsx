'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';

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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 my-4 max-w-lg"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Plan</span>
                    {title && <span className="text-white/60 text-xs">· {title}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                            className="h-full bg-white/40 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                    <span className="text-[10px] text-white/30 tabular-nums">{completedCount}/{plan.length}</span>
                </div>
            </div>

            {/* Steps */}
            <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                    {plan.map((step, i) => (
                        <motion.div
                            key={step.step}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08, duration: 0.2 }}
                            className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-colors ${step.status === 'active' ? 'bg-white/[0.04]' : ''
                                }`}
                        >
                            {/* Status Icon */}
                            <div className="flex-shrink-0">
                                {step.status === 'completed' ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 15 }}
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-green-400/70" />
                                    </motion.div>
                                ) : step.status === 'active' ? (
                                    <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                                ) : step.status === 'error' ? (
                                    <AlertCircle className="w-4 h-4 text-red-400/70" />
                                ) : (
                                    <Circle className="w-4 h-4 text-white/15" />
                                )}
                            </div>

                            {/* Step Label */}
                            <span className={`text-sm ${step.status === 'completed' ? 'text-white/40 line-through' :
                                    step.status === 'active' ? 'text-white/80 font-medium' :
                                        step.status === 'error' ? 'text-red-400/60' :
                                            'text-white/30'
                                }`}>
                                {step.description}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
