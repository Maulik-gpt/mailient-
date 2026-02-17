"use client";

import {
    CheckCircle2, XCircle, FileText, Mail, Calendar,
    ExternalLink, Clock, ArrowRight
} from 'lucide-react';
import type { ExecutionResult } from '../types/mission';

interface ExecutionResultCardProps {
    result: ExecutionResult;
}

export function ExecutionResultCard({ result }: ExecutionResultCardProps) {
    return (
        <div className={`
      rounded-2xl border overflow-hidden
      ${result.success
                ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-950/15 via-[#0d0d0d] to-[#0a0a0a]'
                : 'border-red-500/20 bg-gradient-to-br from-red-950/15 via-[#0d0d0d] to-[#0a0a0a]'}
    `}>
            <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className={`
            w-9 h-9 rounded-xl flex items-center justify-center
            ${result.success ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-red-500/15 border border-red-500/20'}
          `}>
                        {result.success
                            ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                            : <XCircle className="w-4.5 h-4.5 text-red-400" />}
                    </div>
                    <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">
                            Execution {result.success ? 'Complete' : 'Failed'}
                        </span>
                        <h3 className="text-white font-semibold text-[15px]">
                            {result.success ? 'Actions completed successfully' : 'Some actions could not be completed'}
                        </h3>
                    </div>
                </div>

                {/* What Changed */}
                {result.changes.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-white/30">What changed</span>
                        <div className="space-y-1.5">
                            {result.changes.map((change, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <span className="text-white/80 text-sm leading-relaxed">{change}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Artifacts / Links */}
                {result.artifacts.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-white/30">References</span>
                        <div className="flex flex-wrap gap-2">
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
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/[0.08] transition-colors"
                                    >
                                        <IconComponent className="w-3 h-3" />
                                        {artifact.label}
                                        {artifact.url && <ExternalLink className="w-2.5 h-2.5 opacity-50" />}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Next Monitoring Step */}
                {result.next_monitoring && (
                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400/60 block mb-0.5">
                                Follow-up scheduled
                            </span>
                            <p className="text-blue-300/80 text-xs leading-relaxed">
                                {result.next_monitoring.description}
                            </p>
                            <p className="text-blue-400/40 text-[10px] mt-1">
                                Check at: {new Date(result.next_monitoring.check_at).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {result.error && (
                    <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3 flex items-start gap-2.5">
                        <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-300/80 text-xs leading-relaxed">{result.error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
