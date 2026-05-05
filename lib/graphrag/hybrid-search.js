/**
 * Hybrid Search Service
 * 
 * Combines BM25 keyword search with Vector semantic search for optimal retrieval.
 * Solves the "semantic drift" problem by using both exact matching and semantic similarity.
 */

import { createClient } from '@supabase/supabase-js';
import { OpenRouterAIService } from '../openrouter-ai.js';

export class HybridSearchService {
    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        this.ai = new OpenRouterAIService();
        this.defaultConfig = {
            vectorWeight: 0.6,
            keywordWeight: 0.4,
            recencyWeight: 0.3,
            relevanceWeight: 0.7,
            limit: 10,
            maxDepth: 2,
            daysWindow: 30
        };
    }

    /**
     * Generate embedding for text using OpenAI-compatible API
     */
    async generateEmbedding(text) {
        try {
            // Switch to OpenRouter's free embedding model as requested
            return await this.ai.generateEmbedding(text);
        } catch (error) {
            console.error('❌ [HybridSearch] Failed to generate embedding:', error);
            return null;
        }
    }

    /**
     * Perform hybrid search combining BM25 and Vector similarity
     */
    async search(userId, query, options = {}) {
        const config = { ...this.defaultConfig, ...options };
        
        console.log(`🔍 [HybridSearch] Searching: "${query}" for user ${userId}`);

        try {
            // Generate embedding for the query
            const queryEmbedding = await this.generateEmbedding(query);
            
            if (!queryEmbedding) {
                console.warn('⚠️ [HybridSearch] Falling back to keyword-only search');
                return this.keywordOnlySearch(userId, query, config);
            }

            // Use the database function for hybrid search
            const { data, error } = await this.supabase.rpc('hybrid_search_memory', {
                p_user_id: userId,
                p_query: query,
                p_query_embedding: queryEmbedding,
                p_limit: config.limit,
                p_vector_weight: config.vectorWeight,
                p_keyword_weight: config.keywordWeight
            });

            if (error) {
                console.error('❌ [HybridSearch] Database error:', error);
                // Fallback to manual implementation
                return this.manualHybridSearch(userId, query, queryEmbedding, config);
            }

            // Track access for recency scoring
            for (const result of (data || [])) {
                await this.trackAccess(result.node_id);
            }

            return {
                success: true,
                results: data || [],
                query,
                method: 'hybrid'
            };

        } catch (error) {
            console.error('❌ [HybridSearch] Search failed:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }

    /**
     * Manual hybrid search implementation (fallback if RPC fails)
     */
    async manualHybridSearch(userId, query, queryEmbedding, config) {
        try {
            // Keyword search using trigram similarity
            const { data: keywordResults, error: keywordError } = await this.supabase
                .from('memory_search_index')
                .select('node_id, entity_label, node_type, search_text')
                .eq('user_id', userId)
                .textSearch('tsv_search', query)
                .limit(config.limit * 2);

            if (keywordError) throw keywordError;

            // Vector similarity search
            const { data: vectorResults, error: vectorError } = await this.supabase
                .from('memory_nodes')
                .select('id, label, type, properties, embedding, recency_score')
                .eq('user_id', userId)
                .not('embedding', 'is', null)
                .limit(config.limit * 2);

            if (vectorError) throw vectorError;

            // Calculate cosine similarity for vector results
            const scoredVectorResults = (vectorResults || []).map(node => ({
                ...node,
                vector_score: this.cosineSimilarity(queryEmbedding, node.embedding)
            }));

            // Combine and rank results
            const combined = this.combineResults(
                keywordResults || [],
                scoredVectorResults,
                config
            );

            return {
                success: true,
                results: combined.slice(0, config.limit),
                query,
                method: 'hybrid-manual'
            };

        } catch (error) {
            console.error('❌ [HybridSearch] Manual search failed:', error);
            return { success: false, error: error.message, results: [] };
        }
    }

    /**
     * Keyword-only search (fallback when embeddings unavailable)
     */
    async keywordOnlySearch(userId, query, config) {
        try {
            const { data, error } = await this.supabase
                .from('memory_search_index')
                .select('node_id, entity_label, node_type, search_text')
                .eq('user_id', userId)
                .textSearch('tsv_search', query)
                .limit(config.limit);

            if (error) throw error;

            // Enrich with node details
            const enriched = await this.enrichResults(userId, data || []);

            return {
                success: true,
                results: enriched,
                query,
                method: 'keyword-only'
            };

        } catch (error) {
            console.error('❌ [HybridSearch] Keyword search failed:', error);
            return { success: false, error: error.message, results: [] };
        }
    }

    /**
     * Combine and rerank keyword and vector results
     */
    combineResults(keywordResults, vectorResults, config) {
        const scoreMap = new Map();

        // Add keyword scores
        keywordResults.forEach((result, index) => {
            const id = result.node_id;
            const score = Math.max(0, 1 - (index * 0.1)) * config.keywordWeight;
            scoreMap.set(id, {
                node_id: id,
                keyword_score: score,
                vector_score: 0,
                label: result.entity_label,
                type: result.node_type
            });
        });

        // Add vector scores
        vectorResults.forEach((result, index) => {
            const id = result.id;
            const vectorScore = result.vector_score * config.vectorWeight;
            
            if (scoreMap.has(id)) {
                const existing = scoreMap.get(id);
                existing.vector_score = vectorScore;
                existing.recency_score = result.recency_score || 0.5;
            } else {
                scoreMap.set(id, {
                    node_id: id,
                    keyword_score: 0,
                    vector_score: vectorScore,
                    recency_score: result.recency_score || 0.5,
                    label: result.label,
                    type: result.type,
                    properties: result.properties
                });
            }
        });

        // Calculate final scores and sort
        return Array.from(scoreMap.values())
            .map(item => ({
                ...item,
                hybrid_score: item.keyword_score + item.vector_score,
                final_score: (
                    (item.keyword_score + item.vector_score) * config.relevanceWeight +
                    (item.recency_score || 0.5) * config.recencyWeight
                )
            }))
            .sort((a, b) => b.final_score - a.final_score);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Enrich search results with full node details
     */
    async enrichResults(userId, results) {
        if (results.length === 0) return [];

        const nodeIds = results.map(r => r.node_id);
        
        const { data: nodes, error } = await this.supabase
            .from('memory_nodes')
            .select('id, label, type, properties, recency_score')
            .eq('user_id', userId)
            .in('id', nodeIds);

        if (error) {
            console.error('❌ [HybridSearch] Enrichment failed:', error);
            return results;
        }

        const nodeMap = new Map((nodes || []).map(n => [n.id, n]));

        return results.map(r => ({
            ...r,
            ...nodeMap.get(r.node_id)
        }));
    }

    /**
     * Track node access for recency scoring
     */
    async trackAccess(nodeId) {
        try {
            await this.supabase.rpc('track_node_access', {
                p_node_id: nodeId
            });
        } catch (error) {
            // Non-critical, don't fail the search
            console.warn('⚠️ [HybridSearch] Failed to track access:', error);
        }
    }

    /**
     * Get search suggestions based on recent nodes
     */
    async getSuggestions(userId, prefix, limit = 5) {
        try {
            const { data, error } = await this.supabase
                .from('memory_nodes')
                .select('label, type')
                .eq('user_id', userId)
                .ilike('label', `%${prefix}%`)
                .order('last_accessed_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return {
                success: true,
                suggestions: (data || []).map(n => ({
                    label: n.label,
                    type: n.type
                }))
            };

        } catch (error) {
            console.error('❌ [HybridSearch] Suggestions failed:', error);
            return { success: false, suggestions: [] };
        }
    }
}

export default HybridSearchService;
