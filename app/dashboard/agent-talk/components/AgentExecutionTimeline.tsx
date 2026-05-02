'use client';

/**
 * AgentExecutionTimeline — Phase 3: Premium Minimalist Aesthetic
 * 
 * Features:
 * - Shimmering text (ShiningText) for active steps
 * - V3 Verb forms for completed steps
 * - Expandable output/summaries
 * - Minimalist design with zero "heavy" labels
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  Search, Mail, Zap, FileText, Calendar, ListTodo, Database, BrainCircuit, Sparkles, CheckCircle2 
} from 'lucide-react';
import { ShiningText } from '@/components/ui/shining-text';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'tool_error' | 'approval' | 'respond' | 'message';
  tool?: string;
  label: string;
  context?: string; // Detailed context (e.g. search query, internal thought)
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

// ─── Constants ─────────────────────────────────────────────────────────────

const toolIcons: Record<string, React.ReactNode> = {
  search_inbox: <Search className="w-3.5 h-3.5" />,
  read_email: <Mail className="w-3.5 h-3.5" />,
  send_email: <Zap className="w-3.5 h-3.5" />,
  save_draft: <FileText className="w-3.5 h-3.5" />,
  schedule_meeting: <Calendar className="w-3.5 h-3.5" />,
  check_availability: <Calendar className="w-3.5 h-3.5" />,
  create_task: <ListTodo className="w-3.5 h-3.5" />,
  notion_create_page: <Database className="w-3.5 h-3.5" />,
  notion_search: <Database className="w-3.5 h-3.5" />,
  think: <BrainCircuit className="w-3.5 h-3.5" />,
  respond: <Sparkles className="w-3.5 h-3.5" />,
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Formats tool names into V3 (Past Participle) or Active (Present Continuous)
 */
const formatVerb = (tool: string, status: string, label: string) => {
  const name = tool.replace(/_/g, ' ');
  
  if (status === 'active') {
    if (name.includes('search')) return `Searching Inbox...`;
    if (name.startsWith('read')) return 'Reading Email...';
    if (name.startsWith('send')) return 'Sending Email...';
    if (name.startsWith('save')) return 'Saving Draft...';
    if (name.startsWith('schedule')) return 'Scheduling Meeting...';
    if (name.startsWith('check')) return 'Checking Availability...';
    if (name.startsWith('create')) return 'Creating Task...';
    return `${name.charAt(0).toUpperCase() + name.slice(1)}ing...`;
  }

  if (status === 'completed') {
    if (name.includes('search')) return 'Searched Inbox';
    if (name.startsWith('read')) return 'Read Email';
    if (name.startsWith('send')) return 'Sent Email';
    if (name.startsWith('save')) return 'Saved Draft';
    if (name.startsWith('schedule')) return 'Scheduled Meeting';
    if (name.startsWith('check')) return 'Checked Availability';
    if (name.startsWith('create')) return 'Created Task';
    return `${name.charAt(0).toUpperCase() + name.slice(1)}ed`;
  }

  return label || name;
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function AgentExecutionTimeline({
  steps,
  isActive,
}: AgentExecutionTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps.length, isActive]);

  if (steps.length === 0) return null;

  return (
    <div className="w-full mt-4 space-y-4 max-w-full">
      <AnimatePresence initial={false}>
        {steps.map((step, idx) => {
          const isTool = step.type === 'tool_call' || step.type === 'tool_result';
          const isThinking = step.type === 'thinking';
          const isLast = idx === steps.length - 1;
          const isActiveStep = step.status === 'active';
          
          if (isThinking && !step.label) return null;
          if (isThinking && (step.label === 'Reasoning...' || step.label === 'Processing...')) return null;

          const displayLabel = isTool 
            ? formatVerb(step.tool || '', step.status, step.label) 
            : step.label;

          return (
            <motion.div
              key={step.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="group flex flex-col gap-2"
            >
              <div className="flex items-center gap-3">
                {/* Minimal Icon/Status */}
                <div className={cn(
                  "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500",
                  isActiveStep 
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-black shadow-sm" 
                    : "bg-neutral-100 dark:bg-white/5 text-neutral-400 dark:text-white/20"
                )}>
                  {isActiveStep ? (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      {isTool ? toolIcons[step.tool || 'default'] : <BrainCircuit className="w-3.5 h-3.5" />}
                    </motion.div>
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Step Text & Context */}
                <div className="flex-1 min-w-0">
                  {isActiveStep ? (
                    <div className="flex flex-col gap-0.5">
                      <ShiningText text={displayLabel} />
                      {step.context && (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[12px] text-neutral-400 dark:text-white/20 italic line-clamp-1"
                        >
                          {step.context}
                        </motion.p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-neutral-500 dark:text-white/40">
                        {displayLabel}
                      </span>
                      {step.context && (
                        <span className="text-[11px] text-neutral-400/60 dark:text-white/10 italic line-clamp-1">
                          {step.context}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Result/Summary */}
              {step.summary && (
                <details className="ml-9 group/details">
                  <summary className="flex items-center gap-1.5 cursor-pointer list-none text-[11px] font-bold text-neutral-400 dark:text-white/20 hover:text-black dark:hover:text-white/50 transition-colors uppercase tracking-widest select-none">
                    <ChevronDown className="w-3 h-3 transition-transform group-open/details:rotate-180" />
                    View Details
                  </summary>
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 p-3 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-100 dark:border-white/5"
                  >
                    <p className="text-[12px] leading-relaxed text-neutral-600 dark:text-white/60">
                      {step.summary}
                    </p>
                  </motion.div>
                </details>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={bottomRef} className="h-2" />
    </div>
  );
}

export default AgentExecutionTimeline;
