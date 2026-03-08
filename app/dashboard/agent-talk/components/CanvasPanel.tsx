'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Copy, Check, Edit3, FileText, Sparkles, ChevronRight } from 'lucide-react';

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
    content: unknown;
    sections?: CanvasSection[];
    actions?: { actionType: string; requiresApproval?: boolean }[];
    approvalTokens?: Record<string, string>;
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
        const data = canvasData?.type === 'email_draft'
            ? { ...emailDraft, body: editMode ? editedBody : emailDraft.body || '' }
            : canvasData?.content;
        onExecute(action, data);
    };

    if (!isOpen || !canvasData) return null;

    const title = canvasData.title || typeLabels[canvasData.type] || 'Canvas';
    const sections: CanvasSection[] = canvasData.sections ? [...canvasData.sections] : [];
    const genericContent = (canvasData.content || {}) as {
        title?: string;
        keyPoints?: string[];
        actionItems?: string[];
        urgency?: string;
        findings?: { topic: string; detail: string }[];
        recommendations?: string[];
        steps?: { task: string; order?: number }[];
        timeline?: string;
    };

    if (sections.length === 0 && canvasData.content) {
        if (canvasData.type === 'summary') {
            if (genericContent.keyPoints?.length) {
                sections.push({ id: 'keypoints', title: 'Key Points', tag: 'Overview', content: genericContent.keyPoints.join('\n') });
            }
            if (genericContent.actionItems?.length) {
                sections.push({ id: 'actions', title: 'Action Items', tag: 'To-do', content: genericContent.actionItems.join('\n') });
            }
            if (genericContent.urgency) {
                sections.push({ id: 'urgency', title: 'Priority Level', tag: genericContent.urgency, content: `Urgency: ${genericContent.urgency}` });
            }
        } else if (canvasData.type === 'research') {
            if (genericContent.findings?.length) {
                genericContent.findings.forEach((f, i) => {
                    sections.push({ id: `finding-${i}`, title: f.topic, tag: 'Finding', content: f.detail });
                });
            }
            if (genericContent.recommendations?.length) {
                sections.push({ id: 'recs', title: 'Recommendations', tag: 'Next steps', content: genericContent.recommendations.join('\n') });
            }
        } else if (canvasData.type === 'action_plan') {
            if (genericContent.steps?.length) {
                genericContent.steps.forEach((s, i) => {
                    sections.push({ id: `step-${i}`, title: s.task, tag: `Step ${s.order || i + 1}`, content: '' });
                });
            }
            if (genericContent.timeline) {
                sections.push({ id: 'timeline', title: 'Timeline', tag: 'Schedule', content: genericContent.timeline });
            }
        }
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/45 backdrop-blur-[3px] z-40 transition-opacity" onClick={onClose} />

            <div
                ref={panelRef}
                className="fixed right-0 top-0 h-screen w-[50vw] max-w-[760px] min-w-[420px] bg-[linear-gradient(180deg,#0f0f12_0%,#09090b_100%)] border-l border-white/[0.08] z-50 flex flex-col shadow-[-24px_0_60px_rgba(0,0,0,0.45)]"
                style={{ animation: 'canvasSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <h2 className="text-white font-semibold text-[15px] tracking-wide">{title}</h2>
                        <span className="text-white/20 text-xs">.</span>
                        <span className="text-white/40 text-xs">Operator</span>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white/80">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {canvasData.error && (
                        <div className="px-6 py-6">
                            <div className="text-red-400/70 text-sm bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                                <p className="font-medium mb-1">Generation failed</p>
                                <p className="text-red-400/50 text-xs">{canvasData.error}</p>
                            </div>
                        </div>
                    )}

                    {canvasData.type === 'email_draft' && !canvasData.error && (
                        <div className="px-6 py-5">
                            <div className="space-y-2 mb-5">
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-white/35 w-16 text-xs uppercase tracking-wide font-medium">To</span>
                                    <span className="text-white/75 text-sm">{emailDraft.to || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-white/35 w-16 text-xs uppercase tracking-wide font-medium">Subject</span>
                                    <span className="text-white/95 text-sm font-medium">{emailDraft.subject || 'No subject'}</span>
                                </div>
                            </div>

                            <div className="h-px bg-white/[0.06] mb-5" />

                            {editMode ? (
                                <textarea
                                    value={editedBody}
                                    onChange={(e) => setEditedBody(e.target.value)}
                                    className="w-full min-h-[300px] bg-black/20 border border-white/[0.12] rounded-xl p-4 text-white/90 text-sm leading-[1.8] resize-y focus:outline-none focus:border-white/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] font-sans"
                                    autoFocus
                                />
                            ) : (
                                <div className="text-white/88 text-sm leading-[1.8] whitespace-pre-wrap font-sans">
                                    {emailDraft.body || ''}
                                </div>
                            )}

                            {emailDraft.tone && (
                                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/[0.06]">
                                    <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">Tone</span>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.1] text-white/55">
                                        {emailDraft.tone}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {canvasData.type !== 'email_draft' && sections.length > 0 && !canvasData.error && (
                        <div className="py-2">
                            {canvasData.type === 'summary' && genericContent?.title && (
                                <div className="px-6 py-4 text-white/58 text-sm leading-relaxed border-b border-white/[0.06]">
                                    {genericContent.title}
                                </div>
                            )}

                            {sections.map((section) => (
                                <div key={section.id} className="border-b border-white/[0.05] last:border-0">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="flex items-center w-full px-6 py-4 hover:bg-white/[0.03] transition-colors text-left gap-3"
                                    >
                                        <ChevronRight
                                            className={`w-3.5 h-3.5 text-white/25 flex-shrink-0 transition-transform duration-200 ${expandedSections.has(section.id) ? 'rotate-90' : ''}`}
                                        />
                                        <span className="text-white/84 text-sm font-medium flex-1">{section.title}</span>
                                        {section.tag && <span className="text-white/33 text-xs font-medium">{section.tag}</span>}
                                    </button>

                                    {expandedSections.has(section.id) && section.content && (
                                        <div className="px-6 pb-4 pl-12">
                                            <div className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{section.content}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {canvasData.type !== 'email_draft' && sections.length === 0 && canvasData.raw && !canvasData.error && (
                        <div className="px-6 py-5">
                            <div className="text-white/82 text-sm leading-[1.8] whitespace-pre-wrap font-sans">{canvasData.raw}</div>
                        </div>
                    )}
                </div>

                {!canvasData.error && (
                    <div className="border-t border-white/[0.08] px-6 py-4 bg-black/20 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {canvasData.type === 'email_draft' && (
                                    <button
                                        onClick={() => setEditMode(!editMode)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${editMode ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/10'}`}
                                    >
                                        <Edit3 className="w-3 h-3" />
                                        {editMode ? 'Editing' : 'Edit'}
                                    </button>
                                )}
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
                                >
                                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                {canvasData.type === 'email_draft' && (
                                    <>
                                        <button
                                            onClick={() => handleExecute('save_draft')}
                                            disabled={isExecuting}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white bg-white/10 hover:bg-white/15 border border-white/[0.1] transition-all disabled:opacity-40"
                                        >
                                            <FileText className="w-3 h-3" />
                                            Save Draft
                                        </button>
                                        <button
                                            onClick={() => handleExecute('send_email')}
                                            disabled={isExecuting}
                                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-white to-white/90 text-black hover:from-white hover:to-white transition-all shadow-[0_8px_24px_rgba(255,255,255,0.18)] disabled:opacity-40"
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
                                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-white to-white/90 text-black hover:from-white hover:to-white transition-all shadow-[0_8px_24px_rgba(255,255,255,0.18)] disabled:opacity-40"
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
