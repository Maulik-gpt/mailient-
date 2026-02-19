"use client";

import { useState } from 'react';
import {
    Clock, AlertCircle, CheckCircle2, Archive,
    ChevronDown, ChevronUp, User, Mail,
    ArrowRight, Zap, FileText, MoreHorizontal
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

const STATUS_CONFIG: Record<MissionStatus, { label: string; color: string; dotColor: string }> = {
    active: {
        label: 'In progress',
        color: 'text-white/70',
        dotColor: 'bg-white/70'
    },
    waiting_on_other: {
        label: 'Waiting',
        color: 'text-white/40',
        dotColor: 'bg-zinc-600'
    },
    needs_user: {
        label: 'Action needed',
        color: 'text-white',
        dotColor: 'bg-white animate-pulse'
    },
    done: {
        label: 'Done',
        color: 'text-white/40',
        dotColor: 'bg-zinc-500'
    },
    archived: {
        label: 'Archived',
        color: 'text-white/20',
        dotColor: 'bg-white/10'
    }
};

const PRIORITY_COLORS: Record<MissionPriority, string> = {
    high: 'text-white/80',
    normal: 'text-white/40',
    low: 'text-white/20',
};

function isAtRisk(mission: Mission): boolean {
    if (mission.status === 'done' || mission.status === 'archived') return false;

    const now = new Date();

    if (mission.due_at) {
        const dueDate = new Date(mission.due_at);
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntilDue <= 48 && hoursUntilDue > 0) return true;
    }

    if (mission.status === 'waiting_on_other' && mission.last_activity_at) {
        const lastActivity = new Date(mission.last_activity_at);
        const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 3) return true;
    }

    if (mission.status === 'needs_user' && mission.last_activity_at) {
        const lastActivity = new Date(mission.last_activity_at);
        const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 1) return true;
    }

    return false;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      rounded-xl border transition-all duration-300 overflow-hidden font-sans
      ${atRisk
                ? 'border-white/20 bg-[#0c0c0c]'
                : 'border-white/[0.06] bg-[#0c0c0c]'}
      hover:border-white/[0.1]
    `}>
            <div className="p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                {/* Status */}
                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${statusConfig.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                                    {statusConfig.label}
                                </span>

                                {/* At risk */}
                                {atRisk && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/50">
                                        <AlertCircle className="w-2.5 h-2.5" />
                                        Overdue
                                    </span>
                                )}

                                {/* Due date */}
                                {mission.due_at && (
                                    <span className="text-[10px] text-white/25">
                                        Due {new Date(mission.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}

                                {/* Priority indicator for high */}
                                {mission.priority === 'high' && (
                                    <span className="text-[10px] text-white/60 font-medium">High priority</span>
                                )}
                            </div>

                            <h3 className="text-white/85 font-medium text-sm leading-snug tracking-[-0.01em]">{mission.title}</h3>
                            {mission.goal && (
                                <p className="text-white/35 text-[12px] mt-0.5 leading-relaxed">{mission.goal}</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                        {!isCompact && (
                            <button
                                onClick={() => setShowMore(!showMore)}
                                className="p-1.5 rounded-lg hover:bg-white/[0.04] text-white/20 hover:text-white/50 transition-colors"
                            >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1.5 rounded-lg hover:bg-white/[0.04] text-white/20 hover:text-white/50 transition-colors"
                        >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>

                {/* More actions */}
                {showMore && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-top-1 duration-150">
                        {mission.status !== 'done' && onMarkDone && (
                            <button
                                onClick={() => { onMarkDone(mission.mission_id); setShowMore(false); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-colors"
                            >
                                <CheckCircle2 className="w-3 h-3" />
                                Mark done
                            </button>
                        )}
                        {onArchive && (
                            <button
                                onClick={() => { onArchive(mission.mission_id); setShowMore(false); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/70 transition-colors"
                            >
                                <Archive className="w-3 h-3" />
                                Archive
                            </button>
                        )}
                    </div>
                )}

                {/* Progress */}
                {totalSteps > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-white/25 font-medium">
                            <span>{completedSteps}/{totalSteps} steps</span>
                            <span>{Math.round((completedSteps / totalSteps) * 100)}%</span>
                        </div>
                        <div className="h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${mission.status === 'done' ? 'bg-white/40' : 'bg-white/20'
                                    }`}
                                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Expanded */}
                {isExpanded && (
                    <div className="space-y-3 pt-1 animate-in slide-in-from-top-1 duration-200">
                        {/* Next Action */}
                        {mission.next_action_reason && mission.status !== 'done' && (
                            <div className="bg-white/[0.025] border border-white/[0.05] rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowRight className="w-3 h-3 text-white/40" />
                                    <span className="text-[10px] font-medium text-white/25">Next step</span>
                                </div>
                                <p className="text-white/55 text-[12px] leading-relaxed pl-5">{mission.next_action_reason}</p>
                            </div>
                        )}

                        {/* Participants */}
                        {mission.participants.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {mission.participants.slice(0, 4).map((p, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md bg-white/[0.03] text-[11px] text-white/45">
                                        <User className="w-2.5 h-2.5 opacity-50" />
                                        {p.display_name || p.email}
                                    </span>
                                ))}
                                {mission.participants.length > 4 && (
                                    <span className="text-[11px] text-white/20">+{mission.participants.length - 4}</span>
                                )}
                            </div>
                        )}

                        {/* Linked Threads */}
                        {mission.linked_threads.length > 0 && (
                            <div className="space-y-1">
                                {mission.linked_threads.slice(0, 3).map((thread) => (
                                    <button
                                        key={thread.thread_id}
                                        onClick={() => onViewThread?.(thread.thread_id)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors text-left group"
                                    >
                                        <Mail className="w-3 h-3 text-white/20 flex-shrink-0 group-hover:text-white/40 transition-colors" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white/50 text-[12px] truncate group-hover:text-white/70 transition-colors">
                                                {thread.messages[0]?.subject || 'Thread'}
                                            </p>
                                        </div>
                                        <span className="text-[10px] text-white/15">{thread.messages.length}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Artifacts */}
                        {mission.artifacts.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {mission.artifacts.map((artifact, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-[3px] rounded-md bg-white/[0.03] text-[10px] text-white/35">
                                        <FileText className="w-2.5 h-2.5 opacity-50" />
                                        {artifact.type}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Next Step CTA */}
                        {mission.status !== 'done' && mission.status !== 'archived' && onGenerateNextStep && (
                            <button
                                onClick={() => onGenerateNextStep(mission.mission_id)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg text-[12px] text-white/45 hover:text-white/70 font-medium transition-all duration-200 active:scale-[0.99]"
                            >
                                <Zap className="w-3 h-3" />
                                Continue
                            </button>
                        )}

                        {/* Activity */}
                        <div className="text-[10px] text-white/15 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Updated {timeAgo(mission.last_activity_at)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
