/**
 * GraphRAG Search API Route
 * 
 * POST /api/graphrag/search - Perform hybrid search
 * GET /api/graphrag/search?q=query - Quick search with suggestions
 */

import { NextResponse } from 'next/server';
import { HybridSearchService } from '@/lib/graphrag/hybrid-search.js';
import { GraphRAGService } from '@/lib/graphrag/graph-rag-service.js';
import { RankingService } from '@/lib/graphrag/ranking-service.js';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

// POST: Perform hybrid search with full ranking
export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        const body = await req.json();
        
        const { 
            query, 
            options = {},
            includeContext = false,
            maxContextDepth = 2
        } = body;

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ 
                error: 'Query is required' 
            }, { status: 400 });
        }

        console.log(`🔍 [API] Hybrid search: "${query}" for ${userId}`);

        // Initialize services
        const searchService = new HybridSearchService();
        const rankingService = new RankingService();
        const graphService = new GraphRAGService();

        // 1. Perform hybrid search
        const searchResult = await searchService.search(userId, query, {
            limit: options.limit || 10,
            vectorWeight: options.vectorWeight || 0.6,
            keywordWeight: options.keywordWeight || 0.4
        });

        if (!searchResult.success) {
            return NextResponse.json({
                error: 'Search failed',
                details: searchResult.error
            }, { status: 500 });
        }

        // 2. Apply advanced ranking
        let rankedResults = await rankingService.rankResults(
            searchResult.results,
            query,
            { weights: options.weights }
        );

        // 3. Apply personalization
        rankedResults = await rankingService.getPersonalizedRanking(
            userId,
            rankedResults,
            query
        );

        // 4. Optionally include graph context
        let contextData = null;
        if (includeContext && rankedResults.length > 0) {
            const topEntity = rankedResults[0];
            contextData = await graphService.queryContext(
                userId,
                topEntity.label || topEntity.node_label,
                {
                    maxDepth: maxContextDepth,
                    daysWindow: options.daysWindow || 30
                }
            );
        }

        // 5. Build response with explanations
        const response = {
            success: true,
            query,
            results: rankedResults.map(r => ({
                id: r.node_id || r.id,
                label: r.label || r.node_label,
                type: r.type || r.node_type,
                properties: r.properties || r.node_properties,
                score: r.scores?.final || r.final_score,
                scores: r.scores,
                explanation: rankingService.explainRanking(r)
            })),
            meta: {
                total: rankedResults.length,
                method: searchResult.method,
                searchTime: new Date().toISOString()
            }
        };

        if (contextData?.success) {
            response.context = contextData.context;
            response.relationships = contextData.relationships;
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error('❌ [API] Search error:', error);
        return NextResponse.json({
            error: 'Search failed',
            details: error.message
        }, { status: 500 });
    }
}

// GET: Quick search with autocomplete suggestions
export async function GET(req) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email.toLowerCase();
        const { searchParams } = new URL(req.url);
        
        const query = searchParams.get('q');
        const type = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') || '5');

        if (!query || query.trim().length < 2) {
            return NextResponse.json({
                suggestions: [],
                query: query || ''
            });
        }

        const searchService = new HybridSearchService();

        // Get suggestions or quick search
        if (query.length < 4) {
            // Suggestions mode for short queries
            const suggestions = await searchService.getSuggestions(userId, query, limit);
            return NextResponse.json({
                query,
                suggestions: suggestions.suggestions || []
            });
        }

        // Quick search for longer queries
        const results = await searchService.search(userId, query, { limit });

        return NextResponse.json({
            query,
            results: results.results?.map(r => ({
                id: r.node_id || r.id,
                label: r.label || r.node_label,
                type: r.type || r.node_type,
                score: r.final_score || r.combined_score
            })) || []
        });

    } catch (error) {
        console.error('❌ [API] Quick search error:', error);
        return NextResponse.json({
            error: 'Search failed',
            details: error.message
        }, { status: 500 });
    }
}
