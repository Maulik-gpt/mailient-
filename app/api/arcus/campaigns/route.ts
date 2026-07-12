/**
 * GET /api/arcus/campaigns — list the user's outreach campaigns (newest first).
 */
import { NextResponse } from 'next/server';
// @ts-ignore — JS module
import { auth } from '../../../../lib/auth.js';
// @ts-ignore — JS module
import { getSupabaseAdmin } from '../../../../lib/supabase.js';
import { effectiveDailyCap } from '../../../../lib/arcus/outreach';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.email.toLowerCase();
    const supabase = getSupabaseAdmin();

    const { data: campaigns, error } = await supabase
      .from('arcus_campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      // Table missing (migration not yet run) → empty list, not a 500.
      if ((error as any).code === '42P01') return NextResponse.json({ campaigns: [] });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      campaigns: (campaigns || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        dailyCap: c.daily_cap,
        effectiveCapToday: effectiveDailyCap(c),
        counts: {
          recipients: c.recipient_count ?? 0,
          drafted: c.drafted_count ?? 0,
          sent: c.sent_count ?? 0,
          replied: c.replied_count ?? 0,
          meeting: c.meeting_count ?? 0,
          failed: c.failed_count ?? 0,
        },
        domainHealth: c.domain_health || null,
        lastError: c.last_error || null,
        createdAt: c.created_at,
        approvedAt: c.approved_at,
        completedAt: c.completed_at,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list campaigns' }, { status: 500 });
  }
}
