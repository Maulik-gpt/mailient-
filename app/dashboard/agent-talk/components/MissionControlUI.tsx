"use client";

import React from 'react';
import { Target, Clock, ArrowRight, User, AlertCircle, Activity, Zap, CheckCircle2, Plus } from 'lucide-react';

/**
 * 🚀 Mission Dashboard Display Component
 * Premium card-based status overview
 */
export const MissionDashboardDisplay = ({ data, onAction }: { data: any, onAction?: (action: string) => void }) => {
    if (!data) return null;

    const stats = data.stats || { active: 0, waiting: 0, atRisk: 0, completed: 0 };

    return (
        <div className="mt-6 space-y-6">
            {/* Mini Stats Bar */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Active', value: stats.active, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Waiting', value: stats.waiting, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'At Risk', value: stats.atRisk, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    { label: 'Done', value: stats.completed, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ].map((stat, i) => (
                    <div key={i} className={`${stat.bg} border border-white/5 rounded-2xl p-3 text-center backdrop-blur-sm`}>
                        <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Primary Mission Card */}
            {data.activeMissions?.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-white/40 text-[11px] uppercase tracking-widest font-bold px-1">Active Missions</h4>
                    {data.activeMissions.slice(0, 3).map((mission: any, i: number) => (
                        <div key={mission.id} className="group bg-neutral-900/50 hover:bg-neutral-800/50 border border-white/5 hover:border-blue-500/30 rounded-2xl p-4 transition-all cursor-pointer relative overflow-hidden" onClick={() => onAction?.(`work on mission ${mission.title}`)}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                        <Target size={20} />
                                    </div>
                                    <div>
                                        <h5 className="text-white font-bold group-hover:text-blue-400 transition-colors">{mission.title}</h5>
                                        <p className="text-xs text-white/50 mt-1">Next: {mission.next_step || 'Planning...'}</p>
                                    </div>
                                </div>
                                {mission.deadline && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                        <Clock size={12} className="text-white/30" />
                                        <span className="text-[10px] text-white/60 font-medium">{new Date(mission.deadline).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {[1, 2].map(j => (
                                        <div key={j} className="w-6 h-6 rounded-full bg-neutral-800 border-2 border-neutral-900 flex items-center justify-center text-[8px] text-white/40">
                                            <User size={10} />
                                        </div>
                                    ))}
                                </div>
                                <button className="text-[10px] font-bold text-blue-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    RUN AGENT <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* At Risk Alert */}
            {data.atRiskMissions?.length > 0 && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                        <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                        <h5 className="text-rose-400 font-bold text-sm">Critical: {data.atRiskMissions.length} Stuck Missions</h5>
                        <p className="text-rose-400/60 text-[11px]">Missions at risk due to inactivity. Needs attention.</p>
                    </div>
                    <button className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold rounded-xl transition-colors shadow-lg shadow-rose-500/20">
                        SOLVE
                    </button>
                </div>
            )}
        </div>
    );
};

/**
 * 🤖 Mission Agent Loop Display
 * Visualizes the Understand -> Plan -> Act cycle
 */
export const MissionAgentLoopDisplay = ({ loopResult, onReviewDraft }: { loopResult: any, onReviewDraft: (draft: any) => void }) => {
    if (!loopResult) return null;

    return (
        <div className="mt-6 space-y-4">
            <div className="bg-neutral-900/80 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                {/* Stages visualization */}
                <div className="flex border-b border-white/5">
                    {['UNDERSTAND', 'PLAN', 'ACT'].map((stage, i) => (
                        <div key={i} className="flex-1 py-3 px-4 text-center border-r last:border-0 border-white/5">
                            <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${i <= 2 ? 'bg-blue-500 animate-pulse' : 'bg-white/10'}`} />
                                <span className={`text-[9px] font-bold tracking-widest ${i <= 2 ? 'text-white' : 'text-white/20'}`}>{stage}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-5 space-y-5">
                    {/* Understanding */}
                    <div className="flex gap-4">
                        <div className="mt-1"><Activity size={16} className="text-blue-400" /></div>
                        <div>
                            <h6 className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Mission State</h6>
                            <p className="text-sm text-white/80 mt-1 leading-relaxed">{loopResult.understanding.summary}</p>
                        </div>
                    </div>

                    {/* Plan */}
                    <div className="flex gap-4">
                        <div className="mt-1"><Zap size={16} className="text-amber-400" /></div>
                        <div>
                            <h6 className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Strategy</h6>
                            <p className="text-sm text-white/80 mt-1 leading-relaxed font-medium">{loopResult.plan.nextAction}</p>
                            <p className="text-[11px] text-white/30 mt-1 italic">{loopResult.plan.reasoning}</p>
                        </div>
                    </div>

                    {/* Action Result */}
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-lg"><CheckCircle2 size={16} className="text-emerald-400" /></div>
                            <div>
                                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Status</div>
                                <div className="text-xs text-white/90 font-medium">{loopResult.action.description}</div>
                            </div>
                        </div>
                        {loopResult.action.requiresApproval && (
                            <button
                                onClick={() => onReviewDraft(loopResult.action)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                REVIEW DRAFT
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * ✨ Mission Suggestions Display
 */
export const MissionSuggestionsDisplay = ({ suggestions, onAccept }: { suggestions: any[], onAccept: (s: any) => void }) => {
    if (!suggestions?.length) return null;

    return (
        <div className="mt-6 space-y-3">
            <h4 className="text-white/40 text-[11px] uppercase tracking-widest font-bold px-1 flex items-center gap-2">
                <Zap size={12} className="text-amber-400" /> Detected Mission Opportunities
            </h4>
            <div className="grid grid-cols-1 gap-3">
                {suggestions.map((s, i) => (
                    <div key={i} className="group bg-neutral-900/50 hover:bg-neutral-800/80 border border-white/10 rounded-2xl p-4 transition-all flex items-center justify-between">
                        <div className="flex-1 pr-4">
                            <h5 className="text-sm font-bold text-white">{s.title}</h5>
                            <p className="text-[11px] text-white/50 mt-1">{s.successCondition}</p>
                        </div>
                        <button
                            onClick={() => onAccept(s)}
                            className="bg-white/10 hover:bg-blue-600 hover:text-white text-white/60 p-2 rounded-xl border border-white/10 transition-all active:scale-90"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
