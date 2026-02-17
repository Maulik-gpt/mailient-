"use client";

import { useState } from 'react';
import {
    Target, Clock, AlertCircle, CheckCircle2, Archive,
    ChevronDown, ChevronUp, User, Mail, Calendar,
    ArrowRight, Zap, FileText, MoreHorizontal, Trash2
} from 'lucide-react';
import type { Mission, MissionStatus, MissionPriority } from '../types/mission';

interface MissionCardProps {
    mission: Mission;
    onGenerateNextStep?: (missionId: string) => void;
    onMarkDone?: (missionId: string) => void;
    onArchive?: (missionId: string) => void;
    onViewThread?: (threadId: string) => void;
    isCompact?: boolean;
}

const STATUS_CONFIG: Record<MissionStatus, { label: string; color: string; icon: React.ReactNode }> = {
    active: {
        label: 'Active',
        color: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        icon: <Zap className="w-3.5 h-3.5" />
    },
    waiting_on_other: {
        label: 'Waiting',
        color: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        icon: <Clock className="w-3.5 h-3.5" />
    },
    needs_user: {
        label: 'Needs You',
        color: 'bg-red-500/10 border-red-500/20 text-red-400',
        icon: <AlertCircle className="w-3.5 h-3.5" />
    },
    done: {
        label: 'Done',
        color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />
    },
    archived: {
        label: 'Archived',
        color: 'bg-white/5 border-white/10 text-white/40',
        icon: <Archive className="w-3.5 h-3.5" />
    }
};

const PRIORITY_DOTS: Record<MissionPriority, string> = {
    high: 'bg-red-500',
    normal: 'bg-blue-500',
    low: 'bg-white/30',
};

function isAtRisk(mission: Mission): boolean {
    if (mission.status === 'done' || mission.status === 'archived') return false;

    const now = new Date();

    // Due within 48 hours and not done
    if (mission.due_at) {
        const dueDate = new Date(mission.due_at);
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilDue <= 48 && hoursUntilDue > 0) return true;
    }

    // Waiting on other and stale > 3 business days
    if (mission.status === 'waiting_on_other' && mission.last_activity_at) {
        const lastActivity = new Date(mission.last_activity_at);
        const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 3) return true;
    }

    // Needs user and stale > 1 day
    if (mission.status === 'needs_user' && mission.last_activity_at) {
        const lastActivity = new Date(mission.last_activity_at);
        const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 1) return true;
    }

    return false;
}

export function MissionCard({
    mission,
    onGenerateNextStep,
    onMarkDone,
    onArchive,
    onViewThread,
    isCompact = false
}: MissionCardProps) {
    const [isExpanded, setIsExpanded] = useState(!isCompact);
    const [showMore, setShowMore] = useState(false);

    const statusConfig = STATUS_CONFIG[mission.status];
    const atRisk = isAtRisk(mission);

    const completedSteps = mission.execution_steps.filter(s => s.status === 'done').length;
    const totalSteps = mission.execution_steps.length;

    return (
        <div className={`
      rounded-2xl border transition-all duration-300 overflow-hidden
      ${atRisk
                ? 'border-red-500/20 bg-gradient-to-br from-red-950/10 via-[#0d0d0d] to-[#0a0a0a] shadow-[0_0_30px_rgba(239,68,68,0.06)]'
                : 'border-white/[0.06] bg-gradient-to-br from-[#0d0d0d] via-[#0f0f0f] to-[#0a0a0a]'}
      hover:border-white/10 hover:shadow-lg
    `}>
            <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Priority dot */}
                        <div className="flex-shrink-0 mt-2">
                            <div className={`w-2 h-2 rounded-full ${PRIORITY_DOTS[mission.priority]}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                {/* Status badge */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${statusConfig.color}`}>
                                    {statusConfig.icon}
                                    {statusConfig.label}
                                </span>

                                {/* At risk flag */}
                                {atRisk && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/15 border border-red-500/25 text-red-400 animate-pulse">
                                        <AlertCircle className="w-3 h-3" />
                                        At Risk
                                    </span>
                                )}

                                {/* Due date */}
                                {mission.due_at && (
                                    <span className="text-[10px] text-white/30 font-medium">
                                        Due {new Date(mission.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-white font-semibold text-sm leading-snug">{mission.title}</h3>
                            <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{mission.goal}</p>
                        </div>
                    </div>

                    {/* Expand/Collapse + More */}
                    <div className="flex items-center gap-1">
                        {!isCompact && (
                            <button
                                onClick={() => setShowMore(!showMore)}
                                className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
                        >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* More actions dropdown */}
                {showMore && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-200">
                        {mission.status !== 'done' && onMarkDone && (
                            <button
                                onClick={() => { onMarkDone(mission.mission_id); setShowMore(false); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                                <CheckCircle2 className="w-3 h-3" />
                                Mark Done
                            </button>
                        )}
                        {onArchive && (
                            <button
                                onClick={() => { onArchive(mission.mission_id); setShowMore(false); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 transition-colors"
                            >
                                <Archive className="w-3 h-3" />
                                Archive
                            </button>
                        )}
                    </div>
                )}

                {/* Progress bar */}
                {totalSteps > 0 && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-white/30 font-medium">
                            <span>{completedSteps} of {totalSteps} steps</span>
                            <span>{Math.round((completedSteps / totalSteps) * 100)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
                                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                    <div className="space-y-3 pt-1 animate-in slide-in-from-top-2 duration-200">
                        {/* Next Action */}
                        {mission.next_action_reason && mission.status !== 'done' && (
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400/60">Next Action</span>
                                </div>
                                <p className="text-white/70 text-xs leading-relaxed">{mission.next_action_reason}</p>
                            </div>
                        )}

                        {/* Participants */}
                        {mission.participants.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-white/25">People</span>
                                {mission.participants.slice(0, 4).map((p, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-white/60 border border-white/[0.06]">
                                        <User className="w-2.5 h-2.5" />
                                        {p.display_name || p.email}
                                    </span>
                                ))}
                                {mission.participants.length > 4 && (
                                    <span className="text-[11px] text-white/30">+{mission.participants.length - 4} more</span>
                                )}
                            </div>
                        )}

                        {/* Linked Threads */}
                        {mission.linked_threads.length > 0 && (
                            <div className="space-y-1.5">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-white/25">Linked Threads</span>
                                {mission.linked_threads.slice(0, 3).map((thread) => (
                                    <button
                                        key={thread.thread_id}
                                        onClick={() => onViewThread?.(thread.thread_id)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors text-left"
                                    >
                                        <Mail className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white/70 text-xs truncate">{thread.messages[0]?.subject || 'Thread'}</p>
                                            <p className="text-white/30 text-[10px]">{thread.messages.length} messages</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Artifacts */}
                        {mission.artifacts.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-white/25">Artifacts</span>
                                {mission.artifacts.map((artifact, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-white/50 border border-white/[0.06]">
                                        <FileText className="w-2.5 h-2.5" />
                                        {artifact.type}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Generate Next Step button */}
                        {mission.status !== 'done' && mission.status !== 'archived' && onGenerateNextStep && (
                            <button
                                onClick={() => onGenerateNextStep(mission.mission_id)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-xs text-white/60 hover:text-white/90 font-medium transition-all duration-300 active:scale-[0.98]"
                            >
                                <Zap className="w-3 h-3" />
                                Generate Next Step
                            </button>
                        )}

                        {/* Last activity */}
                        <div className="text-[10px] text-white/20 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Last activity {new Date(mission.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
