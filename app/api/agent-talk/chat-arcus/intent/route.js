import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { ArcusAIService } from '@/lib/arcus-ai.js';

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

        const { message } = await request.json();
        if (!message) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        const arcusAI = new ArcusAIService();
        const intentAnalysis = await arcusAI.analyzeIntentAndPlan(message, {
            userEmail: session.user.email,
            userName: session.user.name || 'User'
        });

        return NextResponse.json({
            intent: intentAnalysis?.intent || 'general_chat',
            plan: intentAnalysis?.plan || [],
            needsCanvas: intentAnalysis?.needsCanvas || false,
            canvasType: intentAnalysis?.canvasType || 'none',
            reasoning: intentAnalysis?.reasoning || '',
        });
    } catch (error) {
        console.error('Intent analysis error:', error);
        return NextResponse.json({
            intent: 'general_chat',
            plan: [{ step: 1, action: 'respond', description: 'Processing your request', type: 'think' }],
            needsCanvas: false,
            canvasType: 'none',
            reasoning: ''
        });
    }
}
