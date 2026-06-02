'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronRight,
  Globe, Clock, LayoutTemplate, Terminal, AlertCircle, CheckCircle2,
} from 'lucide-react';
import type { AgentStep, AgentNarrative } from './AgentExecutionTimeline';
import { GmailIcon, NotionIcon, GoogleCalendarIcon, SlackIcon } from './BrandIcon';

// ─── Tool icon + label map ────────────────────────────────────────────────────
//
// For tools that hit a real third-party app, show the BRAND mark — that's
// what the user recognizes ("Arcus is touching my Notion"). For utility
// tools (canvas, web fetch, etc.) we fall back to Lucide icons.

const TOOL_META: Record<string, { icon: React.ReactNode; verb: string }> = {
  // Gmail
  search_gmail:        { icon: <GmailIcon />, verb: 'Search Gmail' },
  search_inbox:        { icon: <GmailIcon />, verb: 'Search inbox' },
  read_email:          { icon: <GmailIcon />, verb: 'Read email' },
  get_sent_emails:     { icon: <GmailIcon />, verb: 'Fetch sent emails' },
  draft_reply:         { icon: <GmailIcon />, verb: 'Draft reply' },
  save_draft:          { icon: <GmailIcon />, verb: 'Save draft' },
  send_email:          { icon: <GmailIcon />, verb: 'Send email' },
  digest_newsletters:  { icon: <GmailIcon />, verb: 'Digest newsletters' },
  check_followups:     { icon: <GmailIcon />, verb: 'Check follow-ups' },
  gmail_unlimited_search: { icon: <GmailIcon />, verb: 'Scan Gmail' },
  gmail_bulk_read_threads: { icon: <GmailIcon />, verb: 'Read threads' },
  gmail_batch_draft_replies: { icon: <GmailIcon />, verb: 'Draft replies' },
  gmail_archive_thread: { icon: <GmailIcon />, verb: 'Archive thread' },
  gmail_auto_label_threads: { icon: <GmailIcon />, verb: 'Label threads' },
  // Google Calendar
  schedule_meeting:    { icon: <GoogleCalendarIcon />, verb: 'Schedule meeting' },
  get_calendar_events: { icon: <GoogleCalendarIcon />, verb: 'Check calendar' },
  calendar_get_availability: { icon: <GoogleCalendarIcon />, verb: 'Check availability' },
  calendar_unlimited_scan: { icon: <GoogleCalendarIcon />, verb: 'Scan calendar' },
  calendar_cancel_event: { icon: <GoogleCalendarIcon />, verb: 'Cancel event' },
  // Notion
  search_notion:       { icon: <NotionIcon />, verb: 'Search Notion' },
  create_notion_page:  { icon: <NotionIcon />, verb: 'Create Notion page' },
  notion_read_page:    { icon: <NotionIcon />, verb: 'Read Notion page' },
  notion_create_task:  { icon: <NotionIcon />, verb: 'Create Notion task' },
  fetch_notion_schema: { icon: <NotionIcon />, verb: 'Read Notion schema' },
  // Slack
  send_slack_message:  { icon: <SlackIcon />, verb: 'Send Slack message' },
  slack_send_dm:       { icon: <SlackIcon />, verb: 'Send Slack DM' },
  slack_find_user:     { icon: <SlackIcon />, verb: 'Find Slack user' },
  slack_get_channels:  { icon: <SlackIcon />, verb: 'List Slack channels' },
  // Utility — Lucide
  open_canvas:         { icon: <LayoutTemplate className="w-3.5 h-3.5" />, verb: 'Open canvas' },
  update_canvas:       { icon: <LayoutTemplate className="w-3.5 h-3.5" />, verb: 'Update canvas' },
  web_search:          { icon: <Globe className="w-3.5 h-3.5" />, verb: 'Web search' },
  web_search_instant:  { icon: <Globe className="w-3.5 h-3.5" />, verb: 'Web search' },
  send_web_request:    { icon: <Globe className="w-3.5 h-3.5" />, verb: 'Fetch web page' },
  read_browser_page:   { icon: <Globe className="w-3.5 h-3.5" />, verb: 'Read page' },
};

function getToolMeta(tool?: string) {
  if (!tool) return { icon: <Terminal className="w-3.5 h-3.5" />, verb: 'Run tool' };
  return TOOL_META[tool] ?? {
    icon: <Terminal className="w-3.5 h-3.5" />,
    verb: tool.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
  };
}

// ─── Result-summary extraction (cleaned for the inline result chip) ───────────

function cleanSummaryPreview(summary?: string): string | null {
  if (!summary) return null;
  const first = summary.split('\n').find(l => l.trim()) || '';
  const clean = first.replace(/\[[^\]]{0,80}\]/g, '').replace(/\s{2,}/g, ' ').trim();
  return clean.slice(0, 180) || null;
}

function deriveHeadline(narrative: string | undefined, fallbackIteration: number): string {
  if (!narrative) return `Step ${fallbackIteration}`;
  // First sentence, max 90 chars — keeps the collapsed view tight.
  const first = narrative.split(/(?<=[.!?])\s+/)[0] || narrative;
  const trimmed = first.replace(/\s+/g, ' ').trim();
  return trimmed.length > 90 ? trimmed.slice(0, 87) + '…' : trimmed;
}

// ─── Atomic rows: reasoning, tool, loader ─────────────────────────────────────

function ReasoningRow({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 py-2"
    >
      <div className="mt-[3px] flex-shrink-0 text-black/30 dark:text-white/25">
        <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0 text-[14px] leading-[1.65] text-black/72 dark:text-white/75 whitespace-pre-wrap">
        {text}
      </div>
    </motion.div>
  );
}

function ToolRow({ step }: { step: AgentStep }) {
  const [open, setOpen] = useState(false);
  const isActive = step.status === 'active';
  const isError = step.status === 'error';
  const meta = getToolMeta(step.tool);
  const summaryPreview = !isActive && !isError ? cleanSummaryPreview(step.summary) : null;
  const hasResult = !!summaryPreview;

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="py-1.5"
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'mt-[2px] flex-shrink-0',
          isActive
            ? 'text-black/55 dark:text-white/55'
            : isError
              ? 'text-rose-500/80 dark:text-rose-400/80'
              : 'text-black/40 dark:text-white/35',
        )}>
          {isError ? <AlertCircle className="w-3.5 h-3.5" /> : meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-[14px] tracking-tight leading-snug',
            isActive
              ? 'text-black/75 dark:text-white/75 font-medium'
              : isError
                ? 'text-black/80 dark:text-zinc-200'
                : 'text-black/60 dark:text-white/55',
          )}>
            {isActive ? (
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              >
                {meta.verb}
              </motion.span>
            ) : meta.verb}
          </div>
          {hasResult && (
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              className={cn(
                'inline-flex items-center gap-1 mt-1.5 px-1.5 py-[1px] rounded',
                'bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.07] dark:hover:bg-white/[0.08]',
                'text-[10.5px] font-mono tracking-tight text-black/50 dark:text-white/45',
                'transition-colors',
              )}
            >
              {open ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              Result
            </button>
          )}
          <AnimatePresence initial={false}>
            {open && hasResult && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-2 px-2.5 py-2 rounded-md bg-black/[0.025] dark:bg-white/[0.035] border border-black/[0.05] dark:border-white/[0.05] text-[12px] text-black/55 dark:text-white/50 leading-[1.55] whitespace-pre-wrap">
                  {summaryPreview}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function DottedLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 py-3"
    >
      <div
        className="w-4 h-4 rounded-full border-[1.5px] border-dashed border-orange-400/55 dark:border-orange-300/45 animate-spin"
        style={{ animationDuration: '2.2s' }}
      />
    </motion.div>
  );
}

// ─── Per-iteration block ──────────────────────────────────────────────────────

interface IterationBlock {
  iteration: number;
  steps: AgentStep[];
  narrative?: string;
  isActive: boolean;
}

function IterationGroup({ block, isLastActive }: { block: IterationBlock; isLastActive: boolean }) {
  // Active iteration always expanded; completed ones default collapsed
  // (let user expand any of them with a click).
  const [open, setOpen] = useState(block.isActive);
  const headline = useMemo(
    () => deriveHeadline(block.narrative, block.iteration),
    [block.narrative, block.iteration],
  );

  const showCheckIcon = !block.isActive;

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-1.5 text-left py-1.5',
          'text-[13px] tracking-tight',
          open
            ? 'text-black/50 dark:text-white/45'
            : 'text-black/40 dark:text-white/35 hover:text-black/60 dark:hover:text-white/55',
          'transition-colors',
        )}
      >
        {open
          ? <ChevronDown className="w-3 h-3 flex-shrink-0 opacity-70" strokeWidth={2} />
          : <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-70" strokeWidth={2} />}
        {showCheckIcon && (
          <CheckCircle2 className="w-3 h-3 flex-shrink-0 text-black/30 dark:text-white/30" strokeWidth={1.75} />
        )}
        <span className="truncate">{headline}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="ml-[5px] pl-4 border-l border-black/[0.08] dark:border-white/[0.08]">
              {block.narrative && (
                <ReasoningRow text={block.narrative} />
              )}
              {block.steps.map((step, i) => (
                <ToolRow key={step.id || i} step={step} />
              ))}
              {block.isActive && isLastActive && <DottedLoader />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Group steps by iteration, attach narratives ──────────────────────────────

function buildBlocks(steps: AgentStep[], narratives: AgentNarrative[], isActive: boolean): IterationBlock[] {
  const visible = steps.filter(s => {
    if (s.type === 'thinking') {
      const l = s.label?.toLowerCase() || '';
      return !['reasoning...', 'processing...', 'thinking...', 'analysing your request...', 'analyzing your request...'].includes(l);
    }
    return true;
  });

  const byIteration = new Map<number, AgentStep[]>();
  const iterationOrder: number[] = [];
  for (const step of visible) {
    if (!byIteration.has(step.iteration)) {
      byIteration.set(step.iteration, []);
      iterationOrder.push(step.iteration);
    }
    byIteration.get(step.iteration)!.push(step);
  }

  const lastIteration = iterationOrder[iterationOrder.length - 1];
  return iterationOrder.map(iter => {
    const blockSteps = byIteration.get(iter)!;
    const narrative = narratives.find(n => n.iteration === iter)?.text;
    // An iteration is "active" only if the overall run is active AND it's
    // the latest iteration AND at least one of its steps is still active.
    const blockActive = isActive
      && iter === lastIteration
      && blockSteps.some(s => s.status === 'active');
    return { iteration: iter, steps: blockSteps, narrative, isActive: blockActive };
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function LiveStepTracker({ steps, narratives = [], isActive }: {
  steps: AgentStep[];
  narratives?: AgentNarrative[];
  isActive: boolean;
}) {
  const blocks = useMemo(() => buildBlocks(steps, narratives, isActive), [steps, narratives, isActive]);
  if (blocks.length === 0) return null;

  const lastActiveIteration = blocks.reduce<number | null>((acc, b) => b.isActive ? b.iteration : acc, null);

  return (
    <div className="mt-1 mb-3">
      <AnimatePresence initial={false}>
        {blocks.map((block) => (
          <IterationGroup
            key={block.iteration}
            block={block}
            isLastActive={block.iteration === lastActiveIteration}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default LiveStepTracker;
