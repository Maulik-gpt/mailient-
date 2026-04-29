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
  AlertCircle, Clock, Send, PenTool, Globe, ChevronUp
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
  search_inbox: <Search className="w-3.5 h-3.5" />,
  read_email: <Mail className="w-3.5 h-3.5" />,
  send_email: <Send className="w-3.5 h-3.5" />,
  save_draft: <PenTool className="w-3.5 h-3.5" />,
  schedule_meeting: <Calendar className="w-3.5 h-3.5" />,
  check_availability: <Calendar className="w-3.5 h-3.5" />,
  create_task: <ListTodo className="w-3.5 h-3.5" />,
  notion_create_page: <Database className="w-3.5 h-3.5" />,
  notion_search: <Database className="w-3.5 h-3.5" />,
  think: <BrainCircuit className="w-3.5 h-3.5" />,
  respond: <Zap className="w-3.5 h-3.5" />,
  default: <Globe className="w-3.5 h-3.5" />,
};

const getToolIcon = (tool?: string) => {
  if (!tool) return <BrainCircuit className="w-3.5 h-3.5" />;
  return toolIcons[tool] || toolIcons.default;
};

// ─── Glowing Dot ────────────────────────────────────────────────────────────

function GlowingDot({ active, error }: { active?: boolean, error?: boolean }) {
  if (error) {
    return (
      <div className="relative flex h-3 w-3 items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
      </div>
    );
  }
  
  if (active) {
    return (
      <div className="relative flex h-3 w-3 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
      </div>
    );
  }
  
  return (
    <div className="relative flex h-3 w-3 items-center justify-center">
      <CheckCircle2 className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
    </div>
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

  useEffect(() => {
    if (isActive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps.length, isActive]);

  if (steps.length === 0) return null;

  // Group steps by iteration
  const iterations = steps.reduce((acc, step) => {
    const iter = step.iteration;
    if (!acc[iter]) acc[iter] = [];
    acc[iter].push(step);
    return acc;
  }, {} as Record<number, AgentStep[]>);

  const iterationEntries = Object.entries(iterations).sort(([a], [b]) => Number(a) - Number(b));
  const hasErrors = steps.some(s => s.status === 'error');

  return (
    <div className="w-full mt-2 font-sans">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col space-y-4 pl-1 pb-2">
              {iterationEntries.map(([iterNum, iterSteps], iterIndex) => {
                const isLastIteration = iterIndex === iterationEntries.length - 1;
                const isIterActive = isActive && isLastIteration;
                
                // Find thought and tool calls within this iteration
                const thoughts = iterSteps.filter(s => s.type === 'thinking');
                const toolCalls = iterSteps.filter(s => s.type === 'tool_call' || s.type === 'tool_result');
                const iterError = iterSteps.some(s => s.status === 'error');

                // Determine the group heading (could be the first thought or a generic label)
                const heading = thoughts.length > 0 ? 'Executing task loop' : `Step ${Number(iterNum) + 1}`;

                return (
                  <div key={iterNum} className="relative flex flex-col gap-3">
                    
                    {/* Vertical Connecting Line */}
                    {!isLastIteration && (
                      <div className="absolute left-[5.5px] top-6 bottom-[-24px] w-[1px] bg-neutral-200 dark:bg-[#333]" />
                    )}

                    {/* Group Header */}
                    <div className="flex items-center gap-3">
                      <div className="z-10 bg-white dark:bg-[#1a1a1a] py-1">
                        <GlowingDot active={isIterActive} error={iterError} />
                      </div>
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 cursor-pointer">
                        {heading} <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                      </span>
                    </div>

                    {/* Group Content */}
                    <div className="pl-[26px] flex flex-col gap-3">
                      {/* Tool Calls (Pills) */}
                      {toolCalls.map((tc, tcIndex) => (
                        <div key={tc.id} className="flex items-center">
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium",
                            tc.status === 'active' 
                              ? "bg-neutral-100 dark:bg-[#2c2c2c] border-neutral-200 dark:border-[#444] text-neutral-800 dark:text-neutral-300"
                              : tc.status === 'error'
                                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
                                : "bg-neutral-50 dark:bg-[#222] border-neutral-200 dark:border-[#333] text-neutral-600 dark:text-neutral-400"
                          )}>
                            <div className="text-neutral-500 dark:text-neutral-400">
                              {getToolIcon(tc.tool)}
                            </div>
                            <span>{tc.label}</span>
                          </div>
                        </div>
                      ))}

                      {/* Thoughts (Paragraphs) */}
                      {thoughts.map((thought, tIndex) => (
                         // Only show thought if it has substantial content and isn't just "Reasoning..."
                         thought.label && thought.label !== 'Reasoning...' && thought.label !== 'Processing...' && (
                           <div key={thought.id} className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed pr-4">
                             {thought.label}
                           </div>
                         )
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Final active state ("Thinking") */}
              {isActive && (
                <div className="relative flex items-center gap-3 pt-2">
                  <div className="z-10 bg-white dark:bg-[#1a1a1a] py-1">
                    <GlowingDot active={true} />
                  </div>
                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    Thinking
                  </span>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse/Expand Toggle (for completed states) */}
      {!isActive && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 py-2 w-fit group text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
        >
          {isExpanded ? 'Collapse timeline' : 'Show timeline'}
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", !isExpanded && "-rotate-90")} />
        </button>
      )}
    </div>
  );
}

export default AgentExecutionTimeline;
