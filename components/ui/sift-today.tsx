'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reply, CalendarClock, Clock, ArrowUpRight, RefreshCw, Loader2, Mail, ExternalLink, CheckCircle2, Sun, Sunrise, Sunset, Moon, AlertTriangle, Sparkles, FileText, MessageSquare, ChevronDown, X } from 'lucide-react';
import { SiftDraftModal } from '@/components/ui/sift-draft-modal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DecideItem {
  id: string;
  threadId: string;
  sender: { name: string; email: string };
  subject: string;
  reason: string;
  receivedAt: string;
  gmailUrl: string;
}
interface ShowUpItem {
  id: string;
  start: string;
  end: string | null;
  title: string;
  attendeeCount: number;
  meetLink: string | null;
  hangoutLink: string | null;
  isExternal: boolean;
}
interface ChaseItem {
  id: string;
  threadId: string;
  recipient: { name: string; email: string };
  subject: string;
  daysSilent: number;
  sentAt: string;
  gmailUrl: string;
}
interface ActionItem {
  id: string;
  text: string;
  dueAt: string | null;
  isOverdue: boolean;
  meetingTitle: string | null;
  attendees: string[];
}
interface AgentRunItem {
  id: string;
  agentName: string;
  status: 'success' | 'error' | 'transient_error' | 'running';
  summary: string | null;
  toolCalls: number;
  ranAt: string;
  artifactCounts: { gmail: number; calendar: number; notion: number; slack: number };
}

interface TodayPayload {
  decide: DecideItem[];
  showUp: ShowUpItem[];
  chase: ChaseItem[];
  actionItems: ActionItem[];
  agentRuns?: AgentRunItem[];
  emptyAll: boolean;
  generatedAt: string;
  gmailConnected: boolean;
  calendarConnected: boolean;
  needsReconnect?: { gmail?: boolean; calendar?: boolean };
}

function formatDueLabel(dueAt: string | null, isOverdue: boolean): string {
  if (!dueAt) return 'no deadline';
  if (isOverdue) {
    try {
      const days = Math.floor((Date.now() - new Date(dueAt).getTime()) / (24 * 60 * 60 * 1000));
      return days >= 1 ? `${days}d overdue` : 'overdue';
    } catch {
      return 'overdue';
    }
  }
  try {
    const d = new Date(dueAt);
    const ms = d.getTime() - Date.now();
    const hours = Math.round(ms / (60 * 60 * 1000));
    if (hours < 24) return hours <= 1 ? 'due now' : `due in ${hours}h`;
    const days = Math.round(hours / 24);
    return days === 1 ? 'due tomorrow' : `due in ${days}d`;
  } catch {
    return 'due soon';
  }
}

function formatStartTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${Math.max(1, mins)}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  } catch {
    return '';
  }
}

function senderInitial(name: string): string {
  return (name || '?').trim()[0]?.toUpperCase() || '?';
}

function aiErrorToToast(err: unknown): { title: string; description: string; durationMs: number } {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  if (msg.includes('429') || msg.includes('daily rate-limited') || msg.includes('free-models-per-day') || msg.includes('limit exceeded')) {
    return {
      title: 'AI quota hit for today',
      description: "OpenRouter's free pool reset at midnight UTC. Tap the email in Gmail directly, or upgrade for paid model fallback.",
      durationMs: 7000,
    };
  }
  if (msg.includes('rate limit') || msg.includes('models are currently busy') || msg.includes('all keys')) {
    return {
      title: 'Models are slammed right now',
      description: 'Try again in a minute — Google\'s API is throttling the free pool.',
      durationMs: 5000,
    };
  }
  if (msg.includes('token expired') || msg.includes('invalid_grant') || msg.includes('refresh failed')) {
    return {
      title: 'Gmail sign-in expired',
      description: 'Reconnect Google from the prompt-box connectors to keep drafting.',
      durationMs: 7000,
    };
  }
  return {
    title: 'Failed to generate draft reply',
    description: 'Close and try again. If it persists, the issue is on the model side.',
    durationMs: 4500,
  };
}

function linkify(text: string) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s<]+[^.,;?!)\]\s<])/g;
    return text.replace(urlRegex, (url) => {
        const displayUrl = url.length > 55 ? url.substring(0, 52) + '...' : url;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-500/30 transition-all font-medium">${displayUrl}</a>`;
    });
}

const renderMarkdown = (text: string): string => {
    if (!text) return text;
    text = text.replace(/<br\s*\/?>/gi, '\n');

    const paragraphs = text.split(/\n\n+/);
    const renderedParagraphs = paragraphs.map(para => {
        let processedPara = para.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-black dark:text-white brightness-125">$1</strong>');

        if (processedPara.includes('\n- ') || processedPara.startsWith('- ') || processedPara.includes('\n* ') || processedPara.startsWith('* ')) {
            const lines = processedPara.split('\n');
            const listItems = lines.map(line => {
                const match = line.match(/^[\s]*[-*]\s*(.*)$/);
                if (match) {
                    return `<li>${match[1]}</li>`;
                }
                return line;
            });

            let joinedList = listItems.join('\n');
            joinedList = joinedList.replace(/(<li>[\s\S]*?<\/li>(?:\n<li>[\s\S]*?<\/li>)*)/g, '<ul class="list-disc list-inside my-4 space-y-2">$1</ul>');
            return joinedList;
        }

        processedPara = linkify(processedPara);
        processedPara = processedPara.replace(/\n/g, '<br/>');

        return `<p class="mb-4 last:mb-0">${processedPara}</p>`;
    });

    return renderedParagraphs.join('');
};

interface BucketHeaderProps {
  label: string;
  count: number;
  icon: React.ReactNode;
}

function BucketHeader({ label, count, icon }: BucketHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <div className="w-7 h-7 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] flex items-center justify-center text-black/65 dark:text-white/65 ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
        {icon}
      </div>
      <h2 className="text-[11.5px] font-semibold tracking-[0.14em] uppercase text-black/55 dark:text-white/55">
        {label}
      </h2>
      {count > 0 && (
        <>
          <span className="text-[11px] text-black/25 dark:text-white/25">·</span>
          <span className="text-[11px] tabular-nums text-black/40 dark:text-white/40 font-medium">
            {count}
          </span>
        </>
      )}
    </div>
  );
}

function EmptyBucket({ message }: { message: string }) {
  return (
    <div className="py-5 px-4 rounded-2xl border border-dashed border-black/[0.06] dark:border-white/[0.06] text-[13px] text-black/35 dark:text-white/35 leading-relaxed">
      {message}
    </div>
  );
}

interface ItemCardProps {
  topLeft: string;
  topRight?: string;
  title: string;
  reason: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; href: string };
  onDismiss?: () => void;
}

function ItemCard({ topLeft, topRight, title, reason, primaryAction, secondaryAction, onDismiss }: ItemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.18 } }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -1 }}
      {...(onDismiss ? {
        drag: 'x' as const,
        dragConstraints: { left: 0, right: 0 },
        dragElastic: { left: 0.8, right: 0.04 },
        // Swipe left past the threshold to remove the card.
        onDragEnd: (_e: any, info: { offset: { x: number } }) => { if (info.offset.x < -90) onDismiss(); },
      } : {})}
      className="group relative bg-white dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl px-4 py-3.5 hover:border-black/[0.14] dark:hover:border-white/[0.14] hover:shadow-[0_2px_18px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_2px_18px_rgba(0,0,0,0.4)] transition-[border-color,box-shadow] duration-200"
    >
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          title="Dismiss (or swipe left)"
          className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center text-black/30 dark:text-white/30 opacity-0 group-hover:opacity-100 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] hover:text-black/70 dark:hover:text-white/70 transition-all"
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.25} />
        </button>
      )}
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center text-[11px] font-semibold text-black/70 dark:text-white/70 flex-shrink-0 tracking-tight">
            {senderInitial(topLeft)}
          </div>
          <span className="text-[13px] font-medium text-black/80 dark:text-white/80 truncate tracking-tight">{topLeft}</span>
        </div>
        {topRight && (
          <span className="text-[11px] tabular-nums text-black/35 dark:text-white/35 flex-shrink-0">{topRight}</span>
        )}
      </div>
      <h3 className="text-[14.5px] font-medium text-black dark:text-white truncate mb-1 tracking-tight leading-snug">{title}</h3>
      <p className="text-[12.5px] text-black/50 dark:text-white/45 mb-3 line-clamp-1 leading-relaxed">{reason}</p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-full text-[12px] font-medium !bg-black !text-white dark:!bg-white dark:!text-black hover:opacity-85 active:scale-[0.97] transition-all duration-150"
        >
          {primaryAction.label}
          <ArrowUpRight className="w-3 h-3 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-transform duration-200" strokeWidth={2.25} />
        </button>
        {secondaryAction && (
          <a
            href={secondaryAction.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
          >
            {secondaryAction.label}
            <ExternalLink className="w-3 h-3" strokeWidth={2} />
          </a>
        )}
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.04] rounded-2xl px-4 py-3.5 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-black/[0.06] dark:bg-white/[0.06]" />
        <div className="h-3 w-28 rounded bg-black/[0.06] dark:bg-white/[0.06]" />
      </div>
      <div className="h-3.5 w-3/4 rounded bg-black/[0.06] dark:bg-white/[0.06] mb-2" />
      <div className="h-3 w-1/2 rounded bg-black/[0.04] dark:bg-white/[0.04] mb-3" />
      <div className="h-7 w-24 rounded-full bg-black/[0.05] dark:bg-white/[0.05]" />
    </div>
  );
}

// "While you were away" — the command-center section. Surfaces what the user's
// scheduled agents did recently, so the FIRST thing a founder sees on HomeFeed
// is their agents' work, not just their inbox. This is the spec's core promise.

interface RunDetail {
  plan: string | null;
  tools: Array<{ label: string; count: number; ok: boolean }>;
  links: {
    gmail: Array<{ label: string; url: string }>;
    calendar: Array<{ label: string; url: string }>;
    notion: Array<{ label: string; url: string }>;
    slack: Array<{ label: string; url: string }>;
  };
}

function artifactChips(c: AgentRunItem['artifactCounts']) {
  return [
    { icon: Mail, n: c.gmail, label: c.gmail === 1 ? 'draft' : 'drafts' },
    { icon: CalendarClock, n: c.calendar, label: c.calendar === 1 ? 'event' : 'events' },
    { icon: FileText, n: c.notion, label: c.notion === 1 ? 'note' : 'notes' },
    { icon: MessageSquare, n: c.slack, label: 'Slack' },
  ].filter(x => x.n > 0);
}

// One run = one collapsible card. Collapsed: status + name + summary + chips
// (the 10-second glance). Expanded: plan -> tools -> direct links (the full
// transparency stack), fetched lazily on first open so the feed stays fast.
function AgentRunCard({ run }: { run: AgentRunItem }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(false);

  const failed = run.status === 'error' || run.status === 'transient_error';
  const running = run.status === 'running';
  const chips = artifactChips(run.artifactCounts);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !detail && !loadingDetail) {
      setLoadingDetail(true);
      setDetailError(false);
      try {
        const res = await fetch(`/api/home-feed/run-detail?runId=${encodeURIComponent(run.id)}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        setDetail({ plan: json.plan ?? null, tools: json.tools ?? [], links: json.links ?? { gmail: [], calendar: [], notion: [], slack: [] } });
      } catch {
        setDetailError(true);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const linkGroups: Array<{ key: keyof RunDetail['links']; label: string; icon: any }> = [
    { key: 'gmail', label: 'Gmail drafts', icon: Mail },
    { key: 'calendar', label: 'Calendar events', icon: CalendarClock },
    { key: 'notion', label: 'Notion pages', icon: FileText },
    { key: 'slack', label: 'Slack messages', icon: MessageSquare },
  ];
  const hasAnyLink = detail && linkGroups.some(g => detail.links[g.key]?.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.04] rounded-2xl overflow-hidden hover:border-black/[0.12] dark:hover:border-white/[0.12] transition-colors"
    >
      {/* Collapsed header — always visible, the 10-second glance */}
      <button type="button" onClick={toggle} className="w-full text-left px-4 py-3.5 group">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={cn(
            'inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0',
            failed ? 'text-amber-600 dark:text-amber-400'
              : running ? 'text-black/40 dark:text-white/40'
              : 'text-emerald-600 dark:text-emerald-400',
          )}>
            {failed ? <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} />
              : running ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />}
          </span>
          <span className="text-[13px] font-semibold text-black dark:text-white truncate">{run.agentName}</span>
          <span className="text-[11px] text-black/35 dark:text-white/35 flex-shrink-0">{formatRelative(run.ranAt)} ago</span>
          <ChevronDown className={cn('w-4 h-4 text-black/30 dark:text-white/30 transition-transform ml-auto flex-shrink-0', open && 'rotate-180')} strokeWidth={2} />
        </div>
        {run.summary && (
          <p className={cn('text-[12.5px] text-black/60 dark:text-white/60 leading-relaxed pl-7', !open && 'line-clamp-2')}>{run.summary}</p>
        )}
        {!open && (chips.length > 0 || run.toolCalls > 0) && (
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 pl-7">
            {chips.map((chip, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] text-black/45 dark:text-white/45">
                <chip.icon className="w-3 h-3" strokeWidth={1.75} />
                {chip.n} {chip.label}
              </span>
            ))}
            {chips.length === 0 && run.toolCalls > 0 && (
              <span className="text-[11px] text-black/40 dark:text-white/40">{run.toolCalls} {run.toolCalls === 1 ? 'action' : 'actions'} taken</span>
            )}
          </div>
        )}
      </button>

      {/* Expanded — the full transparency stack */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pl-11 space-y-4">
              {loadingDetail && (
                <div className="flex items-center gap-2 text-[12px] text-black/40 dark:text-white/40 pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading details…
                </div>
              )}
              {detailError && (
                <p className="text-[12px] text-black/45 dark:text-white/45 pt-1">Couldn't load the details for this run.</p>
              )}

              {detail && !loadingDetail && (
                <>
                  {/* Plan — what Arcus decided to do */}
                  {detail.plan && (
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-black/35 dark:text-white/35 mb-1.5">The plan</p>
                      <p className="text-[12.5px] text-black/65 dark:text-white/65 leading-relaxed whitespace-pre-line">{detail.plan}</p>
                    </div>
                  )}

                  {/* Tools — what actually executed */}
                  {detail.tools.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-black/35 dark:text-white/35 mb-1.5">What it did</p>
                      <ul className="space-y-1">
                        {detail.tools.map((t, i) => (
                          <li key={i} className="flex items-center gap-2 text-[12.5px] text-black/65 dark:text-white/65">
                            <span className={cn('w-1 h-1 rounded-full flex-shrink-0', t.ok ? 'bg-emerald-500/70' : 'bg-amber-500/70')} />
                            <span>{t.label}{t.count > 1 ? ` ×${t.count}` : ''}{!t.ok ? ' — failed' : ''}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Direct links — clickable artifacts */}
                  {hasAnyLink && (
                    <div>
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-black/35 dark:text-white/35 mb-1.5">Open what it made</p>
                      <div className="space-y-2">
                        {linkGroups.map(g => {
                          const items = detail.links[g.key];
                          if (!items?.length) return null;
                          return (
                            <div key={g.key}>
                              {items.map((lnk, i) => (
                                <a
                                  key={i}
                                  href={lnk.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-[12.5px] text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white py-1 group/link"
                                >
                                  <g.icon className="w-3.5 h-3.5 flex-shrink-0 text-black/40 dark:text-white/40" strokeWidth={1.75} />
                                  <span className="truncate">{lnk.label}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0 text-black/0 group-hover/link:text-black/40 dark:group-hover/link:text-white/40 transition-colors" strokeWidth={2} />
                                </a>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!detail.plan && detail.tools.length === 0 && !hasAnyLink && (
                    <p className="text-[12px] text-black/45 dark:text-white/45">This was a read-only scan — no plan, actions, or artifacts recorded.</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AgentRunsSection({ runs }: { runs: AgentRunItem[] }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.05] text-black/55 dark:text-white/55">
          <Sparkles className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <h2 className="text-[13px] font-semibold tracking-tight text-black dark:text-white">While you were away</h2>
      </div>
      <div className="space-y-2.5">
        {runs.map((run) => <AgentRunCard key={run.id} run={run} />)}
      </div>
    </section>
  );
}

// In-memory snapshot so swapping tabs (which remounts this component) is instant.
// Stale-while-revalidate: show the cached data immediately, refresh in the
// background. Lives for the page session; Refresh forces a fresh fetch.
let TODAY_CACHE: TodayPayload | null = null;

// Swipe-to-dismiss state, persisted with a TTL so a removed item doesn't come
// back on the next background refresh, but the set can't grow unbounded.
const DISMISS_KEY = 'mailient_today_dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
function loadDismissed(): Map<string, number> {
  const m = new Map<string, number>();
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}') as Record<string, number>;
    const now = Date.now();
    for (const [id, at] of Object.entries(raw)) if (now - at < DISMISS_TTL_MS) m.set(id, at);
  } catch { /* ignore */ }
  return m;
}
function persistDismissed(m: Map<string, number>) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(Object.fromEntries(m))); } catch { /* ignore */ }
}

export default function SiftToday() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<TodayPayload | null>(() => TODAY_CACHE);
  const [loading, setLoading] = useState(!TODAY_CACHE);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Map<string, number>>(() =>
    typeof window !== 'undefined' ? loadDismissed() : new Map());

  const dismissItem = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Map(prev);
      next.set(id, Date.now());
      persistDismissed(next);
      return next;
    });
  }, []);

  const [activeDraft, setActiveDraft] = useState<any>(null);
  const [isDraftingNudgeId, setIsDraftingNudgeId] = useState<string | null>(null);
  const [isDraftingDecideId, setIsDraftingDecideId] = useState<string | null>(null);
  // Re-runs the generator for the currently open draft (used by the Voice
  // Profile button to re-draft in the updated voice).
  const redraftRef = useRef<(() => void) | null>(null);

  const handleDraftNudge = async (item: ChaseItem) => {
    setIsDraftingNudgeId(item.id);
    redraftRef.current = () => handleDraftNudge(item);
    setActiveDraft({
      content: '',
      recipientName: item.recipient.name || item.recipient.email.split('@')[0] || 'Recipient',
      recipientEmail: item.recipient.email,
      senderName: session?.user?.name || '',
      subject: item.subject.startsWith('Re:') ? item.subject : `Re: ${item.subject}`,
      threadId: item.threadId,
    });

    try {
      const response = await fetch('/api/email/draft-reply?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: item.id,
          category: 'follow-up',
          emailContent: `Draft a polite follow-up nudge to ${item.recipient.name || item.recipient.email} on the thread "${item.subject}" — they haven't replied in ${item.daysSilent} days. Reference the original ask and end with one concrete CTA. Match my voice.`,
          emailSubject: item.subject,
          emailFrom: item.recipient.email
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to generate draft nudge');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setActiveDraft((prev: any) => prev ? { ...prev, content: renderMarkdown(accumulated) } : null);
        }
      }
    } catch (e) {
       console.error('Failed to generate draft nudge:', e);
       setActiveDraft(null);
       toast.error('Failed to generate draft nudge');
    } finally {
       setIsDraftingNudgeId(null);
    }
  };

  const handleDraftDecide = async (item: DecideItem) => {
    setIsDraftingDecideId(item.id);
    redraftRef.current = () => handleDraftDecide(item);
    setActiveDraft({
      content: '',
      recipientName: item.sender.name || item.sender.email.split('@')[0] || 'Recipient',
      recipientEmail: item.sender.email,
      senderName: session?.user?.name || '',
      subject: item.subject.startsWith('Re:') ? item.subject : `Re: ${item.subject}`,
      threadId: item.threadId,
    });

    try {
      const response = await fetch('/api/email/draft-reply?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: item.id,
          category: 'general',
          emailContent: `Draft a reply to ${item.sender.name || item.sender.email} about "${item.subject}". Match my voice profile and keep it under 4 sentences.`,
          emailSubject: item.subject,
          emailFrom: item.sender.email
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to generate draft reply');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setActiveDraft((prev: any) => prev ? { ...prev, content: renderMarkdown(accumulated) } : null);
        }
      }

      if (!accumulated.trim()) {
        setActiveDraft((prev: any) => prev ? {
          ...prev,
          content: renderMarkdown(`Hi ${(item.sender.name || item.sender.email).split(' ')[0]},\n\nGot your message — let me think on this and follow up shortly.\n\nBest,`),
        } : null);
        toast.warning('The AI struggled to draft a reply', {
          description: 'Showing a starter you can edit. Try again in a minute if the model was rate-limited.',
          duration: 5000,
        });
      }
    } catch (e) {
       console.error('Failed to generate draft reply:', e);
       setActiveDraft(null);
       const t = aiErrorToToast(e);
       toast.error(t.title, { description: t.description, duration: t.durationMs });
    } finally {
       setIsDraftingDecideId(null);
    }
  };

  const handleSendDraft = async (draftData: any) => {
    const response = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: draftData.recipientEmail,
        subject: draftData.subject,
        body: draftData.content,
        threadId: draftData.threadId,
        isHtml: true,
      })
    });
    if (!response.ok) throw new Error("Failed to send");
  };

  const firstName = useMemo(() => {
    const raw = session?.user?.name?.trim();
    if (raw) return raw.split(/\s+/)[0];
    const email = session?.user?.email;
    if (email) {
      const local = email.split('@')[0];
      // Strip common separators, take first chunk, capitalize
      const first = local.split(/[._\-+]/)[0];
      if (first) return first.charAt(0).toUpperCase() + first.slice(1);
    }
    return '';
  }, [session]);

  const load = useCallback(async (opts?: { background?: boolean }) => {
    const bg = !!opts?.background;
    if (!bg) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/home-feed/today', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) {
        if (!bg) setError(json.error || 'Failed to load.');
        return;
      }
      TODAY_CACHE = json as TodayPayload;
      setData(json as TodayPayload);
    } catch (e: any) {
      if (!bg) setError(e?.message || 'Network error.');
    } finally {
      if (!bg) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If a snapshot is already cached, show it instantly and revalidate quietly —
    // tab swaps no longer wait ~7s. First-ever load shows the skeleton.
    load({ background: !!TODAY_CACHE });
  }, [load]);

  const openArcus = (prompt: string) => {
    try {
      sessionStorage.setItem('arcus_prefill', prompt);
    } catch {
      // sessionStorage can throw in incognito or with disk full — push anyway
    }
    router.push('/dashboard/agent-talk');
  };

  const { todayLabel, greeting, GreetingIcon } = useMemo(() => {
    const now = new Date();
    const label = now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const hour = now.getHours();
    let g = 'Hello';
    let Icon: typeof Sun = Sun;
    if (hour < 5)        { g = 'Up late';        Icon = Moon; }
    else if (hour < 12)  { g = 'Good morning';   Icon = Sunrise; }
    else if (hour < 17)  { g = 'Good afternoon'; Icon = Sun; }
    else if (hour < 22)  { g = 'Good evening';   Icon = Sunset; }
    else                 { g = 'Good night';     Icon = Moon; }
    const personalized = firstName ? `${g}, ${firstName}` : g;
    return { todayLabel: label, greeting: personalized, GreetingIcon: Icon };
  }, [firstName]);

  const lastUpdated = useMemo(() => (data ? formatRelative(data.generatedAt) : null), [data]);

  // Hide swipe-dismissed items from every bucket (survives background refresh).
  const decideItems = useMemo(() => (data?.decide ?? []).filter((i) => !dismissed.has(i.id)), [data, dismissed]);
  const chaseItems = useMemo(() => (data?.chase ?? []).filter((i) => !dismissed.has(i.id)), [data, dismissed]);
  const showUpItems = useMemo(() => (data?.showUp ?? []).filter((i) => !dismissed.has(i.id)), [data, dismissed]);
  const actionItemsVisible = useMemo(() => (data?.actionItems ?? []).filter((i) => !dismissed.has(i.id)), [data, dismissed]);

  return (
    <div className="w-full min-h-screen bg-transparent">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-32">
        {/* Header */}
        <div className="flex items-end justify-between mb-12 gap-4">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/35 dark:text-white/35 mb-3 font-medium">
              {todayLabel}
            </p>
            <h1 className="text-3xl sm:text-[40px] sm:leading-[1.05] font-semibold text-black dark:text-white tracking-[-0.025em]">
              {greeting}
            </h1>
            <p className="text-[15px] mt-1.5 text-black/55 dark:text-white/55 tracking-tight">
              here&apos;s what deserves you today.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors disabled:opacity-40 flex-shrink-0"
            title="Refresh"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            )}
            <span className="hidden sm:inline">{lastUpdated ? `${lastUpdated} ago` : 'Refresh'}</span>
          </button>
        </div>

        {/* Command center: what the user's agents did while they were away.
            Renders first, independent of inbox buckets — this is the spec's
            "open HomeFeed, understand everything in 10 seconds" promise. */}
        {data && data.agentRuns && data.agentRuns.length > 0 && (
          <AgentRunsSection runs={data.agentRuns} />
        )}

        {loading && !data && (
          <div className="space-y-10">
            {(['Decide', 'Show up', 'Chase'] as const).map((label) => (
              <section key={label}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-black/[0.04] dark:bg-white/[0.05]" />
                  <div className="h-3 w-20 rounded bg-black/[0.06] dark:bg-white/[0.06]" />
                </div>
                <div className="space-y-2.5">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              </section>
            ))}
          </div>
        )}

        {error && (
          <div className="py-6 px-5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-[13px] text-black/65 dark:text-white/65">
            {error}
          </div>
        )}

        {data && data.needsReconnect && (data.needsReconnect.gmail || data.needsReconnect.calendar) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="py-10 px-6 text-center rounded-3xl border border-amber-500/15 dark:border-amber-400/15 bg-amber-500/[0.04] dark:bg-amber-400/[0.04]"
          >
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-amber-500/[0.08] dark:bg-amber-400/[0.08] text-amber-600 dark:text-amber-400 mb-4">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <h2 className="text-[16px] font-medium text-black dark:text-white mb-1.5 tracking-tight">
              {data.needsReconnect.gmail && data.needsReconnect.calendar
                ? 'Google sign-in expired'
                : data.needsReconnect.gmail
                  ? 'Gmail sign-in expired'
                  : 'Calendar sign-in expired'}
            </h2>
            <p className="text-[13.5px] text-black/55 dark:text-white/55 mb-5 max-w-sm mx-auto leading-relaxed">
              I tried to refresh in the background but Google rejected the token. Sign in again and I'll pick up right where we left off.
            </p>
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: window.location.href, redirect: true })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-black text-white dark:bg-white dark:text-black hover:bg-black/85 dark:hover:bg-white/85 transition-colors active:scale-[0.97]"
            >
              Sign in with Google
            </button>
          </motion.div>
        )}

        {data && !data.gmailConnected && !data.needsReconnect && (
          <div className="py-12 px-6 text-center rounded-3xl border border-black/[0.06] dark:border-white/[0.06]">
            <Mail className="w-6 h-6 mx-auto mb-3 text-black/40 dark:text-white/40" strokeWidth={1.5} />
            <h2 className="text-[15px] font-medium text-black dark:text-white mb-1.5">Connect Gmail to see your day</h2>
            <p className="text-[13px] text-black/50 dark:text-white/50 mb-5">
              Sift reads only what it needs to surface what matters today.
            </p>
            <button
              type="button"
              onClick={() => signIn('google', { callbackUrl: window.location.href, redirect: true })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium bg-black text-white dark:bg-white dark:text-black hover:bg-black/85 dark:hover:bg-white/85 transition-colors"
            >
              Connect Gmail
            </button>
          </div>
        )}

        {data && data.gmailConnected && data.emptyAll && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="py-20 text-center"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/[0.04] dark:bg-white/[0.05] ring-1 ring-black/[0.04] dark:ring-white/[0.05] text-black/55 dark:text-white/55 mb-5">
              <GreetingIcon className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <h2 className="text-[20px] font-medium text-black dark:text-white mb-2 tracking-tight">
              …take a breath{firstName ? `, ${firstName}` : ''}.
            </h2>
            <p className="text-[14px] text-black/50 dark:text-white/50 max-w-sm mx-auto leading-relaxed">
              Just scanned your inbox, calendar, and follow-ups — nothing urgent, no meetings, nothing overdue. Rare and good.
            </p>
            {data.generatedAt && (
              <p className="mt-4 text-[11px] uppercase tracking-[0.12em] text-black/30 dark:text-white/30">
                Live data · checked {formatRelative(data.generatedAt)} ago
              </p>
            )}
          </motion.div>
        )}

        {data && data.gmailConnected && !data.emptyAll && (
          <div className="space-y-10">
            {/* PROMISED (action items from /log) */}
            {actionItemsVisible.length > 0 && (
              <section>
                <BucketHeader
                  label="Promised"
                  count={actionItemsVisible.length}
                  icon={<CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />}
                />
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {actionItemsVisible.map((item) => (
                      <ItemCard
                        key={item.id}
                        topLeft={item.meetingTitle || 'from your notes'}
                        topRight={formatDueLabel(item.dueAt, item.isOverdue)}
                        title={item.text}
                        reason={item.attendees.length > 0
                          ? `Promised after meeting with ${item.attendees.slice(0, 2).join(', ')}${item.attendees.length > 2 ? ` +${item.attendees.length - 2}` : ''}.`
                          : 'From your meeting notes.'}
                        onDismiss={() => dismissItem(item.id)}
                        primaryAction={{
                          label: item.isOverdue ? 'Handle now' : 'Open',
                          onClick: () => {
                            const ctx = item.attendees.length > 0
                              ? ` (linked to ${item.attendees.join(', ')})`
                              : '';
                            openArcus(`Help me with this action item from "${item.meetingTitle || 'my notes'}"${ctx}: ${item.text}`);
                          },
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* DECIDE */}
            <section>
              <BucketHeader
                label="Decide"
                count={decideItems.length}
                icon={<Reply className="w-3.5 h-3.5" strokeWidth={2} />}
              />
              {decideItems.length === 0 ? (
                <EmptyBucket message="Inbox is clear — nothing urgent unanswered." />
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {decideItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        topLeft={item.sender.name || item.sender.email}
                        topRight={formatRelative(item.receivedAt)}
                        title={item.subject}
                        reason={item.reason}
                        onDismiss={() => dismissItem(item.id)}
                        primaryAction={{
                          label: isDraftingDecideId === item.id ? 'Drafting...' : 'Draft reply',
                          onClick: () => handleDraftDecide(item),
                        }}
                        secondaryAction={{ label: 'Open thread', href: item.gmailUrl }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            {/* SHOW UP */}
            <section>
              <BucketHeader
                label="Show up"
                count={showUpItems.length}
                icon={<CalendarClock className="w-3.5 h-3.5" strokeWidth={2} />}
              />
              {showUpItems.length === 0 ? (
                <EmptyBucket message="No meetings on the books today." />
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {showUpItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        topLeft={formatStartTime(item.start)}
                        topRight={`${item.attendeeCount} attendee${item.attendeeCount === 1 ? '' : 's'}`}
                        title={item.title}
                        reason={item.isExternal ? 'External meeting — prep it.' : 'Internal meeting.'}
                        onDismiss={() => dismissItem(item.id)}
                        primaryAction={{
                          label: 'Prep me',
                          onClick: () =>
                            openArcus(`/prep ${item.title} at ${formatStartTime(item.start)} today`),
                        }}
                        secondaryAction={
                          item.meetLink ? { label: 'Join', href: item.meetLink } : undefined
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>

            {/* CHASE */}
            <section>
              <BucketHeader
                label="Chase"
                count={chaseItems.length}
                icon={<Clock className="w-3.5 h-3.5" strokeWidth={2} />}
              />
              {chaseItems.length === 0 ? (
                <EmptyBucket message="Nobody owes you a reply right now." />
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {chaseItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        topLeft={item.recipient.name || item.recipient.email}
                        topRight={`${item.daysSilent}d silent`}
                        title={item.subject}
                        reason="You sent this. They haven't replied."
                        onDismiss={() => dismissItem(item.id)}
                        primaryAction={{
                          label: isDraftingNudgeId === item.id ? 'Drafting...' : 'Draft nudge',
                          onClick: () => handleDraftNudge(item),
                        }}
                        secondaryAction={{ label: 'Open thread', href: item.gmailUrl }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Draft Reply Modal */}
        {activeDraft && (
          <SiftDraftModal
            draftData={activeDraft}
            onSendReply={handleSendDraft}
            onDismiss={() => setActiveDraft(null)}
            isVisible={true}
            onRedraft={() => redraftRef.current?.()}
          />
        )}
      </div>
    </div>
  );
}
