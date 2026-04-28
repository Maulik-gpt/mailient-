'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Loader2, X, Sparkles, Maximize2, Minimize2, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlanArtifact, PlanStatus } from './PlanArtifactCard';

// Re-export types for consumers
export type { PlanArtifact, PlanStatus };

// ─── Inline Plan Card ─────────────────────────────────────────
interface PlanCanvasProps {
  plan: PlanArtifact;
  onExecute: (planId: string) => Promise<void>;
  onDecline?: (planId: string) => void;
  isProcessing?: boolean;
}

export function PlanCanvas({ plan, onExecute, onDecline, isProcessing }: PlanCanvasProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const isDraft = plan.status === 'draft' && !plan.locked;
  const isRunning = plan.status === 'executing';
  const isCompleted = plan.status === 'completed';

  const handleExecute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExecuting(true);
    try {
      await onExecute(plan.planId);
    } catch (err) {
      console.error('[PlanCanvas] Execute failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  // Build display text from the plan objective (the real AI content)
  const planText = plan.objective || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="w-full max-w-2xl my-3"
    >
      <div className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-300",
        "bg-[#0c0c0c] shadow-[0_2px_20px_rgba(0,0,0,0.4)]",
        isDraft ? "border-white/[0.08]" :
        isRunning ? "border-blue-500/20" :
        isCompleted ? "border-emerald-500/15" :
        "border-white/[0.06]"
      )}>

        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
              isRunning ? "bg-blue-500/10" :
              isCompleted ? "bg-emerald-500/10" :
              "bg-white/[0.04]"
            )}>
              {isRunning ? (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-white/30" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-bold text-white tracking-tight truncate">{plan.title}</h3>
              <StatusLabel status={plan.status} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            {/* Expand / Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/25 hover:text-white/50 transition-all"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* ── Plan Content ── */}
        <div className="px-5 pb-4">
          <div className={cn(
            "text-[13px] text-white/50 leading-[1.75] whitespace-pre-wrap transition-all duration-300",
            isExpanded ? "" : "line-clamp-4"
          )}>
            {planText}
          </div>
        </div>

        {/* ── Action Bar ── */}
        {isDraft && (
          <div className="px-5 py-3 border-t border-white/[0.04] flex items-center gap-2">
            <button
              onClick={handleExecute}
              disabled={isExecuting || isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[12px] font-bold rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-40 active:scale-[0.98]"
            >
              {isExecuting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {isExecuting ? 'Starting...' : 'Execute'}
            </button>
            {onDecline && (
              <button
                onClick={(e) => { e.stopPropagation(); onDecline(plan.planId); }}
                className="px-3 py-2 text-white/25 hover:text-white/50 text-[12px] font-bold rounded-xl hover:bg-white/[0.04] transition-all"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {isRunning && (
          <div className="px-5 py-2.5 border-t border-blue-500/10 bg-blue-500/[0.03]">
            <div className="flex items-center gap-2 text-blue-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[12px] font-bold">Executing...</span>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="px-5 py-2.5 border-t border-emerald-500/10 bg-emerald-500/[0.03]">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[12px] font-bold">Plan executed</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Status Label ─────────────────────────────────────────────
function StatusLabel({ status }: { status: PlanStatus }) {
  const config: Record<PlanStatus, { label: string; cls: string }> = {
    draft:     { label: 'Draft',     cls: 'text-amber-400/60' },
    approved:  { label: 'Approved',  cls: 'text-emerald-400/60' },
    executing: { label: 'Running',   cls: 'text-blue-400/60' },
    completed: { label: 'Done',      cls: 'text-emerald-400/60' },
    failed:    { label: 'Failed',    cls: 'text-red-400/60' },
    cancelled: { label: 'Cancelled', cls: 'text-white/20' },
  };
  const c = config[status];
  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wider", c.cls)}>
      {c.label}
    </span>
  );
}

export default PlanCanvas;
