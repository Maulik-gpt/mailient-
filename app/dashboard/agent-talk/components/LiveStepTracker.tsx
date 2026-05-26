'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronRight,
  Search, Mail, Send, FileText, Calendar, Database,
  Globe, MessageSquare, Inbox, PenLine, Clock,
  LayoutTemplate, Terminal, AlertCircle,
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

// ─── Summary cleaning + snippet extraction ────────────────────────────────────

// Strip all bracket annotations like [ID: xxx], [Thread: xxx], [🔵 CLIENT THREAD], etc.
function stripBrackets(text: string): string {
  return text
    .replace(/\[[^\]]{0,80}\]/g, '')   // remove [anything up to 80 chars]
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Extract first name from "Full Name <email@domain.com>" or "Full Name" or "email@domain.com"
function extractSenderName(from: string): string {
  const stripped = stripBrackets(from).trim();
  // "Name <email>" → "Name"
  const nameMatch = stripped.match(/^([^<@]+?)\s*(?:<|$)/);
  if (nameMatch?.[1]?.trim()) return nameMatch[1].trim();
  // bare email → local part
  const emailMatch = stripped.match(/^([^@]+)@/);
  return emailMatch?.[1] ?? stripped;
}

// Parse a tier badge like "🔵 CLIENT THREAD", "🟢 REVENUE", "🟡 SCHEDULING", "GENERAL"
// into a clean human label
function tierToLabel(badge: string): string {
  const b = badge.toLowerCase();
  if (b.includes('client')) return 'Client';
  if (b.includes('revenue')) return 'Revenue';
  if (b.includes('schedul')) return 'Scheduling';
  return '';
}

// Extract tier badge from a raw block line like "[🔵 CLIENT THREAD] [ID: ...] [Thread: ...]"
function extractTier(rawLine: string): string {
  const m = rawLine.match(/\[([^\]]+(?:CLIENT|REVENUE|SCHEDULING|GENERAL)[^\]]*)\]/i);
  return m ? tierToLabel(m[1]) : '';
}

export interface ParsedSnippet {
  subject: string;
  from: string;
  tier: string;
  preview?: string;
}

// Parse email-style tool output (search_gmail, search_inbox, get_sent_emails)
// Format: numbered blocks with From:, Subject:, Date:, Preview: lines
function parseEmailSnippets(summary: string): ParsedSnippet[] {
  const blocks = summary.split(/\n(?=\d+\.\s)/).filter(Boolean);
  const results: ParsedSnippet[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    const headerLine = lines[0] || '';
    const tier = extractTier(headerLine);

    const subjectLine = lines.find(l => /^subject:/i.test(l.trim()));
    const fromLine = lines.find(l => /^from:/i.test(l.trim()));
    const previewLine = lines.find(l => /^preview:/i.test(l.trim()));

    const subject = subjectLine
      ? subjectLine.replace(/^subject:\s*/i, '').trim()
      : stripBrackets(headerLine).replace(/^\d+\.\s*/, '').trim();

    const from = fromLine
      ? extractSenderName(fromLine.replace(/^from:\s*/i, '').trim())
      : '';

    const preview = previewLine
      ? previewLine.replace(/^preview:\s*/i, '').trim().slice(0, 120)
      : undefined;

    if (subject && subject.length > 1) {
      results.push({ subject, from, tier, preview });
    }
  }

  return results.slice(0, 6);
}

// Parse calendar events output
function parseCalendarSnippets(summary: string): ParsedSnippet[] {
  const lines = summary.split('\n').filter(Boolean);
  const results: ParsedSnippet[] = [];

  for (const line of lines) {
    const clean = stripBrackets(line).trim();
    // Lines like "• Meeting with Priya — Thu Jan 16 at 2:00 PM"
    // or "1. Product Sync — Friday 9am"
    const stripped = clean.replace(/^[-•\d.)\s]+/, '').trim();
    if (stripped.length > 4 && !stripped.toLowerCase().startsWith('found') && !stripped.toLowerCase().startsWith('no event')) {
      results.push({ subject: stripped, from: '', tier: '' });
    }
  }

  return results.slice(0, 5);
}

// Parse Notion search / web search output
function parseGenericSnippets(summary: string): ParsedSnippet[] {
  const lines = summary.split('\n').filter(Boolean);
  const results: ParsedSnippet[] = [];

  for (const line of lines) {
    const clean = stripBrackets(line).trim();
    const stripped = clean
      .replace(/^[-•\d.)]+\s*/, '')
      .replace(/^(title|page|result|url|link):\s*/i, '')
      .trim();
    if (stripped.length > 6 && !/^found\s/i.test(stripped) && !/^no\s/i.test(stripped)) {
      results.push({ subject: stripped, from: '', tier: '' });
    }
  }

  return results.slice(0, 5);
}

function extractResultCount(summary?: string): number | null {
  if (!summary) return null;
  const m = summary.match(/found\s+(\d+)|(\d+)\s+(email|result|event|item|message|thread|match)/i);
  const n = parseInt(m?.[1] ?? m?.[2] ?? '', 10);
  return isNaN(n) ? null : n;
}

function getSnippets(tool: string | undefined, summary: string | undefined): ParsedSnippet[] {
  if (!summary || !tool) return [];
  const emailTools = ['search_gmail', 'search_inbox', 'get_sent_emails', 'read_email'];
  const calTools = ['get_calendar_events', 'schedule_meeting'];
  if (emailTools.includes(tool)) return parseEmailSnippets(summary);
  if (calTools.includes(tool)) return parseCalendarSnippets(summary);
  return parseGenericSnippets(summary);
}

// ─── Single expandable step card ─────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  Client:     'text-blue-400/80',
  Revenue:    'text-emerald-400/80',
  Scheduling: 'text-amber-400/80',
};

function SnippetRow({ snippet }: { snippet: ParsedSnippet }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20 mt-[7px] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[12.5px] text-black/70 dark:text-white/65 leading-snug truncate">
            {snippet.subject}
          </span>
          {snippet.from && (
            <span className="text-[11px] text-black/40 dark:text-white/30 flex-shrink-0 truncate max-w-[100px]">
              {snippet.from}
            </span>
          )}
          {snippet.tier && (
            <span className={cn('text-[10px] font-semibold flex-shrink-0', TIER_COLORS[snippet.tier] ?? 'text-black/40 dark:text-white/30')}>
              {snippet.tier}
            </span>
          )}
        </div>
        {snippet.preview && (
          <p className="text-[11px] text-black/40 dark:text-white/25 mt-0.5 leading-snug line-clamp-1">
            {snippet.preview}
          </p>
        )}
      </div>
    </div>
  );
}

function StepCard({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(false);
  const isActive = step.status === 'active';
  const isError = step.status === 'error';

  const { icon, label } = getToolMeta(step.tool);
  const resultCount = isActive ? null : extractResultCount(step.summary);
  const snippets = isActive ? [] : getSnippets(step.tool, step.summary);
  const hasDetails = snippets.length > 0;

  const resultLabel = resultCount !== null
    ? `${resultCount} result${resultCount !== 1 ? 's' : ''}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'rounded-xl border overflow-hidden transition-colors',
        isActive
          ? 'bg-black/[0.03] dark:bg-white/[0.04] border-black/10 dark:border-white/10'
          : isError
          ? 'bg-red-500/[0.04] border-red-500/20'
          : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.06] dark:border-white/[0.07]',
      )}
    >
      {/* Header row */}
      <button
        onClick={() => hasDetails && setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors',
          hasDetails ? 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer' : 'cursor-default',
        )}
      >
        {/* Tool icon */}
        <div
          className={cn(
            'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border',
            isActive
              ? 'bg-black/[0.05] dark:bg-white/[0.06] border-black/10 dark:border-white/15 text-black/70 dark:text-white/70'
              : isError
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-black/[0.03] dark:bg-white/[0.05] border-black/[0.05] dark:border-white/[0.08] text-black/50 dark:text-white/40',
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
              className="text-[13px] font-medium text-black/70 dark:text-white/60 tracking-tight block"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            >
              {label}
            </motion.span>
          ) : (
            <span className={cn(
              'text-[13px] font-medium tracking-tight block',
              isError ? 'text-red-400/70' : 'text-black/60 dark:text-white/55',
            )}>
              {label}
              {resultLabel && (
                <span className="ml-1.5 text-black/40 dark:text-white/30">— {resultLabel}</span>
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
                className="w-1 h-1 rounded-full bg-black/40 dark:bg-white/30"
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ repeat: Infinity, duration: 1.2, delay, ease: 'easeInOut' }}
              />
            ))}
          </div>
        ) : hasDetails ? (
          <div className="flex-shrink-0 text-black/30 dark:text-white/20">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        ) : null}
      </button>

      {/* Expanded snippet list */}
      <AnimatePresence initial={false}>
        {open && hasDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden border-t border-black/[0.06] dark:border-white/[0.06]"
          >
            <div className="px-3.5 pb-2 pt-1 divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {snippets.map((s, i) => (
                <SnippetRow key={i} snippet={s} />
              ))}
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
                  className="text-[13px] text-black/50 dark:text-white/35 leading-[1.7] pb-1.5"
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
