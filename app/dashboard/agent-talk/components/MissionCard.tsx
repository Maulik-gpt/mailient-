'use client';

import React, { useState } from 'react';
import {
    Target,
    ChevronDown,
    ChevronUp,
    Clock,
    CheckCircle2,
    AlertCircle,
    Archive,
    FileEdit,
    Link2,
    Sparkles,
} from 'lucide-react';
import type { Mission, MissionStatus, MissionStep } from '../types/mission';

interface MissionCardProps {
    mission: Mission;
    isCompact?: boolean;
    onStatusChange?: (missionId: string, status: MissionStatus) => void;
    onGoalEdit?: (missionId: string, newGoal: string) => void;
    onGenerateNextStep?: (missionId: string) => void;
}

const statusConfig: Record<MissionStatus, {
    label: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
}> = {
    draft: {
        label: 'Draft',
        icon: <FileEdit className="w-3 h-3" />,
        color: 'text-white/50',
        bg: 'bg-white/5',
        border: 'border-white/10',
    },
    waiting_on_user: {
        label: 'Needs your input',
        icon: <AlertCircle className="w-3 h-3" />,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
    },
    waiting_on_other: {
        label: 'Waiting on reply',
        icon: <Clock className="w-3 h-3" />,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
    },
    done: {
        label: 'Done',
        icon: <CheckCircle2 className="w-3 h-3" />,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
    },
    archived: {
        label: 'Archived',
        icon: <Archive className="w-3 h-3" />,
        color: 'text-white/30',
        bg: 'bg-white/[0.03]',
        border: 'border-white/5',
    },
};

function StepProgress({ steps }: { steps: MissionStep[] }) {
    const total = steps.length;
    const done = steps.filter(s => s.status === 'done').length;
    const progress = total > 0 ? (done / total) * 100 : 0;

    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <span className="text-[10px] text-white/30 tabular-nums">
                {done}/{total}
            </span>
        </div>
    );
}

export default function MissionCard({
    mission,
    isCompact = false,
    onStatusChange,
    onGoalEdit,
    onGenerateNextStep,
}: MissionCardProps) {
    const [isExpanded, setIsExpanded] = useState(!isCompact);
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [editedGoal, setEditedGoal] = useState(mission.goal);

    const status = statusConfig[mission.status];
    const isDone = mission.status === 'done' || mission.status === 'archived';
    const currentStep = mission.steps.find(s => s.status === 'running');
    const nextPendingStep = mission.steps.find(s => s.status === 'pending');

    const handleGoalSave = () => {
        onGoalEdit?.(mission.id, editedGoal);
        setIsEditingGoal(false);
    };

    return (
        <div
            className={`ml-[60px] mb-5 rounded-2xl border transition-all duration-300 ${isDone ? 'border-white/5 opacity-70' : 'border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                }`}
        >
            {/* Header */}
            <div
                className="flex items-start gap-3 px-5 py-4 cursor-pointer bg-[#0a0a0a] rounded-t-2xl"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Mission icon */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Target className="w-4 h-4 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Goal */}
                    {isEditingGoal ? (
                        <div className="flex items-center gap-2">
                            <input
                                value={editedGoal}
                                onChange={(e) => setEditedGoal(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGoalSave()}
                                onBlur={handleGoalSave}
                                className="flex-1 bg-[#151515] border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500/40"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <h3
                            className="text-white text-sm font-semibold leading-snug truncate pr-4"
                            onDoubleClick={() => !isDone && setIsEditingGoal(true)}
                        >
                            {mission.goal}
                        </h3>
                    )}

                    {/* Status badge + thread count */}
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${status.bg} ${status.border} border ${status.color}`}>
                            {status.icon}
                            {status.label}
                        </span>
                        {mission.linkedThreadIds.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-white/25">
                                <Link2 className="w-2.5 h-2.5" />
                                {mission.linkedThreadIds.length} thread{mission.linkedThreadIds.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Step progress bar */}
                    {mission.steps.length > 0 && (
                        <div className="mt-2.5">
                            <StepProgress steps={mission.steps} />
                        </div>
                    )}
                </div>

                {/* Expand chevron */}
                <button className="text-white/20 hover:text-white/40 transition-colors mt-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-5 pb-4 bg-[#080808] rounded-b-2xl border-t border-white/5 animate-in fade-in duration-200">
                    {/* Steps list */}
                    {mission.steps.length > 0 && (
                        <div className="mt-3 space-y-1">
                            {mission.steps.map((step, i) => (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-3 py-1.5 ${step.status === 'running' ? 'opacity-100' : step.status === 'done' ? 'opacity-60' : 'opacity-35'
                                        }`}
                                >
                                    {step.status === 'done' ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    ) : step.status === 'running' ? (
                                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                    ) : step.status === 'failed' ? (
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-white/15 flex-shrink-0" />
                                    )}
                                    <span
                                        className={`text-xs ${step.status === 'done'
                                                ? 'text-white/40 line-through decoration-white/15'
                                                : step.status === 'running'
                                                    ? 'text-white/80'
                                                    : 'text-white/30'
                                            }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Current activity */}
                    {currentStep && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-blue-400/70 bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">
                            <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            {currentStep.label}
                        </div>
                    )}

                    {/* Generate next step button */}
                    {!isDone && nextPendingStep && (
                        <button
                            onClick={() => onGenerateNextStep?.(mission.id)}
                            className="mt-3 flex items-center gap-2 text-xs text-white/40 hover:text-white/70 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 rounded-lg px-3 py-2 transition-all duration-200 w-full justify-center"
                        >
                            <Sparkles className="w-3 h-3" />
                            Run next step
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
