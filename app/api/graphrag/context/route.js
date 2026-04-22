/**
 * GraphRAG Context API Route
 * 
 * GET /api/graphrag/context?entity=EntityName - Get graph context for entity
 * POST /api/graphrag/context - Get conversation context
 */

import { NextResponse } from 'next/server';
import { GraphRAGService } from '@/lib/graphrag/graph-rag-service.js';
import { auth } from '@/lib/auth.js';

export const dynamic = 'force-dynamic';

// GET: Get graph context for a specific entity
export async function GET(req) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        const { searchParams } = new URL(req.url);
        
        const entity = searchParams.get('entity');
        const depth = parseInt(searchParams.get('depth') || '2');
        const days = parseInt(searchParams.get('days') || '30');

        if (!entity) {
            return NextResponse.json({ 
                error: 'Entity parameter is required' 
            }, { status: 400 });
        }

        console.log(`🔍 [API] Getting context for entity: ${entity}`);

        const graphService = new GraphRAGService();
        const result = await graphService.queryContext(userId, entity, {
            maxDepth: depth,
            daysWindow: days
        });

        if (!result.success) {
            return NextResponse.json({
                error: 'Context query failed',
                details: result.error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            entity,
            context: result.context,
            relationships: result.relationships,
            totalNodes: result.totalNodes,
            searchDepth: result.searchDepth
        });

    } catch (error) {
        console.error('❌ [API] Context error:', error);
        return NextResponse.json({
            error: 'Context query failed',
            details: error.message
        }, { status: 500 });
    }
}

// POST: Get conversation context from message text
export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        const body = await req.json();
        
        const { 
            conversationId,
            messageText,
            options = {}
        } = body;

        if (!messageText) {
            return NextResponse.json({ 
                error: 'messageText is required' 
            }, { status: 400 });
        }

        console.log(`💬 [API] Getting conversation context for: ${conversationId}`);

        const graphService = new GraphRAGService();
        const result = await graphService.getConversationContext(
            userId,
            conversationId || `temp-${Date.now()}`,
            messageText,
            options
        );

        if (!result.success) {
            return NextResponse.json({
                error: 'Context extraction failed',
                details: result.error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            conversationId,
            context: result.context,
            linkedEntities: result.linkedEntities,
            totalContexts: result.totalContexts
        });

    } catch (error) {
        console.error('❌ [API] Conversation context error:', error);
        return NextResponse.json({
            error: 'Context extraction failed',
            details: error.message
        }, { status: 500 });
    }
}
