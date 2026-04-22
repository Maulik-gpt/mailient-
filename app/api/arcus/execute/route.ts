import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ArcusExecutorEngine } from '@/lib/arcus-executor-engine';
import { DatabaseService } from '@/lib/supabase';

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { plan, context = {} } = await req.json();
        
        // Setup execution context
        const executionContext = {
            ...context,
            userId: (session.user as any).id,
            accountId: (session.user as any).accountId || 'primary',
            supabase: new DatabaseService().supabase
        };

        const executor = new ArcusExecutorEngine({ supabase: executionContext.supabase });
        const result = await executor.executePlan(plan, executionContext);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Arcus Execute API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
