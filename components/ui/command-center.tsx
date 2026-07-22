'use client';

/**
 * Command Center — the redesigned home feed.
 *
 * The old feed was an activity LOG: it told you what already happened. This is a
 * COMMAND CENTER: it opens with where your world stands right now and what needs
 * you, then shows the momentum behind it.
 *
 * Structure (top → bottom), each section a real data source, none invented:
 *   1. Hero      — greeting + one-line AI summary of the day + four stat tiles.
 *   2. Your week — a real 7-day activity chart (arcus_agent_runs; empty state is
 *                  honest, never a fabricated trend).
 *   3. Key conversations — THE new capability. Your important threads and where
 *                  each currently STANDS (awaiting you / waiting on them /
 *                  meeting booked), derived from the already-AI-triaged
 *                  decide/chase/showUp pools, deduped per person.
 *   4. Needs a reply — the subset that is genuinely on you right now.
 *   5. Your meetings — upcoming, with one-click scheduling.
 *   6. Worth your time — cross-app recommendations (Gmail·Cal·Notion·Slack).
 *   7. While you were away — what your agents did.
 *
 * Every action is a one-click handoff to Arcus with a prefilled prompt
 * (sessionStorage 'arcus_prefill' → /dashboard/agent-talk), the same proven flow
 * the recommendations already use — so we reuse the real draft/schedule engine
 * rather than reproducing a streaming editor here.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip as RTooltip,
} from 'recharts';
import {
  Sparkles, Mail, Calendar, Clock, ArrowRight, MessageSquare,
  CheckCircle2, Reply, CalendarPlus, Inbox, Zap, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Data shapes (mirror /api/home-feed/today + week-activity) ───────────────────
interface DecideItem { id: string; threadId: string; sender: { name: string; email: string }; subject: string; reason: string; receivedAt: string; gmailUrl: string; signals?: string[]; }
interface ChaseItem { id: string; threadId: string; recipient: { name: string; email: string }; subject: string; daysSilent: number; sentAt: string; gmailUrl: string; reason?: string; signals?: string[]; }
interface ShowUpItem { id: string; start: string; end: string | null; title: string; attendeeCount: number; meetLink: string | null; hangoutLink: string | null; isExternal: boolean; reason?: string; }
interface AgentRunItem { id: string; agentName: string; status: string; summary: string | null; toolCalls: number; ranAt: string; artifactCounts: { gmail: number; calendar: number; notion: number; slack: number }; }
interface TodayData { decide: DecideItem[]; showUp: ShowUpItem[]; chase: ChaseItem[]; actionItems: any[]; agentRuns: AgentRunItem[]; summary: string | null; }
interface WeekDay { date: string; label: string; isToday: boolean; runs: number; actions: number; }
interface WeekData { days: WeekDay[]; totalRuns: number; totalActions: number; hasData: boolean; }
interface Rec { id: string; category: string; title: string; summary: string; arcusPrompt: string; ctaLabel: string; stat: { value: number; label: string }; atRisk?: boolean; }

// A person-keyed conversation with its current status. Derived, never invented.
type ConvoStatus = 'awaiting_you' | 'waiting_on_them' | 'meeting_booked';
interface Conversation {
  key: string;
  name: string;
  email: string;
  subject: string;
  status: ConvoStatus;
  context: string;        // the AI-written reason from the source item
  when: string;           // relative time string
  urgency: number;        // for sort: higher = more urgent
  prompt: string;         // handed to Arcus on click
}

// ── helpers ─────────────────────────────────────────────────────────────────
function firstName(name?: string, email?: string): string {
  const n = (name || '').trim();
  if (n) return n.split(/\s+/)[0];
  const local = (email || '').split('@')[0] || '';
  const f = local.split(/[._-]/)[0];
  return f ? f.charAt(0).toUpperCase() + f.slice(1) : 'Someone';
}
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const diff = Date.now() - t;
  const past = diff >= 0;
  const m = Math.abs(diff) / 60000;
  if (m < 60) return past ? `${Math.round(m)}m ago` : `in ${Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return past ? `${Math.round(h)}h ago` : `in ${Math.round(h)}h`;
  const d = Math.round(h / 24);
  return past ? `${d}d ago` : `in ${d}d`;
}
function clockTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function CommandCenter({ userName }: { userName?: string }) {
  const router = useRouter();
  const [today, setToday] = useState<TodayData | null>(null);
  const [week, setWeek] = useState<WeekData | null>(null);
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [loading, setLoading] = useState(true);

  const openArcus = useCallback((prompt: string) => {
    try { sessionStorage.setItem('arcus_prefill', prompt); } catch { /* incognito */ }
    router.push('/dashboard/agent-talk');
  }, [router]);

  useEffect(() => {
    let alive = true;
    (async () => {
      // today + week land fast and drive the whole above-the-fold; recs are
      // slower (an LLM call) so they stream in after and never block first paint.
      const [t, w] = await Promise.allSettled([
        fetch('/api/home-feed/today').then(r => r.ok ? r.json() : null),
        fetch('/api/home-feed/week-activity').then(r => r.ok ? r.json() : null),
      ]);
      if (!alive) return;
      if (t.status === 'fulfilled' && t.value?.success !== false) setToday(t.value);
      if (w.status === 'fulfilled' && w.value) setWeek(w.value);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Recommendations depend on today's pools, so fire once today is in.
  useEffect(() => {
    if (!today) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/home-feed/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decide: today.decide, chase: today.chase,
            actionItems: today.actionItems, showUp: today.showUp,
          }),
        });
        if (alive && res.ok) {
          const j = await res.json();
          setRecs(Array.isArray(j?.recommendations) ? j.recommendations : []);
        }
      } catch { if (alive) setRecs([]); }
    })();
    return () => { alive = false; };
  }, [today]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }, []);
  const dateLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    [],
  );

  // ── Derive the four headline stats + the key-conversations list ───────────────
  const stats = useMemo(() => {
    const handled = (today?.agentRuns || []).reduce(
      (n, r) => n + r.artifactCounts.gmail + r.artifactCounts.calendar + r.artifactCounts.notion + r.artifactCounts.slack,
      0,
    );
    return {
      reply: today?.decide.length || 0,
      meetings: today?.showUp.length || 0,
      awaiting: today?.chase.length || 0,
      handled,
    };
  }, [today]);

  const conversations = useMemo<Conversation[]>(() => {
    if (!today) return [];
    const byKey = new Map<string, Conversation>();
    const put = (c: Conversation) => {
      const existing = byKey.get(c.key);
      // One card per person; keep the most urgent status if they recur.
      if (!existing || c.urgency > existing.urgency) byKey.set(c.key, c);
    };

    for (const d of today.decide) {
      put({
        key: (d.sender.email || d.sender.name || d.id).toLowerCase(),
        name: firstName(d.sender.name, d.sender.email),
        email: d.sender.email,
        subject: d.subject,
        status: 'awaiting_you',
        context: d.reason || 'Waiting on your reply.',
        when: relTime(d.receivedAt),
        urgency: 100,
        prompt: `Draft a reply to ${d.sender.name || d.sender.email} about "${d.subject}". Read the thread first, then write it in my voice.`,
      });
    }
    for (const s of today.showUp) {
      put({
        key: `mtg:${s.id}`,
        name: s.title,
        email: '',
        subject: s.title,
        status: 'meeting_booked',
        context: s.reason || `${s.attendeeCount} attendee${s.attendeeCount === 1 ? '' : 's'}${s.isExternal ? ' · external' : ''}.`,
        when: clockTime(s.start),
        urgency: 60,
        prompt: `Prep me for my meeting "${s.title}". Pull recent context on the attendees from my email and calendar.`,
      });
    }
    for (const c of today.chase) {
      put({
        key: (c.recipient.email || c.recipient.name || c.id).toLowerCase(),
        name: firstName(c.recipient.name, c.recipient.email),
        email: c.recipient.email,
        subject: c.subject,
        status: 'waiting_on_them',
        context: c.reason || `No reply in ${c.daysSilent} day${c.daysSilent === 1 ? '' : 's'}.`,
        when: `${c.daysSilent}d silent`,
        urgency: 40 + Math.min(c.daysSilent, 20),
        prompt: `Draft a warm, low-pressure follow-up to ${c.recipient.name || c.recipient.email} about "${c.subject}" — it's been quiet for ${c.daysSilent} days.`,
      });
    }
    return [...byKey.values()].sort((a, b) => b.urgency - a.urgency).slice(0, 6);
  }, [today]);

  if (loading) return <CommandCenterSkeleton />;

  const nothingPressing = stats.reply === 0 && stats.meetings === 0 && stats.awaiting === 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-8">
      {/* 1 ── HERO ──────────────────────────────────────────────────────────── */}
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-[13px] font-medium text-arcus-fg-tertiary">{dateLabel}</p>
        <h1 className="mt-1 text-[28px] sm:text-[34px] font-semibold tracking-tight text-arcus-fg">
          {greeting}{userName ? `, ${userName}` : ''}.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-arcus-fg-secondary">
          {today?.summary?.trim()
            || (nothingPressing
              ? 'Nothing needs you right now — your inbox is handled. Here’s where things stand.'
              : 'Here’s what deserves your attention today.')}
        </p>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatTile icon={<Reply className="w-4 h-4" />} value={stats.reply} label="need a reply" tone={stats.reply > 0 ? 'attn' : 'calm'} />
          <StatTile icon={<Calendar className="w-4 h-4" />} value={stats.meetings} label={stats.meetings === 1 ? 'meeting' : 'meetings'} tone="calm" />
          <StatTile icon={<Clock className="w-4 h-4" />} value={stats.awaiting} label="awaiting reply" tone="calm" />
          <StatTile icon={<CheckCircle2 className="w-4 h-4" />} value={stats.handled} label="handled for you" tone="good" />
        </div>
      </motion.section>

      {/* 2 ── YOUR WEEK ─────────────────────────────────────────────────────── */}
      <WeekChart week={week} onSchedule={() => openArcus('Set up a scheduled agent that gives me a morning briefing every weekday at 8am.')} />

      {/* 3 ── KEY CONVERSATIONS (the new capability) ────────────────────────── */}
      {conversations.length > 0 && (
        <Section title="Key conversations" sub="Where your important threads stand right now">
          <div className="grid sm:grid-cols-2 gap-2.5">
            {conversations.map(c => (
              <ConversationCard key={c.key} c={c} onOpen={() => openArcus(c.prompt)} />
            ))}
          </div>
        </Section>
      )}

      {/* 4 ── NEEDS A REPLY ─────────────────────────────────────────────────── */}
      {today && today.decide.length > 0 && (
        <Section title="Needs a reply" sub="On you right now">
          <div className="space-y-2">
            {today.decide.slice(0, 5).map(d => (
              <ReplyRow
                key={d.id}
                who={d.sender.name || d.sender.email}
                subject={d.subject}
                reason={d.reason}
                when={relTime(d.receivedAt)}
                signals={d.signals}
                onDraft={() => openArcus(`Draft a reply to ${d.sender.name || d.sender.email} about "${d.subject}". Read the thread first, then write it in my voice.`)}
                onOpen={() => window.open(d.gmailUrl, '_blank')}
              />
            ))}
          </div>
        </Section>
      )}

      {/* 5 ── YOUR MEETINGS ─────────────────────────────────────────────────── */}
      {today && today.showUp.length > 0 && (
        <Section
          title="Your meetings"
          sub="Upcoming"
          action={{ label: 'Schedule something', onClick: () => openArcus('Find a free 30-minute slot this week and schedule a meeting. Ask me who with and what about.') }}
        >
          <div className="space-y-2">
            {today.showUp.slice(0, 5).map(m => (
              <MeetingRow
                key={m.id}
                title={m.title}
                start={m.start}
                attendeeCount={m.attendeeCount}
                isExternal={m.isExternal}
                meetLink={m.meetLink || m.hangoutLink}
                onPrep={() => openArcus(`Prep me for "${m.title}". Pull recent email and calendar context on the attendees.`)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* 6 ── WORTH YOUR TIME (cross-app) ───────────────────────────────────── */}
      {recs && recs.length > 0 && (
        <Section title="Worth your time" sub="Across Gmail, Calendar, Notion & Slack">
          <div className="grid sm:grid-cols-2 gap-2.5">
            {recs.slice(0, 4).map(r => (
              <RecCard key={r.id} r={r} onDo={() => openArcus(r.arcusPrompt)} />
            ))}
          </div>
        </Section>
      )}

      {/* 7 ── WHILE YOU WERE AWAY ───────────────────────────────────────────── */}
      {today && today.agentRuns.length > 0 && (
        <Section title="While you were away" sub="What your agents handled">
          <div className="space-y-2">
            {today.agentRuns.slice(0, 4).map(r => (
              <AgentRunRow key={r.id} run={r} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function Section({ title, sub, action, children }: { title: string; sub?: string; action?: { label: string; onClick: () => void }; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4 }}>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-arcus-fg">{title}</h2>
          {sub && <p className="text-[12.5px] text-arcus-fg-tertiary mt-0.5">{sub}</p>}
        </div>
        {action && (
          <button onClick={action.onClick} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-arcus-fg-secondary hover:text-arcus-fg transition-colors">
            {action.label} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
    </motion.section>
  );
}

function StatTile({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: 'attn' | 'calm' | 'good' }) {
  return (
    <div className="rounded-2xl border border-arcus-border bg-arcus-surface px-4 py-3.5">
      <div className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-xl mb-2',
        tone === 'attn' ? 'bg-amber-500/10 text-amber-500'
          : tone === 'good' ? 'bg-emerald-500/10 text-emerald-500'
            : 'bg-arcus-elevated text-arcus-fg-tertiary',
      )}>
        {icon}
      </div>
      <div className="text-[26px] font-semibold tracking-tight text-arcus-fg tabular-nums leading-none">{value}</div>
      <div className="text-[12px] text-arcus-fg-tertiary mt-1">{label}</div>
    </div>
  );
}

const STATUS_META: Record<ConvoStatus, { label: string; cls: string; Icon: any }> = {
  awaiting_you: { label: 'Awaiting your reply', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', Icon: Reply },
  waiting_on_them: { label: 'Waiting on them', cls: 'bg-arcus-elevated text-arcus-fg-tertiary border-arcus-border', Icon: Clock },
  meeting_booked: { label: 'Meeting booked', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', Icon: Calendar },
};

function ConversationCard({ c, onOpen }: { c: Conversation; onOpen: () => void }) {
  const s = STATUS_META[c.status];
  return (
    <button
      onClick={onOpen}
      className="group text-left rounded-2xl border border-arcus-border bg-arcus-surface hover:bg-arcus-surface-hover hover:border-arcus-fg-muted/30 transition-all p-4"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[14px] font-semibold text-arcus-fg truncate">{c.name}</span>
        <span className={cn('shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-medium', s.cls)}>
          <s.Icon className="w-3 h-3" /> {s.label}
        </span>
      </div>
      <p className="text-[13px] text-arcus-fg-secondary line-clamp-1 mb-1">{c.subject}</p>
      <p className="text-[12.5px] text-arcus-fg-tertiary line-clamp-2 leading-relaxed">{c.context}</p>
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[11.5px] text-arcus-fg-muted">{c.when}</span>
        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-arcus-fg-tertiary group-hover:text-arcus-fg transition-colors">
          Handle it <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
}

function ReplyRow({ who, subject, reason, when, signals, onDraft, onOpen }: { who: string; subject: string; reason: string; when: string; signals?: string[]; onDraft: () => void; onOpen: () => void }) {
  return (
    <div className="rounded-2xl border border-arcus-border bg-arcus-surface p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-arcus-elevated flex items-center justify-center shrink-0 text-arcus-fg-tertiary">
        <Mail className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-arcus-fg truncate">{who}</span>
          <span className="text-[11.5px] text-arcus-fg-muted shrink-0">{when}</span>
        </div>
        <p className="text-[13px] text-arcus-fg-secondary truncate">{subject}</p>
        {reason && <p className="text-[12.5px] text-arcus-fg-tertiary mt-1 line-clamp-2 leading-relaxed">{reason}</p>}
        {signals && signals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {signals.slice(0, 3).map((s, i) => (
              <span key={i} className="text-[10.5px] px-2 py-0.5 rounded-full bg-arcus-elevated text-arcus-fg-tertiary border border-arcus-border">{s}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2.5">
          <button onClick={onDraft} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-arcus-fg text-arcus-fg-inverse text-[12.5px] font-semibold hover:opacity-90 transition-opacity">
            <Reply className="w-3.5 h-3.5" /> Draft reply
          </button>
          <button onClick={onOpen} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-arcus-border text-arcus-fg-secondary text-[12.5px] font-medium hover:bg-arcus-surface-hover transition-colors">
            Open thread
          </button>
        </div>
      </div>
    </div>
  );
}

function MeetingRow({ title, start, attendeeCount, isExternal, meetLink, onPrep }: { title: string; start: string; attendeeCount: number; isExternal: boolean; meetLink: string | null; onPrep: () => void }) {
  return (
    <div className="rounded-2xl border border-arcus-border bg-arcus-surface p-4 flex items-center gap-3">
      <div className="flex flex-col items-center justify-center w-14 shrink-0">
        <span className="text-[15px] font-semibold text-arcus-fg tabular-nums leading-none">{clockTime(start)}</span>
        <span className="text-[10.5px] text-arcus-fg-muted mt-1">{relTime(start)}</span>
      </div>
      <div className="w-px self-stretch bg-arcus-border" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-arcus-fg truncate">{title}</p>
        <p className="text-[12px] text-arcus-fg-tertiary mt-0.5">
          {attendeeCount} attendee{attendeeCount === 1 ? '' : 's'}{isExternal ? ' · external' : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {meetLink && (
          <a href={meetLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-arcus-border text-arcus-fg-secondary text-[12.5px] font-medium hover:bg-arcus-surface-hover transition-colors">
            Join
          </a>
        )}
        <button onClick={onPrep} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-arcus-fg text-arcus-fg-inverse text-[12.5px] font-semibold hover:opacity-90 transition-opacity">
          <Zap className="w-3.5 h-3.5" /> Prep me
        </button>
      </div>
    </div>
  );
}

function RecCard({ r, onDo }: { r: Rec; onDo: () => void }) {
  return (
    <button onClick={onDo} className="group text-left rounded-2xl border border-arcus-border bg-arcus-surface hover:bg-arcus-surface-hover transition-all p-4">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-[14px] font-semibold text-arcus-fg leading-snug">{r.title}</span>
        {r.atRisk && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10.5px] font-medium">
            <AlertTriangle className="w-3 h-3" /> at risk
          </span>
        )}
      </div>
      <p className="text-[12.5px] text-arcus-fg-tertiary leading-relaxed line-clamp-2">{r.summary}</p>
      <span className="inline-flex items-center gap-1 mt-2.5 text-[12px] font-medium text-arcus-fg-secondary group-hover:text-arcus-fg transition-colors">
        {r.ctaLabel || 'Do it'} <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}

const APP_ICON: Record<string, any> = { gmail: Mail, calendar: Calendar, notion: MessageSquare, slack: MessageSquare };
function AgentRunRow({ run }: { run: AgentRunItem }) {
  const chips = (['gmail', 'calendar', 'notion', 'slack'] as const)
    .map(k => ({ k, n: run.artifactCounts[k] })).filter(x => x.n > 0);
  return (
    <div className="rounded-2xl border border-arcus-border bg-arcus-surface p-4 flex items-start gap-3">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
        run.status === 'error' || run.status === 'transient_error' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500')}>
        {run.status === 'running' ? <Clock className="w-4 h-4 animate-pulse" /> : <CheckCircle2 className="w-4 h-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-arcus-fg truncate">{run.agentName}</span>
          <span className="text-[11.5px] text-arcus-fg-muted shrink-0">{relTime(run.ranAt)}</span>
        </div>
        {run.summary && <p className="text-[12.5px] text-arcus-fg-tertiary mt-0.5 line-clamp-2 leading-relaxed">{run.summary}</p>}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {chips.map(({ k, n }) => {
              const I = APP_ICON[k];
              return (
                <span key={k} className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-arcus-elevated text-arcus-fg-tertiary border border-arcus-border capitalize">
                  <I className="w-3 h-3" /> {n} {k}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Your-week chart ─────────────────────────────────────────────────────────
function WeekChart({ week, onSchedule }: { week: WeekData | null; onSchedule: () => void }) {
  // Honest empty state — no fabricated trend. A user with no agent activity is
  // shown the truth and a nudge, not a fake sparkline.
  if (!week || !week.hasData) {
    return (
      <Section title="Your week" sub="Arcus activity, last 7 days">
        <div className="rounded-2xl border border-dashed border-arcus-border bg-arcus-surface p-8 text-center">
          <div className="w-10 h-10 rounded-xl bg-arcus-elevated flex items-center justify-center mx-auto mb-3 text-arcus-fg-tertiary">
            <Zap className="w-5 h-5" />
          </div>
          <p className="text-[14px] font-medium text-arcus-fg">No agent activity yet this week</p>
          <p className="text-[12.5px] text-arcus-fg-tertiary mt-1 max-w-sm mx-auto">Schedule an agent and this fills in — a daily briefing, an inbox sweep, meeting prep.</p>
          <button onClick={onSchedule} className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-arcus-fg text-arcus-fg-inverse text-[12.5px] font-semibold hover:opacity-90 transition-opacity">
            <CalendarPlus className="w-4 h-4" /> Schedule an agent
          </button>
        </div>
      </Section>
    );
  }

  const peak = Math.max(...week.days.map(d => d.actions), 1);
  return (
    <Section title="Your week" sub={`${week.totalActions} action${week.totalActions === 1 ? '' : 's'} across ${week.totalRuns} run${week.totalRuns === 1 ? '' : 's'}, last 7 days`}>
      <div className="rounded-2xl border border-arcus-border bg-arcus-surface p-5">
        <div className="h-[132px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week.days} margin={{ top: 6, right: 4, bottom: 0, left: 4 }} barCategoryGap="28%">
              <XAxis
                dataKey="label" tickLine={false} axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--arcus-fg-muted, #9a9a9a)' }} dy={4}
              />
              <RTooltip
                cursor={{ fill: 'var(--arcus-surface-hover, rgba(0,0,0,0.04))' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as WeekDay;
                  return (
                    <div className="rounded-lg border border-arcus-border bg-arcus-elevated px-2.5 py-1.5 shadow-lg">
                      <div className="text-[11px] font-semibold text-arcus-fg">{d.label}{d.isToday ? ' · so far' : ''}</div>
                      <div className="text-[11px] text-arcus-fg-tertiary">{d.actions} action{d.actions === 1 ? '' : 's'} · {d.runs} run{d.runs === 1 ? '' : 's'}</div>
                    </div>
                  );
                }}
              />
              {/* Single neutral series — one ink, no legend needed (the title names it).
                  Today's bar is de-emphasised because it's still filling ("so far"). */}
              <Bar dataKey="actions" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {week.days.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.isToday ? 'var(--arcus-fg-muted, #b5b5b5)' : 'var(--arcus-fg, #111)'}
                    fillOpacity={d.actions === 0 ? 0.12 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Section>
  );
}

function CommandCenterSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 space-y-8 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 w-32 bg-arcus-surface rounded" />
        <div className="h-8 w-64 bg-arcus-surface rounded" />
        <div className="h-4 w-96 max-w-full bg-arcus-surface rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-arcus-surface rounded-2xl" />)}
        </div>
      </div>
      <div className="h-40 bg-arcus-surface rounded-2xl" />
      <div className="grid sm:grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-28 bg-arcus-surface rounded-2xl" />)}
      </div>
    </div>
  );
}
