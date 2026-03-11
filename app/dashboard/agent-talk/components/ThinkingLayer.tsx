'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
    progressiveReveal?: boolean;
    onStop?: () => void;
}

export function ThinkingLayer({
    steps,
    isVisible,
    currentThought,
    isGenerating,
    generatingLabel,
    progressiveReveal = false,
    onStop
}: ThinkingLayerProps) {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

    const visibleSteps = useMemo(() => {
        if (!progressiveReveal) return steps;
        const activeIndex = steps.findIndex((s) => s.status === 'active' || s.status === 'blocked_approval');
        if (activeIndex >= 0) {
            return steps.slice(0, activeIndex + 1);
        }
        const lastCompleted = [...steps].reverse().findIndex((s) => s.status === 'completed' || s.status === 'error');
        if (lastCompleted >= 0) {
            const idx = steps.length - 1 - lastCompleted;
            return steps.slice(0, idx + 1);
        }
        return steps.slice(0, 1);
    }, [steps, progressiveReveal]);

    if (!isVisible || visibleSteps.length === 0) return null;

    const toggleStep = (id: string) => {
        setExpandedSteps((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="space-y-0">
            {visibleSteps.map((step) => {
                const isActive = step.status === 'active';
                const isCompleted = step.status === 'completed';
                const isPending = step.status === 'pending';
                const isError = step.status === 'error';
                const isBlocked = step.status === 'blocked_approval';
                const detailText = step.expandedContent || step.detail || (isPending ? 'Pending execution.' : 'No additional details yet.');

                return (
                    <div key={step.id} className="group relative">
                        <div className="absolute left-[6px] top-8 bottom-0 w-px bg-gradient-to-b from-graphite-border-strong via-graphite-border to-transparent pointer-events-none" />
                        <button
                            onClick={() => toggleStep(step.id)}
                            className="flex items-center gap-3 py-2 w-full text-left rounded-lg transition-colors -mx-1 px-3 bg-graphite-surface/70 hover:bg-graphite-surface-2/80 border border-graphite-border/70 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                        >
                            <span
                                className={[
                                    'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors shadow-[0_0_10px_rgba(255,255,255,0.2)]',
                                    isCompleted ? 'bg-graphite-accent' : '',
                                    isPending ? 'bg-graphite-muted-2' : '',
                                    isActive ? 'bg-graphite-highlight' : '',
                                    isError ? 'bg-graphite-danger' : '',
                                    isBlocked ? 'bg-graphite-warning' : '',
                                ].join(' ')}
                            />

                            <span
                                className={[
                                    'text-sm flex-1 transition-colors tracking-tight',
                                    isActive ? 'text-graphite-text' : 'text-graphite-muted',
                                    isCompleted ? 'text-graphite-muted-2' : '',
                                    isPending ? 'text-graphite-muted-2' : '',
                                    isError ? 'text-graphite-danger' : '',
                                    isBlocked ? 'text-graphite-warning' : '',
                                ].join(' ')}
                            >
                                {step.label}
                            </span>

                            <span className="text-graphite-muted">
                                {expandedSteps.has(step.id) ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                )}
                            </span>
                        </button>

                        {expandedSteps.has(step.id) && (
                            <div className="ml-4 pl-3 border-l border-graphite-border py-2 mb-1">
                                <p className="text-graphite-muted text-[11px] leading-relaxed whitespace-pre-wrap">{detailText}</p>
                            </div>
                        )}
                    </div>
                );
            })}

            {currentThought && (
                <p className="text-graphite-muted text-[11px] leading-relaxed pt-2">{currentThought}</p>
            )}

            {isGenerating && generatingLabel && (
                <div className="flex items-center justify-between px-2 py-2 mt-3 bg-graphite-surface border border-graphite-border rounded-xl">
                    <div className="flex items-center gap-2.5">
                        <span className="text-graphite-text text-sm">{generatingLabel}</span>
                    </div>
                    {onStop && (
                        <button
                            onClick={onStop}
                            className="text-graphite-muted-2 hover:text-graphite-text text-xs font-medium px-3 py-1 rounded-lg transition-all"
                        >
                            Stop
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

interface ArtifactCardProps {
    type: string;
    title: string;
    version?: string;
    onView: () => void;
}

const artifactIcons: Record<string, string> = {
    email_draft: 'Mail',
    summary: 'Summary',
    research: 'Research',
    action_plan: 'Plan',
    reply: 'Reply',
    notes: 'Notes',
    meeting_schedule: 'Meeting',
    analytics_report: 'Analytics',
    generic_workflow: 'Workflow'
};

const artifactLabels: Record<string, string> = {
    email_draft: 'Email Draft',
    summary: 'Summary',
    research: 'Research',
    action_plan: 'Action Plan',
    reply: 'Reply Draft',
    notes: 'Notes',
    meeting_schedule: 'Meeting Schedule',
    analytics_report: 'Analytics Report',
    generic_workflow: 'Workflow'
};

export function ArtifactCard({ type, title, version = 'v1', onView }: ArtifactCardProps) {
    return (
        <button
            onClick={onView}
            className="group flex items-center gap-3 bg-graphite-surface/70 hover:bg-graphite-surface-2/80 border border-graphite-border/70 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-graphite-border-strong rounded-xl px-4 py-3 mt-3 mb-1 w-full max-w-sm transition-all duration-200"
        >
            <span className="text-[11px] uppercase tracking-[0.16em] text-graphite-muted-2 flex-shrink-0">{artifactIcons[type] || 'Canvas'}</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-graphite-text text-sm font-medium truncate">{title || artifactLabels[type]}</span>
                <span className="text-graphite-muted-2 text-xs"></span>
                <span className="text-graphite-muted text-[11px]">{version}</span>
            </div>
            <div className="flex items-center gap-1 text-graphite-muted group-hover:text-graphite-text transition-colors">
                <span className="text-xs font-medium">View</span>
                <ChevronRight className="w-3 h-3" />
            </div>
        </button>
    );
}


