'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Copy, Check, Edit3, FileText, Mail, ListChecks, Sparkles, ChevronDown, ChevronRight, MoreHorizontal, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    actions?: { actionType: string; requiresApproval?: boolean }[];
    approvalTokens?: Record<string, string>;
    goal?: string;
    decisionSummary?: string;
    riskFlags?: string[];
    sources?: { threadId?: string | null; messageId?: string | null; sender?: string; timestamp?: string | null; subject?: string }[];
    recommendedAction?: string | null;
    alternatives?: string[];
    actionPayload?: unknown;
    approval?: {
        required: boolean;
        token?: string | null;
        expiresAt?: string | null;
        reason?: string | null;
    };
    raw?: string;
    error?: string;
}

interface CanvasPanelProps {
    isOpen: boolean;
    onClose: () => void;
    canvasData: CanvasData | null;
    onExecute: (action: string, data: unknown) => void;
    isExecuting?: boolean;
}

type EmailDraftContent = {
    to?: string;
    subject?: string;
    body?: string;
    tone?: string;
};

const typeLabels: Record<CanvasType, string> = {
    email_draft: 'EMAIL_DRAFT',
    summary: 'DOCUMENT_SUMMARY',
    research: 'RESEARCH_ASSET',
    action_plan: 'ACTION_PROTOCOL',
    reply: 'REPLY_DRAFT',
    notes: 'BRAIN_DUMP',
    none: 'CANVAS_CORE',
};

const actionPriority: Record<string, number> = {
    send_email: 1,
    save_draft: 2,
    execute_plan: 3,
    apply_changes: 4,
    revise: 5,
    cancel: 6
};

const actionLabel: Record<string, string> = {
    send_email: 'Send Email',
    save_draft: 'Save Draft',
    execute_plan: 'Execute Task',
    apply_changes: 'Apply Changes',
    revise: 'Revise',
    cancel: 'Cancel'
};

export function CanvasPanel({ isOpen, onClose, canvasData, onExecute, isExecuting }: CanvasPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [editedBody, setEditedBody] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const emailDraft = (canvasData?.content || {}) as EmailDraftContent;

    useEffect(() => {
        if (canvasData?.type === 'email_draft' && emailDraft?.body) {
            setEditedBody(emailDraft.body);
        }
        if (canvasData?.sections) {
            setExpandedSections(new Set(canvasData.sections.map((s) => s.id)));
        }
    }, [canvasData, emailDraft?.body]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const toggleSection = (id: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleCopy = () => {
        let text = '';
        if (canvasData?.type === 'email_draft') {
            text = `Subject: ${emailDraft.subject || ''}\nTo: ${emailDraft.to || ''}\n\n${editMode ? editedBody : emailDraft.body || ''}`;
        } else if (canvasData?.sections && canvasData.sections.length > 0) {
            text = canvasData.sections.map((s) => `${s.title}${s.tag ? ` [${s.tag}]` : ''}\n${s.content}`).join('\n\n');
        } else if (canvasData?.raw) {
            text = canvasData.raw;
        }
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExecute = (action: string) => {
        if (action === 'copy') {
            handleCopy();
            return;
        }
        if (action === 'cancel') {
            onClose();
            return;
        }
        if (action === 'revise') {
            setEditMode(true);
            return;
        }

        const payload = canvasData?.actionPayload
            || (canvasData?.type === 'email_draft'
                ? { ...emailDraft, body: editMode ? editedBody : emailDraft.body || '' }
                : canvasData?.content);

        onExecute(action, payload);
    };

    if (!isOpen || !canvasData) return null;

    const title = canvasData.title || typeLabels[canvasData.type] || 'CANVAS_CORE';

    // Build sections from different canvas types
    let sections: CanvasSection[] = canvasData.sections || [];

    if (sections.length === 0 && canvasData.content) {
        if (canvasData.type === 'summary' && canvasData.content) {
            const c = canvasData.content;
            if (c.keyPoints?.length) {
                sections.push({ id: 'keypoints', title: 'Key Points', tag: 'OVERVIEW', content: c.keyPoints.join('\n'), expanded: true });
            }
            if (c.actionItems?.length) {
                sections.push({ id: 'actions', title: 'Action Items', tag: 'TODO', content: c.actionItems.join('\n'), expanded: true });
            }
            if (c.urgency) {
                sections.push({ id: 'urgency', title: 'Priority Level', tag: c.urgency.toUpperCase(), content: `Urgency: ${c.urgency}`, expanded: false });
            }
        } else if (canvasData.type === 'research' && canvasData.content) {
            const c = canvasData.content;
            if (c.findings?.length) {
                c.findings.forEach((f: any, i: number) => {
                    sections.push({ id: `finding-${i}`, title: f.topic, tag: 'FINDING', content: f.detail, expanded: true });
                });
            }
            if (c.recommendations?.length) {
                sections.push({ id: 'recs', title: 'Recommendations', tag: 'NEXT_STEPS', content: c.recommendations.join('\n'), expanded: true });
            }
        } else if (canvasData.type === 'action_plan' && canvasData.content) {
            const c = canvasData.content;
            if (c.steps?.length) {
                c.steps.forEach((s: any, i: number) => {
                    sections.push({ id: `step-${i}`, title: s.task, tag: `STEP_${String(s.order || i + 1).padStart(2, '0')}`, content: '', expanded: false });
                });
            }
            if (c.timeline) {
                sections.push({ id: 'timeline', title: 'Timeline', tag: 'SCHEDULE', content: c.timeline, expanded: true });
            }
        }
    }

    const orderedActions = [...(canvasData.actions || [])].sort((a, b) => (actionPriority[a.actionType] || 99) - (actionPriority[b.actionType] || 99));
    if (!orderedActions.find((a) => a.actionType === 'revise')) orderedActions.push({ actionType: 'revise', requiresApproval: false });
    if (!orderedActions.find((a) => a.actionType === 'cancel')) orderedActions.push({ actionType: 'cancel', requiresApproval: false });

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity cursor-pointer"
                    />

                    {/* Panel */}
                    <motion.div
                        ref={panelRef}
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                        className={`fixed right-0 top-0 h-screen ${isFullscreen ? 'w-screen' : 'w-[55vw] max-w-[800px] min-w-[420px]'} bg-[#050505]/90 backdrop-blur-2xl border-l border-white/[0.08] z-50 flex flex-col shadow-2xl shadow-black/50`}
                    >
                        {/* Header Branding */}
                        <div className="flex items-center justify-between px-8 py-3 bg-white/[0.02] border-b border-white/[0.04]">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
                                    <span className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">ARCUS_CANVAS_V1.4</span>
                                </div>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                    <span className="text-white/20 whitespace-nowrap">STATUS:</span>
                                    <span className="text-white/60">READY</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="p-1.5 hover:bg-white/10 rounded-md transition-all text-white/30 hover:text-white/80"
                                >
                                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-white/10 rounded-md transition-all text-white/30 hover:text-white/80 group"
                                >
                                    <X className="w-4 h-4 transition-transform group-hover:rotate-90" />
                                </button>
                            </div>
                        </div>

                        {/* Title Bar */}
                        <div className="px-8 py-6">
                            <h2 className="text-white text-3xl font-light tracking-tight flex items-baseline gap-3">
                                {title}
                                <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">
                                    {canvasData.type}
                                </span>
                            </h2>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-8 custom-scrollbar">
                            <div className="max-w-2xl mx-auto w-full pb-20">

                                {/* Error State */}
                                {canvasData.error && (
                                    <div className="py-6">
                                        <div className="text-red-400/80 font-mono text-xs bg-red-400/5 border border-red-400/20 rounded-xl p-5 backdrop-blur-md">
                                            <div className="flex items-center gap-2 mb-3">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="font-bold tracking-widest">SYSTEM_ERROR_LOG</span>
                                            </div>
                                            <p className="leading-relaxed opacity-70">{canvasData.error}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Email Draft View */}
                                {canvasData.type === 'email_draft' && canvasData.content && !canvasData.error && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        {/* Email fields */}
                                        <div className="space-y-1 font-mono">
                                            <div className="flex items-center gap-4 py-2 border-b border-white/[0.03]">
                                                <span className="text-white/20 text-[10px] w-12 tracking-tighter">TO:</span>
                                                <span className="text-white/60 text-xs">{canvasData.content.to || 'NULL'}</span>
                                            </div>
                                            <div className="flex items-center gap-4 py-2 border-b border-white/[0.03]">
                                                <span className="text-white/20 text-[10px] w-12 tracking-tighter">SUB:</span>
                                                <span className="text-white/90 text-[13px] font-medium">{canvasData.content.subject || 'UNTITLED'}</span>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="relative group">
                                            {editMode ? (
                                                <textarea
                                                    value={editedBody}
                                                    onChange={(e) => setEditedBody(e.target.value)}
                                                    className="w-full min-h-[400px] bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 text-white/90 text-[15px] leading-[1.7] resize-none focus:outline-none focus:border-white/20 font-sans transition-all"
                                                    autoFocus
                                                />
                                            ) : (
                                                <div className="text-white/90 text-lg leading-[1.7] whitespace-pre-wrap font-serif tracking-tight selection:bg-white/20">
                                                    {canvasData.content.body}
                                                </div>
                                            )}
                                        </div>

                                        {canvasData.content.tone && (
                                            <div className="flex items-center gap-3 pt-6 border-t border-white/[0.04]">
                                                <span className="text-[9px] font-mono tracking-widest text-white/20">TONE_INDEX:</span>
                                                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 uppercase">
                                                    {canvasData.content.tone}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Structured Sections View (Summary / Research / Action Plan) */}
                                {canvasData.type !== 'email_draft' && sections.length > 0 && !canvasData.error && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        {canvasData.content?.title && (
                                            <div className="text-white/40 text-sm italic font-serif mb-8 border-l-2 border-white/10 pl-6 py-2">
                                                {canvasData.content.title}
                                            </div>
                                        )}

                                        {sections.map((section, i) => (
                                            <div
                                                key={section.id}
                                                className="group/section bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.04] rounded-2xl transition-all duration-300 overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => toggleSection(section.id)}
                                                    className="flex items-center w-full px-6 py-5 text-left gap-4"
                                                >
                                                    <div className="flex flex-col items-center gap-1 opacity-20 group-hover/section:opacity-50 transition-opacity">
                                                        <ChevronRight
                                                            className={`w-3.5 h-3.5 text-white transition-transform duration-300 ease-out ${expandedSections.has(section.id) ? 'rotate-90' : ''}`}
                                                        />
                                                    </div>
                                                    <div className="flex-1 flex items-baseline justify-between">
                                                        <span className="text-white/80 text-sm font-medium tracking-tight">{section.title}</span>
                                                        {section.tag && (
                                                            <span className="text-[9px] font-mono text-white/20 tracking-widest uppercase">{section.tag}</span>
                                                        )}
                                                    </div>
                                                </button>

                                                <AnimatePresence>
                                                    {expandedSections.has(section.id) && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                        >
                                                            <div className="px-14 pb-8">
                                                                <div className="text-white/60 text-[15px] leading-[1.7] whitespace-pre-wrap font-sans selection:bg-white/10">
                                                                    {section.content}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Raw text fallback */}
                                {canvasData.type !== 'email_draft' && sections.length === 0 && canvasData.raw && !canvasData.error && (
                                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                        <div className="text-white/80 text-[15px] leading-[1.8] whitespace-pre-wrap font-mono bg-white/[0.02] border border-white/[0.04] rounded-2xl p-8">
                                            {canvasData.raw}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Bar */}
                        {!canvasData.error && (
                            <div className="mt-auto border-t border-white/[0.08] bg-black/40 backdrop-blur-xl px-10 py-6">
                                <div className="max-w-3xl mx-auto flex items-center justify-between">
                                    {/* Left side Metadata/Edit */}
                                    <div className="flex items-center gap-4">
                                        {canvasData.type === 'email_draft' && (
                                            <button
                                                onClick={() => setEditMode(!editMode)}
                                                className={`flex items-center gap-2 h-10 px-4 rounded-xl font-mono text-[10px] tracking-widest transition-all ${editMode
                                                    ? 'bg-white text-black font-bold'
                                                    : 'bg-white/5 text-white/40 hover:text-white/80 hover:bg-white/10 border border-white/5'
                                                    }`}
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                {editMode ? 'FINISH_EDIT' : 'ENTER_EDIT'}
                                            </button>
                                        )}
                                        <button
                                            onClick={handleCopy}
                                            className="flex items-center gap-2 h-10 px-4 rounded-xl font-mono text-[10px] tracking-widest text-white/40 hover:text-white/80 transition-all group"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />}
                                            {copied ? 'COPIED' : 'COPY_BUFFER'}
                                        </button>
                                    </div>

                                    {/* Right side — Primary complex actions */}
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-px bg-white/5 mx-2" />
                                        {canvasData.type === 'email_draft' && (
                                            <>
                                                <button
                                                    onClick={() => handleExecute('save_draft')}
                                                    disabled={isExecuting}
                                                    className="flex items-center gap-2 h-12 px-6 rounded-2xl font-mono text-[11px] tracking-[0.15em] text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-20 uppercase"
                                                >
                                                    <FileText className="w-4 h-4 text-white/40" />
                                                    Cache_Draft
                                                </button>
                                                <button
                                                    onClick={() => handleExecute('send_email')}
                                                    disabled={isExecuting}
                                                    className="flex items-center gap-3 h-12 px-8 rounded-2xl font-mono text-[11px] tracking-[0.2em] bg-white text-black hover:bg-white/90 shadow-xl shadow-white/10 transition-all disabled:opacity-50 group uppercase"
                                                >
                                                    {isExecuting ? (
                                                        <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                                    )}
                                                    {isExecuting ? 'Transmitting...' : 'Dispatch'}
                                                </button>
                                            </>
                                        )}
                                        {canvasData.type === 'action_plan' && (
                                            <button
                                                onClick={() => handleExecute('execute_plan')}
                                                disabled={isExecuting}
                                                className="flex items-center gap-3 h-12 px-8 rounded-2xl font-mono text-[11px] tracking-[0.2em] bg-white text-black hover:bg-white/90 shadow-xl shadow-white/10 transition-all disabled:opacity-50 group uppercase"
                                            >
                                                <Sparkles className="w-4 h-4 transition-all group-hover:scale-125" />
                                                Initialize_Protocol
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </AnimatePresence>
    );
}

const AlertCircle = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
