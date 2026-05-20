'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Repeat, CalendarClock, ShieldCheck, History } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export interface ScheduledAgentData {
  id: string;
  name: string;
  task: string;
  scheduleLabel: string;
  cron: string;
  channel: string;
  skipConfirmations: boolean;
  status: string;
  nextRun?: string;
}

function fmt(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

// ── Detail sidebar ─────────────────────────────────────────────────────────────

function ScheduledAgentSidebar({
  data,
  onClose,
}: {
  data: ScheduledAgentData;
  onClose: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = !mounted || resolvedTheme === 'dark';

  const [skip, setSkip] = useState(data.skipConfirmations);
  const [savingSkip, setSavingSkip] = useState(false);
  const [pastRun, setPastRun] = useState<
    { at: string | null; summary: string | null; status: string } | null
  >(null);
  const [loadingRuns, setLoadingRuns] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/arcus/agents');
        const json = await res.json();
        const agent = (json.agents || []).find((a: any) => a.id === data.id);
        if (!cancelled && agent) {
          setSkip(!!agent.skip_confirmations);
          setPastRun({
            at: agent.last_run_at || null,
            summary: agent.last_report_summary || null,
            status: agent.status || data.status,
          });
        }
      } catch {
        /* keep card-provided values */
      } finally {
        if (!cancelled) setLoadingRuns(false);
      }
    })();
    return () => { cancelled = true; };
  }, [data.id, data.status]);

  const toggleSkip = async () => {
    const next = !skip;
    setSkip(next);
    setSavingSkip(true);
    try {
      await fetch('/api/arcus/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.id, skip_confirmations: next }),
      });
    } catch {
      setSkip(!next); // revert on failure
    } finally {
      setSavingSkip(false);
    }
  };

  const statusVal = pastRun?.status || data.status;

  return createPortal(
    <div className="fixed inset-0 z-[99998]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={cn(
          "absolute right-0 top-0 h-full w-full max-w-[420px] border-l flex flex-col transition-all",
          isDark 
            ? "bg-[#1A1A1A] border-white/10 text-white" 
            : "bg-[#FCFCFC] border-black/[0.08] text-neutral-900 shadow-2xl"
        )}
      >
        <div className={cn("flex items-start justify-between p-6 border-b", isDark ? "border-white/8" : "border-black/[0.06]")}>
          <div className="min-w-0">
            <p className={cn("text-[11px] font-semibold uppercase tracking-widest mb-1", isDark ? "text-white/30" : "text-neutral-400")}>
              Scheduled Background Agent
            </p>
            <h2 className={cn("text-[20px] font-bold leading-snug break-words", isDark ? "text-white/90" : "text-neutral-900")}>
              {data.name}
            </h2>
            <span
              className={cn(
                "inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide border",
                statusVal === 'paused'
                  ? (isDark ? 'bg-amber-500/15 text-amber-300 border-transparent' : 'bg-amber-50 text-amber-800 border-amber-200/60')
                  : (isDark ? 'bg-emerald-500/15 text-emerald-300 border-transparent' : 'bg-emerald-50 text-emerald-800 border-emerald-200/60')
              )}
            >
              {statusVal}
            </span>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "p-2 -mr-2 rounded-lg transition-all",
              isDark ? "text-white/40 hover:text-white/80 hover:bg-white/6" : "text-neutral-400 hover:text-neutral-800 hover:bg-black/[0.04]"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <p className={cn("text-[11px] font-semibold uppercase tracking-widest mb-2", isDark ? "text-white/30" : "text-neutral-400")}>
              What it does
            </p>
            <p className={cn("text-[13px] leading-relaxed whitespace-pre-wrap", isDark ? "text-white/70" : "text-neutral-600")}>
              {data.task}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={cn("flex items-center gap-2 text-[13px]", isDark ? "text-white/50" : "text-neutral-500")}>
                <Repeat className="w-4 h-4" /> Repeat
              </span>
              <span className={cn("text-[13px] font-semibold", isDark ? "text-white/85" : "text-neutral-800")}>
                {data.scheduleLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn("flex items-center gap-2 text-[13px]", isDark ? "text-white/50" : "text-neutral-500")}>
                <CalendarClock className="w-4 h-4" /> Next run
              </span>
              <span className={cn("text-[13px] font-semibold", isDark ? "text-white/85" : "text-neutral-800")}>
                {fmt(data.nextRun)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn("flex items-center gap-2 text-[13px]", isDark ? "text-white/50" : "text-neutral-500")}>
                <ShieldCheck className="w-4 h-4" /> Skip confirmations
              </span>
              <button
                onClick={toggleSkip}
                disabled={savingSkip}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors disabled:opacity-60",
                  skip ? 'bg-emerald-500' : (isDark ? 'bg-white/15' : 'bg-black/10')
                )}
                aria-pressed={skip}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm",
                    skip ? 'translate-x-5' : ''
                  )}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className={cn("text-[13px]", isDark ? "text-white/50" : "text-neutral-500")}>Delivery</span>
              <span className={cn("text-[13px] font-semibold capitalize", isDark ? "text-white/85" : "text-neutral-800")}>
                {data.channel}
              </span>
            </div>
          </div>

          <div>
            <p className={cn("flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest mb-3", isDark ? "text-white/30" : "text-neutral-400")}>
              <History className="w-3.5 h-3.5" /> Past runs
            </p>
            {loadingRuns ? (
              <div className={cn("h-16 rounded-xl animate-pulse", isDark ? "bg-white/5" : "bg-black/[0.03]")} />
            ) : pastRun?.at ? (
              <div className={cn("rounded-xl border p-4 transition-all", isDark ? "bg-white/5 border-white/8" : "bg-black/[0.02] border-black/[0.06]")}>
                <p className={cn("text-[12px] font-semibold", isDark ? "text-white/70" : "text-neutral-700")}>
                  {fmt(pastRun.at)}
                </p>
                {pastRun.summary && (
                  <p className={cn("text-[12px] mt-1.5 leading-relaxed line-clamp-4", isDark ? "text-white/45" : "text-neutral-500")}>
                    {pastRun.summary}
                  </p>
                )}
              </div>
            ) : (
              <p className={cn("text-[12px]", isDark ? "text-white/35" : "text-neutral-400")}>
                No runs yet — it will run at the next scheduled time.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

// ── Inline chat card ───────────────────────────────────────────────────────────

export function ScheduledAgentCard({ data }: { data: ScheduledAgentData }) {
  const [open, setOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = !mounted || resolvedTheme === 'dark';

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "mt-3 mb-1 w-full text-left p-4 rounded-2xl border transition-all duration-300",
          isDark 
            ? "bg-white/[0.04] border-white/8 hover:bg-white/[0.07] hover:border-white/15" 
            : "bg-black/[0.02] border-black/[0.06] hover:bg-black/[0.04] hover:border-black/[0.12] shadow-sm"
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Clock className={cn("w-4 h-4 flex-shrink-0", isDark ? "text-emerald-300" : "text-emerald-600")} />
          <span className={cn("text-[15px] font-bold truncate", isDark ? "text-white/90" : "text-neutral-900")}>
            {data.name}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide border",
              data.status === 'paused'
                ? (isDark ? 'bg-amber-500/15 text-amber-300 border-transparent' : 'bg-amber-50 text-amber-800 border-amber-200/60')
                : (isDark ? 'bg-emerald-500/15 text-emerald-300 border-transparent' : 'bg-emerald-50 text-emerald-800 border-emerald-200/60')
            )}
          >
            {data.status === 'paused' ? 'Paused' : 'Live'}
          </span>
        </div>
        <p className={cn("text-[12px] leading-relaxed line-clamp-2 mb-3", isDark ? "text-white/45" : "text-neutral-500")}>
          {data.task}
        </p>
        <div className="flex items-center justify-between text-[12px]">
          <span className={isDark ? "text-white/40" : "text-neutral-450"}>Repeat</span>
          <span className={cn("font-semibold", isDark ? "text-white/80" : "text-neutral-800")}>{data.scheduleLabel}</span>
        </div>
        <div className="flex items-center justify-between text-[12px] mt-1">
          <span className={isDark ? "text-white/40" : "text-neutral-450"}>Next run</span>
          <span className={cn("font-semibold", isDark ? "text-white/80" : "text-neutral-800")}>{fmt(data.nextRun)}</span>
        </div>
        <p className={cn("text-[11px] mt-3 font-medium", isDark ? "text-white/30" : "text-neutral-400")}>Click to view details →</p>
      </motion.button>

      <AnimatePresence>
        {open && <ScheduledAgentSidebar data={data} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
