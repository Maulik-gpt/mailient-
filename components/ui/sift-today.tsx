'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reply, CalendarClock, Clock, ArrowUpRight, RefreshCw, Loader2, Mail, ExternalLink, CheckCircle2, Sun, Sunrise, Sunset, Moon, AlertTriangle } from 'lucide-react';
import { SiftDraftModal } from '@/components/ui/sift-draft-modal';
import { toast } from 'sonner';

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
interface TodayPayload {
  decide: DecideItem[];
  showUp: ShowUpItem[];
  chase: ChaseItem[];
  actionItems: ActionItem[];
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
}

function ItemCard({ topLeft, topRight, title, reason, primaryAction, secondaryAction }: ItemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -1 }}
      className="group relative bg-white dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] rounded-2xl px-4 py-3.5 hover:border-black/[0.14] dark:hover:border-white/[0.14] hover:shadow-[0_2px_18px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_2px_18px_rgba(0,0,0,0.4)] transition-[border-color,box-shadow] duration-200"
    >
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

export default function SiftToday() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeDraft, setActiveDraft] = useState<any>(null);
  const [isDraftingNudgeId, setIsDraftingNudgeId] = useState<string | null>(null);
  const [isDraftingDecideId, setIsDraftingDecideId] = useState<string | null>(null);

  const handleDraftNudge = async (item: ChaseItem) => {
    setIsDraftingNudgeId(item.id);
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
    } catch (e) {
       console.error('Failed to generate draft reply:', e);
       setActiveDraft(null);
       toast.error('Failed to generate draft reply');
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/home-feed/today', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to load.');
        return;
      }
      setData(json as TodayPayload);
    } catch (e: any) {
      setError(e?.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
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

  return (
    <div className="w-full min-h-screen bg-transparent dark:bg-black">
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
            onClick={load}
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
            {data.actionItems.length > 0 && (
              <section>
                <BucketHeader
                  label="Promised"
                  count={data.actionItems.length}
                  icon={<CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />}
                />
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {data.actionItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        topLeft={item.meetingTitle || 'from your notes'}
                        topRight={formatDueLabel(item.dueAt, item.isOverdue)}
                        title={item.text}
                        reason={item.attendees.length > 0
                          ? `Promised after meeting with ${item.attendees.slice(0, 2).join(', ')}${item.attendees.length > 2 ? ` +${item.attendees.length - 2}` : ''}.`
                          : 'From your meeting notes.'}
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
                count={data.decide.length}
                icon={<Reply className="w-3.5 h-3.5" strokeWidth={2} />}
              />
              {data.decide.length === 0 ? (
                <EmptyBucket message="Inbox is clear — nothing urgent unanswered." />
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {data.decide.map((item) => (
                      <ItemCard
                        key={item.id}
                        topLeft={item.sender.name || item.sender.email}
                        topRight={formatRelative(item.receivedAt)}
                        title={item.subject}
                        reason={item.reason}
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
                count={data.showUp.length}
                icon={<CalendarClock className="w-3.5 h-3.5" strokeWidth={2} />}
              />
              {data.showUp.length === 0 ? (
                <EmptyBucket message="No meetings on the books today." />
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {data.showUp.map((item) => (
                      <ItemCard
                        key={item.id}
                        topLeft={formatStartTime(item.start)}
                        topRight={`${item.attendeeCount} attendee${item.attendeeCount === 1 ? '' : 's'}`}
                        title={item.title}
                        reason={item.isExternal ? 'External meeting — prep it.' : 'Internal meeting.'}
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
                count={data.chase.length}
                icon={<Clock className="w-3.5 h-3.5" strokeWidth={2} />}
              />
              {data.chase.length === 0 ? (
                <EmptyBucket message="Nobody owes you a reply right now." />
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {data.chase.map((item) => (
                      <ItemCard
                        key={item.id}
                        topLeft={item.recipient.name || item.recipient.email}
                        topRight={`${item.daysSilent}d silent`}
                        title={item.subject}
                        reason="You sent this. They haven't replied."
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
          />
        )}
      </div>
    </div>
  );
}
