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
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';
import { GmailService } from '@/lib/gmail';
import { CalendarService } from '@/lib/calendar';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_PER_BUCKET = 3;

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

interface TodayResponse {
  decide: DecideItem[];
  showUp: ShowUpItem[];
  chase: ChaseItem[];
  emptyAll: boolean;
  generatedAt: string;
  gmailConnected: boolean;
  calendarConnected: boolean;
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
  return null;
}

async function fetchDecide(gmail: GmailService): Promise<DecideItem[]> {
  try {
    const res = await (gmail as any).getEmails(30, 'is:unread newer_than:1d -category:promotions -category:social');
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
    return items.slice(0, MAX_PER_BUCKET);
  } catch (err) {
    console.warn('[home-feed/today] decide fetch failed:', (err as any)?.message);
    return [];
  }
}

async function fetchShowUp(cal: CalendarService, userEmail: string): Promise<ShowUpItem[]> {
  try {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const events = await cal.listEvents({
      timeMin: now.toISOString(),
      timeMax: endOfDay.toISOString(),
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

export async function GET(_req: Request) {
  try {
    // @ts-ignore
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userEmail = session.user.email as string;

    let accessToken = (session as any)?.accessToken;
    let refreshToken = (session as any)?.refreshToken;

    if (!accessToken) {
      try {
        const db = new DatabaseService();
        const tokens = await db.getUserTokens(userEmail);
        if (tokens?.encrypted_access_token) {
          accessToken = decrypt(tokens.encrypted_access_token);
          refreshToken = tokens.encrypted_refresh_token ? decrypt(tokens.encrypted_refresh_token) : '';
        }
      } catch (e) {
        console.error('[home-feed/today] token fetch failed:', e);
      }
    }

    if (!accessToken) {
      const empty: TodayResponse = {
        decide: [], showUp: [], chase: [], emptyAll: true,
        generatedAt: new Date().toISOString(),
        gmailConnected: false, calendarConnected: false,
      };
      return NextResponse.json({ success: true, ...empty });
    }

    const gmail = new GmailService(accessToken, refreshToken || '');
    (gmail as any).setUserEmail?.(userEmail);
    const cal = new CalendarService(accessToken, refreshToken || '');

    const [decide, showUp, chase] = await Promise.all([
      fetchDecide(gmail),
      fetchShowUp(cal, userEmail),
      fetchChase(gmail, userEmail),
    ]);

    const payload: TodayResponse = {
      decide,
      showUp,
      chase,
      emptyAll: decide.length === 0 && showUp.length === 0 && chase.length === 0,
      generatedAt: new Date().toISOString(),
      gmailConnected: true,
      calendarConnected: true,
    };
    return NextResponse.json({ success: true, ...payload });
  } catch (err: any) {
    console.error('[home-feed/today] failed:', err?.message);
    return NextResponse.json({ success: false, error: err?.message || 'Failed to build today surface' }, { status: 500 });
  }
}
