"use client";

import { useState, useEffect } from 'react';
import {
    ChevronRight, ChevronDown, CheckCircle2, XCircle,
    Loader2, Brain, Search, Mail, Send, Calendar,
    MessageSquare, Sparkles, Clock
} from 'lucide-react';
import type { AgentStep, StepType, StepStatus } from '@/lib/agent-executor';

interface AgentStepsProps {
    steps: AgentStep[];
    goal: string;
    isComplete: boolean;
    onStepExpand?: (stepId: string, isOpen: boolean) => void;
}

const STEP_ICON: Record<StepType, React.ReactNode> = {
    think: <Brain className="w-3 h-3" />,
    clarify: <MessageSquare className="w-3 h-3" />,
    search_email: <Search className="w-3 h-3" />,
    read_email: <Mail className="w-3 h-3" />,
    create_draft: <Sparkles className="w-3 h-3" />,
    send_email: <Send className="w-3 h-3" />,
    book_meeting: <Calendar className="w-3 h-3" />,
    done: <CheckCircle2 className="w-3 h-3" />,
};

const STEP_LABEL_RUNNING: Record<StepType, string> = {
    think: 'Thinking...',
    clarify: 'Checking assumptions...',
    search_email: 'Searching your inbox...',
    read_email: 'Reading email...',
    create_draft: 'Writing draft...',
    send_email: 'Sending email...',
    book_meeting: 'Setting up meeting...',
    done: 'Wrapping up...',
};

function StatusDot({ status }: { status: StepStatus }) {
    if (status === 'done') {
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
    }
    if (status === 'failed') {
        return <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />;
    }
    if (status === 'running') {
        return <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />;
    }
    // pending
    return <span className="w-3.5 h-3.5 rounded-full border border-white/15 flex-shrink-0 inline-block" />;
}

function StepRow({ step, autoExpand }: { step: AgentStep; autoExpand: boolean }) {
    const [isOpen, setIsOpen] = useState(autoExpand);
    const hasDetail = !!(step.detail || step.error || step.result);
    const isRunning = step.status === 'running';
    const label = isRunning ? STEP_LABEL_RUNNING[step.type] : step.label;

    // Auto-collapse completed steps after 2.5s
    useEffect(() => {
        if (step.status === 'done' && isOpen && step.type !== 'think') {
            const t = setTimeout(() => setIsOpen(false), 2500);
            return () => clearTimeout(t);
        }
    }, [step.status, step.type]);

    // Auto-expand running step
    useEffect(() => {
        if (isRunning) setIsOpen(true);
    }, [isRunning]);

    return (
        <div className={`
      rounded-lg border transition-all duration-300 overflow-hidden
      ${step.status === 'running' ? 'border-blue-500/20 bg-blue-500/[0.03]' : ''}
      ${step.status === 'done' ? 'border-white/[0.04] bg-transparent' : ''}
      ${step.status === 'failed' ? 'border-red-500/20 bg-red-500/[0.03]' : ''}
      ${step.status === 'pending' ? 'border-white/[0.03] bg-transparent opacity-40' : ''}
    `}>
            <button
                onClick={() => hasDetail && setIsOpen(!isOpen)}
                className={`
          w-full flex items-center gap-2.5 px-3 py-2 text-left
          ${hasDetail ? 'cursor-pointer hover:bg-white/[0.02]' : 'cursor-default'}
          transition-colors
        `}
            >
                <StatusDot status={step.status} />

                <span className="flex items-center gap-1.5 text-white/25 flex-shrink-0">
                    {STEP_ICON[step.type]}
                </span>

                <span className={`
          flex-1 text-[13px] font-sans transition-colors
          ${step.status === 'running' ? 'text-white/70' : ''}
          ${step.status === 'done' ? 'text-white/35' : ''}
          ${step.status === 'failed' ? 'text-red-400/70' : ''}
          ${step.status === 'pending' ? 'text-white/25' : ''}
        `}>
                    {step.status === 'done' && step.type !== 'think' ? (
                        <span className="line-through decoration-white/15">{label}</span>
                    ) : label}
                </span>

                {step.status === 'done' && step.detail && (
                    <span className="text-[11px] text-white/20 truncate max-w-[160px] hidden sm:block">
                        {step.detail}
                    </span>
                )}

                {hasDetail && (
                    <span className="text-white/15 flex-shrink-0">
                        {isOpen
                            ? <ChevronDown className="w-3 h-3" />
                            : <ChevronRight className="w-3 h-3" />
                        }
                    </span>
                )}
            </button>

            {/* Expandable detail panel */}
            {isOpen && hasDetail && (
                <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1 duration-150">
                    <div className="ml-6 pl-3 border-l border-white/[0.05]">
                        {step.status === 'failed' && step.error && (
                            <p className="text-[12px] text-red-400/70 font-sans">{step.error}</p>
                        )}
                        {step.detail && step.status !== 'failed' && (
                            <p className="text-[12px] text-white/40 font-sans leading-relaxed">{step.detail}</p>
                        )}
                        {step.result && step.type === 'search_email' && step.result.emails?.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {step.result.emails.slice(0, 3).map((email: any, i: number) => (
                                    <div key={i} className="text-[11px] text-white/30 font-sans truncate">
                                        {email.subject || '(no subject)'} — {email.from}
                                    </div>
                                ))}
                                {step.result.emails.length > 3 && (
                                    <div className="text-[11px] text-white/20">+{step.result.emails.length - 3} more</div>
                                )}
                            </div>
                        )}
                        {step.result && step.type === 'book_meeting' && step.result.bookingUrl && (
                            <a
                                href={step.result.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-[12px] text-blue-400/70 hover:text-blue-400 transition-colors"
                            >
                                <Calendar className="w-3 h-3" />
                                {step.result.type === 'instant_booking' ? 'View booking confirmation' : 'Open scheduling link'}
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function AgentSteps({ steps, goal, isComplete }: AgentStepsProps) {
    const [isHeaderOpen, setIsHeaderOpen] = useState(true);
    const activeIndex = steps.findIndex(s => s.status === 'running');
    const failedSteps = steps.filter(s => s.status === 'failed');
    const doneSteps = steps.filter(s => s.status === 'done');

    // Auto-collapse header when all steps complete
    useEffect(() => {
        if (isComplete) {
            const t = setTimeout(() => setIsHeaderOpen(false), 3000);
            return () => clearTimeout(t);
        }
    }, [isComplete]);

    if (steps.length === 0) return null;

    return (
        <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden font-sans">
            {/* Header */}
            <button
                onClick={() => setIsHeaderOpen(!isHeaderOpen)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : failedSteps.length > 0 && activeIndex === -1 ? (
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                    )}
                    <span className={`text-[13px] font-medium truncate ${isComplete ? 'text-white/50' : 'text-white/70'}`}>
                        {isComplete ? 'Done' : activeIndex >= 0 ? STEP_LABEL_RUNNING[steps[activeIndex].type] : goal}
                    </span>
                </div>

                {/* Progress dots */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {steps.filter(s => s.type !== 'think' && s.type !== 'done').map((s, i) => (
                        <span
                            key={i}
                            className={`
                w-1 h-1 rounded-full transition-all duration-300
                ${s.status === 'done' ? 'bg-emerald-400/60' : ''}
                ${s.status === 'running' ? 'bg-blue-400 animate-pulse' : ''}
                ${s.status === 'failed' ? 'bg-red-400/60' : ''}
                ${s.status === 'pending' ? 'bg-white/10' : ''}
              `}
                        />
                    ))}
                </div>

                <span className="text-[11px] text-white/20 flex-shrink-0">
                    {doneSteps.filter(s => s.type !== 'think').length}/{steps.filter(s => s.type !== 'think').length}
                </span>

                {isHeaderOpen
                    ? <ChevronDown className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                }
            </button>

            {/* Steps list */}
            {isHeaderOpen && (
                <div className="px-3 pb-3 space-y-1 animate-in slide-in-from-top-1 duration-200">
                    {steps.map((step, i) => (
                        <StepRow
                            key={step.id}
                            step={step}
                            autoExpand={i === activeIndex || step.type === 'think'}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
