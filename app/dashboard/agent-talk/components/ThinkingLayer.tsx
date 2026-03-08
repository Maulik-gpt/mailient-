'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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

export function ThinkingLayer({ steps, isVisible, currentThought, isGenerating, generatingLabel, onStop }: ThinkingLayerProps) {
    const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

    if (!isVisible || steps.length === 0) return null;

    const toggleStep = (id: string) => {
        setExpandedSteps(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="space-y-0 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] px-3 py-2 backdrop-blur-sm">
            {steps.map((step) => {
                const isActive = step.status === 'active';
                const isCompleted = step.status === 'completed';
                const isPending = step.status === 'pending';
                const isError = step.status === 'error';
                const canExpand = !!step.expandedContent && !isPending;

                return (
                    <div key={step.id} className="group relative">
                        <div className="absolute left-[4px] top-8 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/8 to-transparent pointer-events-none" />
                        <button
                            onClick={() => canExpand && toggleStep(step.id)}
                            className="flex items-center gap-2 py-2 w-full text-left hover:bg-white/[0.03] rounded-xl transition-colors -mx-1 px-2 disabled:cursor-default"
                            disabled={!canExpand}
                        >
                            {isActive ? (
                                <span className="flex items-center gap-[2px] flex-shrink-0">
                                    {[0, 1, 2, 3].map((i) => (
                                        <span
                                            key={i}
                                            className="inline-block w-[3px] h-[3px] rounded-full bg-white/50"
                                            style={{
                                                animation: `arcusDotPulse 1.4s ease-in-out ${i * 0.15}s infinite`,
                                            }}
                                        />
                                    ))}
                                </span>
                            ) : (
                                <span
                                    className={[
                                        'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors',
                                        isCompleted ? 'bg-emerald-200/70' : '',
                                        isPending ? 'bg-white/25' : '',
                                        isError ? 'bg-red-400/70' : '',
                                    ].join(' ')}
                                />
                            )}

                            <span
                                className={[
                                    'text-sm flex-1 transition-colors',
                                    isActive ? 'text-white/90' : '',
                                    isCompleted ? 'text-emerald-100/85' : '',
                                    isPending ? 'text-white/38' : '',
                                    isError ? 'text-red-200/80' : '',
                                ].join(' ')}
                            >
                                {step.label}
                            </span>

                            {canExpand && (
                                <span className="text-white/30">
                                    {expandedSteps.has(step.id) ? (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </span>
                            )}
                        </button>

                        {canExpand && expandedSteps.has(step.id) && (
                            <div className="ml-4 pl-3 border-l border-white/10 py-2 mb-1">
                                <p className="text-white/55 text-xs leading-relaxed whitespace-pre-wrap">{step.expandedContent}</p>
                            </div>
                        )}
                    </div>
                );
            })}

            {currentThought && (
                <p className="text-white/45 text-xs leading-relaxed pt-2">{currentThought}</p>
            )}

            {isGenerating && generatingLabel && (
                <div className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 mt-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-[2px]">
                            {[0, 1, 2, 3].map((i) => (
                                <span
                                    key={i}
                                    className="inline-block w-[3px] h-[3px] rounded-full bg-white/50"
                                    style={{
                                        animation: `arcusDotPulse 1.2s ease-in-out ${i * 0.12}s infinite`,
                                    }}
                                />
                            ))}
                        </span>
                        <span className="text-white/75 text-sm">{generatingLabel}</span>
                    </div>
                    {onStop && (
                        <button
                            onClick={onStop}
                            className="text-white/40 hover:text-white/70 text-xs font-medium px-3 py-1 hover:bg-white/5 rounded-lg transition-all"
                        >
                            Stop
                        </button>
                    )}
                </div>
            )}

            <style jsx>{`
                @keyframes arcusDotPulse {
                    0%, 100% { opacity: 0.2; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.3); }
                }
            `}</style>
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
    email_draft: '✉️',
    summary: '📄',
    research: '🔬',
    action_plan: '📋',
    reply: '↩️',
    notes: '📝',
};

const artifactLabels: Record<string, string> = {
    email_draft: 'Email Draft',
    summary: 'Summary',
    research: 'Research',
    action_plan: 'Action Plan',
    reply: 'Reply Draft',
    notes: 'Notes',
};

export function ArtifactCard({ type, title, version = 'v1', onView }: ArtifactCardProps) {
    return (
        <button
            onClick={onView}
            className="group flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/[0.14] rounded-xl px-4 py-3 mt-3 mb-1 w-full max-w-sm transition-all duration-200"
        >
            <span className="text-base flex-shrink-0">{artifactIcons[type] || '✨'}</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-white/80 text-sm font-medium truncate">{title || artifactLabels[type]}</span>
                <span className="text-white/20 text-xs">·</span>
                <span className="text-white/30 text-xs">{version}</span>
            </div>
            <div className="flex items-center gap-1 text-white/30 group-hover:text-white/60 transition-colors">
                <span className="text-xs font-medium">View</span>
                <ChevronRight className="w-3 h-3" />
            </div>
        </button>
    );
}
