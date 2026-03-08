'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Copy, Check, Edit3, FileText, Mail, ListChecks, Sparkles, ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';

export type CanvasType = 'email_draft' | 'summary' | 'research' | 'action_plan' | 'reply' | 'notes' | 'none';

export interface CanvasSection {
    id: string;
    title: string;
    tag?: string;
    content: string;
    expanded?: boolean;
}

export interface CanvasData {
    type: CanvasType;
    title?: string;
    content: any;
    sections?: CanvasSection[];
    raw?: string;
    error?: string;
}

interface CanvasPanelProps {
    isOpen: boolean;
    onClose: () => void;
    canvasData: CanvasData | null;
    onExecute: (action: string, data: any) => void;
    isExecuting?: boolean;
}

const typeLabels: Record<CanvasType, string> = {
    email_draft: 'Email Draft',
    summary: 'Summary',
    research: 'Research',
    action_plan: 'Action Plan',
    reply: 'Reply Draft',
    notes: 'Notes',
    none: 'Canvas',
};

export function CanvasPanel({ isOpen, onClose, canvasData, onExecute, isExecuting }: CanvasPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [editedBody, setEditedBody] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (canvasData?.type === 'email_draft' && canvasData?.content?.body) {
            setEditedBody(canvasData.content.body);
        }
        // Expand all sections by default
        if (canvasData?.sections) {
            setExpandedSections(new Set(canvasData.sections.map(s => s.id)));
        }
    }, [canvasData]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const toggleSection = (id: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleCopy = () => {
        let text = '';
        if (canvasData?.type === 'email_draft' && canvasData?.content) {
            text = `Subject: ${canvasData.content.subject}\nTo: ${canvasData.content.to}\n\n${editMode ? editedBody : canvasData.content.body}`;
        } else if (canvasData?.sections) {
            text = canvasData.sections.map(s => `${s.title}${s.tag ? ` [${s.tag}]` : ''}\n${s.content}`).join('\n\n');
        } else if (canvasData?.raw) {
            text = canvasData.raw;
        }
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExecute = (action: string) => {
        if (action === 'copy') { handleCopy(); return; }
        const data = canvasData?.type === 'email_draft'
            ? { ...canvasData?.content, body: editMode ? editedBody : canvasData?.content?.body }
            : canvasData?.content;
        onExecute(action, data);
    };

    if (!isOpen || !canvasData) return null;

    const title = canvasData.title || typeLabels[canvasData.type] || 'Canvas';

    // Build sections from different canvas types
    let sections: CanvasSection[] = canvasData.sections || [];

    if (sections.length === 0 && canvasData.content) {
        if (canvasData.type === 'summary' && canvasData.content) {
            const c = canvasData.content;
            if (c.keyPoints?.length) {
                sections.push({ id: 'keypoints', title: 'Key Points', tag: 'Overview', content: c.keyPoints.join('\n'), expanded: true });
            }
            if (c.actionItems?.length) {
                sections.push({ id: 'actions', title: 'Action Items', tag: 'To-do', content: c.actionItems.join('\n'), expanded: true });
            }
            if (c.urgency) {
                sections.push({ id: 'urgency', title: 'Priority Level', tag: c.urgency, content: `Urgency: ${c.urgency}`, expanded: false });
            }
        } else if (canvasData.type === 'research' && canvasData.content) {
            const c = canvasData.content;
            if (c.findings?.length) {
                c.findings.forEach((f: any, i: number) => {
                    sections.push({ id: `finding-${i}`, title: f.topic, tag: 'Finding', content: f.detail, expanded: true });
                });
            }
            if (c.recommendations?.length) {
                sections.push({ id: 'recs', title: 'Recommendations', tag: 'Next steps', content: c.recommendations.join('\n'), expanded: true });
            }
        } else if (canvasData.type === 'action_plan' && canvasData.content) {
            const c = canvasData.content;
            if (c.steps?.length) {
                c.steps.forEach((s: any, i: number) => {
                    sections.push({ id: `step-${i}`, title: s.task, tag: `Step ${s.order || i + 1}`, content: '', expanded: false });
                });
            }
            if (c.timeline) {
                sections.push({ id: 'timeline', title: 'Timeline', tag: 'Schedule', content: c.timeline, expanded: true });
            }
        }
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className="fixed right-0 top-0 h-screen w-[48vw] max-w-[680px] min-w-[380px] bg-[#0c0c0c] border-l border-white/[0.06] z-50 flex flex-col"
                style={{
                    animation: 'canvasSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <h2 className="text-white font-medium text-[15px]">{title}</h2>
                        <span className="text-white/20 text-xs">·</span>
                        <span className="text-white/30 text-xs">v1</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white/70"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">

                    {/* Error State */}
                    {canvasData.error && (
                        <div className="px-6 py-6">
                            <div className="text-red-400/70 text-sm bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                                <p className="font-medium mb-1">Generation failed</p>
                                <p className="text-red-400/50 text-xs">{canvasData.error}</p>
                            </div>
                        </div>
                    )}

                    {/* Email Draft View */}
                    {canvasData.type === 'email_draft' && canvasData.content && !canvasData.error && (
                        <div className="px-6 py-5">
                            {/* Email fields */}
                            <div className="space-y-2 mb-5">
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-white/30 w-16 text-xs uppercase tracking-wide font-medium">To</span>
                                    <span className="text-white/70 text-sm">{canvasData.content.to || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-white/30 w-16 text-xs uppercase tracking-wide font-medium">Subject</span>
                                    <span className="text-white/90 text-sm font-medium">{canvasData.content.subject || 'No subject'}</span>
                                </div>
                            </div>

                            <div className="h-px bg-white/[0.04] mb-5" />

                            {/* Body */}
                            {editMode ? (
                                <textarea
                                    value={editedBody}
                                    onChange={(e) => setEditedBody(e.target.value)}
                                    className="w-full min-h-[300px] bg-transparent border border-white/[0.08] rounded-xl p-4 text-white/85 text-sm leading-[1.8] resize-y focus:outline-none focus:border-white/15 font-sans"
                                    autoFocus
                                />
                            ) : (
                                <div className="text-white/85 text-sm leading-[1.8] whitespace-pre-wrap font-sans">
                                    {canvasData.content.body}
                                </div>
                            )}

                            {canvasData.content.tone && (
                                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.04]">
                                    <span className="text-[10px] uppercase tracking-wider text-white/25 font-medium">Tone</span>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/40">
                                        {canvasData.content.tone}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Structured Sections View (Summary / Research / Action Plan) */}
                    {canvasData.type !== 'email_draft' && sections.length > 0 && !canvasData.error && (
                        <div className="py-2">
                            {/* Top content if exists */}
                            {canvasData.type === 'summary' && canvasData.content?.title && (
                                <div className="px-6 py-4 text-white/50 text-sm leading-relaxed border-b border-white/[0.04]">
                                    {canvasData.content.title}
                                </div>
                            )}

                            {/* Expandable sections — Storyline style */}
                            {sections.map((section, i) => (
                                <div key={section.id} className="border-b border-white/[0.04] last:border-0">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="flex items-center w-full px-6 py-4 hover:bg-white/[0.02] transition-colors text-left gap-3"
                                    >
                                        <ChevronRight
                                            className={`w-3.5 h-3.5 text-white/25 flex-shrink-0 transition-transform duration-200 ${expandedSections.has(section.id) ? 'rotate-90' : ''
                                                }`}
                                        />
                                        <span className="text-white/80 text-sm font-medium flex-1">{section.title}</span>
                                        {section.tag && (
                                            <span className="text-white/25 text-xs font-medium">{section.tag}</span>
                                        )}
                                    </button>

                                    {/* Section content */}
                                    {expandedSections.has(section.id) && section.content && (
                                        <div className="px-6 pb-4 pl-12">
                                            <div className="text-white/55 text-sm leading-relaxed whitespace-pre-wrap">
                                                {section.content}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Raw text fallback */}
                    {canvasData.type !== 'email_draft' && sections.length === 0 && canvasData.raw && !canvasData.error && (
                        <div className="px-6 py-5">
                            <div className="text-white/80 text-sm leading-[1.8] whitespace-pre-wrap font-sans">
                                {canvasData.raw}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                {!canvasData.error && (
                    <div className="border-t border-white/[0.06] px-6 py-4">
                        <div className="flex items-center justify-between">
                            {/* Left side */}
                            <div className="flex items-center gap-2">
                                {canvasData.type === 'email_draft' && (
                                    <button
                                        onClick={() => setEditMode(!editMode)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${editMode ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                                            }`}
                                    >
                                        <Edit3 className="w-3 h-3" />
                                        {editMode ? 'Editing' : 'Edit'}
                                    </button>
                                )}
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
                                >
                                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>

                            {/* Right side — Primary action */}
                            <div className="flex items-center gap-2">
                                {canvasData.type === 'email_draft' && (
                                    <>
                                        <button
                                            onClick={() => handleExecute('save_draft')}
                                            disabled={isExecuting}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white/80 bg-white/5 hover:bg-white/8 border border-white/[0.06] hover:border-white/10 transition-all disabled:opacity-40"
                                        >
                                            <FileText className="w-3 h-3" />
                                            Save Draft
                                        </button>
                                        <button
                                            onClick={() => handleExecute('send_email')}
                                            disabled={isExecuting}
                                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-white/90 transition-all disabled:opacity-40"
                                        >
                                            {isExecuting ? (
                                                <span className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <Send className="w-3 h-3" />
                                            )}
                                            {isExecuting ? 'Sending...' : 'Send Email'}
                                        </button>
                                    </>
                                )}
                                {canvasData.type === 'action_plan' && (
                                    <button
                                        onClick={() => handleExecute('execute_plan')}
                                        disabled={isExecuting}
                                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-white/90 transition-all disabled:opacity-40"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Execute Plan
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
        @keyframes canvasSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
        </>
    );
}
