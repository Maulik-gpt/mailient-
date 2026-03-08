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

/**
 * InlineThinkingSteps — Muse-style expandable thinking process
 * Renders as permanent inline content within a message bubble.
 * Each step is a bullet with expandable detail, like:
 *   • Musings ˅
 *   • Searched web for AI customer support ˅
 *   ⊹ Compiling insights...
 */
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

    const activeStep = steps.find(s => s.status === 'active');
    const completedSteps = steps.filter(s => s.status === 'completed');

    return (
        <div className="space-y-0">
            {/* Completed steps — expandable inline bullets */}
            {completedSteps.map((step) => (
                <div key={step.id} className="group">
                    <button
                        onClick={() => step.expandedContent && toggleStep(step.id)}
                        className="flex items-center gap-2 py-1.5 w-full text-left hover:bg-white/[0.02] rounded-lg transition-colors -mx-1 px-1"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
                        <span className="text-white/70 text-sm flex-1">{step.label}</span>
                        {step.expandedContent && (
                            <span className="text-white/30">
                                {expandedSteps.has(step.id) ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </span>
                        )}
                    </button>

                    {/* Expanded detail content */}
                    {step.expandedContent && expandedSteps.has(step.id) && (
                        <div className="ml-4 pl-3 border-l border-white/10 py-2 mb-1">
                            <p className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap">{step.expandedContent}</p>
                        </div>
                    )}
                </div>
            ))}

            {/* Active step — animated dots */}
            {activeStep && (
                <div className="flex items-center gap-2 py-1.5 -mx-1 px-1">
                    <span className="flex items-center gap-[2px]">
                        {[0, 1, 2, 3].map((i) => (
                            <span
                                key={i}
                                className="inline-block w-[3px] h-[3px] rounded-full bg-white/40"
                                style={{
                                    animation: `arcusDotPulse 1.4s ease-in-out ${i * 0.15}s infinite`,
                                }}
                            />
                        ))}
                    </span>
                    <span className="text-white/60 text-sm">{activeStep.label}</span>
                </div>
            )}

            {/* Generation bar — "Generating storyline..." with Stop */}
            {isGenerating && generatingLabel && (
                <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 mt-3">
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
                        <span className="text-white/70 text-sm">{generatingLabel}</span>
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

            {/* CSS Animations */}
            <style jsx>{`
        @keyframes arcusDotPulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
        </div>
    );
}

/**
 * ArtifactCard — Inline card in chat showing what Arcus created
 * Like: ✨ Email Draft · v1    View ›
 */
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
