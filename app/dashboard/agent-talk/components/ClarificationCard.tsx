'use client';

import React from 'react';
import { HelpCircle, Mail, User, Calendar, ChevronRight } from 'lucide-react';
import type { SearchCandidate, ClarificationOption } from '../types/mission';

interface ClarificationCardProps {
    question: string;
    options?: ClarificationOption[];
    emailCandidates?: SearchCandidate[];
    onSelect: (value: any) => void;
    onNone?: () => void;
}

export default function ClarificationCard({
    question,
    options,
    emailCandidates,
    onSelect,
    onNone,
}: ClarificationCardProps) {
    return (
        <div className="ml-[60px] mb-5 rounded-2xl border border-amber-500/15 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Top accent */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

            {/* Question */}
            <div className="px-5 py-4 bg-[#0c0c0c]">
                <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{question}</p>
                </div>
            </div>

            {/* Email candidates */}
            {emailCandidates && emailCandidates.length > 0 && (
                <div className="border-t border-white/5 bg-[#080808]">
                    {emailCandidates.map((candidate, i) => (
                        <button
                            key={candidate.id}
                            onClick={() => onSelect(candidate)}
                            className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.03] transition-all duration-200 border-b border-white/[0.03] last:border-0 group text-left"
                        >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Mail className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-white/80 font-medium truncate">{candidate.subject}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <User className="w-3 h-3 text-white/20" />
                                    <span className="text-xs text-white/40">{candidate.from}</span>
                                    {candidate.date && (
                                        <>
                                            <span className="text-white/10">·</span>
                                            <Calendar className="w-3 h-3 text-white/15" />
                                            <span className="text-xs text-white/25">{candidate.date}</span>
                                        </>
                                    )}
                                </div>
                                {candidate.snippet && (
                                    <p className="text-xs text-white/25 mt-1.5 line-clamp-2 leading-relaxed">
                                        {candidate.snippet}
                                    </p>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors mt-2 flex-shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {/* Generic options */}
            {options && options.length > 0 && (
                <div className="border-t border-white/5 bg-[#080808]">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => onSelect(option.value)}
                            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-all duration-200 border-b border-white/[0.03] last:border-0 group text-left"
                        >
                            <div className="flex-1">
                                <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors">
                                    {option.label}
                                </span>
                                {option.description && (
                                    <p className="text-xs text-white/30 mt-0.5">{option.description}</p>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/30 transition-colors flex-shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {/* None option */}
            {onNone && (
                <div className="border-t border-white/5 bg-[#060606]">
                    <button
                        onClick={onNone}
                        className="w-full px-5 py-2.5 text-xs text-white/25 hover:text-white/40 transition-colors text-center"
                    >
                        None of these
                    </button>
                </div>
            )}
        </div>
    );
}
