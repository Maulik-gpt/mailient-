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

import { useEffect, useMemo, useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, Cell, Tooltip as RTooltip,
  AreaChart, Area, XAxis,
  PieChart, Pie,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import {
  Sparkles, Mail, Calendar, Clock, ArrowRight, MessageSquare,
  CheckCircle2, Reply, CalendarPlus, Inbox, Zap, ChevronRight, AlertTriangle,
  FileText, Hash, RefreshCw,
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
// Real per-app signal counts from /api/home-feed/recommendations — already
// connection-gated there (a gatherer only ever produces a signal for an app
// with a live token) and toggle-gated by Customize Briefing, so a nonzero
// count here means "connected AND active," never an invented number.
interface AppCounts { gmail: number; calendar: number; notion: number; slack: number; calcom: number; }
// The "Sift says…" ecosystem read — same endpoint, same real items, an extra
// field on the one LLM call already being made (no added cost/latency).
interface SiftSummary { headline: string; analysis: string; }
// What the existing Gmail draft for a thread looks like, handed to the Inbox
// tab's draft-reply box so it can open pre-filled instead of going to Arcus.
interface ExistingDraft { threadId: string; to: string; subject: string; body: string; isHtml: boolean; }

// A person-keyed conversation with its current status. Derived, never invented.
// 'active' = a genuinely ongoing thread that's neither on you nor gone quiet
// (server /api/home-feed/conversations returns this whenever the latest message
// doesn't clear either threshold) — it was missing from this union even though
// the server has always been able to send it, which meant STATUS_META[c.status]
// silently returned undefined and crashed the card. Fixed here.
type ConvoStatus = 'awaiting_you' | 'waiting_on_them' | 'meeting_booked' | 'active';
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
  daysSince?: number;     // real days-silent, when known — powers the "going quiet" chart
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

// Conversations as returned by /api/home-feed/conversations (the real Gmail scan).
interface ServerConvo { key: string; name: string; email: string; subject: string; status: ConvoStatus; summary: string; nextAction: string; lastActivityIso: string; daysSince: number; fromThem: boolean; messageCount: number; }

// Instant-load cache: show the last snapshot the moment the tab paints, then
// revalidate in the background. This is what SiftToday did and I'd dropped —
// the reason the redesign "took too long to load" was a cold wait on the
// server AI triage every single time.
function readCache<T>(k: string): T | null {
  try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) as T : null; } catch { return null; }
}
function writeCache(k: string, v: unknown) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } }

export function CommandCenter({ userName, onOpenExistingDraft }: {
  userName?: string;
  // Passed down from home-feed/page.tsx: switches to the Inbox tab and hands
  // the existing draft to its draft-reply box. Optional so CommandCenter can
  // still render standalone (e.g. in a future test/story) without it.
  onOpenExistingDraft?: (draft: ExistingDraft) => void;
}) {
  const router = useRouter();
  const [today, setToday] = useState<TodayData | null>(() => readCache('cc_today'));
  const [week, setWeek] = useState<WeekData | null>(() => readCache('cc_week'));
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [appCounts, setAppCounts] = useState<AppCounts | null>(() => readCache('cc_appcounts'));
  const [sift, setSift] = useState<SiftSummary | null>(() => readCache('cc_sift'));
  const [convos, setConvos] = useState<ServerConvo[] | null>(() => readCache('cc_convos'));
  const [convosLoading, setConvosLoading] = useState(true);
  // Only block on a skeleton when we have NOTHING cached to show.
  const [loading, setLoading] = useState(() => !readCache('cc_today'));
  // Separate from `week`/`appCounts` being null (which is also the genuine
  // "no data" state) — these track whether their fetch has resolved AT LEAST
  // ONCE, so the analytics panel can tell "still loading" apart from
  // "genuinely empty" instead of flashing a false empty state while the
  // request is still in flight.
  const [weekLoaded, setWeekLoaded] = useState(() => !!readCache('cc_week'));
  const [recsLoaded, setRecsLoaded] = useState(() => !!readCache('cc_appcounts') || !!readCache('cc_sift'));

  const openArcus = useCallback((prompt: string) => {
    try { sessionStorage.setItem('arcus_prefill', prompt); } catch { /* incognito */ }
    router.push('/dashboard/agent-talk');
  }, [router]);

  // "Needs a reply" → Draft reply: check for an already-existing Gmail draft on
  // this thread FIRST. If one exists, this is NOT an Arcus job — hand it to the
  // Inbox tab's own draft-reply box (pre-filled, ready to review/send) instead
  // of sending a redundant "draft a reply" prompt to Arcus, which would either
  // duplicate the draft or confuse the user about which one is current. Fails
  // soft to the normal Arcus prompt on any error/timeout/missing callback.
  const handleDraftReply = useCallback(async (d: DecideItem) => {
    const prompt = `Draft a reply to ${d.sender.name || d.sender.email} about "${d.subject}". Read the thread first, then write it in my voice.`;
    if (onOpenExistingDraft) {
      try {
        const res = await fetch(`/api/gmail/drafts/for-thread?threadId=${encodeURIComponent(d.threadId)}`, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const j = await res.json();
          if (j?.exists) {
            onOpenExistingDraft({ threadId: d.threadId, to: j.to || '', subject: j.subject || d.subject, body: j.body || '', isHtml: !!j.isHtml });
            return;
          }
        }
      } catch { /* fall through to Arcus */ }
    }
    openArcus(prompt);
  }, [onOpenExistingDraft, openArcus]);

  // Refresh BOTH sources the analytics panel actually draws from: week-activity
  // (the area chart / spark tiles / radar) AND recommendations (the donut +
  // Sift text). The old version only re-fetched week-activity — the donut and
  // Sift could never be refreshed at all, which is exactly the "the analytics
  // never seem to actually redo the AI work" bug. Reuses the current `today`
  // snapshot as recommendations' input (this button refreshes analytics, not
  // the whole feed — Needs a Reply/Key Conversations have their own data).
  const [analyticsRefreshing, setAnalyticsRefreshing] = useState(false);
  const refreshAnalytics = useCallback(async () => {
    setAnalyticsRefreshing(true);
    try {
      const [w, r] = await Promise.allSettled([
        fetch('/api/home-feed/week-activity').then(res => res.ok ? res.json() : null),
        today
          ? fetch('/api/home-feed/recommendations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ decide: today.decide, chase: today.chase, actionItems: today.actionItems, showUp: today.showUp }),
            }).then(res => res.ok ? res.json() : null)
          : Promise.resolve(null),
      ]);
      if (w.status === 'fulfilled' && w.value) { setWeek(w.value); writeCache('cc_week', w.value); }
      setWeekLoaded(true);
      if (r.status === 'fulfilled' && r.value) {
        const j = r.value;
        setRecs(Array.isArray(j?.recommendations) ? j.recommendations : []);
        if (j?.appCounts) { setAppCounts(j.appCounts); writeCache('cc_appcounts', j.appCounts); }
        if (j?.sift) { setSift(j.sift); writeCache('cc_sift', j.sift); }
      }
      setRecsLoaded(true);
    } finally {
      setAnalyticsRefreshing(false);
    }
  }, [today]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [t, w] = await Promise.allSettled([
        fetch('/api/home-feed/today').then(r => r.ok ? r.json() : null),
        fetch('/api/home-feed/week-activity').then(r => r.ok ? r.json() : null),
      ]);
      if (!alive) return;
      if (t.status === 'fulfilled' && t.value?.success !== false && t.value) { setToday(t.value); writeCache('cc_today', t.value); }
      if (w.status === 'fulfilled' && w.value) { setWeek(w.value); writeCache('cc_week', w.value); }
      setWeekLoaded(true);
      setLoading(false);
    })();
    // The real relationship scan runs on its own timeline (cached server-side),
    // so it never blocks the hero/stats/chart. Its own skeleton covers the wait.
    (async () => {
      try {
        const r = await fetch('/api/home-feed/conversations');
        if (alive && r.ok) {
          const j = await r.json();
          const list: ServerConvo[] = Array.isArray(j?.conversations) ? j.conversations : [];
          setConvos(list); writeCache('cc_convos', list);
        }
      } catch { /* keep cached / fall back to derived */ }
      finally { if (alive) setConvosLoading(false); }
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
          if (j?.appCounts) { setAppCounts(j.appCounts); writeCache('cc_appcounts', j.appCounts); }
          if (j?.sift) { setSift(j.sift); writeCache('cc_sift', j.sift); }
        }
      } catch { if (alive) setRecs([]); }
      finally { if (alive) setRecsLoaded(true); }
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
    // "Handled for you" = the real work Arcus did this week. It USED to sum
    // artifact_links, which is empty on most runs (the real signal is tool_calls,
    // already totalled by /week-activity) — so it read 0 while the chart showed
    // 77. Now it uses that same real total, with the artifact sum as a fallback.
    const artifactHandled = (today?.agentRuns || []).reduce(
      (n, r) => n + r.artifactCounts.gmail + r.artifactCounts.calendar + r.artifactCounts.notion + r.artifactCounts.slack, 0);
    return {
      reply: today?.decide.length || 0,
      meetings: today?.showUp.length || 0,
      awaiting: today?.chase.length || 0,
      handled: (week?.totalActions ?? 0) || artifactHandled,
    };
  }, [today, week]);

  // Prefer the REAL Gmail relationship scan (server-side, cached). It surfaces
  // important ongoing threads even when nothing is "actionable" — the whole
  // point of the redesign. Until it lands (or if it's empty), fall back to
  // deriving from the action pools so the section is never blank when there IS
  // action to show.
  const serverConversations = useMemo<Conversation[]>(() => {
    if (!convos?.length) return [];
    return convos.map(c => ({
      key: c.key,
      name: c.name,
      email: c.email,
      subject: c.subject,
      status: c.status,
      context: c.summary,
      when: c.status === 'waiting_on_them' ? `${c.daysSince}d silent` : relTime(c.lastActivityIso),
      urgency: c.status === 'awaiting_you' ? 100 : c.status === 'waiting_on_them' ? 50 : 20,
      prompt: c.nextAction,
      daysSince: c.daysSince,
    }));
  }, [convos]);

  const derivedConversations = useMemo<Conversation[]>(() => {
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
        daysSince: c.daysSilent,
      });
    }
    return [...byKey.values()].sort((a, b) => b.urgency - a.urgency).slice(0, 6);
  }, [today]);

  const conversations = serverConversations.length ? serverConversations : derivedConversations;

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
        <div className="mt-2 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-arcus-fg-tertiary">Sift says…</p>
          <p className="mt-1 text-[15px] font-medium leading-relaxed text-arcus-fg">
            {sift?.headline
              || today?.summary?.trim()
              || (nothingPressing
                ? 'Nothing needs you right now — your inbox is handled.'
                : 'Here’s what deserves your attention today.')}
          </p>
          {/* The longer synthesis loads a beat later (it rides the same call as
              Worth your time) — appears once ready rather than reserving empty
              space up front, so the hero never shows a gap while waiting. */}
          {sift?.analysis && (
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-arcus-fg-secondary">{sift.analysis}</p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatTile icon={<Reply className="w-4 h-4" />} value={stats.reply} label="need a reply" tone={stats.reply > 0 ? 'attn' : 'calm'} />
          <StatTile icon={<Calendar className="w-4 h-4" />} value={stats.meetings} label={stats.meetings === 1 ? 'meeting' : 'meetings'} tone="calm" />
          <StatTile icon={<Clock className="w-4 h-4" />} value={stats.awaiting} label="awaiting reply" tone="calm" />
          <StatTile icon={<CheckCircle2 className="w-4 h-4" />} value={stats.handled} label="handled for you" tone="good" />
        </div>
      </motion.section>

      {/* 2 ── ANALYTICS — real weekly activity + live, connection-gated cross-app
          signal counts, never a fixed Gmail/Calendar-only view. ─────────────── */}
      <AnalyticsSection
        week={week}
        weekLoaded={weekLoaded}
        appCounts={appCounts}
        recsLoaded={recsLoaded}
        refreshing={analyticsRefreshing}
        onRefresh={refreshAnalytics}
        onSchedule={() => openArcus('Set up a scheduled agent that gives me a morning briefing every weekday at 8am.')}
      />

      {/* 3 ── KEY CONVERSATIONS (the new capability) ────────────────────────── */}
      {conversations.length > 0 ? (
        <Section title="Key conversations" sub="Where your important threads stand right now">
          <ConversationPulse conversations={conversations} />
          <div className="grid sm:grid-cols-2 gap-2.5">
            {conversations.map(c => (
              <ConversationCard key={c.key} c={c} onOpen={() => openArcus(c.prompt)} />
            ))}
          </div>
        </Section>
      ) : convosLoading ? (
        <Section title="Key conversations" sub="Reading your inbox for what matters…">
          <div className="grid sm:grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-arcus-surface animate-pulse" />)}
          </div>
        </Section>
      ) : null}

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
                onDraft={() => handleDraftReply(d)}
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

function Metric({ value, label, big }: { value: string; label: string; big?: boolean }) {
  return (
    <div>
      <div className={cn('font-semibold tracking-tight text-arcus-fg tabular-nums leading-none', big ? 'text-[24px]' : 'text-[18px]')}>{value}</div>
      <div className="text-[11px] text-arcus-fg-tertiary mt-1">{label}</div>
    </div>
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

// Status → { badge classes, solid bar-fill class, label, icon }. One entry per
// value the server or the derived fallback can actually produce — `active` was
// missing even though /api/home-feed/conversations has always been able to
// return it, so any card in that state hit STATUS_META[undefined] and crashed
// the section. `fill` is the SAME hue as the badge (never a second palette) so
// the pulse chart and the cards below it read as one system.
const STATUS_META: Record<ConvoStatus, { label: string; cls: string; fill: string; Icon: any }> = {
  awaiting_you: { label: 'Awaiting your reply', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', fill: 'bg-amber-500', Icon: Reply },
  waiting_on_them: { label: 'Waiting on them', cls: 'bg-arcus-elevated text-arcus-fg-tertiary border-arcus-border', fill: 'bg-arcus-fg-muted', Icon: Clock },
  meeting_booked: { label: 'Meeting booked', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', fill: 'bg-indigo-500', Icon: Calendar },
  active: { label: 'Active thread', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', fill: 'bg-blue-500', Icon: MessageSquare },
};
// Fixed render order for the status bar/legend — status color is state, not
// rank, but a stable left-to-right order still keeps repeat visits legible.
const STATUS_ORDER: ConvoStatus[] = ['awaiting_you', 'waiting_on_them', 'active', 'meeting_booked'];

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

// ── Shared textured fill (stipple + wash) ────────────────────────────────────
// Recharts renders each chart into its OWN <svg>, so defs must be declared
// inside every chart that uses them. Two layers per hue: a soft top-to-bottom
// gradient "wash" (dataviz house rule: area fills stay a wash, ~10-30%
// opacity, never a saturated block) plus a small tiled dot pattern for the
// stippled/particle texture — together, layered under a crisp stroke line,
// they read as the textured fill in the reference dashboard without ever
// drawing a solid block of color.
function stippleDefs(id: string, colorVar: string) {
  return (
    <defs>
      <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={colorVar} stopOpacity={0.3} />
        <stop offset="100%" stopColor={colorVar} stopOpacity={0} />
      </linearGradient>
      <pattern id={`${id}-dots`} width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.65" fill={colorVar} fillOpacity={0.55} />
      </pattern>
    </defs>
  );
}

// ── Stat tile with a REAL trend sparkline — the same week.days series that
// feeds the big chart below, just a different dataKey (actions vs runs).
// Never a fabricated trend: if there's no week data this never renders (its
// parent gates on week.hasData).
function StatSparkTile({ label, sub, value, data, dataKey, colorVar }: {
  label: string; sub: string; value: number; data: WeekDay[]; dataKey: 'actions' | 'runs'; colorVar: string;
}) {
  const id = `spark-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div className="rounded-2xl border border-arcus-border bg-arcus-surface p-4 overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[26px] font-semibold tracking-tight text-arcus-fg tabular-nums leading-none">{value.toLocaleString()}</div>
          <div className="text-[12px] text-arcus-fg-tertiary mt-1.5">{label}</div>
        </div>
        <span className="text-[10.5px] text-arcus-fg-muted mt-0.5 shrink-0">{sub}</span>
      </div>
      <div className="h-12 -mx-4 -mb-4 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            {stippleDefs(id, colorVar)}
            <Area type="monotone" dataKey={dataKey} stroke="none" fill={`url(#${id}-wash)`} isAnimationActive={false} />
            <Area type="monotone" dataKey={dataKey} stroke="none" fill={`url(#${id}-dots)`} isAnimationActive={false} />
            <Area type="monotone" dataKey={dataKey} stroke={colorVar} strokeWidth={1.5} fill="none" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── The big "your week" area chart — real 7-day activity, textured fill,
// crisp stroke, hover tooltip (values live there, never drawn permanently on
// the chart), and a manual refresh control.
function WeekAreaChart({ week, onRefresh, refreshing }: { week: WeekData; onRefresh: () => void; refreshing: boolean }) {
  const id = `week-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const busiest = Math.max(...week.days.map((d) => d.actions), 0);
  const avg = Math.round(week.totalActions / 7);
  return (
    <div className="rounded-2xl border border-arcus-border bg-arcus-surface p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-6">
          <Metric big value={String(week.totalActions)} label="actions this week" />
          <div className="w-px h-8 bg-arcus-border" />
          <Metric value={String(avg)} label="daily average" />
          <Metric value={String(busiest)} label="busiest day" />
        </div>
        <button
          onClick={onRefresh}
          aria-label="Refresh this week's activity"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-arcus-fg-tertiary hover:text-arcus-fg hover:bg-arcus-elevated transition-colors shrink-0"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
        </button>
      </div>
      <div className="h-[180px] mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={week.days} margin={{ top: 10, right: 4, bottom: 0, left: 4 }}>
            {stippleDefs(id, 'var(--arcus-chart-blue)')}
            <XAxis
              dataKey="label" tickLine={false} axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--arcus-fg-muted, #9a9a9a)' }} dy={6}
            />
            <RTooltip
              cursor={{ stroke: 'var(--arcus-border, #d4d4d4)', strokeWidth: 1 } as any}
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
            <Area type="monotone" dataKey="actions" stroke="none" fill={`url(#${id}-wash)`} />
            <Area type="monotone" dataKey="actions" stroke="none" fill={`url(#${id}-dots)`} />
            <Area
              type="monotone" dataKey="actions" stroke="var(--arcus-chart-blue)" strokeWidth={2} fill="none"
              dot={{ r: 3, fill: 'var(--arcus-chart-blue)', strokeWidth: 0 }} activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Across your apps — live, connection-gated per-app signal counts from
// /api/home-feed/recommendations (bounces/replies-needed for Gmail, prep-needed
// meetings for Calendar, stale pages for Notion, awaiting-reply DMs for Slack,
// upcoming bookings for Cal.com). A slice only exists here if that app is BOTH
// connected and produced a real signal this pass — nothing invented, nothing
// shown for an app the user hasn't connected. Donut is the endorsed form here
// (part-to-whole, ≤5 clearly-separated segments with a legend) rather than the
// bar-length comparison used elsewhere on this page.
const APP_CHART_META = {
  gmail:    { label: 'Gmail',    Icon: Mail,         varName: '--arcus-chart-blue' },
  calendar: { label: 'Calendar', Icon: Calendar,     varName: '--arcus-chart-green' },
  notion:   { label: 'Notion',   Icon: FileText,     varName: '--arcus-chart-magenta' },
  slack:    { label: 'Slack',    Icon: Hash,         varName: '--arcus-chart-yellow' },
  calcom:   { label: 'Cal.com',  Icon: CalendarPlus, varName: '--arcus-chart-aqua' },
} as const;

function AppsDonut({ counts }: { counts: AppCounts | null }) {
  const rows = useMemo(() => {
    if (!counts) return [];
    return (Object.keys(APP_CHART_META) as Array<keyof typeof APP_CHART_META>)
      .map((k) => ({ key: k, value: counts[k], ...APP_CHART_META[k] }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [counts]);

  if (rows.length === 0) return null;
  const total = rows.reduce((n, r) => n + r.value, 0);

  return (
    <div className="rounded-2xl border border-arcus-border bg-arcus-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-arcus-fg-tertiary mb-2.5">Across your apps</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mb-3">
        {rows.map((r) => (
          <span key={r.key} className="inline-flex items-center gap-1.5 text-[11.5px] text-arcus-fg-tertiary">
            <span className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: `var(${r.varName})` }} />
            {r.label}
          </span>
        ))}
      </div>
      <div className="relative h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows} dataKey="value" nameKey="label"
              innerRadius="64%" outerRadius="100%" paddingAngle={2}
              stroke="var(--arcus-surface)" strokeWidth={3}
            >
              {rows.map((r) => <Cell key={r.key} fill={`var(${r.varName})`} />)}
            </Pie>
            <RTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as (typeof rows)[number];
                return (
                  <div className="rounded-lg border border-arcus-border bg-arcus-elevated px-2.5 py-1.5 shadow-lg">
                    <div className="text-[11px] font-semibold text-arcus-fg">{p.label}</div>
                    <div className="text-[11px] text-arcus-fg-tertiary">{p.value} signal{p.value === 1 ? '' : 's'}</div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[24px] font-semibold tracking-tight text-arcus-fg tabular-nums leading-none">{total}</span>
          <span className="text-[10.5px] text-arcus-fg-tertiary mt-1">signals right now</span>
        </div>
      </div>
    </div>
  );
}

// ── This week, by day — the SAME real week.days series as the area chart
// above, re-plotted as a radar so the weekday pattern reads at a glance.
// Labelled "this week" (not "average") since one week of real data isn't an
// average yet — the codebase's own rule against reading illustrative numbers
// as measured.
function WeekdayRadar({ week }: { week: WeekData }) {
  const id = `radar-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <div className="rounded-2xl border border-arcus-border bg-arcus-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-arcus-fg-tertiary mb-3">This week, by day</p>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={week.days} outerRadius="72%">
            {stippleDefs(id, 'var(--arcus-chart-green)')}
            <PolarGrid stroke="var(--arcus-border, #d4d4d4)" />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--arcus-fg-tertiary, #8a8a8a)' }} />
            <Radar dataKey="actions" stroke="none" fill={`url(#${id}-wash)`} fillOpacity={1} isAnimationActive={false} />
            <Radar dataKey="actions" stroke="none" fill={`url(#${id}-dots)`} fillOpacity={1} isAnimationActive={false} />
            <Radar dataKey="actions" stroke="var(--arcus-chart-green)" strokeWidth={2} fill="none" />
            <RTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as WeekDay;
                return (
                  <div className="rounded-lg border border-arcus-border bg-arcus-elevated px-2.5 py-1.5 shadow-lg">
                    <div className="text-[11px] font-semibold text-arcus-fg">{d.label}{d.isToday ? ' · so far' : ''}</div>
                    <div className="text-[11px] text-arcus-fg-tertiary">{d.actions} action{d.actions === 1 ? '' : 's'}</div>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// A skeleton block matching one analytics tile's footprint — pulsing, never a
// blank flash. Used both for first-load (nothing fetched yet) and to fill the
// donut's slot while recommendations are still in flight.
function AnalyticsTileSkeleton({ h }: { h: string }) {
  return <div className={cn('bg-arcus-surface rounded-2xl animate-pulse', h)} />;
}

// ── Orchestrates the whole analytics dashboard: a real loading skeleton while
// the first fetch is in flight (never the false-empty "no activity" state —
// that used to flash before week-activity had even resolved), the honest
// empty state once we KNOW there's no agent activity, and otherwise the two
// spark tiles + big area chart + (donut when there's connected-app data) +
// weekday radar. `refreshing` re-runs BOTH week-activity and recommendations
// (the donut/Sift source) — the earlier version only refreshed the chart,
// which meant the donut could never actually be refreshed.
function AnalyticsSection({ week, weekLoaded, appCounts, recsLoaded, refreshing, onRefresh, onSchedule }: {
  week: WeekData | null; weekLoaded: boolean; appCounts: AppCounts | null; recsLoaded: boolean;
  refreshing: boolean; onRefresh: () => void; onSchedule: () => void;
}) {
  if (!weekLoaded) {
    return (
      <Section title="Your week" sub="Loading your activity…">
        <div className="grid sm:grid-cols-2 gap-2.5 mb-2.5">
          <AnalyticsTileSkeleton h="h-[84px]" />
          <AnalyticsTileSkeleton h="h-[84px]" />
        </div>
        <AnalyticsTileSkeleton h="h-[236px]" />
        <div className="grid sm:grid-cols-2 gap-2.5 mt-2.5">
          <AnalyticsTileSkeleton h="h-[212px]" />
          <AnalyticsTileSkeleton h="h-[212px]" />
        </div>
      </Section>
    );
  }

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

  const hasApps = !!appCounts && Object.values(appCounts).some((v) => v > 0);
  // The donut's slot: real data, a loading skeleton while recs are still in
  // flight, or nothing once we KNOW there's genuinely no cross-app signal.
  const showDonutSlot = hasApps || !recsLoaded;

  return (
    <Section title="Your week" sub={`${week.totalActions} action${week.totalActions === 1 ? '' : 's'} across ${week.totalRuns} run${week.totalRuns === 1 ? '' : 's'}, last 7 days`}>
      {/* Refetch keeps the frame — the existing charts hold at reduced opacity
          (dim + pulse) while refreshing rather than being torn out and
          replaced, so a manual refresh never causes a layout jump. */}
      <div className={cn('transition-opacity duration-300', refreshing && 'opacity-50 pointer-events-none animate-pulse')}>
        <div className="grid sm:grid-cols-2 gap-2.5 mb-2.5">
          <StatSparkTile label="actions this week" sub="last 7 days" value={week.totalActions} data={week.days} dataKey="actions" colorVar="var(--arcus-chart-blue)" />
          <StatSparkTile label="agent runs this week" sub="last 7 days" value={week.totalRuns} data={week.days} dataKey="runs" colorVar="var(--arcus-chart-blue)" />
        </div>
        <WeekAreaChart week={week} onRefresh={onRefresh} refreshing={refreshing} />
        <div className={cn('grid gap-2.5 mt-2.5', showDonutSlot && 'sm:grid-cols-2')}>
          {hasApps ? <AppsDonut counts={appCounts} /> : (!recsLoaded ? <AnalyticsTileSkeleton h="h-[212px]" /> : null)}
          <WeekdayRadar week={week} />
        </div>
      </div>
    </Section>
  );
}

// ── Conversation pulse — status breakdown + which relationships are going
// quiet fastest. Two real, purely-derived signals rendered as bars rather than
// a donut (house style: a pie/donut is for part-to-whole "at a glance" with
// clearly separated segments — these statuses are frequently close in count,
// which a segmented bar compares far more reliably). Renders nothing under 3
// conversations: with that few there's nothing meaningful to compare.
function ConversationPulse({ conversations }: { conversations: Conversation[] }) {
  const total = conversations.length;
  const segments = useMemo(() => {
    const counts: Record<ConvoStatus, number> = { awaiting_you: 0, waiting_on_them: 0, active: 0, meeting_booked: 0 };
    for (const c of conversations) counts[c.status] = (counts[c.status] || 0) + 1;
    return STATUS_ORDER.map((s) => ({ status: s, count: counts[s] })).filter((s) => s.count > 0);
  }, [conversations]);

  const goingQuiet = useMemo(() => {
    return conversations
      .filter((c): c is Conversation & { daysSince: number } => c.status === 'waiting_on_them' && typeof c.daysSince === 'number')
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 4);
  }, [conversations]);
  const maxQuiet = Math.max(...goingQuiet.map((c) => c.daysSince), 1);

  if (total < 3) return null;

  return (
    <div className="rounded-2xl border border-arcus-border bg-arcus-surface p-4 mb-2.5 grid sm:grid-cols-2 gap-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-arcus-fg-tertiary mb-2.5">Where things stand</p>
        <div className="h-2.5 w-full rounded-full overflow-hidden flex gap-0.5 bg-arcus-elevated">
          {segments.map((seg) => (
            <div
              key={seg.status}
              className={cn(STATUS_META[seg.status].fill, 'h-full first:rounded-l-full last:rounded-r-full')}
              style={{ width: `${(seg.count / total) * 100}%` }}
              title={`${STATUS_META[seg.status].label}: ${seg.count}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2.5">
          {segments.map((seg) => (
            <span key={seg.status} className="inline-flex items-center gap-1.5 text-[11.5px] text-arcus-fg-tertiary">
              <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_META[seg.status].fill)} />
              {STATUS_META[seg.status].label} <span className="text-arcus-fg-secondary font-semibold tabular-nums">{seg.count}</span>
            </span>
          ))}
        </div>
      </div>

      {goingQuiet.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-arcus-fg-tertiary mb-2.5">Going quiet</p>
          <div className="space-y-2">
            {goingQuiet.map((c) => (
              <div key={c.key} tabIndex={0} className="group flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-arcus-fg-muted">
                <span className="text-[12.5px] text-arcus-fg-secondary w-20 shrink-0 truncate">{c.name}</span>
                <div className="flex-1 h-2 rounded-full bg-arcus-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max((c.daysSince / maxQuiet) * 100, 6)}%` }}
                  />
                </div>
                <span className="text-[11.5px] text-arcus-fg-tertiary tabular-nums w-9 text-right shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200">
                  {c.daysSince}d
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
