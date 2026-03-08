import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const runId = params?.runId;
    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const run = await db.getOperatorRunById(session.user.email, runId);
    const steps = await db.getOperatorRunSteps(session.user.email, runId);
    const events = await db.getOperatorRunEvents(session.user.email, runId, 200);

    return NextResponse.json({
      run: run ? {\n        runId: run.run_id || run.runId,\n        status: run.status,\n        phase: run.phase,\n        intent: run.intent,\n        complexity: run.complexity,\n        updatedAt: run.updated_at\n      } : null,
      steps: (steps || []).map((s) => ({
        id: s.step_id,
        order: s.step_order,
        kind: s.kind,
        status: s.status,
        label: s.label,
        detail: s.detail || '',
        evidence: s.evidence || null
      })),
      events: (events || []).map((e) => ({
        id: e.id,
        type: e.event_type || 'run_event',
        phase: e.phase || 'thinking',
        payload: e.payload || {},
        createdAt: e.created_at
      }))
    });
  } catch (error) {
    console.error('Operator run fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch run' }, { status: 500 });
  }
}



