/**
 * GET /api/referrals/me — the signed-in user's referral code, link and stats.
 *
 * Read-only and session-scoped. There is deliberately no write endpoint: if a
 * client could create referrals or grant days, it could mint free months.
 * Attribution happens server-side at signup; payout happens server-side on the
 * billing webhook. Both are unreachable from the browser.
 */

import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth as nextAuth } from '@/lib/auth.js';
import { getReferralStats } from '@/lib/referrals';

const auth: any = nextAuth;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Prefer the real request origin so links work in preview deploys and
  // localhost without hardcoding production.
  const origin = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const stats = await getReferralStats(session.user.email, origin);
  return NextResponse.json(stats);
}
