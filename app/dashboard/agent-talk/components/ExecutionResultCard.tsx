"use client";

import {
    CheckCircle2, XCircle, FileText, Mail, Calendar,
    ExternalLink, Clock, RotateCcw
} from 'lucide-react';
import type { ExecutionResult } from '../types/mission';

interface ExecutionResultCardProps {
    result: ExecutionResult;
}

export function ExecutionResultCard({ result }: ExecutionResultCardProps) {
    return (
        <div className={`
      rounded-xl border overflow-hidden font-sans transition-all duration-300
      ${result.success
                ? 'border-emerald-500/15 bg-[#0c0c0c]'
                : 'border-red-500/15 bg-[#0c0c0c]'}
    `}>
            {/* Top accent line */}
            <div className={`h-[2px] ${result.success ? 'bg-emerald-400/30' : 'bg-red-400/30'}`} />

            <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className={`
            w-7 h-7 rounded-lg flex items-center justify-center
            ${result.success ? 'bg-emerald-500/10' : 'bg-red-500/10'}
          `}>
                        {result.success
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <div>
                        <h3 className="text-white/80 font-medium text-[14px] tracking-[-0.01em]">
                            {result.success ? 'Done' : 'Something went wrong'}
                        </h3>
                    </div>
                </div>

                {/* Changes */}
                {result.changes.length > 0 && (
                    <div className="space-y-1.5 pl-10">
                        {result.changes.map((change, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400/50 flex-shrink-0 mt-[3px]" />
                                <span className="text-white/55 text-[13px] leading-relaxed">{change}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Artifacts */}
                {result.artifacts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-10">
                        {result.artifacts.map((artifact, i) => {
                            const IconComponent =
                                artifact.type === 'email' || artifact.type === 'message' ? Mail :
                                    artifact.type === 'event' || artifact.type === 'calendar' ? Calendar :
                                        FileText;
                            return (
                                <a
                                    key={i}
                                    href={artifact.url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/[0.03] text-white/40 hover:text-white/65 hover:bg-white/[0.06] transition-colors"
                                >
                                    <IconComponent className="w-2.5 h-2.5" />
                                    {artifact.label}
                                    {artifact.url && <ExternalLink className="w-2 h-2 opacity-40" />}
                                </a>
                            );
                        })}
                    </div>
                )}

                {/* Follow-up */}
                {result.next_monitoring && (
                    <div className="pl-10 flex items-start gap-2 text-[12px] text-white/30">
                        <RotateCcw className="w-3 h-3 flex-shrink-0 mt-[2px] opacity-50" />
                        <div>
                            <span>{result.next_monitoring.description}</span>
                            <span className="text-white/15 ml-1">
                                · {new Date(result.next_monitoring.check_at).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>
                )}

                {/* Error */}
                {result.error && (
                    <div className="pl-10 flex items-start gap-2 text-[12px] text-red-400/60">
                        <XCircle className="w-3 h-3 flex-shrink-0 mt-[2px]" />
                        <span>{result.error}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
