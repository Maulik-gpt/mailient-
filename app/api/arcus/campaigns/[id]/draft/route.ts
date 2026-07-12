/**
 * POST /api/arcus/campaigns/[id]/draft — advance drafting by one batch.
 *
 * Called by the review screen on load/poll so an open review page keeps the
 * pipeline moving even between cron ticks. Idempotent: rows are claimed by
 * status transition, so concurrent callers never double-draft.
 */
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth } from '../../../../../../lib/auth.js';
// @ts-ignore — JS module
import { getSupabaseAdmin } from '../../../../../../lib/supabase.js';
import { draftCampaignBatch } from '../../../../../../lib/arcus/outreach';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const res = await draftCampaignBatch(supabase, userId, id);
    return NextResponse.json({ ok: !res.error, ...res });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Drafting failed' }, { status: 500 });
  }
}
