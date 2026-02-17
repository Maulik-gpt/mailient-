import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { MissionEngine } from '@/lib/mission-engine.js';

const engine = new MissionEngine();

/**
 * GET /api/autopilot-rules - List user's autopilot rules
 */
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const rules = await engine.getAllAutopilotRules(session.user.email);
        return NextResponse.json({ success: true, rules });
    } catch (error) {
        console.error('GET /api/autopilot-rules error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/autopilot-rules - Create or update an autopilot rule
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { ruleType, ruleConfig, enabled } = body;

        if (!ruleType || !ruleConfig) {
            return NextResponse.json({ error: 'ruleType and ruleConfig are required' }, { status: 400 });
        }

        const validTypes = ['follow_up_limit', 'new_contact_approval', 'pricing_approval', 'time_window', 'auto_send'];
        if (!validTypes.includes(ruleType)) {
            return NextResponse.json({ error: `Invalid rule type. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
        }

        const rule = await engine.setAutopilotRule(
            session.user.email,
            ruleType,
            ruleConfig,
            enabled !== undefined ? enabled : true
        );

        return NextResponse.json({ success: true, rule });
    } catch (error) {
        console.error('POST /api/autopilot-rules error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
