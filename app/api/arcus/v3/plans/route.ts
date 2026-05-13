/**
 * Arcus V3 — Plans API
 * GET  /api/arcus/v3/plans        — List plans for authenticated user (paginated)
 * POST /api/arcus/v3/plans        — (internal) Create a plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../lib/auth.js';
import { getSupabaseAdmin } from '../../../../../lib/supabase.js';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const session = await (auth as any)();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.email.toLowerCase();
    const supabase = getSupabaseAdmin();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    const cursor = searchParams.get('cursor'); // createdAt timestamp
    const status = searchParams.get('status'); // optional filter
    const mode = searchParams.get('mode'); // 'agentic' | 'plan_mode'

    // Build query — always scoped to userId
    let query = supabase
      .from('arcus_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (mode) {
      query = query.eq('mode', mode);
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error('[Arcus V3] Plans list error:', error.message);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // For each plan, fetch its steps
    const plansWithSteps = await Promise.all(
      (plans || []).map(async (plan) => {
        const { data: steps } = await supabase
          .from('arcus_plan_steps')
          .select('*')
          .eq('plan_id', plan.id)
          .order('position', { ascending: true });

        return { ...plan, steps: steps || [] };
      })
    );

    return NextResponse.json({
      plans: plansWithSteps,
      nextCursor: plansWithSteps.length === limit ? plansWithSteps[plansWithSteps.length - 1].created_at : null
    });

  } catch (error) {
    console.error('[Arcus V3] Plans API error:', (error as Error).message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
