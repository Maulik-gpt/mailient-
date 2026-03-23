'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, Copy, Check, Edit3, FileText, Mail, Sparkles, ChevronDown, 
  ChevronRight, Calendar, Globe, AlertCircle, ShieldAlert, Send, 
  ArrowRight, Maximize2, Minimize2, BarChart3, Clock, Users, Zap, 
  MoreHorizontal, Monitor, CheckCircle2, Circle, Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

export type CanvasType = 'email_draft' | 'summary' | 'research' | 'action_plan' | 'reply' | 'notes' | 'meeting_schedule' | 'analytics' | 'workflow' | 'none';

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

const typeConfig: Record<CanvasType, { label: string; icon: any; color: string }> = {
    email_draft: { label: 'Email Draft', icon: '✉️', color: '#6366f1' },
    summary: { label: 'Summary', icon: '📋', color: '#8b5cf6' },
    research: { label: 'Research', icon: '🔍', color: '#06b6d4' },
    action_plan: { label: 'Action Plan', icon: '⚡', color: '#f59e0b' },
    reply: { label: 'Reply', icon: '↩️', color: '#10b981' },
    notes: { label: 'Notes', icon: '📝', color: '#ec4899' },
    meeting_schedule: { label: 'Schedule', icon: '📅', color: '#3b82f6' },
    analytics: { label: 'Analytics', icon: '📊', color: '#f97316' },
    workflow: { label: 'Strategy', icon: '⚙️', color: '#a855f7' },
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

    return (
        <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '46%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 35, stiffness: 280, mass: 0.8 }}
            className="h-full flex flex-col overflow-hidden relative shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-40"
            style={{ minWidth: '420px', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
        >
            {/* Canvas Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                        {canvasData.type === 'workflow' ? (
                            <div className="w-full h-full p-2 flex flex-col gap-1 items-center justify-center opacity-40">
                                <div className="w-full h-0.5 bg-white/40 rounded-full" />
                                <div className="w-2/3 h-0.5 bg-white/40 rounded-full" />
                                <div className="w-full h-0.5 bg-white/40 rounded-full" />
                            </div>
                        ) : (
                            <FileText className="w-5 h-5 text-white/40" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-[17px] font-bold tracking-tight text-white/95">
                            {canvasData.type === 'workflow' ? "Arcus's workspace" : (canvasData.title || config.label)}
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                                <Edit className="w-2.5 h-2.5 text-white/40" />
                            </div>
                            <span className="text-[11px] text-white/30 font-semibold tracking-tight uppercase">
                                Arcus is using <span className="text-white/60">Editor</span>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-white/5 rounded-lg border border-white/5 text-white/40 transition-colors">
                        <Monitor className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg border border-white/5 text-white/40 transition-colors"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Canvas Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
                <div className="p-6 relative">
                    <AnimatePresence mode="wait">
                        {canvasData.type === 'workflow' ? (
                            <motion.div
                                key="workflow"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6"
                            >
                                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-[17px] font-bold text-white tracking-tight">Task progress</h3>
                                        <span className="text-[14px] font-mono text-zinc-500 font-medium">
                                            {canvasData.content?.steps?.filter((s: any) => s.status === 'completed').length || 0} / {canvasData.content?.steps?.length || 0}
                                        </span>
                                    </div>

                                    <div className="space-y-6">
                                        {canvasData.content?.steps?.map((step: any, index: number) => (
                                            <div 
                                                key={step.id || index}
                                                className={cn(
                                                    "flex items-start gap-4 transition-all duration-500",
                                                    step.status === 'completed' || step.status === 'active' ? "opacity-100" : "opacity-30"
                                                )}
                                            >
                                                <div className="mt-1">
                                                    {step.status === 'completed' ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    ) : (
                                                        <Clock className={cn(
                                                            "w-5 h-5",
                                                            step.status === 'active' ? "text-white animate-pulse" : "text-zinc-600"
                                                        )} />
                                                    )}
                                                </div>
                                                <p className={cn(
                                                    "flex-1 text-[15px] font-medium leading-tight tracking-tight pt-0.5",
                                                    step.status === 'completed' || step.status === 'active' ? "text-white/90" : "text-zinc-500"
                                                )}>
                                                    {step.title}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="px-2">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-zinc-600" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">Mission Intelligence</span>
                                    </div>
                                    <p className="text-[14px] text-zinc-500 leading-relaxed italic border-l border-zinc-800 pl-4 py-1">
                                        "Arcus is currently optimizing the extraction strategy across multiple high-priority datasets while cross-referencing founder LinkedIn profiles for 100% verification accuracy."
                                    </p>
                                </div>
                            </motion.div>
                        ) : canvasData.type === 'email_draft' ? (
                            <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                                <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.015]">
                                    <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-3">
                                        <span className="text-white/20 text-[11px] font-semibold tracking-wide w-14 shrink-0">To</span>
                                        <span className="text-white/70 text-[13px]">{canvasData.content.to || '—'}</span>
                                    </div>
                                    <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-3">
                                        <span className="text-white/20 text-[11px] font-semibold tracking-wide w-14 shrink-0">Subject</span>
                                        <span className="text-white/80 text-[13px] font-medium">{canvasData.content.subject || '—'}</span>
                                    </div>
                                    <div className="p-4">
                                        {editMode ? (
                                            <textarea
                                                value={editedBody}
                                                onChange={(e) => setEditedBody(e.target.value)}
                                                className="w-full min-h-[280px] bg-transparent text-white/75 text-[13px] leading-[1.85] resize-none focus:outline-none placeholder:text-white/15"
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="text-white/65 text-[13px] leading-[1.85] whitespace-pre-wrap">
                                                {canvasData.content.body}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button onClick={() => setEditMode(!editMode)} className="flex items-center gap-2 text-white/20 hover:text-white/50 transition-all text-[12px] font-medium">
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>{editMode ? 'Done editing' : 'Edit draft'}</span>
                                </button>
                            </motion.div>
                        ) : (
                           <div className="text-white/20 text-center py-20 italic">
                             Premium Canvas Display coming soon for {canvasData.type}
                           </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="shrink-0 px-6 py-4 border-t border-white/5 bg-[#080808]">
                <div className="flex items-center justify-between">
                    <button onClick={onClose} className="text-white/20 hover:text-white/40 text-[12px] font-bold uppercase tracking-widest">
                        Dismiss
                    </button>
                    <div className="flex items-center gap-3">
                        {canvasData.actions?.map((action: any) => (
                            <button
                                key={action.actionType}
                                onClick={() => handleExecute(action.actionType)}
                                className="h-10 px-6 bg-white text-black text-[13px] font-bold rounded-xl hover:bg-white/90 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                            >
                                {action.label || formatActionLabel(action.actionType)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
            `}</style>
        </motion.div>
    );
}
