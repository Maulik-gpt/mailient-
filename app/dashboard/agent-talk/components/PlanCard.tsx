'use client';

import React, { useState } from 'react';
import {
    Check,
    Edit2,
    AlertTriangle,
    Mail,
    Calendar,
    Search,
    Send,
    Shield,
    X,
    ChevronDown,
    ChevronUp,
    Users,
    Clock,
    MapPin,
} from 'lucide-react';
import type { PlanCard as PlanCardType, RiskFlag, ActionType } from '../types/mission';

interface PlanCardProps {
    card: PlanCardType;
    onApprove: (cardId: string) => void;
    onEdit: (cardId: string, updates: Partial<PlanCardType>) => void;
    onReject: (cardId: string) => void;
}

const actionLabels: Record<ActionType, { label: string; icon: React.ReactNode; color: string }> = {
    search_email: { label: 'Search Email', icon: <Search className="w-4 h-4" />, color: 'blue' },
    read_thread: { label: 'Read Thread', icon: <Mail className="w-4 h-4" />, color: 'blue' },
    draft_reply: { label: 'Draft Reply', icon: <Edit2 className="w-4 h-4" />, color: 'purple' },
    send_email: { label: 'Send Email', icon: <Send className="w-4 h-4" />, color: 'emerald' },
    get_availability: { label: 'Check Availability', icon: <Clock className="w-4 h-4" />, color: 'amber' },
    create_meeting: { label: 'Schedule Meeting', icon: <Calendar className="w-4 h-4" />, color: 'green' },
    schedule_check: { label: 'Schedule Follow-up', icon: <Clock className="w-4 h-4" />, color: 'orange' },
    clarify: { label: 'Clarify', icon: <AlertTriangle className="w-4 h-4" />, color: 'yellow' },
};

const riskLabels: Record<RiskFlag, { label: string; severity: 'low' | 'medium' | 'high' }> = {
    new_recipient: { label: 'New recipient', severity: 'low' },
    external_domain: { label: 'External domain', severity: 'medium' },
    mentions_money: { label: 'Mentions money', severity: 'high' },
    mentions_legal: { label: 'Legal content', severity: 'high' },
    mentions_medical: { label: 'Medical content', severity: 'high' },
    attachment_forwarding: { label: 'Attachment forwarding', severity: 'medium' },
    large_recipient_list: { label: 'Many recipients', severity: 'medium' },
};

export default function PlanCard({ card, onApprove, onEdit, onReject }: PlanCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedBody, setEditedBody] = useState(card.body || '');
    const [editedSubject, setEditedSubject] = useState(card.subject || '');
    const [showDetails, setShowDetails] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    const action = actionLabels[card.actionType] || actionLabels.clarify;
    const hasRisks = card.safetyFlags && card.safetyFlags.length > 0;
    const isAlreadyHandled = card.status === 'approved' || card.status === 'rejected';

    const handleApprove = () => {
        setIsApproving(true);
        if (isEditing) {
            onEdit(card.id, { body: editedBody, subject: editedSubject, status: 'edited' });
            setIsEditing(false);
        }
        onApprove(card.id);
        setTimeout(() => setIsApproving(false), 1500);
    };

    const handleReject = () => {
        onReject(card.id);
    };

    const colorClass = action.color;

    return (
        <div
            className={`relative ml-[60px] mb-5 rounded-2xl overflow-hidden border transition-all duration-300 ${isAlreadyHandled
                    ? 'border-white/5 opacity-60'
                    : `border-${colorClass}-500/20 shadow-[0_0_30px_rgba(0,0,0,0.3)]`
                }`}
        >
            {/* Gradient top accent */}
            <div
                className={`h-[2px] bg-gradient-to-r from-transparent via-${colorClass}-500/60 to-transparent`}
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#0c0c0c]">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-8 h-8 rounded-lg bg-${colorClass}-500/15 border border-${colorClass}-500/20 flex items-center justify-center text-${colorClass}-400`}
                    >
                        {action.icon}
                    </div>
                    <div>
                        <h3 className="text-white text-sm font-semibold">{action.label}</h3>
                        {card.confidence !== undefined && (
                            <span className="text-[11px] text-white/30">
                                Confidence: {Math.round(card.confidence * 100)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Status badge */}
                {isAlreadyHandled && (
                    <span
                        className={`text-[11px] px-2.5 py-1 rounded-full ${card.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                    >
                        {card.status === 'approved' ? 'Approved' : 'Dismissed'}
                    </span>
                )}
            </div>

            {/* Content Preview */}
            <div className="px-5 py-4 bg-[#080808]">
                {/* Recipients */}
                {card.recipients && card.recipients.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-3.5 h-3.5 text-white/25" />
                        <span className="text-xs text-white/40">To:</span>
                        <span className="text-xs text-white/70">{card.recipients.join(', ')}</span>
                    </div>
                )}

                {/* Subject */}
                {card.subject && (
                    <div className="mb-3">
                        {isEditing ? (
                            <input
                                value={editedSubject}
                                onChange={(e) => setEditedSubject(e.target.value)}
                                className="w-full bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 transition-colors"
                                placeholder="Subject..."
                            />
                        ) : (
                            <div className="text-sm text-white/80 font-medium">{card.subject}</div>
                        )}
                    </div>
                )}

                {/* Body */}
                {card.body && (
                    <div>
                        {isEditing ? (
                            <textarea
                                value={editedBody}
                                onChange={(e) => setEditedBody(e.target.value)}
                                className="w-full min-h-[120px] bg-[#151515] border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 resize-none focus:outline-none focus:border-blue-500/40 transition-colors font-sans leading-relaxed"
                                placeholder="Email body..."
                            />
                        ) : (
                            <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                {card.body}
                            </div>
                        )}
                    </div>
                )}

                {/* Meeting Details */}
                {card.meetingDetails && (
                    <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-3.5 h-3.5 text-white/30" />
                            <span className="text-white/70">{card.meetingDetails.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Users className="w-3.5 h-3.5 text-white/30" />
                            <span className="text-white/60">{card.meetingDetails.attendees.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-3.5 h-3.5 text-white/30" />
                            <span className="text-white/60">{card.meetingDetails.slot} ({card.meetingDetails.duration} min)</span>
                        </div>
                        {card.meetingDetails.location && (
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-3.5 h-3.5 text-white/30" />
                                <span className="text-white/60">{card.meetingDetails.location}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Expandable Details (Assumptions, Questions) */}
                {(card.assumptions?.length > 0 || card.questionsForUser?.length > 0) && (
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center gap-1.5 mt-3 text-[11px] text-white/25 hover:text-white/40 transition-colors"
                    >
                        {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showDetails ? 'Hide' : 'Show'} details
                    </button>
                )}

                {showDetails && (
                    <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        {card.assumptions?.length > 0 && (
                            <div>
                                <div className="text-[11px] text-white/30 mb-1 uppercase tracking-wider">Assumptions</div>
                                <ul className="space-y-1">
                                    {card.assumptions.map((a, i) => (
                                        <li key={i} className="text-xs text-white/40 flex items-start gap-1.5">
                                            <span className="text-white/15 mt-0.5">•</span>
                                            {a}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {card.questionsForUser?.length > 0 && (
                            <div>
                                <div className="text-[11px] text-white/30 mb-1 uppercase tracking-wider">Questions</div>
                                <ul className="space-y-1">
                                    {card.questionsForUser.map((q, i) => (
                                        <li key={i} className="text-xs text-amber-400/60 flex items-start gap-1.5">
                                            <span className="text-amber-500/30 mt-0.5">?</span>
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Risk flags */}
            {hasRisks && (
                <div className="px-5 py-2.5 bg-[#0a0a0a] border-t border-white/5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Shield className="w-3 h-3 text-amber-500/50" />
                        {card.safetyFlags.map((flag) => {
                            const risk = riskLabels[flag];
                            return (
                                <span
                                    key={flag}
                                    className={`text-[10px] px-2 py-0.5 rounded-full border ${risk.severity === 'high'
                                            ? 'bg-red-500/10 text-red-400/70 border-red-500/15'
                                            : risk.severity === 'medium'
                                                ? 'bg-amber-500/10 text-amber-400/70 border-amber-500/15'
                                                : 'bg-white/5 text-white/40 border-white/10'
                                        }`}
                                >
                                    {risk.label}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            {!isAlreadyHandled && (
                <div className="flex items-center justify-end gap-2 px-5 py-3 bg-[#060606] border-t border-white/5">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-200 border border-white/5"
                    >
                        <Edit2 className="w-3 h-3" />
                        {isEditing ? 'Preview' : 'Edit'}
                    </button>
                    <button
                        onClick={handleReject}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 hover:text-red-400 bg-white/[0.03] hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-white/5 hover:border-red-500/20"
                    >
                        <X className="w-3 h-3" />
                        Dismiss
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={isApproving}
                        className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isApproving
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            }`}
                    >
                        {isApproving ? (
                            <>
                                <Check className="w-3 h-3" />
                                Approved
                            </>
                        ) : (
                            <>
                                <Check className="w-3 h-3" />
                                Approve
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
