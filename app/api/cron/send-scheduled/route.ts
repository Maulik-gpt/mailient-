/**
 * Dedicated scheduled-email dispatcher cron — also the heartbeat of Arcus
 * Outreach campaigns.
 *
 * Each tick, in order:
 *   1. continueDraftingCampaigns — advance any campaign still writing drafts
 *      (chunked + resumable; a 429'd model just resumes next tick)
 *   2. dispatchCampaignSends    — top up the send queue for approved campaigns
 *      (ramp curve, daily cap, business-hours window, jitter, auto-pause)
 *   3. drainScheduledEmails     — the actual paced Gmail sends
 *   4. syncCampaignSendOutcomes — pull sent/failed back onto recipient rows
 *
 * The 15-min run-agents cron already drains scheduled emails every tick, so this
 * is the TIGHTER lane. Point a more frequent cron-job.org entry (e.g. every 2–5
 * min) here for send-time accuracy. Same CRON_SECRET auth as run-agents.
 *
 *   GET /api/cron/send-scheduled
 *   Authorization: Bearer $CRON_SECRET   (or x-arcus-cron-secret: $CRON_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase.js';
import { drainScheduledEmails } from '../../../../lib/arcus/scheduled-send';
import {
  continueDraftingCampaigns,
  dispatchCampaignSends,
  syncCampaignSendOutcomes,
  classifyCampaignReplies,
} from '../../../../lib/arcus/outreach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET || 'arcus-cron-secret';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const ok =
    authHeader === `Bearer ${CRON_SECRET}` ||
    request.headers.get('x-arcus-cron-secret') === CRON_SECRET ||
    request.headers.get('x-vercel-cron') === '1';
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabaseAdmin();

  // Campaign lanes first (each is fail-soft and returns quickly when idle),
  // then the shared drain, then outcome sync so recipient rows reflect this
  // tick's sends immediately.
  const draftsAdvanced = await continueDraftingCampaigns(supabase);
  const dispatch = await dispatchCampaignSends(supabase);
  const result = await drainScheduledEmails(supabase, { limit: 50 });
  await syncCampaignSendOutcomes(supabase);
  // Reply intelligence: classify new replies + draft the follow-through in
  // the user's voice (Gmail drafts in-thread — approval law holds).
  const repliesHandled = await classifyCampaignReplies(supabase);

  return NextResponse.json({
    ok: true,
    ...result,
    campaignDraftsAdvanced: draftsAdvanced,
    campaignQueued: dispatch.queued,
    campaignRepliesHandled: repliesHandled,
  });
}
