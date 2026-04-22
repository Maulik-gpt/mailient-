/**
 * GraphRAG Agreements API Route
 * 
 * GET /api/graphrag/agreements - Get recent agreements and decisions
 * POST /api/graphrag/agreements - Record a new agreement or decision
 */

import { NextResponse } from 'next/server';
import { GraphRAGService } from '@/lib/graphrag/graph-rag-service.js';
import { KnowledgeExtractionAgent } from '@/lib/graphrag/knowledge-extraction-agent.js';
import { auth } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

// GET: Get recent agreements and decisions
export async function GET(req) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        const { searchParams } = new URL(req.url);
        
        const days = parseInt(searchParams.get('days') || '7');
        const limit = parseInt(searchParams.get('limit') || '10');

        console.log(`📋 [API] Getting agreements for last ${days} days`);

        const graphService = new GraphRAGService();
        const result = await graphService.getRecentAgreements(userId, days, limit);

        if (!result.success) {
            return NextResponse.json({
                error: 'Failed to fetch agreements',
                details: result.error
            }, { status: 500 });
        }

        // Group by type
        const grouped = result.agreements.reduce((acc, agreement) => {
            const type = agreement.type;
            if (!acc[type]) acc[type] = [];
            acc[type].push(agreement);
            return acc;
        }, {});

        return NextResponse.json({
            success: true,
            agreements: result.agreements,
            grouped,
            summary: {
                total: result.agreements.length,
                byType: Object.keys(grouped).map(type => ({
                    type,
                    count: grouped[type].length
                }))
            }
        });

    } catch (error) {
        console.error('❌ [API] Agreements fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch agreements',
            details: error.message
        }, { status: 500 });
    }
}

// POST: Record a new agreement or decision
export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        const body = await req.json();
        
        const { 
            type, // 'agreement' or 'decision'
            text,
            conversationId,
            participant,
            metadata = {}
        } = body;

        if (!text || !type) {
            return NextResponse.json({ 
                error: 'type and text are required' 
            }, { status: 400 });
        }

        if (!['agreement', 'decision'].includes(type)) {
            return NextResponse.json({ 
                error: 'type must be "agreement" or "decision"' 
            }, { status: 400 });
        }

        console.log(`📝 [API] Recording ${type}: ${text.substring(0, 50)}...`);

        const agent = new KnowledgeExtractionAgent();
        
        const context = {
            conversationId,
            participant: participant || session.user.name || session.user.email,
            timestamp: new Date().toISOString(),
            ...metadata
        };

        let result;
        if (type === 'agreement') {
            result = await agent.recordAgreement(userId, text, context);
        } else {
            result = await agent.recordDecision(userId, text, context);
        }

        if (!result.success) {
            return NextResponse.json({
                error: `Failed to record ${type}`,
                details: result.error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            type,
            recorded: result.recorded,
            relationships: result.relationships || [],
            timestamp: context.timestamp
        });

    } catch (error) {
        console.error('❌ [API] Record agreement error:', error);
        return NextResponse.json({
            error: 'Failed to record agreement',
            details: error.message
        }, { status: 500 });
    }
}
