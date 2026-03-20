'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Edit3, FileText, Mail, Sparkles, ChevronDown, ChevronRight, Calendar, Globe, AlertCircle, ShieldAlert, Send, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type CanvasType = 'email_draft' | 'summary' | 'research' | 'action_plan' | 'reply' | 'notes' | 'meeting_schedule' | 'analytics' | 'none';

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
    actions?: { actionType: string; label?: string; requiresApproval?: boolean }[];
    approvalTokens?: Record<string, string>;
    goal?: string;
    decisionSummary?: string;
    riskFlags?: string[];
    riskLevel?: 'low' | 'medium' | 'high';
    confidence?: number;
    requiredInputs?: string[];
    missingInputs?: string[];
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

const typeLabels: Record<CanvasType, string> = {
    email_draft: 'Email Draft',
    summary: 'Summary',
    research: 'Research',
    action_plan: 'Action Plan',
    reply: 'Reply',
    notes: 'Notes',
    meeting_schedule: 'Schedule',
    analytics: 'Analytics',
    none: 'Canvas',
};

const actionLabelMap: Record<string, string> = {
    send_email: 'Send',
    schedule_meeting: 'Confirm',
    save_draft: 'Save Draft',
    execute_plan: 'Execute',
    apply_changes: 'Apply',
    revise: 'Revise',
    cancel: 'Cancel'
};

export function CanvasPanel({ isOpen, onClose, canvasData, onExecute, isExecuting }: CanvasPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [editedBody, setEditedBody] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<'google' | 'cal'>('google');

    useEffect(() => {
        if (canvasData?.type === 'email_draft' && canvasData.content?.body) {
            setEditedBody(canvasData.content.body);
        }
        if (canvasData?.sections) {
            setExpandedSections(new Set(canvasData.sections.map((s) => s.id)));
        }
    }, [canvasData]);

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
            text = `Subject: ${canvasData.content.subject || ''}\nTo: ${canvasData.content.to || ''}\n\n${editMode ? editedBody : canvasData.content.body || ''}`;
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
        if (action === 'copy') { handleCopy(); return; }
        if (action === 'cancel') { onClose(); return; }
        if (action === 'revise') { setEditMode(true); return; }

        let payload = canvasData?.actionPayload || canvasData?.content;

        if (canvasData?.type === 'email_draft') {
            payload = { ...canvasData.content, body: editMode ? editedBody : canvasData.content.body || '' };
        } else if (canvasData?.type === 'meeting_schedule') {
            payload = { ...canvasData.content, provider: selectedProvider };
        }

        onExecute(action, payload);
    };

    if (!isOpen || !canvasData) return null;

    const title = canvasData.title || typeLabels[canvasData.type] || 'Canvas';

    return (
        <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '50%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 260, mass: 0.8 }}
            className="h-full border-l border-white/[0.06] bg-[#0A0A0A] flex flex-col overflow-hidden relative"
            style={{ fontFamily: "'Satoshi', sans-serif", minWidth: 0 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                    <span className="text-[11px] tracking-[0.15em] text-white/40 uppercase" style={{ fontFamily: "'Satoshi', sans-serif" }}>Canvas</span>
                    <span className="text-white/10">·</span>
                    <span className="text-[11px] text-white/25 tracking-wide">{typeLabels[canvasData.type]}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors text-white/25 hover:text-white/60"
                        title="Copy"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/[0.05] rounded-lg transition-colors text-white/25 hover:text-white/60"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
                <div className="px-6 py-8">
                    {/* Title */}
                    <div className="mb-8">
                        <h2 className="text-white text-2xl font-medium tracking-tight leading-tight mb-2" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                            {title}
                        </h2>
                        {canvasData.goal && (
                            <p className="text-white/40 text-sm leading-relaxed" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                                {canvasData.goal}
                            </p>
                        )}
                        {canvasData.confidence !== undefined && (
                            <div className="flex items-center gap-2 mt-3">
                                <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-emerald-500/70 tracking-wide">{canvasData.confidence}% confidence</span>
                            </div>
                        )}
                    </div>

                    {/* Banners */}
                    {canvasData.approval?.required && (
                        <div className="mb-6 bg-amber-500/[0.06] border border-amber-500/15 rounded-xl p-4 flex items-start gap-3">
                            <ShieldAlert className="w-4 h-4 text-amber-500/70 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="text-amber-400/80 text-xs font-medium mb-0.5" style={{ fontFamily: "'Satoshi', sans-serif" }}>Approval required</div>
                                <p className="text-amber-200/40 text-xs leading-relaxed">{canvasData.approval.reason || 'This action needs your confirmation before proceeding.'}</p>
                            </div>
                        </div>
                    )}

                    {canvasData.missingInputs && canvasData.missingInputs.length > 0 && (
                        <div className="mb-6 bg-red-500/[0.06] border border-red-500/15 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-red-500/70 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="text-red-400/80 text-xs font-medium mb-0.5" style={{ fontFamily: "'Satoshi', sans-serif" }}>Missing information</div>
                                <p className="text-red-200/40 text-xs leading-relaxed">
                                    Provide: <span className="text-red-400/70">{canvasData.missingInputs.join(', ')}</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ─── EMAIL DRAFT ─── */}
                    {canvasData.type === 'email_draft' && canvasData.content && (
                        <div className="space-y-0">
                            <div className="border border-white/[0.06] rounded-xl overflow-hidden">
                                {/* Email header fields */}
                                <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center gap-3">
                                    <span className="text-white/20 text-[11px] w-10" style={{ fontFamily: "'Satoshi', sans-serif" }}>To</span>
                                    <span className="text-white/70 text-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>{canvasData.content.to || '—'}</span>
                                </div>
                                <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center gap-3">
                                    <span className="text-white/20 text-[11px] w-10" style={{ fontFamily: "'Satoshi', sans-serif" }}>Subject</span>
                                    <span className="text-white/80 text-sm font-medium" style={{ fontFamily: "'Satoshi', sans-serif" }}>{canvasData.content.subject || '—'}</span>
                                </div>

                                {/* Body */}
                                <div className="p-5">
                                    {editMode ? (
                                        <textarea
                                            value={editedBody}
                                            onChange={(e) => setEditedBody(e.target.value)}
                                            className="w-full min-h-[300px] bg-transparent text-white/80 text-sm leading-[1.8] resize-none focus:outline-none"
                                            style={{ fontFamily: "'Satoshi', sans-serif" }}
                                            autoFocus
                                        />
                                    ) : (
                                        <div className="text-white/70 text-sm leading-[1.8] whitespace-pre-wrap" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                                            {canvasData.content.body}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Attachments */}
                            {canvasData.content.attachments?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {canvasData.content.attachments.map((file: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/50 text-[11px]">
                                            <FileText className="w-3 h-3" />
                                            <span style={{ fontFamily: "'Satoshi', sans-serif" }}>{file.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Edit toggle */}
                            <button
                                onClick={() => setEditMode(!editMode)}
                                className="mt-4 flex items-center gap-2 text-white/25 hover:text-white/60 transition-colors text-xs"
                                style={{ fontFamily: "'Satoshi', sans-serif" }}
                            >
                                <Edit3 className="w-3 h-3" />
                                <span>{editMode ? 'Done editing' : 'Edit draft'}</span>
                            </button>
                        </div>
                    )}

                    {/* ─── MEETING SCHEDULE ─── */}
                    {canvasData.type === 'meeting_schedule' && canvasData.content && (
                        <div className="space-y-5">
                            {/* Meeting details */}
                            <div className="border border-white/[0.06] rounded-xl overflow-hidden divide-y divide-white/[0.04]">
                                <div className="px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-white/30">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-[11px] tracking-wide" style={{ fontFamily: "'Satoshi', sans-serif" }}>Date & Time</span>
                                    </div>
                                    <span className="text-white/80 text-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                                        {canvasData.content.date || '—'} {canvasData.content.time ? `at ${canvasData.content.time}` : ''}
                                    </span>
                                </div>
                                <div className="px-5 py-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-white/30">
                                        <Mail className="w-4 h-4" />
                                        <span className="text-[11px] tracking-wide" style={{ fontFamily: "'Satoshi', sans-serif" }}>Participants</span>
                                    </div>
                                    <span className="text-white/70 text-sm" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                                        {canvasData.content.attendees?.join(', ') || '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Subject / Agenda */}
                            {(canvasData.content.subject || canvasData.content.agenda || canvasData.content.description) && (
                                <div className="border border-white/[0.06] rounded-xl p-5">
                                    {canvasData.content.subject && (
                                        <div className="text-white/80 text-sm font-medium mb-2" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                                            {canvasData.content.subject}
                                        </div>
                                    )}
                                    <div className="text-white/40 text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                                        {canvasData.content.agenda || canvasData.content.description || ''}
                                    </div>
                                </div>
                            )}

                            {/* Provider */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-white/25">
                                    <Globe className="w-3.5 h-3.5" />
                                    <span className="text-[11px] tracking-wide" style={{ fontFamily: "'Satoshi', sans-serif" }}>Provider</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {(['google', 'cal'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setSelectedProvider(p)}
                                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                                                selectedProvider === p
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-white/[0.02] border-white/[0.08] text-white/50 hover:border-white/15'
                                            }`}
                                            style={{ fontFamily: "'Satoshi', sans-serif" }}
                                        >
                                            {p === 'google' ? 'Google Meet' : 'Cal.com'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── ANALYTICS ─── */}
                    {canvasData.type === 'analytics' && canvasData.content && (
                        <div className="space-y-5">
                            {/* Stats grid */}
                            {canvasData.content.stats?.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {canvasData.content.stats.map((stat: any, i: number) => (
                                        <div key={i} className="border border-white/[0.06] rounded-xl p-4">
                                            <div className="text-white/25 text-[10px] tracking-wide mb-1" style={{ fontFamily: "'Satoshi', sans-serif" }}>{stat.label}</div>
                                            <div className="text-white text-xl font-medium" style={{ fontFamily: "'Satoshi', sans-serif" }}>{stat.value}</div>
                                            {stat.trend && (
                                                <div className={`text-[10px] mt-1 ${stat.trend === 'up' ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                                    {stat.trend === 'up' ? '↑' : '↓'} {stat.percentage}%
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Chart placeholder — using a clean inline representation */}
                            {canvasData.content.data?.length > 0 && (
                                <div className="border border-white/[0.06] rounded-xl p-5">
                                    <div className="text-white/25 text-[10px] tracking-wide mb-4" style={{ fontFamily: "'Satoshi', sans-serif" }}>Activity</div>
                                    <div className="flex items-end gap-1 h-[120px]">
                                        {canvasData.content.data.map((point: any, i: number) => {
                                            const maxVal = Math.max(...canvasData.content.data.map((d: any) => d.value || 0), 1);
                                            const height = ((point.value || 0) / maxVal) * 100;
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                    <div
                                                        className="w-full bg-white/10 rounded-sm hover:bg-white/20 transition-colors"
                                                        style={{ height: `${Math.max(height, 2)}%` }}
                                                        title={`${point.name}: ${point.value}`}
                                                    />
                                                    <span className="text-[8px] text-white/15 truncate w-full text-center">{point.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Insights text (raw) */}
                            {canvasData.raw && (
                                <div className="border border-white/[0.06] rounded-xl p-5">
                                    <div className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                                        {canvasData.raw}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── GENERIC SECTIONS ─── */}
                    {canvasData.type !== 'email_draft' && canvasData.type !== 'meeting_schedule' && canvasData.type !== 'analytics' && (
                        <div className="space-y-3">
                            {canvasData.sections?.map((section) => (
                                <div key={section.id} className="border border-white/[0.06] rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <ChevronRight className={`w-3.5 h-3.5 text-white/20 transition-transform ${expandedSections.has(section.id) ? 'rotate-90' : ''}`} />
                                            <span className="text-white/80 text-sm font-medium" style={{ fontFamily: "'Satoshi', sans-serif" }}>{section.title}</span>
                                            {section.tag && (
                                                <span className="text-[9px] text-white/15 tracking-wide">{section.tag}</span>
                                            )}
                                        </div>
                                    </button>
                                    <AnimatePresence>
                                        {expandedSections.has(section.id) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-5 pb-5 pt-1">
                                                    <div className="text-white/50 text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                                                        {section.content}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}

                            {/* Raw fallback */}
                            {(!canvasData.sections || canvasData.sections.length === 0) && canvasData.raw && (
                                <div className="border border-white/[0.06] rounded-xl p-5">
                                    <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                                        {canvasData.raw}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sources */}
                    {canvasData.sources && canvasData.sources.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-white/[0.04]">
                            <div className="text-white/20 text-[10px] tracking-wide mb-3" style={{ fontFamily: "'Satoshi', sans-serif" }}>Sources</div>
                            <div className="space-y-2">
                                {canvasData.sources.map((src, i) => (
                                    <div key={i} className="flex items-center gap-3 text-white/30 text-xs">
                                        <div className="w-1 h-1 rounded-full bg-white/15" />
                                        <span style={{ fontFamily: "'Satoshi', sans-serif" }}>{src.sender}{src.subject ? ` — ${src.subject}` : ''}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="shrink-0 px-6 py-4 border-t border-white/[0.06] flex items-center justify-between bg-[#0A0A0A]">
                <button
                    onClick={onClose}
                    className="text-white/30 hover:text-white/60 text-xs transition-colors"
                    style={{ fontFamily: "'Satoshi', sans-serif" }}
                >
                    Dismiss
                </button>

                <div className="flex items-center gap-3">
                    {canvasData.actions?.length ? (
                        canvasData.actions
                            .filter((a) => a.actionType !== 'cancel' && a.actionType !== 'revise')
                            .map((action) => (
                                <button
                                    key={action.actionType}
                                    onClick={() => handleExecute(action.actionType)}
                                    disabled={isExecuting || (canvasData.missingInputs && canvasData.missingInputs.length > 0)}
                                    className="flex items-center gap-2 h-10 px-5 rounded-lg bg-white text-black text-sm font-medium transition-all hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ fontFamily: "'Satoshi', sans-serif" }}
                                >
                                    {isExecuting ? (
                                        <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-4 h-4" />
                                    )}
                                    <span>{isExecuting ? 'Processing...' : (action.label || actionLabelMap[action.actionType] || 'Execute')}</span>
                                </button>
                            ))
                    ) : (
                        <button
                            onClick={() => handleExecute('default')}
                            disabled={isExecuting || (canvasData.missingInputs && canvasData.missingInputs.length > 0)}
                            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-white text-black text-sm font-medium transition-all hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ fontFamily: "'Satoshi', sans-serif" }}
                        >
                            <ArrowRight className="w-4 h-4" />
                            <span>Complete</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Error notification */}
            <AnimatePresence>
                {canvasData.error && (
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        className="absolute bottom-20 left-4 right-4 z-50"
                    >
                        <div className="bg-red-500/10 border border-red-500/15 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-red-500/70 flex-shrink-0 mt-0.5" />
                            <div>
                                <div className="text-red-400/80 text-xs font-medium mb-0.5" style={{ fontFamily: "'Satoshi', sans-serif" }}>Error</div>
                                <p className="text-red-200/50 text-xs leading-relaxed">{canvasData.error}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
