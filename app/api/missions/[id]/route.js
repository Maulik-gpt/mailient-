import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { MissionEngine } from '@/lib/mission-engine.js';

const engine = new MissionEngine();

/**
 * GET /api/missions/:id - Get a single mission
 */
export async function GET(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id } = await params;
        const mission = await engine.getMission(session.user.email, id);

        if (!mission) {
            return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, mission });
    } catch (error) {
        console.error('GET /api/missions/[id] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/missions/:id - Update a mission
 */
export async function PATCH(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        // Only allow specific fields to be updated
        const allowedFields = ['title', 'status', 'success_condition', 'next_step', 'deadline',
            'escalation_rules', 'linked_thread_ids', 'linked_email_ids', 'outcome_log', 'follow_up_count'];
        const updates = {};
        for (const key of allowedFields) {
            if (body[key] !== undefined) updates[key] = body[key];
        }

        const mission = await engine.updateMission(session.user.email, id, updates);
        return NextResponse.json({ success: true, mission });
    } catch (error) {
        console.error('PATCH /api/missions/[id] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/missions/:id - Delete a mission
 */
export async function DELETE(request, { params }) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { id } = await params;
        await engine.deleteMission(session.user.email, id);
        return NextResponse.json({ success: true, message: 'Mission deleted' });
    } catch (error) {
        console.error('DELETE /api/missions/[id] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
