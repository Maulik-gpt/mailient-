'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Edit3, FileText, Mail, Sparkles, ChevronDown, ChevronRight, Calendar, Globe, AlertCircle, ShieldAlert, Send, ArrowRight, Maximize2, Minimize2, BarChart3, Clock, Users, Zap, MoreHorizontal } from 'lucide-react';
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

const typeConfig: Record<CanvasType, { label: string; icon: string; color: string }> = {
    email_draft: { label: 'Email Draft', icon: '✉️', color: '#6366f1' },
    summary: { label: 'Summary', icon: '📋', color: '#8b5cf6' },
    research: { label: 'Research', icon: '🔍', color: '#06b6d4' },
    action_plan: { label: 'Action Plan', icon: '⚡', color: '#f59e0b' },
    reply: { label: 'Reply', icon: '↩️', color: '#10b981' },
    notes: { label: 'Notes', icon: '📝', color: '#ec4899' },
    meeting_schedule: { label: 'Schedule', icon: '📅', color: '#3b82f6' },
    analytics: { label: 'Analytics', icon: '📊', color: '#f97316' },
    none: { label: 'Canvas', icon: '◆', color: '#a855f7' },
};

const actionLabelMap: Record<string, string> = {
    send_email: 'Send Email',
    schedule_meeting: 'Schedule Meeting',
    save_draft: 'Save Draft',
    execute_plan: 'Execute Plan',
    apply_changes: 'Apply Changes',
    revise: 'Revise',
    cancel: 'Cancel',
    coordinate_event: 'Coordinate Event'
};

const formatActionLabel = (label: string) => {
    if (!label) return '';
    return label.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Animated status dot
function StatusDot({ color = '#22c55e' }: { color?: string }) {
    return (
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40" style={{ backgroundColor: color }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }} />
        </span>
    );
}

export function CanvasPanel({ isOpen, onClose, canvasData, onExecute, isExecuting }: CanvasPanelProps) {
    const [editMode, setEditMode] = useState(false);
    const [editedBody, setEditedBody] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [copied, setCopied] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<'google' | 'cal'>('google');
    const scrollRef = useRef<HTMLDivElement>(null);

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

    const config = typeConfig[canvasData.type] || typeConfig.none;
    const title = canvasData.title || config.label;

    return (
        <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '46%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 35, stiffness: 280, mass: 0.8 }}
            className="h-full flex flex-col overflow-hidden relative"
            style={{ minWidth: '420px' }}
        >
            {/* Outer border glow effect */}
            <div className="absolute inset-0 rounded-none" style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0.02) 100%)',
                borderLeft: '1px solid rgba(255,255,255,0.06)',
            }} />

            {/* Main container */}
            <div className="relative h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
                {/* === TOP BAR === */}
                <div className="shrink-0 relative z-10">
                    {/* Gradient line accent at very top */}
                    <div className="h-[1px] w-full" style={{
                        background: `linear-gradient(90deg, transparent 0%, ${config.color}40 30%, ${config.color}60 50%, ${config.color}40 70%, transparent 100%)`
                    }} />

                    <div className="flex items-center justify-between px-5 py-3">
                        {/* Left: Type badge + Title */}
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Type icon badge */}
                            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-sm"
                                style={{
                                    background: `${config.color}12`,
                                    border: `1px solid ${config.color}20`,
                                    boxShadow: `0 0 20px ${config.color}08`
                                }}
                            >
                                {config.icon}
                            </div>

                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: `${config.color}90` }}>
                                    {config.label}
                                </span>
                                <span className="text-white/80 text-[13px] font-medium truncate leading-tight">
                                    {title}
                                </span>
                            </div>
                        </div>

                        {/* Right: Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleCopy}
                                className="p-2 rounded-lg transition-all duration-200 text-white/25 hover:text-white/60 hover:bg-white/[0.04]"
                                title="Copy contents"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="p-2 rounded-lg transition-all duration-200 text-white/25 hover:text-white/60 hover:bg-white/[0.04]"
                            >
                                <X className="w-4 h-4" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Bottom separator */}
                    <div className="h-[1px] w-full bg-white/[0.04]" />
                </div>

                {/* === SCROLLABLE CONTENT === */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="px-5 py-6">

                        {/* Goal / Description bar */}
                        {canvasData.goal && (
                            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <Zap className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
                                <p className="text-white/40 text-[13px] leading-relaxed">
                                    {canvasData.goal}
                                </p>
                            </div>
                        )}

                        {/* Confidence indicator */}
                        {canvasData.confidence !== undefined && (
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex-1 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${canvasData.confidence}%` }}
                                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                                        className="h-full rounded-full"
                                        style={{
                                            background: `linear-gradient(90deg, ${config.color}60, ${config.color})`
                                        }}
                                    />
                                </div>
                                <span className="text-[11px] font-medium tabular-nums shrink-0" style={{ color: `${config.color}90` }}>
                                    {canvasData.confidence}%
                                </span>
                            </div>
                        )}

                        {/* Approval Banner */}
                        {canvasData.approval?.required && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-5 rounded-xl overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(245, 158, 11, 0.02) 100%)',
                                    border: '1px solid rgba(245, 158, 11, 0.1)'
                                }}
                            >
                                <div className="px-4 py-3 flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10 shrink-0 mt-0.5">
                                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500/70" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-amber-400/90 text-[11px] font-bold tracking-tight mb-0.5">Approval Required</div>
                                        <p className="text-white/35 text-[12px] leading-relaxed">
                                            {canvasData.approval.reason || 'Review and confirm this action before proceeding.'}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Missing Inputs Banner */}
                        {canvasData.missingInputs && canvasData.missingInputs.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-5 rounded-xl overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(239, 68, 68, 0.02) 100%)',
                                    border: '1px solid rgba(239, 68, 68, 0.1)'
                                }}
                            >
                                <div className="px-4 py-3 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-red-500/60 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-red-400/80 text-[11px] font-bold mb-0.5">Missing Information</div>
                                        <p className="text-red-300/40 text-[12px]">
                                            Required: <span className="text-red-400/60 font-medium">{canvasData.missingInputs.join(', ')}</span>
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}


                        {/* ═══════════════════════════════════════════════ */}
                        {/* EMAIL DRAFT */}
                        {/* ═══════════════════════════════════════════════ */}
                        {canvasData.type === 'email_draft' && canvasData.content && (
                            <div className="space-y-4">
                                {/* Email card */}
                                <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.015]">
                                    {/* To field */}
                                    <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-3">
                                        <span className="text-white/20 text-[11px] font-semibold tracking-wide w-14 shrink-0">To</span>
                                        <span className="text-white/70 text-[13px]">{canvasData.content.to || '—'}</span>
                                    </div>
                                    {/* Subject field */}
                                    <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-3">
                                        <span className="text-white/20 text-[11px] font-semibold tracking-wide w-14 shrink-0">Subject</span>
                                        <span className="text-white/80 text-[13px] font-medium">{canvasData.content.subject || '—'}</span>
                                    </div>

                                    {/* Body */}
                                    <div className="p-4">
                                        {editMode ? (
                                            <textarea
                                                value={editedBody}
                                                onChange={(e) => setEditedBody(e.target.value)}
                                                className="w-full min-h-[280px] bg-transparent text-white/75 text-[13px] leading-[1.85] resize-none focus:outline-none placeholder:text-white/15"
                                                autoFocus
                                                placeholder="Type your message..."
                                            />
                                        ) : (
                                            <div className="text-white/65 text-[13px] leading-[1.85] whitespace-pre-wrap">
                                                {canvasData.content.body}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attachments */}
                                {canvasData.content.attachments?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {canvasData.content.attachments.map((file: any, i: number) => (
                                            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-white/40 text-[11px] hover:bg-white/[0.05] hover:text-white/60 transition-all cursor-default">
                                                <FileText className="w-3.5 h-3.5" />
                                                <span className="font-medium">{file.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Edit toggle */}
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className="flex items-center gap-2 text-white/20 hover:text-white/50 transition-all text-[12px] font-medium group"
                                >
                                    <div className="w-6 h-6 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.06] group-hover:border-white/[0.1] transition-all">
                                        <Edit3 className="w-3 h-3" />
                                    </div>
                                    <span>{editMode ? 'Done editing' : 'Edit draft'}</span>
                                </button>
                            </div>
                        )}


                        {/* ═══════════════════════════════════════════════ */}
                        {/* MEETING SCHEDULE */}
                        {/* ═══════════════════════════════════════════════ */}
                        {canvasData.type === 'meeting_schedule' && canvasData.content && (
                            <div className="space-y-5">
                                {/* Meeting details card */}
                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                                    <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/[0.04]">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-white/20" />
                                            <span className="text-[11px] text-white/25 font-semibold tracking-wider uppercase">Date & Time</span>
                                        </div>
                                        <span className="text-white/80 text-[13px] font-medium">
                                            {canvasData.content.date || '—'} {canvasData.content.time ? `at ${canvasData.content.time}` : ''}
                                        </span>
                                    </div>
                                    <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/[0.04]">
                                        <div className="flex items-center gap-3">
                                            <Users className="w-4 h-4 text-white/20" />
                                            <span className="text-[11px] text-white/25 font-semibold tracking-wider uppercase">Participants</span>
                                        </div>
                                        <span className="text-white/65 text-[13px] font-medium truncate max-w-[200px]">
                                            {canvasData.content.attendees?.join(', ') || '—'}
                                        </span>
                                    </div>
                                    {canvasData.content.duration && (
                                        <div className="px-4 py-3.5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Clock className="w-4 h-4 text-white/20" />
                                                <span className="text-[11px] text-white/25 font-semibold tracking-wider uppercase">Duration</span>
                                            </div>
                                            <span className="text-white/65 text-[13px] font-medium">
                                                {canvasData.content.duration}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Agenda */}
                                {(canvasData.content.subject || canvasData.content.agenda || canvasData.content.description) && (
                                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                                        {canvasData.content.subject && (
                                            <div className="text-white/85 text-[14px] font-semibold mb-2 leading-tight">
                                                {canvasData.content.subject}
                                            </div>
                                        )}
                                        <p className="text-white/35 text-[13px] leading-relaxed">
                                            {canvasData.content.agenda || canvasData.content.description || ''}
                                        </p>
                                    </div>
                                )}

                                {/* Provider selection */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-white/20">
                                        <Globe className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-semibold tracking-[0.15em] uppercase">Conference Provider</span>
                                    </div>
                                    <div className="flex gap-2 p-1 bg-white/[0.02] border border-white/[0.05] rounded-xl w-fit">
                                        {(['google', 'cal'] as const).map((p) => (
                                            <motion.button
                                                key={p}
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => setSelectedProvider(p)}
                                                className={`px-5 py-2 rounded-[10px] text-[11px] font-bold transition-all duration-200 ${
                                                    selectedProvider === p
                                                        ? 'bg-white text-black shadow-[0_2px_12px_rgba(255,255,255,0.15)]'
                                                        : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                {p === 'google' ? 'Google Meet' : 'Cal.com'}
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* ═══════════════════════════════════════════════ */}
                        {/* ANALYTICS */}
                        {/* ═══════════════════════════════════════════════ */}
                        {canvasData.type === 'analytics' && canvasData.content && (
                            <div className="space-y-4">
                                {/* Stats grid */}
                                {canvasData.content.stats?.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {canvasData.content.stats.map((stat: any, i: number) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.08 }}
                                                className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 hover:bg-white/[0.025] hover:border-white/[0.1] transition-all duration-300 group"
                                            >
                                                <div className="text-white/25 text-[10px] font-semibold tracking-wider uppercase mb-2">{stat.label}</div>
                                                <div className="text-white text-xl font-semibold tabular-nums">{stat.value}</div>
                                                {stat.trend && (
                                                    <div className={`text-[10px] mt-1.5 font-medium flex items-center gap-1 ${stat.trend === 'up' ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                                                        <span>{stat.trend === 'up' ? '↗' : '↘'}</span>
                                                        <span>{stat.percentage}%</span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Chart area */}
                                {canvasData.content.data?.length > 0 && (
                                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
                                        <div className="text-white/25 text-[10px] font-semibold tracking-wider uppercase mb-4">Activity</div>
                                        <div className="flex items-end gap-[3px] h-[140px]">
                                            {canvasData.content.data.map((point: any, i: number) => {
                                                const maxVal = Math.max(...canvasData.content.data.map((d: any) => d.value || 0), 1);
                                                const height = ((point.value || 0) / maxVal) * 100;
                                                return (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${Math.max(height, 3)}%` }}
                                                        transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                                                        className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                                                    >
                                                        <div
                                                            className="w-full rounded-[3px] transition-colors duration-200 hover:opacity-80 cursor-default"
                                                            style={{
                                                                height: `${Math.max(height, 3)}%`,
                                                                background: `linear-gradient(180deg, ${config.color}50 0%, ${config.color}20 100%)`,
                                                                border: `1px solid ${config.color}15`
                                                            }}
                                                            title={`${point.name}: ${point.value}`}
                                                        />
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex gap-[3px] mt-2">
                                            {canvasData.content.data.map((point: any, i: number) => (
                                                <div key={i} className="flex-1 text-center">
                                                    <span className="text-[7px] text-white/15 truncate block">{point.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Insights */}
                                {canvasData.raw && (
                                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
                                        <div className="text-white/25 text-[10px] font-semibold tracking-wider uppercase mb-3">Insights</div>
                                        <div className="text-white/55 text-[13px] leading-relaxed whitespace-pre-wrap">
                                            {canvasData.raw}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}


                        {/* ═══════════════════════════════════════════════ */}
                        {/* GENERIC SECTIONS (summaries, research, notes, etc.) */}
                        {/* ═══════════════════════════════════════════════ */}
                        {canvasData.type !== 'email_draft' && canvasData.type !== 'meeting_schedule' && canvasData.type !== 'analytics' && (
                            <div className="space-y-3">
                                {canvasData.sections?.map((section, sIdx) => (
                                    <motion.div
                                        key={section.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: sIdx * 0.05 }}
                                        className="rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden hover:border-white/[0.08] transition-all duration-200"
                                    >
                                        <button
                                            onClick={() => toggleSection(section.id)}
                                            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <motion.div
                                                    animate={{ rotate: expandedSections.has(section.id) ? 90 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                                                </motion.div>
                                                <span className="text-white/80 text-[13px] font-medium truncate">{section.title}</span>
                                                {section.tag && (
                                                    <span className="text-[9px] text-white/15 px-1.5 py-0.5 bg-white/[0.04] rounded-md font-medium tracking-wide shrink-0">
                                                        {section.tag}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                        <AnimatePresence>
                                            {expandedSections.has(section.id) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-4 pb-4 pt-0">
                                                        <div className="h-[1px] bg-white/[0.04] mb-3" />
                                                        <div className="text-white/50 text-[13px] leading-[1.8] whitespace-pre-wrap">
                                                            {section.content}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))}

                                {/* Raw / fallback content */}
                                {(!canvasData.sections || canvasData.sections.length === 0) && (canvasData.raw || canvasData.content?.rawText) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5"
                                    >
                                        <p className="text-white/55 text-[13px] leading-[1.85] whitespace-pre-wrap">
                                            {canvasData.content?.rawText || canvasData.raw}
                                        </p>
                                    </motion.div>
                                )}
                            </div>
                        )}


                        {/* ═══════════════════════════════════════════════ */}
                        {/* SOURCES */}
                        {/* ═══════════════════════════════════════════════ */}
                        {canvasData.sources && canvasData.sources.length > 0 && (
                            <div className="mt-7 pt-5 border-t border-white/[0.04]">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-1 rounded-full bg-white/15" />
                                    <span className="text-white/20 text-[10px] font-semibold tracking-[0.12em] uppercase">Sources</span>
                                </div>
                                <div className="space-y-1.5">
                                    {canvasData.sources.map((src, i) => (
                                        <div key={i} className="flex items-center gap-3 text-white/25 text-[12px] py-1 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                                            <span className="text-white/10 text-[10px] font-mono">{String(i + 1).padStart(2, '0')}</span>
                                            <span className="truncate">{src.sender}{src.subject ? ` — ${src.subject}` : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* === BOTTOM ACTION BAR === */}
                <div className="shrink-0 relative z-10">
                    <div className="h-[1px] w-full bg-white/[0.04]" />
                    <div className="px-5 py-3.5 flex items-center justify-between bg-[#080808]">
                        {/* Left: Dismiss */}
                        <button
                            onClick={onClose}
                            className="text-white/25 hover:text-white/50 text-[12px] font-medium transition-all hover:bg-white/[0.03] px-3 py-1.5 rounded-lg -ml-3"
                        >
                            Dismiss
                        </button>

                        {/* Right: Action buttons */}
                        <div className="flex items-center gap-2">
                            {canvasData.actions?.length ? (
                                canvasData.actions
                                    .filter((a) => a.actionType !== 'cancel' && a.actionType !== 'revise')
                                    .map((action) => (
                                        <motion.button
                                            key={action.actionType}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleExecute(action.actionType)}
                                            disabled={isExecuting || (canvasData.missingInputs && canvasData.missingInputs.length > 0)}
                                            className="flex items-center gap-2 h-9 px-5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed disabled:scale-100"
                                            style={{
                                                background: isExecuting ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
                                                color: isExecuting ? 'rgba(255,255,255,0.5)' : '#fff',
                                                boxShadow: isExecuting ? 'none' : `0 4px 16px ${config.color}30, 0 1px 3px ${config.color}20`
                                            }}
                                        >
                                            {isExecuting ? (
                                                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                                            ) : (
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            )}
                                            <span>
                                                {isExecuting
                                                    ? 'Processing...'
                                                    : (action.label || actionLabelMap[action.actionType] || formatActionLabel(action.actionType) || 'Execute')
                                                }
                                            </span>
                                        </motion.button>
                                    ))
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleExecute('default')}
                                    disabled={isExecuting || (canvasData.missingInputs && canvasData.missingInputs.length > 0)}
                                    className="flex items-center gap-2 h-9 px-5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
                                    style={{
                                        background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
                                        color: '#fff',
                                        boxShadow: `0 4px 16px ${config.color}30, 0 1px 3px ${config.color}20`
                                    }}
                                >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    <span>Complete</span>
                                </motion.button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Notification */}
                <AnimatePresence>
                    {canvasData.error && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="absolute bottom-20 left-4 right-4 z-50"
                        >
                            <div className="rounded-xl overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.04) 100%)',
                                    border: '1px solid rgba(239, 68, 68, 0.12)',
                                    backdropFilter: 'blur(20px)'
                                }}
                            >
                                <div className="px-4 py-3 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-red-500/60 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-red-400/80 text-[11px] font-bold mb-0.5">Error</div>
                                        <p className="text-red-200/45 text-[12px] leading-relaxed">{canvasData.error}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Custom scrollbar styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.06);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.12);
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.06) transparent;
                }
            `}</style>
        </motion.div>
    );
}
