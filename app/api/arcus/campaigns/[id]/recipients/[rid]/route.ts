/**
 * PATCH /api/arcus/campaigns/[id]/recipients/[rid]
 *
 * Review-screen edits on a single draft: { subject?, body? } to edit,
 * { exclude: true } to pull someone out, { exclude: false } to re-include.
 * Only drafted/excluded rows are editable — queued/sent rows are immutable.
 */
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth } from '../../../../../../../lib/auth.js';
// @ts-ignore — JS module
import { getSupabaseAdmin } from '../../../../../../../lib/supabase.js';
import { lintDraftDeliverability } from '../../../../../../../lib/arcus/outreach';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; rid: string }> },
) {
  try {
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();
    const { id, rid } = await params;
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();

    const { data: row } = await supabase
      .from('arcus_campaign_recipients')
      .select('id, status, body')
      .eq('id', rid)
      .eq('campaign_id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!['drafted', 'excluded'].includes(row.status)) {
      return NextResponse.json({ error: `A ${row.status} recipient can't be edited.` }, { status: 400 });
    }

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof body.subject === 'string') patch.subject = body.subject.trim().slice(0, 150);
    if (typeof body.body === 'string') {
      const text = body.body.trim();
      if (text.length < 10) return NextResponse.json({ error: 'Body is too short.' }, { status: 400 });
      patch.body = text;
      const lint = lintDraftDeliverability(text);
      patch.deliverability_score = lint.score;
      patch.generic_flag = lint.flags.includes('reads generic');
    }
    if (body.exclude === true) { patch.status = 'excluded'; patch.error = 'excluded by you'; }
    if (body.exclude === false && row.status === 'excluded') {
      // Re-included rows that were auto-excluded at creation have no draft yet —
      // send them through the drafting pipeline instead of straight to 'drafted'
      // (an empty body would fail at enqueue time forever).
      patch.status = row.body && String(row.body).trim().length >= 10 ? 'drafted' : 'pending';
      patch.error = null;
    }

    const { error } = await supabase
      .from('arcus_campaign_recipients')
      .update(patch)
      .eq('id', rid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Update failed' }, { status: 500 });
  }
}
