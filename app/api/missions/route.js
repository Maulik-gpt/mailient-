import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { MissionEngine } from '@/lib/mission-engine.js';

const engine = new MissionEngine();

/**
 * GET /api/missions - List user's missions
 * Query params: status, due_today, at_risk
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const dueToday = searchParams.get('due_today') === 'true';
        const atRisk = searchParams.get('at_risk') === 'true';
        const dashboard = searchParams.get('dashboard') === 'true';

        if (dashboard) {
            const data = await engine.getMissionsDashboard(session.user.email);
            return NextResponse.json({ success: true, ...data });
        }

        const missions = await engine.getUserMissions(session.user.email, {
            status: status || undefined,
            dueToday,
            atRisk
        });

        return NextResponse.json({ success: true, missions, count: missions.length });
    } catch (error) {
        console.error('GET /api/missions error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/missions - Create a new mission
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { title, successCondition, linkedThreadIds, linkedEmailIds, deadline, escalationRules } = body;

        if (!title) {
            return NextResponse.json({ error: 'Mission title is required' }, { status: 400 });
        }

        const mission = await engine.createMission(session.user.email, {
            title,
            successCondition: successCondition || '',
            linkedThreadIds: linkedThreadIds || [],
            linkedEmailIds: linkedEmailIds || [],
            deadline: deadline || null,
            escalationRules: escalationRules || {}
        });

        return NextResponse.json({ success: true, mission });
    } catch (error) {
        console.error('POST /api/missions error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
