'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Check, Circle, Loader2, X, Brain, Sparkles, ListTodo, Zap } from 'lucide-react';
import type { AgentProcess, ThinkingPhase, MissionStep, ThoughtEntry } from '../types/mission';

interface AgentThinkingBlockProps {
    process: AgentProcess;
    onToggleExpand?: (id: string) => void;
}

const phaseConfig: Record<ThinkingPhase, {
    label: string;
    icon: React.ReactNode;
    color: string;
    pulseColor: string;
}> = {
    thinking: {
        label: 'Thinking...',
        icon: <Brain className="w-3.5 h-3.5" />,
        color: 'text-blue-400',
        pulseColor: 'bg-blue-400',
    },
    planning: {
        label: 'Setting up...',
        icon: <Sparkles className="w-3.5 h-3.5" />,
        color: 'text-purple-400',
        pulseColor: 'bg-purple-400',
    },
    executing: {
        label: 'Running...',
        icon: <Zap className="w-3.5 h-3.5" />,
        color: 'text-amber-400',
        pulseColor: 'bg-amber-400',
    },
    done: {
        label: 'Done',
        icon: <Check className="w-3.5 h-3.5" />,
        color: 'text-emerald-400',
        pulseColor: 'bg-emerald-400',
    },
};

function PulsingDots({ color }: { color: string }) {
    return (
        <span className="inline-flex items-center gap-1 ml-1">
            <span
                className={`w-1 h-1 rounded-full ${color} animate-[arcus-pulse_1.4s_ease-in-out_infinite]`}
            />
            <span
                className={`w-1 h-1 rounded-full ${color} animate-[arcus-pulse_1.4s_ease-in-out_0.2s_infinite]`}
            />
            <span
                className={`w-1 h-1 rounded-full ${color} animate-[arcus-pulse_1.4s_ease-in-out_0.4s_infinite]`}
            />
        </span>
    );
}

function StepItem({ step, index }: { step: MissionStep; index: number }) {
    const statusIcon = () => {
        switch (step.status) {
            case 'done':
                return (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                );
            case 'running':
                return (
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                    </div>
                );
            case 'failed':
                return (
                    <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                        <X className="w-3 h-3 text-red-400" />
                    </div>
                );
            case 'skipped':
                return (
                    <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="w-2 h-0.5 bg-white/30 rounded" />
                    </div>
                );
            default: // pending
                return (
                    <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <Circle className="w-2.5 h-2.5 text-white/20" />
                    </div>
                );
        }
    };

    return (
        <div
            className={`flex items-center gap-3 py-1.5 transition-all duration-300 ${step.status === 'running' ? 'opacity-100' : step.status === 'done' ? 'opacity-70' : 'opacity-40'
                }`}
        >
            {statusIcon()}
            <span
                className={`text-[13px] font-normal leading-snug ${step.status === 'done'
                        ? 'text-white/50 line-through decoration-white/20'
                        : step.status === 'running'
                            ? 'text-white/90'
                            : 'text-white/40'
                    }`}
            >
                {step.label}
            </span>
        </div>
    );
}

export default function AgentThinkingBlock({ process, onToggleExpand }: AgentThinkingBlockProps) {
    const [isExpanded, setIsExpanded] = useState(process.isExpanded);
    const [autoCollapsed, setAutoCollapsed] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const config = phaseConfig[process.phase];
    const isDone = process.phase === 'done';
    const hasSteps = process.steps && process.steps.length > 0;
    const completedSteps = process.steps?.filter(s => s.status === 'done').length || 0;
    const totalSteps = process.steps?.length || 0;

    // Auto-collapse when done (with delay for UX)
    useEffect(() => {
        if (isDone && !autoCollapsed) {
            const timer = setTimeout(() => {
                setIsExpanded(false);
                setAutoCollapsed(true);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [isDone, autoCollapsed]);

    // Auto-scroll to bottom of thoughts
    useEffect(() => {
        if (isExpanded && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [process.thoughts?.length, isExpanded]);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        onToggleExpand?.(process.id);
    };

    return (
        <div className="ml-[60px] mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header Row — always visible */}
            <button
                onClick={toggleExpand}
                className="flex items-center gap-2 group cursor-pointer select-none w-full text-left"
            >
                {/* Pulsing indicator */}
                <div className="relative flex items-center justify-center w-5 h-5 flex-shrink-0">
                    {!isDone && (
                        <>
                            <span className={`absolute w-5 h-5 rounded-full ${config.pulseColor} opacity-20 animate-ping`} />
                            <span className={`relative w-2 h-2 rounded-full ${config.pulseColor}`} />
                        </>
                    )}
                    {isDone && (
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                            <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                    )}
                </div>

                {/* Label */}
                <span className={`text-[13px] font-medium ${config.color} flex items-center`}>
                    {config.icon}
                    <span className="ml-1.5">{process.label || config.label}</span>
                    {!isDone && <PulsingDots color={config.pulseColor} />}
                </span>

                {/* Step progress badge */}
                {hasSteps && totalSteps > 0 && (
                    <span className="text-[11px] text-white/30 ml-1">
                        {completedSteps}/{totalSteps}
                    </span>
                )}

                {/* Expand/Collapse chevron */}
                <span className="ml-auto text-white/20 group-hover:text-white/40 transition-colors">
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                </span>
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="mt-2 ml-7 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Thought stream */}
                    {process.thoughts && process.thoughts.length > 0 && (
                        <div className="mb-3 space-y-1 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2">
                            {process.thoughts.map((thought, i) => (
                                <div
                                    key={thought.id || i}
                                    className="text-xs text-white/35 leading-relaxed font-mono animate-in fade-in duration-300"
                                    style={{ animationDelay: `${i * 50}ms` }}
                                >
                                    <span className="text-white/15 mr-2">›</span>
                                    {thought.text}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step checklist */}
                    {hasSteps && (
                        <div className="space-y-0.5 border-l border-white/5 pl-3">
                            {process.steps.map((step, i) => (
                                <StepItem key={step.id || i} step={step} index={i} />
                            ))}
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            )}
        </div>
    );
}
