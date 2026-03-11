import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { ArcusAIService } from '@/lib/arcus-ai.js';
import { DatabaseService } from '@/lib/supabase.js';
import { ArcusOperatorRuntime } from '@/lib/arcus-operator-runtime.js';
import { inferTaskType, mapCanvasTypeToTaskType } from '@/lib/arcus-task-registry.js';

/**
 * Fast intent analysis endpoint
 * Returns typed operator steps so UI can render thinking immediately.
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, conversationId = null, runId = null } = await request.json();
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

        const messageLower = String(message || '').toLowerCase();
        const forceCanvas =
            messageLower.includes('canvas') ||
            messageLower.includes('schedule') ||
            messageLower.includes('meeting') ||
            (messageLower.includes('draft') && (messageLower.includes('reply') || messageLower.includes('email')));

        const intentAnalysis = await arcusAI.analyzeIntentAndPlan(message, {
            userEmail: session.user.email,
            userName: session.user.name || 'User'
        });

        const normalizedPlan = runtime.normalizePlan(intentAnalysis?.plan || [], message);
        const effectiveCanvasType = intentAnalysis?.canvasType || (forceCanvas ? 'email_draft' : 'none');
        const taskType = inferTaskType({
            taskType: intentAnalysis?.taskType || null,
            canvasType: effectiveCanvasType,
            intent: intentAnalysis?.intent || '',
            message
        });

        const requiresApproval = runtime.needsApproval(
            intentAnalysis?.intent || 'general',
            effectiveCanvasType,
            taskType
        );

        const runInit = await runtime.initializeRun({
            message,
            intentAnalysis,
            canvasType: effectiveCanvasType,
            taskType,
            runId: runId || null
        });

        const planSource = runInit?.plan?.length ? runInit.plan : normalizedPlan;
        const effectiveRunId = runInit?.run?.runId || runInit?.run?.run_id || runId || runtime.generateRunId();

        return NextResponse.json({
            runId: effectiveRunId,
            intent: intentAnalysis?.intent || 'general_chat',
            complexity: intentAnalysis?.complexity || runtime.inferComplexity(message, intentAnalysis?.plan || []),
            plan: planSource.map((step, idx) => ({
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
            needsCanvas: Boolean(intentAnalysis?.needsCanvas || forceCanvas),
            canvasType: effectiveCanvasType,
            taskType: taskType || mapCanvasTypeToTaskType(effectiveCanvasType),
            requiresApproval,
            confidence: intentAnalysis?.confidence ?? 0.5,
            riskLevel: intentAnalysis?.riskLevel || 'medium',
            requiredInputs: intentAnalysis?.requiredInputs || [],
            missingInputs: intentAnalysis?.missingInputs || [],
            recommendedAction: intentAnalysis?.recommendedAction || null,
            reasoning: intentAnalysis?.reasoning || '',
        });
    } catch (error) {
        console.error('Intent analysis error:', error);
        const fallbackRunId = `run_fallback_${Date.now()}`;
        return NextResponse.json({
            runId: fallbackRunId,
            intent: 'general_chat',
            complexity: 'simple',
            plan: [
                { step: 1, id: `${fallbackRunId}_1`, kind: 'analyze', status: 'active', label: 'Understanding your request', action: 'analyze', description: 'Understanding your request', type: 'analyze', detail: 'Intent detection and task classification' },
                { step: 2, id: `${fallbackRunId}_2`, kind: 'search', status: 'pending', label: 'Gathering relevant context', action: 'search', description: 'Gathering relevant context', type: 'search', detail: 'Finding the most relevant threads and context' },
                { step: 3, id: `${fallbackRunId}_3`, kind: 'draft', status: 'pending', label: 'Preparing output for review', action: 'draft', description: 'Preparing output for review', type: 'draft', detail: 'Building execution-ready canvas output' }
            ],
            needsCanvas: false,
            canvasType: 'none',
            taskType: 'generic_workflow',
            requiresApproval: false,
            confidence: 0.5,
            riskLevel: 'medium',
            requiredInputs: [],
            missingInputs: [],
            recommendedAction: null,
            reasoning: ''
        });
    }
}


