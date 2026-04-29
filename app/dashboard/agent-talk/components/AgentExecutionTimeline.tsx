'use client';

/**
 * AgentExecutionTimeline — Phase 2: Live Execution Visualisation
 *
 * Shows real-time agentic steps as they stream from the SSE endpoint:
 *   thinking → tool_call → tool_result → thinking → respond
 *
 * Design: monochrome, minimal, matches the existing ThinkingLayer aesthetic.
 * After completion, collapses into a compact summary the user can expand.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Search, Mail, Calendar, FileText, Database, ListTodo,
  CheckCircle2, ChevronDown, ChevronRight, Zap, BrainCircuit,
  AlertCircle, Clock, Send, PenTool
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'tool_error' | 'approval' | 'respond';
  tool?: string;
  label: string;
  status: 'active' | 'completed' | 'error';
  summary?: string;
  startedAt: number;
  completedAt?: number;
  iteration: number;
}

interface AgentExecutionTimelineProps {
  steps: AgentStep[];
  isActive: boolean;
  runId?: string;
  totalDurationMs?: number;
}

// ─── Tool Icon Map ──────────────────────────────────────────────────────────

const toolIcons: Record<string, React.ReactNode> = {
  search_inbox: <Search className="w-3 h-3" />,
  read_email: <Mail className="w-3 h-3" />,
  send_email: <Send className="w-3 h-3" />,
  save_draft: <PenTool className="w-3 h-3" />,
  schedule_meeting: <Calendar className="w-3 h-3" />,
  check_availability: <Calendar className="w-3 h-3" />,
  create_task: <ListTodo className="w-3 h-3" />,
  notion_create_page: <Database className="w-3 h-3" />,
  notion_search: <Database className="w-3 h-3" />,
  think: <BrainCircuit className="w-3 h-3" />,
  respond: <Zap className="w-3 h-3" />,
};

const getToolIcon = (tool?: string) => {
  if (!tool) return <BrainCircuit className="w-3 h-3" />;
  return toolIcons[tool] || <Zap className="w-3 h-3" />;
};

const getToolLabel = (tool?: string) => {
  const labels: Record<string, string> = {
    search_inbox: 'Searching inbox',
    read_email: 'Reading email',
    send_email: 'Sending email',
    save_draft: 'Saving draft',
    schedule_meeting: 'Scheduling meeting',
    check_availability: 'Checking calendar',
    create_task: 'Creating task',
    notion_create_page: 'Creating Notion page',
    notion_search: 'Searching Notion',
    think: 'Reasoning',
    respond: 'Composing response',
  };
  return tool ? labels[tool] || tool : 'Processing';
};

// ─── Shimmer Label ──────────────────────────────────────────────────────────

function ShimmerLabel({ text }: { text: string }) {
  return (
    <motion.span
      className="bg-[linear-gradient(110deg,#666,35%,#fff,50%,#666,75%,#666)] bg-[length:200%_100%] bg-clip-text text-transparent"
      initial={{ backgroundPosition: '200% 0' }}
      animate={{ backgroundPosition: '-200% 0' }}
      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
    >
      {text}
    </motion.span>
  );
}

// ─── Duration Badge ─────────────────────────────────────────────────────────

function DurationBadge({ startedAt, completedAt }: { startedAt: number; completedAt?: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (completedAt) {
      setElapsed(completedAt - startedAt);
      return;
    }
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(interval);
  }, [startedAt, completedAt]);

  const format = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <span className="text-[10px] font-mono text-black/20 dark:text-white/15 tabular-nums">
      {format(elapsed)}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AgentExecutionTimeline({
  steps,
  isActive,
  runId,
  totalDurationMs,
}: AgentExecutionTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest step
  useEffect(() => {
    if (isActive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps.length, isActive]);

  // Auto-collapse after completion
  useEffect(() => {
    if (!isActive && steps.length > 0) {
      const timer = setTimeout(() => setIsExpanded(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive, steps.length]);

  if (steps.length === 0) return null;

  const completedSteps = steps.filter(s => s.status === 'completed');
  const toolCalls = steps.filter(s => s.type === 'tool_call' || s.type === 'tool_result');
  const hasErrors = steps.some(s => s.status === 'error');
  const uniqueTools = [...new Set(steps.filter(s => s.tool).map(s => s.tool!))];

  return (
    <div className="w-full mb-3">
      {/* ── Header (always visible) ──────────────────────────────────── */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 py-1.5 w-full group"
      >
        <ChevronDown
          className={cn(
            'w-3 h-3 text-black/25 dark:text-white/20 transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )}
        />

        {/* Status dot */}
        <div className={cn(
          'w-1.5 h-1.5 rounded-full',
          isActive
            ? 'bg-white dark:bg-white animate-pulse'
            : hasErrors
              ? 'bg-red-400/60'
              : 'bg-black/15 dark:bg-white/15'
        )} />

        {/* Summary text */}
        <span className="text-[11px] font-semibold tracking-widest uppercase text-black/30 dark:text-white/20 group-hover:text-black/50 dark:group-hover:text-white/40 transition-colors">
          {isActive ? (
            <ShimmerLabel text={`Agent executing · ${completedSteps.length} step${completedSteps.length !== 1 ? 's' : ''}`} />
          ) : (
            <>
              {hasErrors ? 'Completed with errors' : 'Completed'} · {completedSteps.length} step{completedSteps.length !== 1 ? 's' : ''}
              {totalDurationMs && ` · ${(totalDurationMs / 1000).toFixed(1)}s`}
            </>
          )}
        </span>

        {/* Tool icons summary (collapsed view) */}
        {!isExpanded && uniqueTools.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            {uniqueTools.slice(0, 4).map((tool, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded flex items-center justify-center text-black/20 dark:text-white/15"
              >
                {getToolIcon(tool)}
              </div>
            ))}
            {uniqueTools.length > 4 && (
              <span className="text-[10px] text-black/15 dark:text-white/10">
                +{uniqueTools.length - 4}
              </span>
            )}
          </div>
        )}
      </button>

      {/* ── Expanded Timeline ────────────────────────────────────────── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative pl-1 mt-1">
              {/* Vertical connector line */}
              <div className="absolute left-[7px] top-1 bottom-1 w-[1px] bg-black/[0.06] dark:bg-white/[0.06]" />

              <div className="space-y-0.5">
                {steps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.15 }}
                    className="relative flex items-center gap-2.5 py-1.5 pl-5"
                  >
                    {/* Step dot */}
                    <div className={cn(
                      'absolute left-[5px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full z-10',
                      step.status === 'active' && 'bg-white dark:bg-white animate-pulse',
                      step.status === 'completed' && 'bg-black/15 dark:bg-white/15',
                      step.status === 'error' && 'bg-red-400/50'
                    )} />

                    {/* Tool icon */}
                    <div className={cn(
                      'w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors',
                      step.status === 'active'
                        ? 'bg-black/[0.04] dark:bg-white/[0.06] text-black/60 dark:text-white/60'
                        : 'bg-transparent text-black/15 dark:text-white/12'
                    )}>
                      {step.status === 'error'
                        ? <AlertCircle className="w-3 h-3 text-red-400/60" />
                        : getToolIcon(step.tool)
                      }
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        'text-[12px] font-medium tracking-tight block truncate',
                        step.status === 'active' && 'text-black dark:text-white',
                        step.status === 'completed' && 'text-black/30 dark:text-white/20',
                        step.status === 'error' && 'text-red-400/70'
                      )}>
                        {step.status === 'active' ? (
                          <ShimmerLabel text={step.label} />
                        ) : (
                          step.summary || step.label
                        )}
                      </span>
                    </div>

                    {/* Duration */}
                    <DurationBadge startedAt={step.startedAt} completedAt={step.completedAt} />
                  </motion.div>
                ))}
              </div>

              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentExecutionTimeline;
