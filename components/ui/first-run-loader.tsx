'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Lock, MailSearch, ShieldCheck, Sparkles, Terminal } from 'lucide-react';

type TerminalStep = {
  label: string;
  detail: string;
};

interface FirstRunLoaderProps {
  steps: TerminalStep[];
  activeIndex: number;
  logLines: string[];
  progressPercent: number;
  countdown?: number | null;
}

export function FirstRunLoader({
  steps,
  activeIndex,
  logLines,
  progressPercent,
  countdown,
}: FirstRunLoaderProps) {
  const [showLogs, setShowLogs] = useState(true);
  const [localCountdown, setLocalCountdown] = useState<number | null>(null);

  const activeStep = steps[activeIndex] || steps[0];
  const effectiveCountdown = countdown ?? localCountdown;

  useEffect(() => {
    if (countdown === null || countdown === undefined) {
      setLocalCountdown(28);
      const id = setInterval(() => {
        setLocalCountdown((prev) => (prev === null ? prev : Math.max(prev - 1, 0)));
      }, 1000);
      return () => clearInterval(id);
    }
    setLocalCountdown(null);
  }, [countdown]);

  const cappedProgress = useMemo(() => Math.min(100, Math.max(progressPercent, 3)), [progressPercent]);

  return (
    <div className="w-full min-h-[70vh] rounded-[28px] bg-[#050505] relative overflow-hidden border border-white/10 shadow-[0_40px_140px_rgba(0,0,0,0.55)]">
      <div className="absolute inset-0 aurora-mask pointer-events-none" />
      <div className="absolute inset-x-10 top-8 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-70" />
      <div className="relative z-10 p-6 sm:p-8 lg:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white/70">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">Arcus AI</span>
            </span>
            <span className="hidden sm:inline text-sm text-white/50">Live inbox mapping</span>
          </div>
          <div className="flex items-center gap-3">
            {effectiveCountdown !== null && (
              <span className="text-[11px] text-white/60 font-mono bg-white/5 rounded-full px-3 py-1 border border-white/10">
                ~{String(effectiveCountdown).padStart(2, '0')}s
              </span>
            )}
            <button
              className="text-[11px] text-white/50 hover:text-white/80 transition-colors"
              onClick={() => setShowLogs((v) => !v)}
            >
              {showLogs ? 'Hide logs' : 'Show logs'}
            </button>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: Skeleton Surface */}
          <div className="glass-surface rounded-3xl p-6 sm:p-8 space-y-6 border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-white/70" />
                <p className="text-sm text-white/60 tracking-wide uppercase">Arcus AI is mapping your inbox</p>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
                <span className="text-[11px] text-emerald-100 font-mono">Secure</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-3 w-40 shimmer-line rounded-full" />
              <div className="flex gap-3">
                <div className="h-2 w-20 shimmer-line rounded-full" />
                <div className="h-2 w-14 shimmer-line rounded-full" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {[42, 38, 56].map((w, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white/[0.04] border border-white/5 p-4 relative overflow-hidden backdrop-blur-2xl"
                >
                  <div className="absolute inset-0 shimmer-soft" />
                  <div className="h-3 w-16 shimmer-line rounded-full mb-3" />
                  <div className="h-2 w-[60%] shimmer-line rounded-full" />
                  <div className="h-2 w-[45%] shimmer-line rounded-full mt-2" />
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-4 flex items-center gap-4 overflow-hidden relative backdrop-blur-2xl"
                >
                  <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-white/30 to-white/0" />
                  <div className="h-12 w-12 rounded-2xl bg-white/[0.05] shimmer-soft" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 shimmer-line rounded-full" />
                    <div className="h-2 w-2/3 shimmer-line rounded-full" />
                    <div className="h-2 w-1/3 shimmer-line rounded-full" />
                  </div>
                  <div className="h-8 w-20 rounded-xl bg-white/[0.04] shimmer-soft" />
                </div>
              ))}
            </div>
          </div>

          {/* Right: Terminal Logs */}
          <div className="h-full glass-surface rounded-3xl p-5 sm:p-6 border border-white/10 flex flex-col shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white/80">
                <Terminal className="w-4 h-4" />
                <span className="text-sm font-mono">Live run</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 text-[11px] rounded-full bg-emerald-500/15 text-emerald-100 border border-emerald-400/30">
                  {cappedProgress}% complete
                </span>
              </div>
            </div>

            <div className="relative flex-1 rounded-2xl bg-black/75 border border-white/10 overflow-hidden backdrop-blur-3xl">
              <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_70%_10%,rgba(16,185,129,0.14),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(236,72,153,0.18),transparent_30%)]" />
              <div className="relative p-5 h-full flex flex-col gap-4 font-mono text-[12px] text-white/80">
                {showLogs ? (
                  <>
                    <div className="flex items-center gap-2 text-white/60 text-[11px] uppercase tracking-[0.12em]">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Arcus AI session</span>
                    </div>
                    <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                      {logLines.map((line, idx) => (
                        <div key={`${line}-${idx}`} className="flex items-start gap-3">
                          <span className="text-white/30">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                          <div className="flex-1">
                            <span className="text-emerald-200">›</span>
                            <span className="ml-2">{line}</span>
                            {idx === logLines.length - 1 && (
                              <span className="ml-1 caret-pulse text-emerald-200">▋</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 text-white/60">
                    <ShieldCheck className="w-8 h-8 text-emerald-300" />
                    <p className="text-sm">Analysis continues quietly. You can keep working.</p>
                    <button
                      onClick={() => setShowLogs(true)}
                      className="text-[11px] px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition"
                    >
                      Show logs again
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px] text-white/60">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <Activity className="w-4 h-4 text-sky-300" />
                <div>
                  <p className="text-white/80">{activeStep?.label}</p>
                  <p className="text-white/50 text-[11px]">Step {activeIndex + 1} of {steps.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <Lock className="w-4 h-4 text-emerald-300" />
                <div>
                  <p className="text-white/80">Zero-trust fetch</p>
                  <p className="text-white/50 text-[11px]">Secure token handoff</p>
                </div>
              </div>
            </div>

            <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-500"
                style={{ width: `${cappedProgress}%`, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </div>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px] text-white/60">
              <div className="flex items-center gap-2">
                <MailSearch className="w-4 h-4" />
                <span>Decrypting metadata, scoring urgency, drafting summaries.</span>
              </div>
              <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">{activeStep?.label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
