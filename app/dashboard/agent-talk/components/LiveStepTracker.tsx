'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import type { AgentStep, AgentNarrative } from './AgentExecutionTimeline';

/**
 * LiveStepTracker — a premium vertical timeline of the agent's execution.
 *
 * Each step is one row on a connected vertical rail:
 *   - completed → solid green node with a check
 *   - active    → pulsing blue node (the step running right now)
 *   - error     → red node with an ✕
 *   - pending   → hollow gray node (queued / not started yet)
 *
 * It is fed by the same `agentSteps` SSE pipeline already in ChatInterface,
 * so it updates in real time as each tool call starts and finishes.
 */

interface LiveStepTrackerProps {
  steps: AgentStep[];
  narratives?: AgentNarrative[];
  isActive: boolean;
}

type NodeState = 'completed' | 'active' | 'error' | 'pending';

function nodeState(step: AgentStep): NodeState {
  if (step.status === 'completed') return 'completed';
  if (step.status === 'error') return 'error';
  if (step.status === 'active') return 'active';
  return 'pending';
}

function StepNode({ state }: { state: NodeState }) {
  if (state === 'completed') {
    return (
      <div className="w-[18px] h-[18px] rounded-full bg-emerald-500/90 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.45)]">
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-[18px] h-[18px] rounded-full bg-red-500/90 flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.45)]">
        <X className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    );
  }

  if (state === 'active') {
    return (
      <div className="relative w-[18px] h-[18px] flex items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full bg-blue-500/30"
          animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        />
        <motion.span
          className="w-[10px] h-[10px] rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  // pending
  return (
    <div className="w-[18px] h-[18px] rounded-full border-2 border-arcus-border bg-arcus-elevated" />
  );
}

function StepRow({
  step,
  isLast,
}: {
  step: AgentStep;
  isLast: boolean;
}) {
  const state = nodeState(step);
  const isActive = state === 'active';
  const isError = state === 'error';

  const contextHint =
    step.context ||
    step.params?.query ||
    step.params?.subject ||
    step.params?.title ||
    step.params?.channel ||
    '';

  const durationSec =
    step.completedAt && step.startedAt
      ? ((step.completedAt - step.startedAt) / 1000).toFixed(1)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex gap-3 pb-3 last:pb-0"
    >
      {/* Rail + node */}
      <div className="relative flex flex-col items-center flex-shrink-0">
        <StepNode state={state} />
        {!isLast && (
          <div
            className={cn(
              'w-px flex-1 mt-1 min-h-[14px]',
              state === 'completed' ? 'bg-emerald-500/30' : 'bg-arcus-border',
            )}
          />
        )}
      </div>

      {/* Label + context */}
      <div className="flex-1 min-w-0 pt-[1px]">
        <div className="flex items-center gap-2">
          {isActive ? (
            <motion.span
              className="text-[13px] font-medium text-arcus-fg-secondary tracking-tight truncate"
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              {step.label}
            </motion.span>
          ) : (
            <span
              className={cn(
                'text-[13px] font-medium tracking-tight truncate',
                isError
                  ? 'text-red-400/70'
                  : state === 'completed'
                  ? 'text-arcus-fg-secondary'
                  : 'text-arcus-fg-muted',
              )}
            >
              {step.label}
            </span>
          )}

          {durationSec && !isActive && (
            <span className="flex-shrink-0 text-[10px] text-arcus-fg-muted font-mono tabular-nums">
              {durationSec}s
            </span>
          )}
        </div>

        {contextHint && (
          <span className="block text-[11px] text-arcus-fg-muted italic truncate mt-0.5">
            {contextHint}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function LiveStepTracker({ steps, narratives = [], isActive }: LiveStepTrackerProps) {
  // Drop bare "thinking..." placeholder steps — only real tool steps belong on the rail.
  const visible = steps.filter(s => {
    if (s.type === 'thinking') {
      const l = s.label?.toLowerCase() || '';
      return !['reasoning...', 'processing...', 'thinking...', 'analysing your request...', 'analyzing your request...'].includes(l);
    }
    return true;
  });

  if (visible.length === 0) return null;

  // Interleave any iteration-level narrative above the first step of that iteration.
  const seenIterations = new Set<number>();

  return (
    <div className="mt-1 mb-3 pl-0.5">
      <AnimatePresence initial={false}>
        {visible.map((step, idx) => {
          const isLast = idx === visible.length - 1;
          const narrative = seenIterations.has(step.iteration)
            ? undefined
            : narratives.find(n => n.iteration === step.iteration);
          if (narrative) seenIterations.add(step.iteration);

          return (
            <div key={step.id || idx}>
              {narrative?.text && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="text-[13px] text-arcus-fg-tertiary leading-[1.7] pb-2 pl-[30px]"
                >
                  {narrative.text}
                </motion.p>
              )}
              <StepRow step={step} isLast={isLast} />
            </div>
          );
        })}
      </AnimatePresence>

      {isActive && (
        <div className="flex items-center gap-1.5 pl-[30px] mt-0.5">
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-blue-400/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2, delay, ease: 'easeInOut' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default LiveStepTracker;
