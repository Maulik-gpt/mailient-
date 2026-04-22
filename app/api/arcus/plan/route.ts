import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ArcusPlanner } from '@/lib/arcus-planner';

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { intent, context } = await req.json();
        
        const planner = new ArcusPlanner();
        const plan = await planner.plan(intent, context);

        return NextResponse.json(plan);
    } catch (error: any) {
        console.error('[Arcus Plan API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
