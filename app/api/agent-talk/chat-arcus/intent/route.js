import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { ArcusAIService } from '@/lib/arcus-ai.js';
import { DatabaseService } from '@/lib/supabase.js';
import { ArcusOperatorRuntime } from '@/lib/arcus-operator-runtime.js';

/**
 * Fast intent analysis endpoint
 * Returns AI-generated thinking steps quickly so the frontend
 * can show live thinking while the main chat processes.
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, conversationId = null } = await request.json();
        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        const db = new DatabaseService();
        const arcusAI = new ArcusAIService();
        const runtime = new ArcusOperatorRuntime({
            db,
            arcusAI,
            userEmail: session.user.email,
            userName: session.user.name || 'User',
            conversationId
        });

        const intentAnalysis = await arcusAI.analyzeIntentAndPlan(message, {
            userEmail: session.user.email,
            userName: session.user.name || 'User'
        });

        const runInit = await runtime.initializeRun({
            message,
            intentAnalysis,
            canvasType: intentAnalysis?.canvasType || 'none'
        });

        const normalizedPlan = runInit?.plan || runtime.normalizePlan(intentAnalysis?.plan || [], message);
        const requiresApproval = runInit?.requiresApproval ?? runtime.needsApproval(
            intentAnalysis?.intent || 'general',
            intentAnalysis?.canvasType || 'none'
        );

        return NextResponse.json({
            runId: runInit?.run?.runId || null,
            intent: intentAnalysis?.intent || 'general_chat',
            complexity: intentAnalysis?.complexity || runtime.inferComplexity(message, intentAnalysis?.plan || []),
            plan: normalizedPlan.map((step, idx) => ({
                step: idx + 1,
                id: step.id,
                kind: step.kind,
                status: step.status,
                label: step.label,
                detail: step.detail || '',
                action: step.label,
                description: step.label,
                type: step.kind
            })),
            needsCanvas: intentAnalysis?.needsCanvas || false,
            canvasType: intentAnalysis?.canvasType || 'none',
            requiresApproval,
            reasoning: intentAnalysis?.reasoning || '',
        });
    } catch (error) {
        console.error('Intent analysis error:', error);
        return NextResponse.json({
            runId: null,
            intent: 'general_chat',
            complexity: 'simple',
            plan: [
                { step: 1, kind: 'analyze', status: 'active', label: 'Understanding your request', action: 'analyze', description: 'Understanding your request', type: 'analyze' },
                { step: 2, kind: 'search', status: 'pending', label: 'Gathering relevant context', action: 'search', description: 'Gathering relevant context', type: 'search' },
                { step: 3, kind: 'draft', status: 'pending', label: 'Preparing output for review', action: 'draft', description: 'Preparing output for review', type: 'draft' }
            ],
            needsCanvas: false,
            canvasType: 'none',
            requiresApproval: false,
            reasoning: ''
        });
    }
}
