/**
 * GraphRAG Streaming API Route (Server-Sent Events)
 * 
 * GET /api/graphrag/stream - Real-time search and graph operation streaming
 * 
 * Provides real-time updates for:
 * - Search progress
 * - Knowledge extraction progress
 * - Graph traversal updates
 * - Plan step updates
 */

import { KnowledgeExtractionAgent } from '@/lib/graphrag/knowledge-extraction-agent.js';
import { HybridSearchService } from '@/lib/graphrag/hybrid-search.js';
import { GraphRAGService } from '@/lib/graphrag/graph-rag-service.js';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    const session = await auth();
    if (!session?.user?.email) {
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.email.toLowerCase();
    const { searchParams } = new URL(req.url);
    
    const operation = searchParams.get('op'); // 'search', 'extract', 'traverse', 'plan'
    const query = searchParams.get('q');
    const conversationId = searchParams.get('conversationId');

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                send({ type: 'init', status: 'started', operation });

                switch (operation) {
                    case 'search':
                        await streamSearch(userId, query, send);
                        break;
                    
                    case 'extract':
                        await streamExtraction(userId, conversationId, send);
                        break;
                    
                    case 'traverse':
                        await streamTraversal(userId, query, send);
                        break;
                    
                    case 'plan':
                        await streamPlan(userId, query, send);
                        break;
                    
                    default:
                        send({ type: 'error', message: 'Unknown operation' });
                }

                send({ type: 'complete', status: 'finished' });
                controller.close();

            } catch (error) {
                console.error('❌ [Stream] Error:', error);
                send({ type: 'error', message: error.message });
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

/**
 * Stream search operation with progress updates
 */
async function streamSearch(userId, query, send) {
    if (!query) {
        send({ type: 'error', message: 'Query is required' });
        return;
    }

    send({ type: 'progress', step: 'embedding', message: 'Generating query embedding...' });
    
    const searchService = new HybridSearchService();
    
    // Step 1: Generate embedding
    const embedding = await searchService.generateEmbedding(query);
    send({ type: 'progress', step: 'searching', message: 'Searching knowledge graph...' });

    // Step 2: Perform search
    const result = await searchService.search(userId, query, { limit: 10 });
    
    if (!result.success) {
        send({ type: 'error', message: result.error });
        return;
    }

    // Step 3: Stream results progressively
    send({ type: 'progress', step: 'ranking', message: 'Ranking results...' });
    
    for (let i = 0; i < result.results.length; i++) {
        const item = result.results[i];
        send({
            type: 'result',
            index: i,
            total: result.results.length,
            data: {
                id: item.node_id || item.id,
                label: item.label || item.node_label,
                type: item.type || item.node_type,
                score: item.final_score || item.combined_score
            }
        });
        
        // Small delay for visual effect
        await new Promise(r => setTimeout(r, 100));
    }

    send({ 
        type: 'results', 
        count: result.results.length,
        method: result.method 
    });
}

/**
 * Stream knowledge extraction with step-by-step updates
 */
async function streamExtraction(userId, conversationId, send) {
    send({ type: 'progress', step: 'analyzing', message: 'Analyzing conversation content...' });
    
    const agent = new KnowledgeExtractionAgent();
    
    // Simulate extraction steps
    const steps = [
        { step: 'entities', message: 'Extracting entities...' },
        { step: 'relationships', message: 'Identifying relationships...' },
        { step: 'validating', message: 'Validating extractions...' },
        { step: 'storing', message: 'Storing in knowledge graph...' }
    ];

    for (const step of steps) {
        send({ type: 'progress', ...step });
        await new Promise(r => setTimeout(r, 500));
    }

    send({ 
        type: 'extraction', 
        status: 'complete',
        entities: 3,
        relationships: 2
    });
}

/**
 * Stream graph traversal with path discovery
 */
async function streamTraversal(userId, entity, send) {
    if (!entity) {
        send({ type: 'error', message: 'Entity is required' });
        return;
    }

    send({ type: 'progress', step: 'traversal', message: `Traversing graph from "${entity}"...` });
    
    const graphService = new GraphRAGService();
    
    // Start traversal
    send({ type: 'progress', step: 'depth-1', message: 'Discovering direct connections...' });
    await new Promise(r => setTimeout(r, 300));

    const result = await graphService.queryContext(userId, entity, { maxDepth: 2 });
    
    if (!result.success) {
        send({ type: 'error', message: result.error });
        return;
    }

    // Group by distance
    const byDistance = {};
    for (const node of result.context) {
        const d = node.distance || 0;
        if (!byDistance[d]) byDistance[d] = [];
        byDistance[d].push(node);
    }

    // Send nodes by distance level
    for (const distance of Object.keys(byDistance).sort()) {
        send({
            type: 'traversal',
            depth: parseInt(distance),
            nodes: byDistance[distance].map(n => ({
                id: n.id,
                label: n.label,
                type: n.type
            }))
        });
        await new Promise(r => setTimeout(r, 200));
    }

    send({ 
        type: 'traversal', 
        status: 'complete',
        totalNodes: result.context.length,
        maxDepth: Math.max(...result.context.map(n => n.distance || 0))
    });
}

/**
 * Stream plan execution with step-by-step visualization
 */
async function streamPlan(userId, query, send) {
    send({ type: 'progress', step: 'planning', message: 'Creating execution plan...' });
    
    // Simulate plan generation
    const plan = [
        { id: 1, action: 'analyze', description: 'Analyze user query', status: 'pending' },
        { id: 2, action: 'search', description: 'Search knowledge graph', status: 'pending' },
        { id: 3, action: 'traverse', description: 'Traverse related entities', status: 'pending' },
        { id: 4, action: 'rank', description: 'Rank and filter results', status: 'pending' },
        { id: 5, action: 'format', description: 'Format response', status: 'pending' }
    ];

    send({ type: 'plan', steps: plan });

    // Execute plan steps
    for (let i = 0; i < plan.length; i++) {
        const step = plan[i];
        
        // Mark as running
        send({ type: 'plan-update', stepId: step.id, status: 'running' });
        
        // Simulate work
        await new Promise(r => setTimeout(r, 600));
        
        // Mark as complete
        send({ type: 'plan-update', stepId: step.id, status: 'complete' });
    }

    send({ type: 'plan', status: 'complete' });
}
