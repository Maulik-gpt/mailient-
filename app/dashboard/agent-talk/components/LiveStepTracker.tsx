'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronRight,
  Search, Mail, Send, FileText, Calendar, Database,
  Globe, MessageSquare, Inbox, PenLine, Clock,
  LayoutTemplate, Terminal, CheckCircle2, AlertCircle,
  Loader2,
} from 'lucide-react';
import type { AgentStep, AgentNarrative } from './AgentExecutionTimeline';

// ─── Tool icon + label map ────────────────────────────────────────────────────

const TOOL_META: Record<string, { icon: React.ReactNode; label: string }> = {
  search_gmail:        { icon: <Mail className="w-4 h-4" />,          label: 'Searching Gmail' },
  search_inbox:        { icon: <Search className="w-4 h-4" />,         label: 'Searching Inbox' },
  read_email:          { icon: <Mail className="w-4 h-4" />,           label: 'Reading Email' },
  get_sent_emails:     { icon: <Inbox className="w-4 h-4" />,          label: 'Fetching Sent Emails' },
  draft_reply:         { icon: <PenLine className="w-4 h-4" />,        label: 'Drafting Reply' },
  save_draft:          { icon: <PenLine className="w-4 h-4" />,        label: 'Saving Draft' },
  send_email:          { icon: <Send className="w-4 h-4" />,           label: 'Sending Email' },
  schedule_meeting:    { icon: <Calendar className="w-4 h-4" />,       label: 'Scheduling Meeting' },
  get_calendar_events: { icon: <Clock className="w-4 h-4" />,          label: 'Checking Calendar' },
  search_notion:       { icon: <Database className="w-4 h-4" />,       label: 'Searching Notion' },
  open_canvas:         { icon: <LayoutTemplate className="w-4 h-4" />, label: 'Opening Canvas' },
  web_search:          { icon: <Globe className="w-4 h-4" />,          label: 'Web Search' },
  send_web_request:    { icon: <Globe className="w-4 h-4" />,          label: 'Fetching Web Page' },
  send_slack_message:  { icon: <MessageSquare className="w-4 h-4" />,  label: 'Sending Slack Message' },
  read_browser_page:   { icon: <Globe className="w-4 h-4" />,          label: 'Reading Page' },
};

function getToolMeta(tool?: string) {
  if (!tool) return { icon: <Terminal className="w-4 h-4" />, label: 'Running Tool' };
  return TOOL_META[tool] ?? { icon: <Terminal className="w-4 h-4" />, label: tool.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
}

// ─── Extract result count from summary string ─────────────────────────────────

function extractResultCount(summary?: string): number | null {
  if (!summary) return null;
  const m = summary.match(/(\d+)\s*(email|result|event|item|message|row|record|snippet|match)/i);
  return m ? parseInt(m[1], 10) : null;
}

// ─── Extract result snippets from summary (email subjects / titles) ───────────

function extractSnippets(summary?: string): string[] {
  if (!summary) return [];
  // Lines that look like "Subject: ...", "- ...", numbered items, or quoted strings
  const lines = summary.split(/\n/).map(l => l.trim()).filter(Boolean);
  return lines
    .filter(l =>
      l.startsWith('-') ||
      l.startsWith('•') ||
      /^\d+[.)]\s/.test(l) ||
      l.startsWith('"') ||
      l.toLowerCase().startsWith('subject:') ||
      l.toLowerCase().startsWith('title:') ||
      l.toLowerCase().startsWith('event:')
    )
    .map(l => l.replace(/^[-•\d.)"']+\s*/, '').replace(/^(subject|title|event):\s*/i, ''))
    .slice(0, 6);
}

// ─── Single expandable step card ─────────────────────────────────────────────

function StepCard({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(false);
  const isActive = step.status === 'active';
  const isError = step.status === 'error';

  const { icon, label } = getToolMeta(step.tool);
  const resultCount = isActive ? null : extractResultCount(step.summary);
  const snippets = isActive ? [] : extractSnippets(step.summary);
  const hasDetails = snippets.length > 0 || (step.summary && step.summary.length > 40 && !isActive);

  const resultLabel = resultCount !== null
    ? `${resultCount} result${resultCount !== 1 ? 's' : ''}`
    : step.summary && !isActive && step.summary.length < 50
    ? step.summary
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'rounded-xl border overflow-hidden transition-colors',
        isActive
          ? 'bg-white/[0.04] border-white/10'
          : isError
          ? 'bg-red-500/[0.04] border-red-500/20'
          : 'bg-white/[0.03] border-white/[0.07]',
      )}
    >
      {/* Header row */}
      <button
        onClick={() => hasDetails && setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors',
          hasDetails ? 'hover:bg-white/[0.03] cursor-pointer' : 'cursor-default',
        )}
      >
        {/* Tool icon */}
        <div
          className={cn(
            'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border',
            isActive
              ? 'bg-white/[0.06] border-white/15 text-white/70'
              : isError
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-white/[0.05] border-white/[0.08] text-white/40',
          )}
        >
          {isActive ? (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            >
              {icon}
            </motion.div>
          ) : isError ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            icon
          )}
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          {isActive ? (
            <motion.span
              className="text-[13px] font-medium text-white/60 tracking-tight block"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            >
              {label}
            </motion.span>
          ) : (
            <span className={cn(
              'text-[13px] font-medium tracking-tight block',
              isError ? 'text-red-400/70' : 'text-white/55',
            )}>
              {label}
              {resultLabel && (
                <span className={cn(
                  'ml-1.5',
                  isError ? 'text-red-400/50' : 'text-white/30',
                )}>
                  — {resultLabel}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Right side */}
        {isActive ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            {[0, 0.2, 0.4].map((delay, i) => (
              <motion.span
                key={i}
                className="w-1 h-1 rounded-full bg-white/30"
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ repeat: Infinity, duration: 1.2, delay, ease: 'easeInOut' }}
              />
            ))}
          </div>
        ) : hasDetails ? (
          <div className="flex-shrink-0 text-white/20">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        ) : null}
      </button>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {open && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="px-3.5 py-2.5 space-y-1.5">
              {snippets.length > 0 ? (
                snippets.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-white/20 mt-[7px] flex-shrink-0" />
                    <span className="text-[12px] text-white/40 leading-snug">{s}</span>
                  </div>
                ))
              ) : step.summary ? (
                <p className="text-[12px] text-white/35 leading-relaxed">{step.summary}</p>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LiveStepTracker({ steps, narratives = [], isActive }: {
  steps: AgentStep[];
  narratives?: AgentNarrative[];
  isActive: boolean;
}) {
  const visible = steps.filter(s => {
    if (s.type === 'thinking') {
      const l = s.label?.toLowerCase() || '';
      return !['reasoning...', 'processing...', 'thinking...', 'analysing your request...', 'analyzing your request...'].includes(l);
    }
    return true;
  });

  if (visible.length === 0) return null;

  const seenIterations = new Set<number>();

  return (
    <div className="mt-1 mb-3 space-y-1.5">
      <AnimatePresence initial={false}>
        {visible.map((step, idx) => {
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
                  className="text-[13px] text-white/35 leading-[1.7] pb-1.5"
                >
                  {narrative.text}
                </motion.p>
              )}
              <StepCard step={step} />
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default LiveStepTracker;
