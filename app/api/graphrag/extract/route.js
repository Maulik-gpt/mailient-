/**
 * GraphRAG Knowledge Extraction API Route
 * 
 * POST /api/graphrag/extract - Extract knowledge from text/emails
 * POST /api/graphrag/extract/conversation - Extract from conversation
 * POST /api/graphrag/extract/emails - Extract from emails batch
 */

import { NextResponse } from 'next/server';
import { KnowledgeExtractionAgent } from '@/lib/graphrag/knowledge-extraction-agent.js';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// POST: Extract knowledge from text
export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        const body = await req.json();
        
        const { 
            text,
            type = 'text', // 'text', 'conversation', 'emails'
            context = {}
        } = body;

        if (!text && type !== 'emails') {
            return NextResponse.json({ 
                error: 'text is required' 
            }, { status: 400 });
        }

        const agent = new KnowledgeExtractionAgent();
        let result;

        switch (type) {
            case 'text':
                result = await agent.extractFromText(userId, text, context);
                break;
            
            case 'conversation':
                if (!Array.isArray(text)) {
                    return NextResponse.json({ 
                        error: 'For conversation type, text must be an array of messages' 
                    }, { status: 400 });
                }
                result = await agent.processConversation(
                    userId,
                    context.conversationId || `conv-${Date.now()}`,
                    text,
                    context
                );
                break;
            
            case 'emails':
                if (!Array.isArray(body.emails)) {
                    return NextResponse.json({ 
                        error: 'emails array is required for type=emails' 
                    }, { status: 400 });
                }
                result = await agent.processEmails(userId, body.emails, context);
                break;
            
            default:
                return NextResponse.json({ 
                    error: 'Invalid type. Use: text, conversation, or emails' 
                }, { status: 400 });
        }

        if (!result.success) {
            return NextResponse.json({
                error: 'Extraction failed',
                details: result.error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            type,
            extracted: result.extracted || false,
            entities: result.entities || [],
            relationships: result.relationships || [],
            ...result
        });

    } catch (error) {
        console.error('❌ [API] Extraction error:', error);
        return NextResponse.json({
            error: 'Extraction failed',
            details: error.message
        }, { status: 500 });
    }
}
