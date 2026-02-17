"use client";

import { useState } from 'react';
import {
    CheckCircle2, XCircle, Edit3, ChevronDown, ChevronUp,
    Mail, Search, Calendar, Send, FileText, AlertTriangle,
    Shield, Clock, Loader2, ExternalLink,
    Video, Users, Play, X, Pencil
} from 'lucide-react';
import type { PlanCard as PlanCardType, ToolType, RiskFlag } from '../types/mission';

interface PlanCardProps {
    plan: PlanCardType;
    onApprove: (planId: string) => void;
    onReject: (planId: string) => void;
    onEdit: (planId: string, instructions: string) => void;
    isExecuting?: boolean;
    executionProgress?: number;
}

const TOOL_LABELS: Record<ToolType, { label: string; icon: React.ReactNode; color: string }> = {
    email_search: { label: 'Search', icon: <Search className="w-3 h-3" />, color: 'text-sky-400 bg-sky-500/8 border-sky-500/15' },
    email_read: { label: 'Read', icon: <Mail className="w-3 h-3" />, color: 'text-sky-400 bg-sky-500/8 border-sky-500/15' },
    send_email: { label: 'Send', icon: <Send className="w-3 h-3" />, color: 'text-emerald-400 bg-emerald-500/8 border-emerald-500/15' },
    create_draft: { label: 'Draft', icon: <FileText className="w-3 h-3" />, color: 'text-amber-400 bg-amber-500/8 border-amber-500/15' },
    calendar_availability: { label: 'Calendar', icon: <Calendar className="w-3 h-3" />, color: 'text-violet-400 bg-violet-500/8 border-violet-500/15' },
    create_meeting: { label: 'Meeting', icon: <Video className="w-3 h-3" />, color: 'text-pink-400 bg-pink-500/8 border-pink-500/15' },
    schedule_check: { label: 'Follow-up', icon: <Clock className="w-3 h-3" />, color: 'text-orange-400 bg-orange-500/8 border-orange-500/15' },
};

const RISK_LABELS: Record<RiskFlag, { label: string; severity: 'low' | 'medium' | 'high' }> = {
    new_recipient: { label: 'First-time recipient', severity: 'medium' },
    external_domain: { label: 'External organization', severity: 'medium' },
    money_legal: { label: 'Sensitive content detected', severity: 'high' },
    attachment_forwarding: { label: 'Includes attachments', severity: 'medium' },
    large_recipient_list: { label: 'Multiple recipients', severity: 'high' },
};

export function PlanCard({ plan, onApprove, onReject, onEdit, isExecuting, executionProgress }: PlanCardProps) {
    const [showDraftPreview, setShowDraftPreview] = useState(true);
    const [showInvitePreview, setShowInvitePreview] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editInstructions, setEditInstructions] = useState('');

    const isPending = plan.status === 'pending';
    const isApproved = plan.status === 'approved' || plan.status === 'executing';
    const isDone = plan.status === 'done';
    const isFailed = plan.status === 'failed';
    const isRejected = plan.status === 'rejected';

    const handleEdit = () => {
        if (editInstructions.trim()) {
            onEdit(plan.id, editInstructions.trim());
            setEditMode(false);
            setEditInstructions('');
        }
    };

    return (
        <div className={`
      relative overflow-hidden rounded-2xl border transition-all duration-500 font-sans
      ${isPending ? 'border-white/[0.08] bg-[#0c0c0c]' : ''}
      ${isApproved || isExecuting ? 'border-blue-500/20 bg-[#0c0c0c]' : ''}
      ${isDone ? 'border-emerald-500/20 bg-[#0c0c0c]' : ''}
      ${isFailed ? 'border-red-500/20 bg-[#0c0c0c]' : ''}
      ${isRejected ? 'border-white/[0.04] bg-[#0a0a0a] opacity-50' : ''}
    `}>
            {/* Execution progress */}
            {isExecuting && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/[0.04]">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000"
                        style={{ width: `${executionProgress || 30}%` }}
                    />
                </div>
            )}

            {/* Done accent */}
            {isDone && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/40" />
            )}

            <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`
              flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
              ${isPending ? 'bg-blue-500/10' : ''}
              ${isApproved || isExecuting ? 'bg-blue-500/15' : ''}
              ${isDone ? 'bg-emerald-500/15' : ''}
              ${isFailed ? 'bg-red-500/15' : ''}
              ${isRejected ? 'bg-white/[0.04]' : ''}
            `}>
                            {isPending && <Play className="w-3.5 h-3.5 text-blue-400" />}
                            {isExecuting && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                            {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                            {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                            {isRejected && <X className="w-3.5 h-3.5 text-white/30" />}
                            {isApproved && !isExecuting && <Play className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-white/25">
                                    {isPending ? 'Proposed action' : isExecuting ? 'Running' : isDone ? 'Completed' : isFailed ? 'Failed' : isRejected ? 'Cancelled' : 'Approved'}
                                </span>
                                {plan.confidence < 0.7 && isPending && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/8 text-amber-400/80 font-medium">
                                        Review needed
                                    </span>
                                )}
                            </div>
                            <h3 className="text-white/90 font-medium text-[15px] leading-snug tracking-[-0.01em]">{plan.goal}</h3>
                        </div>
                    </div>
                </div>

                {/* Steps */}
                <div className="space-y-1.5 pl-11">
                    {plan.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5 group">
                            <div className={`
                flex-shrink-0 w-[18px] h-[18px] rounded flex items-center justify-center text-[10px] font-semibold mt-[2px]
                ${isDone ? 'bg-emerald-500/15 text-emerald-400' :
                                    isExecuting && executionProgress && (i / plan.steps.length * 100) < executionProgress
                                        ? 'bg-blue-500/15 text-blue-400'
                                        : 'bg-white/[0.04] text-white/30'}
              `}>
                                {isDone || (isExecuting && executionProgress && (i / plan.steps.length * 100) < (executionProgress || 0))
                                    ? <CheckCircle2 className="w-2.5 h-2.5" />
                                    : i + 1}
                            </div>
                            <span className="text-white/60 text-[13px] leading-relaxed">{step}</span>
                        </div>
                    ))}
                </div>

                {/* Tools */}
                <div className="flex items-center gap-1.5 flex-wrap pl-11">
                    {plan.tools.map((tool) => {
                        const toolInfo = TOOL_LABELS[tool];
                        if (!toolInfo) return null;
                        return (
                            <span
                                key={tool}
                                className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-md text-[10px] font-medium border ${toolInfo.color}`}
                            >
                                {toolInfo.icon}
                                {toolInfo.label}
                            </span>
                        );
                    })}
                </div>

                {/* Draft Preview */}
                {plan.draft_preview && (
                    <div className="pl-11 space-y-2">
                        <button
                            onClick={() => setShowDraftPreview(!showDraftPreview)}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-white/35 hover:text-white/55 transition-colors"
                        >
                            <Mail className="w-3 h-3" />
                            Email preview
                            {showDraftPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {showDraftPreview && (
                            <div className="bg-white/[0.025] border border-white/[0.05] rounded-xl overflow-hidden animate-in slide-in-from-top-1 duration-200">
                                <div className="px-4 py-3 space-y-1.5 border-b border-white/[0.04]">
                                    <div className="flex items-center gap-2 text-[12px]">
                                        <span className="text-white/30 w-8 text-right">To</span>
                                        <span className="text-white/70">{plan.draft_preview.to.join(', ')}</span>
                                    </div>
                                    {plan.draft_preview.cc.length > 0 && (
                                        <div className="flex items-center gap-2 text-[12px]">
                                            <span className="text-white/30 w-8 text-right">Cc</span>
                                            <span className="text-white/70">{plan.draft_preview.cc.join(', ')}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-[12px]">
                                        <span className="text-white/30 w-8 text-right">Re</span>
                                        <span className="text-white/80 font-medium">{plan.draft_preview.subject}</span>
                                    </div>
                                </div>
                                <div className="px-4 py-3">
                                    <pre className="text-white/60 text-[13px] leading-[1.7] whitespace-pre-wrap font-sans">{plan.draft_preview.body}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Invite Preview */}
                {plan.invite_preview && (
                    <div className="pl-11 space-y-2">
                        <button
                            onClick={() => setShowInvitePreview(!showInvitePreview)}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-white/35 hover:text-white/55 transition-colors"
                        >
                            <Calendar className="w-3 h-3" />
                            Meeting details
                            {showInvitePreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {showInvitePreview && (
                            <div className="bg-white/[0.025] border border-white/[0.05] rounded-xl p-4 space-y-2.5 animate-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-blue-400/70" />
                                    <span className="text-white/80 font-medium text-sm">{plan.invite_preview.title}</span>
                                </div>
                                <div className="text-[12px] text-white/45 space-y-1.5 pl-6">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        {plan.invite_preview.slot} · {plan.invite_preview.duration}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-3 h-3" />
                                        {plan.invite_preview.attendees.join(', ')}
                                    </div>
                                    {plan.invite_preview.meet_link && (
                                        <div className="flex items-center gap-2">
                                            <ExternalLink className="w-3 h-3" />
                                            <span className="text-blue-400/70">{plan.invite_preview.meet_link}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Risk Flags */}
                {plan.risk_flags.length > 0 && (
                    <div className="pl-11 space-y-1.5">
                        {plan.risk_flags.map((flag) => {
                            const info = RISK_LABELS[flag];
                            if (!info) return null;
                            return (
                                <div
                                    key={flag}
                                    className={`flex items-center gap-2 text-[12px] px-3 py-[6px] rounded-lg
                    ${info.severity === 'high' ? 'bg-red-500/[0.04] text-red-400/70' :
                                            info.severity === 'medium' ? 'bg-amber-500/[0.04] text-amber-400/70' :
                                                'bg-white/[0.02] text-white/40'}`}
                                >
                                    <Shield className="w-3 h-3 flex-shrink-0 opacity-60" />
                                    {info.label}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Questions */}
                {plan.questions_for_user.length > 0 && (
                    <div className="pl-11 bg-blue-500/[0.03] border border-blue-500/10 rounded-xl p-4 space-y-2">
                        <span className="text-[11px] font-medium text-blue-400/50">Before proceeding</span>
                        <ul className="space-y-1.5">
                            {plan.questions_for_user.map((q, i) => (
                                <li key={i} className="text-[13px] text-blue-300/60 flex items-start gap-2">
                                    <span className="text-blue-400/40 mt-[2px] text-[10px]">?</span>
                                    {q}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Assumptions */}
                {plan.assumptions.length > 0 && (
                    <div className="pl-11 text-[11px] text-white/20">
                        {plan.assumptions.join(' · ')}
                    </div>
                )}

                {/* Edit Mode */}
                {editMode && (
                    <div className="pl-11 space-y-2.5 animate-in slide-in-from-top-1 duration-200">
                        <textarea
                            value={editInstructions}
                            onChange={(e) => setEditInstructions(e.target.value)}
                            placeholder="Describe what you'd like to change..."
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/15 resize-none min-h-[72px] font-sans transition-colors"
                            autoFocus
                        />
                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={() => { setEditMode(false); setEditInstructions(''); }}
                                className="px-3 py-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors rounded-lg hover:bg-white/[0.04]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={!editInstructions.trim()}
                                className="px-4 py-1.5 text-[12px] bg-white/[0.08] hover:bg-white/[0.12] text-white/80 rounded-lg font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {isPending && !editMode && (
                    <div className="flex items-center gap-2 pt-1 pl-11">
                        <button
                            onClick={() => onApprove(plan.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-[13px] font-semibold transition-all duration-200 hover:bg-white/90 active:scale-[0.98] shadow-[0_1px_12px_rgba(255,255,255,0.08)]"
                        >
                            <Play className="w-3.5 h-3.5" />
                            Run
                        </button>
                        <button
                            onClick={() => setEditMode(true)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white/80 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-[0.98]"
                        >
                            <Pencil className="w-3 h-3" />
                            Edit
                        </button>
                        <button
                            onClick={() => onReject(plan.id)}
                            className="flex items-center justify-center px-3 py-2.5 hover:bg-white/[0.04] text-white/25 hover:text-white/50 rounded-xl transition-all duration-200 active:scale-[0.98]"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
