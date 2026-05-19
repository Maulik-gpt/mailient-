'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Repeat, CalendarClock, ShieldCheck, History } from 'lucide-react';

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
        className="absolute right-0 top-0 h-full w-full max-w-[420px] bg-[#1A1A1A] border-l border-white/10 flex flex-col"
      >
        <div className="flex items-start justify-between p-6 border-b border-white/8">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-1">
              Scheduled Agent
            </p>
            <h2 className="text-[20px] font-bold text-white/90 leading-snug break-words">
              {data.name}
            </h2>
            <span
              className={`inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                (pastRun?.status || data.status) === 'paused'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-emerald-500/15 text-emerald-300'
              }`}
            >
              {pastRun?.status || data.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/6 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <p className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2">
              What it does
            </p>
            <p className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap">
              {data.task}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] text-white/50">
                <Repeat className="w-4 h-4" /> Repeat
              </span>
              <span className="text-[13px] font-semibold text-white/85">
                {data.scheduleLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] text-white/50">
                <CalendarClock className="w-4 h-4" /> Next run
              </span>
              <span className="text-[13px] font-semibold text-white/85">
                {fmt(data.nextRun)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] text-white/50">
                <ShieldCheck className="w-4 h-4" /> Skip confirmations
              </span>
              <button
                onClick={toggleSkip}
                disabled={savingSkip}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  skip ? 'bg-emerald-500' : 'bg-white/15'
                } disabled:opacity-60`}
                aria-pressed={skip}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    skip ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white/50">Delivery</span>
              <span className="text-[13px] font-semibold text-white/85 capitalize">
                {data.channel}
              </span>
            </div>
          </div>

          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-3">
              <History className="w-3.5 h-3.5" /> Past runs
            </p>
            {loadingRuns ? (
              <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
            ) : pastRun?.at ? (
              <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                <p className="text-[12px] font-semibold text-white/70">
                  {fmt(pastRun.at)}
                </p>
                {pastRun.summary && (
                  <p className="text-[12px] text-white/45 mt-1.5 leading-relaxed line-clamp-4">
                    {pastRun.summary}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-white/35">
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

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="mt-3 mb-1 w-full text-left p-4 bg-white/[0.04] border border-white/8 rounded-2xl hover:bg-white/[0.07] hover:border-white/15 transition-all"
      >
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-emerald-300 flex-shrink-0" />
          <span className="text-[15px] font-bold text-white/90 truncate">
            {data.name}
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              data.status === 'paused'
                ? 'bg-amber-500/15 text-amber-300'
                : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {data.status === 'paused' ? 'Paused' : 'Live'}
          </span>
        </div>
        <p className="text-[12px] text-white/45 leading-relaxed line-clamp-2 mb-3">
          {data.task}
        </p>
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-white/40">Repeat</span>
          <span className="text-white/80 font-semibold">{data.scheduleLabel}</span>
        </div>
        <div className="flex items-center justify-between text-[12px] mt-1">
          <span className="text-white/40">Next run</span>
          <span className="text-white/80 font-semibold">{fmt(data.nextRun)}</span>
        </div>
        <p className="text-[11px] text-white/30 mt-3">Click to view details →</p>
      </motion.button>

      <AnimatePresence>
        {open && <ScheduledAgentSidebar data={data} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
