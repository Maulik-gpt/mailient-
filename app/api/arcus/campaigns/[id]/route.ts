/**
 * GET   /api/arcus/campaigns/[id] — campaign detail + recipients (paged).
 * PATCH /api/arcus/campaigns/[id] — { action: 'pause'|'resume'|'cancel' } or { dailyCap }.
 */
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth } from '../../../../../lib/auth.js';
// @ts-ignore — JS module
import { getSupabaseAdmin } from '../../../../../lib/supabase.js';
import { getCampaignSnapshot, setCampaignState } from '../../../../../lib/arcus/outreach';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
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

    const snapshot = await getCampaignSnapshot(supabase, userId, id);
    if (!snapshot) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const url = new URL(req.url);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
    const statusFilter = (url.searchParams.get('status') || '').trim();

    let q = supabase
      .from('arcus_campaign_recipients')
      .select('id, email, name, company, hook, research, subject, body, voice_score, deliverability_score, generic_flag, status, reply_intent, reply_snippet, error, sent_at, replied_at, created_at', { count: 'exact' })
      .eq('campaign_id', id)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data: recipients, count } = await q;

    return NextResponse.json({
      campaign: snapshot,
      recipients: recipients || [],
      total: count ?? 0,
      offset,
      limit,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load campaign' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();

    if (body.action) {
      if (!['pause', 'resume', 'cancel'].includes(body.action)) {
        return NextResponse.json({ error: 'action must be pause, resume, or cancel' }, { status: 400 });
      }
      const res = await setCampaignState(supabase, userId, id, body.action);
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ ok: true, status: res.status });
    }

    if (body.dailyCap != null) {
      const cap = Math.min(100, Math.max(10, Number(body.dailyCap) || 40));
      const { error } = await supabase
        .from('arcus_campaigns')
        .update({ daily_cap: cap, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, dailyCap: cap });
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Update failed' }, { status: 500 });
  }
}
