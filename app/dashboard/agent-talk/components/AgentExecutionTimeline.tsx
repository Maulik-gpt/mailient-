'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Search, Mail, Send, FileText, Calendar, Database,
  BrainCircuit, Sparkles, CheckCircle2, Globe, MessageSquare,
  Inbox, PenLine, Clock, LayoutTemplate,
} from 'lucide-react';
import { ShiningText } from '@/components/ui/shining-text';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentStep {
  id: string;
  type: 'thinking' | 'tool_call' | 'tool_result' | 'tool_error' | 'approval' | 'respond' | 'message';
  tool?: string;
  label: string;
  context?: string;
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

// ─── Tool metadata ──────────────────────────────────────────────────────────

const TOOL_META: Record<string, { icon: React.ReactNode; color: string; activeVerb: string; doneVerb: string }> = {
  // Gmail
  search_gmail:     { icon: <Search className="w-3.5 h-3.5" />,      color: 'text-blue-400',   activeVerb: 'Searching inbox',      doneVerb: 'Searched inbox' },
  read_email:       { icon: <Mail className="w-3.5 h-3.5" />,         color: 'text-blue-400',   activeVerb: 'Reading email',         doneVerb: 'Read email' },
  get_sent_emails:  { icon: <Inbox className="w-3.5 h-3.5" />,        color: 'text-blue-400',   activeVerb: 'Studying writing style', doneVerb: 'Studied writing style' },
  draft_reply:      { icon: <PenLine className="w-3.5 h-3.5" />,      color: 'text-amber-400',  activeVerb: 'Drafting reply',        doneVerb: 'Drafted reply' },
  send_email:       { icon: <Send className="w-3.5 h-3.5" />,         color: 'text-green-400',  activeVerb: 'Sending email',         doneVerb: 'Sent email' },
  // Calendar
  schedule_meeting: { icon: <Calendar className="w-3.5 h-3.5" />,     color: 'text-violet-400', activeVerb: 'Scheduling meeting',    doneVerb: 'Scheduled meeting' },
  get_calendar_events: { icon: <Clock className="w-3.5 h-3.5" />,     color: 'text-violet-400', activeVerb: 'Reading calendar',      doneVerb: 'Read calendar' },
  // Notion
  search_notion:    { icon: <Database className="w-3.5 h-3.5" />,     color: 'text-slate-400',  activeVerb: 'Searching Notion',      doneVerb: 'Searched Notion' },
  // Canvas
  open_canvas:      { icon: <LayoutTemplate className="w-3.5 h-3.5" />, color: 'text-orange-400', activeVerb: 'Opening canvas',     doneVerb: 'Opened canvas' },
  // Web
  web_search:       { icon: <Globe className="w-3.5 h-3.5" />,        color: 'text-cyan-400',   activeVerb: 'Searching web',         doneVerb: 'Searched web' },
  // Slack
  send_slack_message: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: 'text-pink-400', activeVerb: 'Sending Slack message', doneVerb: 'Sent Slack message' },
  // Legacy
  search_inbox:     { icon: <Search className="w-3.5 h-3.5" />,       color: 'text-blue-400',   activeVerb: 'Searching inbox',       doneVerb: 'Searched inbox' },
  save_draft:       { icon: <FileText className="w-3.5 h-3.5" />,     color: 'text-amber-400',  activeVerb: 'Saving draft',          doneVerb: 'Saved draft' },
  send_web_request: { icon: <Globe className="w-3.5 h-3.5" />,        color: 'text-cyan-400',   activeVerb: 'Fetching page',         doneVerb: 'Fetched page' },
};

function getToolMeta(toolName: string) {
  return TOOL_META[toolName] ?? {
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: 'text-white/40',
    activeVerb: `Running ${toolName.replace(/_/g, ' ')}`,
    doneVerb: `Ran ${toolName.replace(/_/g, ' ')}`,
  };
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function AgentExecutionTimeline({ steps, isActive }: AgentExecutionTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [steps.length, isActive]);

  // Filter: skip bare "Reasoning..." thinking steps — only show meaningful steps
  const visible = steps.filter(s => {
    if (s.type === 'thinking') {
      const label = s.label?.toLowerCase() || '';
      return !['reasoning...', 'processing...', 'thinking...', 'analysing your request...'].includes(label);
    }
    return true;
  });

  if (visible.length === 0) return null;

  return (
    <div className="w-full mt-3 space-y-2.5 max-w-full">
      <AnimatePresence initial={false}>
        {visible.map((step, idx) => {
          const isTool = step.type === 'tool_call' || step.type === 'tool_result';
          const isActiveStep = step.status === 'active';
          const isError = step.status === 'error';
          const meta = isTool && step.tool ? getToolMeta(step.tool) : null;

          const displayLabel = isTool && meta
            ? (isActiveStep ? meta.activeVerb : meta.doneVerb)
            : step.label;

          const contextLine = step.context ||
            step.params?.query ||
            step.params?.subject ||
            step.params?.title ||
            step.params?.channel ||
            '';

          return (
            <motion.div
              key={step.id || idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-1"
            >
              {/* Main step row */}
              <div className="flex items-start gap-2.5">
                {/* Icon bubble */}
                <div className={cn(
                  'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 transition-all duration-300',
                  isActiveStep
                    ? 'bg-white/10 ring-1 ring-white/20'
                    : isError
                    ? 'bg-red-500/10 ring-1 ring-red-500/20'
                    : 'bg-white/[0.04]',
                )}>
                  {isActiveStep ? (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                      className={cn(meta?.color || 'text-white/50')}
                    >
                      {meta?.icon ?? <BrainCircuit className="w-3 h-3" />}
                    </motion.div>
                  ) : isError ? (
                    <span className="text-red-400 text-[10px]">✕</span>
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-white/20" />
                  )}
                </div>

                {/* Label + context */}
                <div className="flex-1 min-w-0 pt-0.5">
                  {isActiveStep ? (
                    <>
                      <ShiningText text={displayLabel} />
                      {contextLine && (
                        <p className="text-[11px] text-white/25 mt-0.5 truncate italic">
                          {contextLine}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <span className={cn(
                        'text-[13px] font-medium',
                        isError ? 'text-red-400/70' : 'text-white/35',
                      )}>
                        {displayLabel}
                      </span>
                      {contextLine && (
                        <span className="block text-[11px] text-white/15 truncate italic">
                          {contextLine}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Duration badge for completed steps */}
                {!isActiveStep && step.completedAt && step.startedAt && (
                  <span className="flex-shrink-0 text-[10px] text-white/15 font-mono mt-0.5">
                    {((step.completedAt - step.startedAt) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              {/* Result summary — always visible when present, no click required */}
              {step.summary && !isActiveStep && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                  className="ml-7 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[12px] text-white/40 leading-relaxed"
                >
                  {step.summary}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}

export default AgentExecutionTimeline;
