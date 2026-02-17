import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { MissionEngine } from '@/lib/mission-engine.js';

const engine = new MissionEngine();

/**
 * POST /api/missions/:id/agent-loop
 * Run one iteration of Understand -> Plan -> Act -> Monitor for a mission
 */
export async function POST(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id } = await params;
        const result = await engine.runAgentLoop(session.user.email, id, session);

        return NextResponse.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('POST /api/missions/[id]/agent-loop error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
