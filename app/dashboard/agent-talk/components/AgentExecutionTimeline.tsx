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
  params?: any;
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

const formatToolLabel = (tool?: string, status?: string) => {
  if (!tool) return 'Processing...';
  const name = tool.replace(/_/g, ' ');
  
  if (status === 'active') {
    if (name.endsWith('h')) return `Searching ${name.split(' ')[1] || ''}`.trim();
    if (name.startsWith('read')) return 'Reading Email';
    if (name.startsWith('send')) return 'Sending Email';
    if (name.startsWith('save')) return 'Saving Draft';
    if (name.startsWith('schedule')) return 'Scheduling Meeting';
    if (name.startsWith('check')) return 'Checking Availability';
    if (name.startsWith('create')) return 'Creating Task';
    if (name.startsWith('notion create')) return 'Creating Page';
    if (name.startsWith('notion search')) return 'Searching Notion';
    return name.charAt(0).toUpperCase() + name.slice(1) + 'ing...';
  }

  if (status === 'completed') {
    if (name.startsWith('search')) return 'Searched Inbox';
    if (name.startsWith('read')) return 'Read Email';
    if (name.startsWith('send')) return 'Sent Email';
    if (name.startsWith('save')) return 'Saved Draft';
    if (name.startsWith('schedule')) return 'Scheduled Meeting';
    if (name.startsWith('check')) return 'Checked Availability';
    if (name.startsWith('create')) return 'Created Task';
    if (name.startsWith('notion create')) return 'Created Notion Page';
    if (name.startsWith('notion search')) return 'Searched Notion';
    return name.charAt(0).toUpperCase() + name.slice(1) + 'ed';
  }

  return name.charAt(0).toUpperCase() + name.slice(1);
};

const ShimmerStyles = () => (
  <style jsx global>{`
    .skeleton-shimmer {
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.05) 50%,
        rgba(255, 255, 255, 0) 100%
      );
      background-size: 200% 100%;
      animation: skeleton-shimmer 2s infinite linear;
    }
    @keyframes skeleton-shimmer {
      from { background-position: 200% 0; }
      to { background-position: -200% 0; }
    }
  `}</style>
);

const getToolIcon = (tool?: string) => {
  if (!tool) return <BrainCircuit className="w-3.5 h-3.5" />;
  return toolIcons[tool] || toolIcons.default;
};

// ─── Glowing Dot ────────────────────────────────────────────────────────────

function GlowingDot({ active, error }: { active?: boolean, error?: boolean }) {
  if (error) {
    return (
      <div className="relative flex h-4 w-4 items-center justify-center">
        <div className="absolute inset-0 bg-red-500/20 rounded-full blur-[2px]" />
        <div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
      </div>
    );
  }
  
  if (active) {
    return (
      <div className="relative flex h-4 w-4 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/20 opacity-75 duration-1000"></span>
        <div className="absolute inset-0 bg-white/20 rounded-full blur-[2px]" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]"></span>
      </div>
    );
  }
  
  return (
    <div className="relative flex h-4 w-4 items-center justify-center bg-black/20 dark:bg-white/5 rounded-full border border-black/10 dark:border-white/10">
      <CheckCircle2 className="h-2.5 w-2.5 text-black/40 dark:text-white/40" />
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
    <div className="w-full mt-3 font-sans max-w-[500px]">
      <ShimmerStyles />
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] p-5 backdrop-blur-md shadow-sm"
          >
            <div className="flex flex-col relative pb-2">
              {iterationEntries.map(([iterNum, iterSteps], iterIndex) => {
                const isLastIteration = iterIndex === iterationEntries.length - 1;
                const isIterActive = isActive && isLastIteration;
                
                // Find thought and tool calls within this iteration
                const thoughts = iterSteps.filter(s => s.type === 'thinking');
                const toolCalls = iterSteps.filter(s => s.type === 'tool_call' || s.type === 'tool_result');
                const iterError = iterSteps.some(s => s.status === 'error');

                // Determine the group heading
                const heading = thoughts.length > 0 ? 'Analyzing Context & Strategy' : `Execution Phase ${Number(iterNum) + 1}`;

                return (
                  <div key={iterNum} className="relative flex flex-col gap-4 pb-6">
                    
                    {/* Vertical Connecting Line */}
                    {!isLastIteration && (
                      <div className="absolute left-[7px] top-6 bottom-[4px] w-[2px] bg-gradient-to-b from-black/10 to-black/5 dark:from-white/10 dark:to-white/5 rounded-full" />
                    )}

                    {/* Group Header */}
                    <div className="flex items-center gap-3.5">
                      <div className="z-10 bg-[#f9f9f9] dark:bg-[#121212] rounded-full p-0.5 shadow-sm">
                        <GlowingDot active={isIterActive && toolCalls.length === 0} error={iterError} />
                      </div>
                      <span className="text-[13px] font-bold tracking-tight text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                        {heading} 
                      </span>
                    </div>

                    {/* Group Content */}
                    <div className="pl-[28px] flex flex-col gap-3.5">
                      {/* Thoughts (Paragraphs) */}
                      {thoughts.map((thought, tIndex) => (
                         thought.label && thought.label !== 'Reasoning...' && thought.label !== 'Processing...' && (
                           <div key={thought.id} className="text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                             {thought.label}
                           </div>
                         )
                      ))}

                      {/* Tool Calls (Premium Cards) */}
                      {toolCalls.length > 0 && (
                        <div className="flex flex-col gap-2 mt-1">
                          {toolCalls.map((tc, tcIndex) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={tc.id} 
                              className={cn(
                                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-sm transition-all",
                                tc.status === 'active' 
                                  ? "bg-white dark:bg-white/5 border-black/10 dark:border-white/10 shadow-sm overflow-hidden relative"
                                  : tc.status === 'error'
                                    ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400"
                                    : "bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 text-neutral-500 dark:text-neutral-500"
                              )}
                            >
                              {tc.status === 'active' && (
                                <div className="absolute inset-0 skeleton-shimmer z-0 opacity-40" />
                              )}
                              <div className={cn(
                                "flex items-center justify-center w-6 h-6 rounded-md relative z-10",
                                tc.status === 'active' ? "bg-black/5 dark:bg-white/10 text-black dark:text-white" : "bg-black/5 dark:bg-white/5 text-neutral-500"
                              )}>
                                {getToolIcon(tc.tool)}
                              </div>
                              <div className="flex flex-col relative z-10">
                                <span className={cn(
                                  "text-[12px] font-bold tracking-tight",
                                  tc.status === 'active' ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500"
                                )}>
                                  {formatToolLabel(tc.tool, tc.status)}
                                </span>
                                {tc.label && tc.status === 'active' && (
                                  <span className="text-[11px] text-neutral-500 font-medium line-clamp-1">{tc.label}</span>
                                )}
                              </div>
                              
                              {tc.status === 'active' && (
                                <div className="ml-auto flex items-center relative z-10">
                                  <div className="w-3.5 h-3.5 rounded-full border-[1.5px] border-black/20 dark:border-white/20 border-t-black dark:border-t-white animate-spin" />
                                </div>
                              )}
                              {tc.status === 'completed' && (
                                <div className="ml-auto relative z-10">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-black/30 dark:text-white/30" />
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Final active state ("Thinking") */}
              {isActive && (
                <div className="relative flex items-center gap-3.5 pt-1">
                  <div className="z-10 bg-[#f9f9f9] dark:bg-[#121212] rounded-full p-0.5 shadow-sm">
                    <GlowingDot active={true} />
                  </div>
                  <span className="text-[13px] font-bold tracking-tight text-neutral-800 dark:text-neutral-100 animate-pulse">
                    Synthesizing response...
                  </span>
                </div>
              )}

              <div ref={bottomRef} className="h-2" />
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
