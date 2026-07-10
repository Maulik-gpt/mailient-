import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
// @ts-ignore
import { DatabaseService } from '@/lib/supabase';
// @ts-ignore
import { GmailService } from '@/lib/gmail';
// @ts-ignore
import { decrypt } from '@/lib/crypto';
import { logEvent } from "@/lib/logsso";

/**
 * POST /api/onboarding/scan
 *
 * Reads the user's REAL inbox and returns EXACT counts for the First Scan /
 * Scan Results screens — trust is the whole point, so we do NOT use Gmail's
 * rough `resultSizeEstimate`. We paginate the message list and count the real
 * results (capped so a huge mailbox can't blow the time budget; a capped metric
 * is reported with `capped:true` so the UI can show "6,000+", never a wrong
 * exact number).
 *
 * Each query is precise and reproducible: a user could paste it into Gmail
 * search and get the same count.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PAGE = 500;        // Gmail max page size
const MAX_PAGES = 12;    // hard cap → up to 6,000 counted per metric

async function resolveTokens(session: any, userId: string) {
  let accessToken = session?.accessToken;
  let refreshToken = session?.refreshToken;
  if (!accessToken) {
    const db = new DatabaseService();
    const userTokens = await db.getUserTokens(userId);
    if (userTokens?.encrypted_access_token) {
      accessToken = decrypt(userTokens.encrypted_access_token);
      refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : null;
    }
  }
  return { accessToken, refreshToken };
}

/** Count the exact number of messages matching `query` by paginating ids. */
async function countExact(
  accessToken: string,
  refreshToken: string | null,
  userId: string,
  query: string,
  maxPages = MAX_PAGES,
): Promise<{ count: number; capped: boolean }> {
  // Own GmailService per metric so the three counts can run in parallel
  // without serializing on a shared rate-limiter. (GmailService is untyped JS,
  // so we hold it loosely for the pageToken param.)
  const gmail: any = new GmailService(accessToken, refreshToken ?? '');
  gmail.setUserEmail?.(userId);

  let count = 0;
  let pageToken: string | null = null;
  let pages = 0;

  do {
    const res: any = await gmail.getEmails(PAGE, query, pageToken);
    const msgs = Array.isArray(res?.messages) ? res.messages : [];
    count += msgs.length;
    pageToken = res?.nextPageToken || null;
    pages++;
    if (pages >= maxPages && pageToken) {
      return { count, capped: true };
    }
  } while (pageToken);

  return { count, capped: false };
}

export async function POST() {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();

    const { accessToken, refreshToken } = await resolveTokens(session, userId);
    if (!accessToken) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 403 });
    }

    const WINDOW = 30;

    // Precise, reproducible queries (paste-into-Gmail equivalent):
    //  received      — everything that arrived in the window (not sent/chats/drafts/trash/spam)
    //  unanswered    — still-unread mail from real people (excludes bulk categories)
    //  automated     — newsletters, promos, social, updates, forums (the noise)
    const queries = {
      received:  'newer_than:30d -in:sent -in:chats -in:drafts -in:trash -in:spam',
      unanswered:'in:inbox is:unread newer_than:30d -category:promotions -category:social -category:updates -category:forums',
      automated: 'newer_than:30d (category:promotions OR category:social OR category:updates OR category:forums)',
    };

    const [recvR, unansR, autoR] = await Promise.allSettled([
      countExact(accessToken, refreshToken, userId, queries.received),
      countExact(accessToken, refreshToken, userId, queries.unanswered, 8),
      countExact(accessToken, refreshToken, userId, queries.automated),
    ]);

    const pick = (r: PromiseSettledResult<{ count: number; capped: boolean }>) =>
      r.status === 'fulfilled' ? r.value : null;

    const received = pick(recvR);
    const unanswered = pick(unansR);
    const automated = pick(autoR);

    // If we couldn't read the inbox at all, say so honestly rather than guessing.
    if (!received && !unanswered && !automated) {
      return NextResponse.json({ error: 'Inbox scan failed' }, { status: 502 });
    }

    // Estimated weekly time on email — clearly an estimate (labelled in UI).
    // ~30s to triage each received item + ~4 min to handle each unanswered one,
    // spread across ~4.3 weeks in the 30-day window.
    const recvN = received?.count ?? 0;
    const unansN = unanswered?.count ?? 0;
    const minutes = recvN * 0.5 + unansN * 4;
    const hoursPerWeek = Math.max(1, Math.round((minutes / 60 / 4.3) * 10) / 10);

    return NextResponse.json({
      success: true,
      windowDays: WINDOW,
      received: recvN,
      receivedCapped: received?.capped ?? false,
      unanswered: unansN,
      unansweredCapped: unanswered?.capped ?? false,
      automated: automated?.count ?? 0,
      automatedCapped: automated?.capped ?? false,
      hoursPerWeek,
      // null when a specific metric failed, so the UI can show "—" instead of 0
      partial: {
        received: received == null,
        unanswered: unanswered == null,
        automated: automated == null,
      },
    });
  } catch (error: any) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
    console.error('❌ [Onboarding] Scan failed:', error);
    return NextResponse.json({ error: 'Inbox scan failed' }, { status: 500 });
  }
}
