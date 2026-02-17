"use client";

import { useState } from 'react';
import {
    CheckCircle2, XCircle, Edit3, ChevronDown, ChevronUp,
    Mail, Search, Calendar, Send, FileText, AlertTriangle,
    Zap, Shield, Clock, ArrowRight, Loader2, ExternalLink,
    Video, Users, Target
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
    email_search: { label: 'Email Search', icon: <Search className="w-3.5 h-3.5" />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    email_read: { label: 'Read Thread', icon: <Mail className="w-3.5 h-3.5" />, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    send_email: { label: 'Send Email', icon: <Send className="w-3.5 h-3.5" />, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    create_draft: { label: 'Create Draft', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    calendar_availability: { label: 'Check Availability', icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    create_meeting: { label: 'Schedule Meeting', icon: <Video className="w-3.5 h-3.5" />, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
    schedule_check: { label: 'Follow-up Check', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
};

const RISK_LABELS: Record<RiskFlag, { label: string; severity: 'low' | 'medium' | 'high' }> = {
    new_recipient: { label: 'New recipient — not contacted before', severity: 'medium' },
    external_domain: { label: 'External domain (outside your organization)', severity: 'medium' },
    money_legal: { label: 'Contains financial or legal content', severity: 'high' },
    attachment_forwarding: { label: 'Will forward attachments', severity: 'medium' },
    large_recipient_list: { label: 'Large number of recipients', severity: 'high' },
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
      relative overflow-hidden rounded-2xl border transition-all duration-500
      ${isPending ? 'border-white/10 bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] shadow-[0_0_40px_rgba(59,130,246,0.06)]' : ''}
      ${isApproved || isExecuting ? 'border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-[#0d0d0d] to-[#0a0a0a] shadow-[0_0_40px_rgba(59,130,246,0.12)]' : ''}
      ${isDone ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-[#0d0d0d] to-[#0a0a0a]' : ''}
      ${isFailed ? 'border-red-500/30 bg-gradient-to-br from-red-950/20 via-[#0d0d0d] to-[#0a0a0a]' : ''}
      ${isRejected ? 'border-white/5 bg-[#0a0a0a] opacity-60' : ''}
    `}>
            {/* Execution progress bar */}
            {isExecuting && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 transition-all duration-700 animate-pulse"
                        style={{ width: `${executionProgress || 30}%` }}
                    />
                </div>
            )}

            <div className="p-5 space-y-4">
                {/* Header: Goal + Status */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`
              flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
              ${isPending ? 'bg-blue-500/10 border border-blue-500/20' : ''}
              ${isApproved || isExecuting ? 'bg-blue-500/20 border border-blue-500/30' : ''}
              ${isDone ? 'bg-emerald-500/20 border border-emerald-500/30' : ''}
              ${isFailed ? 'bg-red-500/20 border border-red-500/30' : ''}
              ${isRejected ? 'bg-white/5 border border-white/10' : ''}
            `}>
                            {isPending && <Target className="w-4.5 h-4.5 text-blue-400" />}
                            {isExecuting && <Loader2 className="w-4.5 h-4.5 text-blue-400 animate-spin" />}
                            {isDone && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />}
                            {isFailed && <XCircle className="w-4.5 h-4.5 text-red-400" />}
                            {isRejected && <XCircle className="w-4.5 h-4.5 text-white/40" />}
                            {isApproved && !isExecuting && <Zap className="w-4.5 h-4.5 text-blue-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Mission Plan</span>
                                {plan.confidence < 0.7 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                                        Low confidence
                                    </span>
                                )}
                            </div>
                            <h3 className="text-white font-semibold text-[15px] leading-snug">{plan.goal}</h3>
                        </div>
                    </div>

                    {/* Status badge */}
                    <div className={`
            flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider
            ${isPending ? 'bg-white/5 text-white/50 border border-white/10' : ''}
            ${isExecuting ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : ''}
            ${isDone ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : ''}
            ${isFailed ? 'bg-red-500/15 text-red-400 border border-red-500/20' : ''}
            ${isRejected ? 'bg-white/5 text-white/30 border border-white/5' : ''}
            ${isApproved && !isExecuting ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' : ''}
          `}>
                        {isPending && 'Awaiting'}
                        {isExecuting && 'Running'}
                        {isDone && 'Complete'}
                        {isFailed && 'Failed'}
                        {isRejected && 'Cancelled'}
                        {isApproved && !isExecuting && 'Approved'}
                    </div>
                </div>

                {/* Steps: "What I will do" */}
                <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-white/30">What I'll do</span>
                    <div className="space-y-1.5">
                        {plan.steps.map((step, i) => (
                            <div key={i} className="flex items-start gap-2.5 group">
                                <div className={`
                  flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold mt-0.5
                  ${isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                                        isExecuting && executionProgress && (i / plan.steps.length * 100) < executionProgress
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                                            : 'bg-white/5 text-white/40 border border-white/10'}
                `}>
                                    {isDone || (isExecuting && executionProgress && (i / plan.steps.length * 100) < (executionProgress || 0))
                                        ? <CheckCircle2 className="w-3 h-3" />
                                        : i + 1}
                                </div>
                                <span className="text-white/80 text-sm leading-relaxed">{step}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tools */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-white/30 mr-1">Tools</span>
                    {plan.tools.map((tool) => {
                        const toolInfo = TOOL_LABELS[tool];
                        if (!toolInfo) return null;
                        return (
                            <span
                                key={tool}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${toolInfo.color}`}
                            >
                                {toolInfo.icon}
                                {toolInfo.label}
                            </span>
                        );
                    })}
                </div>

                {/* Draft Preview */}
                {plan.draft_preview && (
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowDraftPreview(!showDraftPreview)}
                            className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-white/30 hover:text-white/50 transition-colors"
                        >
                            <Mail className="w-3.5 h-3.5" />
                            Draft Preview
                            {showDraftPreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {showDraftPreview && (
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-white/40 w-12">To:</span>
                                        <span className="text-white/80">{plan.draft_preview.to.join(', ')}</span>
                                    </div>
                                    {plan.draft_preview.cc.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-white/40 w-12">Cc:</span>
                                            <span className="text-white/80">{plan.draft_preview.cc.join(', ')}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-white/40 w-12">Subject:</span>
                                        <span className="text-white/90 font-medium">{plan.draft_preview.subject}</span>
                                    </div>
                                </div>
                                <div className="border-t border-white/[0.06] pt-3">
                                    <pre className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap font-sans">{plan.draft_preview.body}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Invite Preview */}
                {plan.invite_preview && (
                    <div className="space-y-2">
                        <button
                            onClick={() => setShowInvitePreview(!showInvitePreview)}
                            className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-white/30 hover:text-white/50 transition-colors"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            Meeting Invite Preview
                            {showInvitePreview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {showInvitePreview && (
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2 text-sm">
                                    <Video className="w-4 h-4 text-blue-400" />
                                    <span className="text-white/90 font-medium">{plan.invite_preview.title}</span>
                                </div>
                                <div className="text-xs text-white/60 space-y-1">
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
                                            <span className="text-blue-400">{plan.invite_preview.meet_link}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Risk Flags */}
                {plan.risk_flags.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400/60 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" />
                            Risk Flags
                        </span>
                        <div className="space-y-1.5">
                            {plan.risk_flags.map((flag) => {
                                const info = RISK_LABELS[flag];
                                if (!info) return null;
                                return (
                                    <div
                                        key={flag}
                                        className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border
                      ${info.severity === 'high' ? 'bg-red-500/5 border-red-500/15 text-red-400/80' :
                                                info.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/15 text-amber-400/80' :
                                                    'bg-white/[0.02] border-white/10 text-white/50'}`}
                                    >
                                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                        {info.label}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Questions for User */}
                {plan.questions_for_user.length > 0 && (
                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 space-y-2">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-blue-400/60">Before I proceed</span>
                        <ul className="space-y-1.5">
                            {plan.questions_for_user.map((q, i) => (
                                <li key={i} className="text-sm text-blue-300/80 flex items-start gap-2">
                                    <span className="text-blue-500/60 mt-0.5">?</span>
                                    {q}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Assumptions */}
                {plan.assumptions.length > 0 && (
                    <div className="text-[11px] text-white/30">
                        <span className="font-bold uppercase tracking-wider">Assumptions:</span>{' '}
                        {plan.assumptions.join(' · ')}
                    </div>
                )}

                {/* Edit Instructions */}
                {editMode && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                        <textarea
                            value={editInstructions}
                            onChange={(e) => setEditInstructions(e.target.value)}
                            placeholder="Tell me how to adjust the plan..."
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/30 resize-none min-h-[80px] font-sans"
                            autoFocus
                        />
                        <div className="flex items-center gap-2 justify-end">
                            <button
                                onClick={() => { setEditMode(false); setEditInstructions(''); }}
                                className="px-3 py-1.5 text-xs text-white/50 hover:text-white/80 transition-colors rounded-lg hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEdit}
                                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Update Plan
                            </button>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {isPending && !editMode && (
                    <div className="flex items-center gap-2 pt-1">
                        <button
                            onClick={() => onApprove(plan.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98]"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve & Run
                        </button>
                        <button
                            onClick={() => setEditMode(true)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 rounded-xl text-sm font-medium transition-all duration-300 active:scale-[0.98]"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit
                        </button>
                        <button
                            onClick={() => onReject(plan.id)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-white/40 hover:text-red-400 rounded-xl text-sm transition-all duration-300 active:scale-[0.98]"
                        >
                            <XCircle className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
