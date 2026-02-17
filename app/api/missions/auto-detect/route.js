import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { MissionEngine } from '@/lib/mission-engine.js';

const engine = new MissionEngine();

/**
 * POST /api/missions/auto-detect
 * Scan recent emails and return suggested missions
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const suggestions = await engine.autoDetectMissions(session.user.email, session);

        return NextResponse.json({
            success: true,
            suggestions,
            count: suggestions.length
        });
    } catch (error) {
        console.error('POST /api/missions/auto-detect error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
