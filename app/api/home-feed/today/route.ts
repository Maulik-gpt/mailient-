/**
 * Home-feed Today surface — the daily decision queue.
 *
 * Returns at most 3 items per bucket:
 *   • decide   — unread mail in the last 24h that has urgency or revenue signal
 *   • showUp   — calendar events for the rest of today
 *   • chase    — threads the user sent 3-14 days ago with no reply received
 *
 * No LLM calls in the hot path. Pure heuristics so the home feed loads fast.
 * The old /api/home-feed/insights deep-analysis surface stays available for
 * power users; this route is the surface the home page actually mounts.
 */
import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
// @ts-ignore
import { getSupabaseAdmin } from '@/lib/supabase.js';
import { GmailService } from '@/lib/gmail';
import { CalendarService } from '@/lib/calendar';
import { cleanRunSummary } from '@/lib/arcus/report-summary';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_PER_BUCKET = 3;
const ACTION_ITEM_HORIZON_HOURS = 48;

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
  id: string;              // <meeting_row_id>:<index> — addressable for future "mark done"
  text: string;
  dueAt: string | null;
  isOverdue: boolean;
  meetingTitle: string | null;
  attendees: string[];
}

// "While you were away" — what the user's scheduled agents did recently. This
// is what makes HomeFeed a command center: every agent's work flows through it,
// not just inbox-derived items. Sourced from arcus_agent_runs.
interface AgentRunItem {
  id: string;
  agentName: string;
  status: 'success' | 'error' | 'transient_error' | 'running';
  summary: string | null;     // clean one-line preview of the run report
  toolCalls: number;
  ranAt: string;              // completed_at, or started_at if still running
  artifactCounts: { gmail: number; calendar: number; notion: number; slack: number };
}

interface TodayResponse {
  decide: DecideItem[];
  showUp: ShowUpItem[];
  chase: ChaseItem[];
  actionItems: ActionItem[];
  agentRuns: AgentRunItem[];
  emptyAll: boolean;
  generatedAt: string;
  gmailConnected: boolean;
  calendarConnected: boolean;
  needsReconnect?: { gmail?: boolean; calendar?: boolean };
}

function isTokenExpiredErr(err: any): boolean {
  const m = String(err?.message || '').toLowerCase();
  return m.includes('expired') || m.includes('invalid_grant') || m.includes('401') || m.includes('refresh failed');
}

const URGENCY_SIGNALS = [
  /\burgent\b/i,
  /\basap\b/i,
  /\btime[- ]?sensitive\b/i,
  /\bdeadline\b/i,
  /\boverdue\b/i,
  /\baction (required|needed)\b/i,
  /\bplease (respond|reply|review|approve|confirm)\b/i,
  /\bquick (question|ask)\b/i,
  /\bneed your (input|review|approval|sign[- ]?off|decision)\b/i,
];

const REVENUE_SIGNALS = [
  /\binvoice\b/i,
  /\bcontract\b/i,
  /\bproposal\b/i,
  /\bquote\b/i,
  /\bpricing\b/i,
  /\brenewal\b/i,
  /\bSOW\b/,
  /\bMSA\b/,
  /\bNDA\b/,
  /\bpayment\b/i,
  /\bsigned?\b/i,
  /\boffer letter\b/i,
  /\bpurchase order\b/i,
  /\bP\.O\.\b/,
];

const MEETING_REQUEST_SIGNALS = [
  /\bare you (free|available)\b/i,
  /\bdo you have (time|availability)\b/i,
  /\bcan we (chat|talk|meet|jump on|hop on)\b/i,
  /\b(let'?s|let us) (schedule|set up|find time|meet)\b/i,
  /\bsend (over )?(your|some) availability\b/i,
  /\b(book|grab) a (time|call|meeting)\b/i,
];

// Senders / patterns that should NEVER reach the Decide bucket even if the
// subject says "URGENT" — newsletters, automated digests, marketing.
const NOISE_FROM_PATTERNS = [
  /^no[- ]?reply@/i,
  /^donotreply@/i,
  /^notifications?@/i,
  /^newsletter@/i,
  /^digest@/i,
  /^updates?@/i,
  /^team@.*\.(io|app|com)$/i, // generic team@ from product newsletters
  /^marketing@/i,
  /^hello@.*\.(substack|beehiiv|convertkit)\.com$/i,
];
const NOISE_SUBJECT_PATTERNS = [
  /\b(weekly|daily|monthly) (digest|newsletter|roundup|update|summary|brief)\b/i,
  /\bunsubscribe\b/i,
  /^\[.+\]\s/, // "[Newsletter Name] ..."
  /^Re:\s*\[/, // "Re: [Newsletter]"
  /\bissue #\d+\b/i,
];

function parseFromHeader(fromHeader: string): { name: string; email: string } {
  const match = fromHeader.match(/^(.+?)\s*<(.+?)>\s*$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, ''), email: match[2].trim() };
  return { name: fromHeader.split('@')[0] || 'Unknown', email: fromHeader };
}

function isNoiseSender(fromHeader: string, subject: string): boolean {
  for (const re of NOISE_FROM_PATTERNS) if (re.test(fromHeader)) return true;
  for (const re of NOISE_SUBJECT_PATTERNS) if (re.test(subject)) return true;
  return false;
}

function classifyDecideReason(subject: string, snippet: string, from: string): string | null {
  if (isNoiseSender(from, subject)) return null;
  const text = `${subject} ${snippet}`;
  for (const re of URGENCY_SIGNALS) if (re.test(text)) return 'Flagged urgent';
  for (const re of REVENUE_SIGNALS) if (re.test(text)) return 'Money on the line';
  for (const re of MEETING_REQUEST_SIGNALS) if (re.test(text)) return 'Wants time on your calendar';
  // Direct question in the subject — but only if it's a real subject, not a
  // marketing teaser ("Did you know?" / "Tired of X?")
  if (/\?/.test(subject) && subject.length < 90 && !/^(did you|tired of|want to|ready to|why )/i.test(subject.trim())) {
    return 'Direct question';
  }
  // Re: threads — they continue an active conversation so the user is
  // expected to weigh in. Skip if subject looks like a marketing reply chain.
  if (/^Re:/i.test(subject) && !/\b(unsubscribe|newsletter|digest)\b/i.test(text)) {
    return 'Active thread waiting on you';
  }
  // Fallback for human emails to ensure the AI always has something to show
  return 'Needs your attention';
}

// Replace generic regex reasons with real per-email reasoning via one batched
// LLM call. Mutates items in place. Silent + non-blocking on any failure — the
// heuristic reason stays. Uses the verified free models directly (no heavy
// engine import in the hot path).
async function enrichDecideReasons(items: DecideItem[]): Promise<void> {
  if (!items.length) return;
  const keys = [process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEY2, process.env.OPENROUTER_API_KEY3].filter(Boolean) as string[];
  if (!keys.length) return;

  const numbered = items.map((it, i) => `${i + 1}. From: ${it.sender.name || it.sender.email} | Subject: ${it.subject}`).join('\n');
  const body = {
    model: 'openai/gpt-oss-120b:free',
    max_tokens: 400,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You triage a founder\'s inbox. For each numbered email, write ONE short, specific reason (max 12 words) it needs their attention — name the concrete ask or signal, not a generic label. ' +
          'Good: "Approve the Q3 budget — they need it by Friday." Bad: "Needs your attention." ' +
          'Output ONLY lines in the form "<number>. <reason>", one per email, nothing else.',
      },
      { role: 'user', content: numbered },
    ],
  };

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${keys[0]}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://mailient.xyz' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return;
    const json = await res.json();
    let text: string = json.choices?.[0]?.message?.content || '';
    text = text.replace(/<\/?(?:thinking|thought|reasoning)[^>]*>/gi, '');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*(\d+)[.)]\s*(.+)$/);
      if (!m) continue;
      const idx = parseInt(m[1], 10) - 1;
      const reason = m[2].replace(/^["'`]+|["'`]+$/g, '').trim();
      if (idx >= 0 && idx < items.length && reason.length >= 6 && reason.length <= 120) {
        items[idx].reason = reason;
      }
    }
  } catch {
    // keep heuristic reasons
  }
}

async function fetchDecide(gmail: GmailService): Promise<DecideItem[]> {
  try {
    const res = await (gmail as any).getEmails(30, 'is:unread newer_than:3d -category:promotions -category:social');
    const ids: string[] = (res?.messages || []).map((m: any) => m.id).slice(0, 30);
    if (!ids.length) return [];
    const details = await Promise.all(
      ids.map(async (id) => {
        try {
          const d = await (gmail as any).getEmailDetails(id, 'metadata');
          return (gmail as any).parseEmailData(d);
        } catch {
          return null;
        }
      }),
    );
    const items: DecideItem[] = [];
    for (const d of details) {
      if (!d) continue;
      const reason = classifyDecideReason(d.subject || '', d.snippet || '', d.from || '');
      if (!reason) continue;
      const sender = parseFromHeader(d.from || '');
      items.push({
        id: d.id,
        threadId: d.threadId,
        sender,
        subject: d.subject || '(no subject)',
        reason,
        receivedAt: d.date || new Date(Number(d.internalDate) || Date.now()).toISOString(),
        gmailUrl: `https://mail.google.com/mail/u/0/#inbox/${d.threadId}`,
      });
    }
    // Priority: revenue > urgent > question > meeting > active thread
    const rank = (r: string) => {
      if (r === 'Money on the line') return 0;
      if (r === 'Flagged urgent') return 1;
      if (r === 'Direct question') return 2;
      if (r === 'Wants time on your calendar') return 3;
      return 4;
    };
    items.sort((a, b) => rank(a.reason) - rank(b.reason));

    // AI enrichment: the regex above only SELECTS candidates + gives a generic
    // bucket label. Replace those labels with a real, specific one-line reason
    // per email ("Priya is asking you to approve the Q3 budget by Friday") via
    // one batched LLM call. Heuristic labels stay as the fallback if the call
    // fails — so the feed never slows below the regex baseline.
    await enrichDecideReasons(items.slice(0, MAX_PER_BUCKET));
    return items.slice(0, MAX_PER_BUCKET);
  } catch (err) {
    console.warn('[home-feed/today] decide fetch failed:', (err as any)?.message);
    return [];
  }
}

async function fetchShowUp(cal: CalendarService, userEmail: string): Promise<ShowUpItem[]> {
  try {
    const now = new Date();
    const endOfWindow = new Date(now);
    endOfWindow.setDate(endOfWindow.getDate() + 1);
    endOfWindow.setHours(23, 59, 59, 999);
    const events = await cal.listEvents({
      timeMin: now.toISOString(),
      timeMax: endOfWindow.toISOString(),
      maxResults: 20,
    });
    const items: ShowUpItem[] = [];
    for (const ev of events) {
      if (!ev.start?.dateTime && !ev.start?.date) continue; // skip malformed
      const start = ev.start.dateTime || ev.start.date || '';
      const end = ev.end?.dateTime || ev.end?.date || null;
      const attendees = ev.attendees || [];
      const externalAttendees = attendees.filter((a: any) => a.email && !a.email.endsWith(`@${userEmail.split('@')[1]}`));
      // Skip all-day events and recurring focus blocks (no attendees)
      if (!ev.start?.dateTime) continue;
      if (attendees.length === 0) continue;
      items.push({
        id: ev.id || '',
        start,
        end,
        title: ev.summary || '(no title)',
        attendeeCount: attendees.length,
        meetLink: ev.hangoutLink || ev.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || null,
        hangoutLink: ev.hangoutLink || null,
        isExternal: externalAttendees.length > 0,
      });
    }
    return items.slice(0, MAX_PER_BUCKET);
  } catch (err) {
    console.warn('[home-feed/today] showUp fetch failed:', (err as any)?.message);
    return [];
  }
}

async function fetchChase(gmail: GmailService, userEmail: string): Promise<ChaseItem[]> {
  try {
    const res = await (gmail as any).getEmails(40, 'in:sent newer_than:14d older_than:3d');
    const messages: any[] = res?.messages || [];
    if (!messages.length) return [];
    // Group by threadId — we'll fetch one thread per group to detect a reply.
    const byThread = new Map<string, string>();
    for (const m of messages) {
      if (!byThread.has(m.threadId)) byThread.set(m.threadId, m.id);
    }
    const threadIds = Array.from(byThread.keys()).slice(0, 25);
    const candidates = await Promise.all(
      threadIds.map(async (tid) => {
        try {
          const thread: any = await (gmail as any).getThreadDetails(tid);
          const msgs: any[] = thread.messages || [];
          if (!msgs.length) return null;
          const last = msgs[msgs.length - 1];
          const lastFromHeader = (last.payload?.headers || []).find((h: any) => h.name?.toLowerCase() === 'from')?.value || '';
          const lastFromEmail = parseFromHeader(lastFromHeader).email.toLowerCase();
          // If the latest message is FROM the user, nobody has replied yet — this is a chase candidate.
          if (lastFromEmail !== userEmail.toLowerCase()) return null;
          const firstSubject = (msgs[0].payload?.headers || []).find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '';
          const toHeader = (last.payload?.headers || []).find((h: any) => h.name?.toLowerCase() === 'to')?.value || '';
          const recipient = parseFromHeader(toHeader);
          const internal = Number(last.internalDate) || Date.now();
          const days = Math.floor((Date.now() - internal) / (24 * 60 * 60 * 1000));
          return {
            id: last.id,
            threadId: tid,
            recipient,
            subject: firstSubject || '(no subject)',
            daysSilent: days,
            sentAt: new Date(internal).toISOString(),
            gmailUrl: `https://mail.google.com/mail/u/0/#sent/${tid}`,
          } as ChaseItem;
        } catch {
          return null;
        }
      }),
    );
    const items = candidates.filter((c): c is ChaseItem => c !== null);
    items.sort((a, b) => b.daysSilent - a.daysSilent);
    return items.slice(0, MAX_PER_BUCKET);
  } catch (err) {
    console.warn('[home-feed/today] chase fetch failed:', (err as any)?.message);
    return [];
  }
}

async function fetchActionItems(userEmail: string): Promise<ActionItem[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('arcus_meeting_events')
      .select('id, title, attendees, event_start, action_items')
      .ilike('user_id', userEmail)
      .not('action_items', 'is', null)
      .order('event_start', { ascending: false })
      .limit(25);
    if (error) {
      if (error.code === '42P01') return []; // table missing — silent
      console.warn('[home-feed/today] action items fetch error:', error.message);
      return [];
    }
    if (!data?.length) return [];

    const now = Date.now();
    const horizonMs = now + ACTION_ITEM_HORIZON_HOURS * 60 * 60 * 1000;
    const items: ActionItem[] = [];

    for (const row of data) {
      const ai = Array.isArray(row.action_items) ? row.action_items : [];
      for (let i = 0; i < ai.length; i++) {
        const a = ai[i];
        if (!a || typeof a.text !== 'string' || !a.text.trim()) continue;
        if (a.done === true) continue;
        const dueMs = a.due_at ? new Date(a.due_at).getTime() : null;
        // Dated items only show when ≤48h away (or overdue). Undated items
        // are surfaced as backlog so the user doesn't forget them.
        if (dueMs !== null && dueMs > horizonMs) continue;
        const isOverdue = dueMs !== null && dueMs < now;
        items.push({
          id: `${row.id}:${i}`,
          text: a.text.slice(0, 200),
          dueAt: a.due_at || null,
          isOverdue,
          meetingTitle: row.title || null,
          attendees: Array.isArray(row.attendees)
            ? row.attendees.map((x: any) => x?.email).filter((e: any) => typeof e === 'string')
            : [],
        });
      }
    }

    items.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.dueAt && b.dueAt) return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      if (a.dueAt && !b.dueAt) return -1;
      if (!a.dueAt && b.dueAt) return 1;
      return 0;
    });

    return items.slice(0, MAX_PER_BUCKET);
  } catch (err: any) {
    console.warn('[home-feed/today] action items fetch failed:', err?.message);
    return [];
  }
}

// "While you were away" — the user's scheduled-agent runs from the last ~14h,
// joined to agent names. This is the spec's core HomeFeed promise: every agent's
// work is visible the moment the founder opens the app. Pure DB read, no LLM.
async function fetchAgentRuns(userEmail: string): Promise<AgentRunItem[]> {
  try {
    const supabase = getSupabaseAdmin();
    const sinceIso = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();

    const { data: runs, error } = await supabase
      .from('arcus_agent_runs')
      .select('id, agent_id, status, report_summary, tool_calls, completed_at, started_at, artifact_links')
      .eq('user_id', userEmail)
      .gte('started_at', sinceIso)
      .order('started_at', { ascending: false })
      .limit(MAX_PER_BUCKET);

    // Table not migrated yet, or any error — degrade silently, never break the feed.
    if (error || !runs?.length) return [];

    // Resolve agent names in one query.
    const agentIds = Array.from(new Set(runs.map((r: any) => r.agent_id).filter(Boolean)));
    const nameById = new Map<string, string>();
    if (agentIds.length) {
      const { data: agents } = await supabase
        .from('arcus_agents')
        .select('id, name')
        .in('id', agentIds);
      for (const a of (agents || []) as any[]) nameById.set(a.id, a.name);
    }

    const countBucket = (links: any, key: string): number =>
      Array.isArray(links?.[key]) ? links[key].length : 0;

    return (runs as any[]).map((r) => ({
      id: r.id,
      agentName: nameById.get(r.agent_id) || 'Agent',
      status: (r.status as AgentRunItem['status']) || 'success',
      summary: cleanRunSummary(r.report_summary, 160) || null,
      toolCalls: r.tool_calls ?? 0,
      ranAt: r.completed_at || r.started_at,
      artifactCounts: {
        gmail: countBucket(r.artifact_links, 'gmail'),
        calendar: countBucket(r.artifact_links, 'calendar'),
        notion: countBucket(r.artifact_links, 'notion'),
        slack: countBucket(r.artifact_links, 'slack'),
      },
    }));
  } catch (err: any) {
    console.warn('[home-feed/today] agent runs fetch failed:', err?.message);
    return [];
  }
}

// How long a cached snapshot is served before we recompute. The expensive
// Gmail/Calendar build happens on a miss (or via the cron prewarm); within the TTL
// every load is a fast DB read.
const TODAY_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Build the full Today snapshot (the expensive Gmail/Calendar fetch). Exported so
 * the cron can prewarm the cache. Does NOT apply dismissals — those are filtered at
 * serve time so a fresh dismiss takes effect even against a cached snapshot.
 */
export async function computeTodaySnapshot(userEmail: string): Promise<TodayResponse> {
  let accessToken: string | null = null;
  try {
    const { getGmailToken, getGcalToken } = await import('@/lib/arcus/tools/http-tokens');
    accessToken = (await getGmailToken(userEmail).catch(() => null))
               || (await getGcalToken(userEmail).catch(() => null));
  } catch (e) {
    console.error('[home-feed/today] token fetch failed:', e);
  }

  if (!accessToken) {
    const [actionItems, agentRuns] = await Promise.all([
      fetchActionItems(userEmail),
      fetchAgentRuns(userEmail),
    ]);
    return {
      decide: [], showUp: [], chase: [], actionItems, agentRuns,
      emptyAll: actionItems.length === 0 && agentRuns.length === 0,
      generatedAt: new Date().toISOString(),
      gmailConnected: false, calendarConnected: false,
    };
  }

  const gmail = new GmailService(accessToken, '');
  (gmail as any).setUserEmail?.(userEmail);
  const cal = new CalendarService(accessToken, '');

  const wrap = async <T,>(fn: () => Promise<T>, tag: 'gmail' | 'calendar'): Promise<{ value: T | null; expired: boolean }> => {
    try {
      return { value: await fn(), expired: false };
    } catch (e: any) {
      if (isTokenExpiredErr(e)) {
        try {
          const { markIntegrationNeedsReauth } = await import('@/lib/arcus/tools/http-tokens');
          await markIntegrationNeedsReauth(userEmail.toLowerCase(), tag === 'gmail' ? 'gmail' : 'gcal');
        } catch {}
        return { value: null, expired: true };
      }
      console.warn(`[home-feed/today] ${tag} fetch failed:`, e?.message);
      return { value: null, expired: false };
    }
  };

  const [decideR, showUpR, chaseR, actionItems, agentRuns] = await Promise.all([
    wrap(() => fetchDecide(gmail), 'gmail'),
    wrap(() => fetchShowUp(cal, userEmail), 'calendar'),
    wrap(() => fetchChase(gmail, userEmail), 'gmail'),
    fetchActionItems(userEmail),
    fetchAgentRuns(userEmail),
  ]);

  const gmailExpired = decideR.expired || chaseR.expired;
  const calendarExpired = showUpR.expired;
  const decide = decideR.value || [];
  const showUp = showUpR.value || [];
  const chase = chaseR.value || [];

  const needsReconnect = (gmailExpired || calendarExpired)
    ? { gmail: gmailExpired, calendar: calendarExpired }
    : undefined;

  return {
    decide,
    showUp,
    chase,
    actionItems,
    agentRuns,
    emptyAll: decide.length === 0 && showUp.length === 0 && chase.length === 0 && actionItems.length === 0 && agentRuns.length === 0 && !needsReconnect,
    generatedAt: new Date().toISOString(),
    gmailConnected: !gmailExpired,
    calendarConnected: !calendarExpired,
    needsReconnect,
  };
}

/** Persist a freshly-computed snapshot. Exported for the cron prewarm. */
export async function storeTodaySnapshot(userEmail: string, payload: TodayResponse): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from('arcus_today_cache')
      .upsert({ user_id: userEmail.toLowerCase(), payload, generated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  } catch (e: any) {
    console.warn('[home-feed/today] cache write failed:', e?.message);
  }
}

async function readTodaySnapshot(supabase: any, userEmail: string): Promise<{ payload: TodayResponse; generatedAt: string } | null> {
  try {
    const { data } = await supabase
      .from('arcus_today_cache')
      .select('payload, generated_at')
      .eq('user_id', userEmail.toLowerCase())
      .maybeSingle();
    if (!data?.payload) return null;
    return { payload: data.payload as TodayResponse, generatedAt: data.generated_at };
  } catch {
    return null;
  }
}

async function getDismissedIds(supabase: any, userEmail: string): Promise<Set<string>> {
  try {
    const { data } = await supabase
      .from('arcus_today_dismissals')
      .select('item_id')
      .eq('user_id', userEmail.toLowerCase());
    return new Set((data || []).map((r: any) => r.item_id));
  } catch {
    return new Set();
  }
}

function applyDismissals(payload: TodayResponse, dismissed: Set<string>): TodayResponse {
  if (!dismissed.size) return payload;
  const decide = payload.decide.filter((i) => !dismissed.has(i.id));
  const showUp = payload.showUp.filter((i) => !dismissed.has(i.id));
  const chase = payload.chase.filter((i) => !dismissed.has(i.id));
  const actionItems = payload.actionItems.filter((i) => !dismissed.has(i.id));
  return {
    ...payload,
    decide, showUp, chase, actionItems,
    emptyAll: decide.length === 0 && showUp.length === 0 && chase.length === 0 && actionItems.length === 0 && payload.agentRuns.length === 0 && !payload.needsReconnect,
  };
}

export async function GET(req: Request) {
  try {
    // @ts-ignore
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userEmail = session.user.email as string;

    // STRICT paywall backstop: the dashboard page is fail-closed, but this data
    // endpoint must reject non-payers directly too — otherwise a free/expired user
    // could pull their inbox/calendar by calling the API straight. (Owners + trial
    // pass via assertPaidAccess.)
    const { assertPaidAccess } = await import('@/lib/subscription-protection.js');
    const gate = await assertPaidAccess(userEmail);
    if (!gate.ok) {
      return NextResponse.json({ success: false, error: gate.error, upgradeUrl: gate.upgradeUrl }, { status: gate.status });
    }

    const supabase = getSupabaseAdmin();
    const force = new URL(req.url).searchParams.get('refresh') === '1';

    // Read the cached snapshot + current dismissals in parallel.
    const [cached, dismissed] = await Promise.all([
      force ? Promise.resolve(null) : readTodaySnapshot(supabase, userEmail),
      getDismissedIds(supabase, userEmail),
    ]);

    const isFresh = !!cached && (Date.now() - new Date(cached.generatedAt).getTime() < TODAY_CACHE_TTL_MS);

    let payload: TodayResponse;
    if (isFresh) {
      payload = cached!.payload;
    } else {
      payload = await computeTodaySnapshot(userEmail);
      await storeTodaySnapshot(userEmail, payload); // persist for the next reader / device
    }

    // Dismissals are applied at serve time (not baked into the cache) so a swipe
    // takes effect immediately even against a still-fresh cached snapshot.
    const served = applyDismissals(payload, dismissed);
    return NextResponse.json({ success: true, ...served, cached: isFresh });
  } catch (err: any) {
    console.error('[home-feed/today] failed:', err?.message);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to build today surface' }, { status: 500 });
  }
}
