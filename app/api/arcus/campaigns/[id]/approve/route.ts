/**
 * POST /api/arcus/campaigns/[id]/approve
 *
 * THE approval gate — the only path from 'review' to 'sending'. Deliberately a
 * session-authed user action and not an agent tool: the model can draft and
 * report, but it can never start a send. Brand law.
 */
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth } from '../../../../../../lib/auth.js';
// @ts-ignore — JS module
import { getSupabaseAdmin } from '../../../../../../lib/supabase.js';
import { approveCampaign, getCampaignSnapshot } from '../../../../../../lib/arcus/outreach';

export const dynamic = 'force-dynamic';

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

    const res = await approveCampaign(supabase, userId, id);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

    const snapshot = await getCampaignSnapshot(supabase, userId, id);
    return NextResponse.json({ ok: true, campaign: snapshot });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Approve failed' }, { status: 500 });
  }
}
