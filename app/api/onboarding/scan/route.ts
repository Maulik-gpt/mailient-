import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
// @ts-ignore
import { DatabaseService } from '@/lib/supabase';
// @ts-ignore
import { GmailService } from '@/lib/gmail';
// @ts-ignore
import { decrypt } from '@/lib/crypto';

/**
 * POST /api/onboarding/scan
 *
 * Reads the user's REAL inbox and returns real counts for the "First Scan"
 * onboarding moment. Uses Gmail's own resultSizeEstimate per query, so it's a
 * genuine read of their account — not placeholder numbers. Cheap (maxResults=1
 * per query; the estimate is for the whole result set, not the page).
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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

async function estimate(gmail: any, query: string): Promise<number> {
  try {
    const res = await gmail.getEmails(1, query);
    const n = Number(res?.resultSizeEstimate ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
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

    const gmail = new GmailService(accessToken, refreshToken);
    gmail.setUserEmail?.(userId);

    const WINDOW = 30;

    // Real Gmail queries — each returns Gmail's own estimate of the full match set.
    const [received, needsReply, repetitive] = await Promise.all([
      // Received in the last 30 days (exclude things you sent)
      estimate(gmail, 'newer_than:30d -in:sent -in:chats -in:drafts'),
      // A reasonable "needed a reply" proxy: unread primary-inbox mail from real people
      estimate(gmail, 'in:inbox is:unread newer_than:30d -category:promotions -category:social -category:updates -from:me'),
      // Repetitive / automated noise
      estimate(gmail, 'newer_than:30d (category:promotions OR category:updates OR category:social OR unsubscribe)'),
    ]);

    // Estimated hours/week: ~30s to triage each received item + ~4 min to handle
    // each reply, spread across ~4.3 weeks. Clearly an estimate, labelled as such.
    const minutes = received * 0.5 + needsReply * 4;
    const hoursPerWeek = Math.max(1, Math.round((minutes / 60 / 4.3) * 10) / 10);

    return NextResponse.json({
      success: true,
      windowDays: WINDOW,
      received,
      needsReply,
      repetitive,
      hoursPerWeek,
    });
  } catch (error: any) {
    console.error('❌ [Onboarding] Scan failed:', error);
    return NextResponse.json({ error: 'Inbox scan failed' }, { status: 500 });
  }
}
