/**
 * GraphRAG Service - Contextual Memory with Graph Traversal
 * 
 * Implements the "Memory Graph" architecture:
 * - Temporal Layer: Store timestamps for every interaction
 * - Entity Layer: Extract key entities from conversations
 * - Relationship Layer: Connect entities with typed relationships
 * 
 * Solves the "wait, what did we agree on?" problem through graph traversal.
 */

import { createClient } from '@supabase/supabase-js';
import { HybridSearchService } from './hybrid-search.js';

export class GraphRAGService {
    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        this.hybridSearch = new HybridSearchService();
        
        this.defaultConfig = {
            maxDepth: 2,
            daysWindow: 30,
            minConfidence: 0.6,
            contextLimit: 20,
            recencyDecay: 2592000 // 30 days in seconds
        };
    }

    /**
     * Inject a relationship into the knowledge graph
     * Called when an agreement, decision, or conclusion is reached
     */
    async injectRelationship(userId, fromNode, toNode, relationType, metadata = {}) {
        console.log(`🔗 [GraphRAG] Injecting: (${fromNode.label}) -[${relationType}]-> (${toNode.label})`);

        try {
            // 1. Ensure both nodes exist
            const fromNodeId = await this.ensureNode(userId, fromNode);
            const toNodeId = await this.ensureNode(userId, toNode);

            if (!fromNodeId || !toNodeId) {
                throw new Error('Failed to create or retrieve nodes');
            }

            // 2. Create the relationship edge
            const { data: edge, error: edgeError } = await this.supabase
                .from('memory_edges')
                .upsert({
                    user_id: userId,
                    source_id: fromNodeId,
                    target_id: toNodeId,
                    relation_type: relationType,
                    properties: metadata,
                    confidence: metadata.confidence || 0.8,
                    source_context: metadata.sourceContext || null
                }, {
                    onConflict: 'user_id,source_id,target_id,relation_type'
                })
                .select()
                .single();

            if (edgeError) throw edgeError;

            // 3. Update search index
            await this.supabase.rpc('index_memory_entity', {
                p_node_id: fromNodeId,
                p_user_id: userId
            });
            await this.supabase.rpc('index_memory_entity', {
                p_node_id: toNodeId,
                p_user_id: userId
            });

            return {
                success: true,
                edgeId: edge?.id,
                fromNodeId,
                toNodeId
            };

        } catch (error) {
            console.error('❌ [GraphRAG] Injection failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Ensure a node exists in the graph (create if not exists)
     */
    async ensureNode(userId, node) {
        try {
            // Check if node exists
            const { data: existing, error: checkError } = await this.supabase
                .from('memory_nodes')
                .select('id')
                .eq('user_id', userId)
                .eq('label', node.label)
                .eq('type', node.type)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existing) {
                // Update access time
                await this.supabase
                    .from('memory_nodes')
                    .update({ last_accessed_at: new Date().toISOString() })
                    .eq('id', existing.id);
                
                return existing.id;
            }

            // Generate embedding for new node
            const embeddingText = `${node.label} ${node.type} ${JSON.stringify(node.properties || {})}`;
            const embedding = await this.hybridSearch.generateEmbedding(embeddingText);

            // Create new node
            const { data: newNode, error: createError } = await this.supabase
                .from('memory_nodes')
                .insert({
                    user_id: userId,
                    label: node.label,
                    type: node.type,
                    properties: node.properties || {},
                    embedding: embedding
                })
                .select()
                .single();

            if (createError) throw createError;

            return newNode.id;

        } catch (error) {
            console.error('❌ [GraphRAG] Node creation failed:', error);
            return null;
        }
    }

    /**
     * Query context using graph traversal
     * Answers "What did we agree on?" by traversing from a focus entity
     */
    async queryContext(userId, focusEntity, options = {}) {
        const config = { ...this.defaultConfig, ...options };
        
        console.log(`🔍 [GraphRAG] Querying context for: ${focusEntity}`);

        try {
            // Use the database function for graph traversal
            const { data, error } = await this.supabase.rpc('traverse_memory_graph', {
                p_user_id: userId,
                p_start_label: focusEntity,
                p_max_depth: config.maxDepth,
                p_days_limit: config.daysWindow
            });

            if (error) {
                console.error('❌ [GraphRAG] Traversal RPC failed:', error);
                // Fallback to manual traversal
                return this.manualTraversal(userId, focusEntity, config);
            }

            if (!data || data.length === 0) {
                return {
                    success: true,
                    context: [],
                    focusEntity,
                    message: 'No related context found'
                };
            }

            // Group by distance and build context narrative
            const context = this.buildContextNarrative(data);

            return {
                success: true,
                context: context.nodes,
                relationships: context.relationships,
                focusEntity,
                totalNodes: data.length,
                searchDepth: Math.max(...data.map(d => d.distance))
            };

        } catch (error) {
            console.error('❌ [GraphRAG] Context query failed:', error);
            return { success: false, error: error.message, context: [] };
        }
    }

    /**
     * Manual graph traversal (fallback if RPC fails)
     */
    async manualTraversal(userId, focusEntity, config) {
        try {
            // Find the starting node
            const { data: startNode, error: startError } = await this.supabase
                .from('memory_nodes')
                .select('id, label, type, properties')
                .eq('user_id', userId)
                .eq('label', focusEntity)
                .maybeSingle();

            if (startError || !startNode) {
                return { success: false, error: 'Focus entity not found', context: [] };
            }

            // Get all edges within time window
            const { data: edges, error: edgesError } = await this.supabase
                .from('memory_edges')
                .select('*, source:source_id(*), target:target_id(*)')
                .eq('user_id', userId)
                .gt('created_at', new Date(Date.now() - config.daysWindow * 24 * 60 * 60 * 1000).toISOString());

            if (edgesError) throw edgesError;

            // BFS traversal
            const visited = new Set([startNode.id]);
            const queue = [{ id: startNode.id, distance: 0, path: [startNode.id] }];
            const results = [{
                node_id: startNode.id,
                node_label: startNode.label,
                node_type: startNode.type,
                node_properties: startNode.properties,
                distance: 0,
                path: [startNode.id],
                relation_types: [],
                recency_score: 1.0,
                combined_score: 1.0
            }];

            while (queue.length > 0 && results.length < config.contextLimit) {
                const current = queue.shift();

                if (current.distance >= config.maxDepth) continue;

                // Find connected edges
                const connectedEdges = (edges || []).filter(e => 
                    e.source_id === current.id || e.target_id === current.id
                );

                for (const edge of connectedEdges) {
                    const nextId = edge.source_id === current.id ? edge.target_id : edge.source_id;
                    
                    if (!visited.has(nextId)) {
                        visited.add(nextId);
                        
                        const nextNode = edge.source_id === current.id ? edge.target : edge.source;
                        
                        results.push({
                            node_id: nextId,
                            node_label: nextNode.label,
                            node_type: nextNode.type,
                            node_properties: nextNode.properties,
                            distance: current.distance + 1,
                            path: [...current.path, nextId],
                            relation_types: [...current.relation_types, edge.relation_type],
                            recency_score: this.calculateRecency(edge.created_at),
                            combined_score: this.calculateRecency(edge.created_at) * Math.pow(0.8, current.distance + 1)
                        });

                        queue.push({
                            id: nextId,
                            distance: current.distance + 1,
                            path: [...current.path, nextId]
                        });
                    }
                }
            }

            // Sort by combined score
            results.sort((a, b) => b.combined_score - a.combined_score);

            const context = this.buildContextNarrative(results);

            return {
                success: true,
                context: context.nodes,
                relationships: context.relationships,
                focusEntity,
                totalNodes: results.length
            };

        } catch (error) {
            console.error('❌ [GraphRAG] Manual traversal failed:', error);
            return { success: false, error: error.message, context: [] };
        }
    }

    /**
     * Calculate recency score based on timestamp
     */
    calculateRecency(timestamp) {
        const age = Date.now() - new Date(timestamp).getTime();
        const ageSeconds = age / 1000;
        const halfLife = 2592000; // 30 days
        return Math.exp(-ageSeconds / halfLife);
    }

    /**
     * Build a narrative context from traversal results
     */
    buildContextNarrative(traversalResults) {
        const nodes = [];
        const relationships = [];

        for (const result of traversalResults) {
            nodes.push({
                id: result.node_id,
                label: result.node_label,
                type: result.node_type,
                properties: result.node_properties,
                distance: result.distance,
                recencyScore: result.recency_score,
                combinedScore: result.combined_score
            });

            if (result.relation_types && result.relation_types.length > 0) {
                relationships.push({
                    path: result.path,
                    relationTypes: result.relation_types,
                    distance: result.distance
                });
            }
        }

        return { nodes, relationships };
    }

    /**
     * Contextual Windowing: Get context for a conversation
     * Automatically links conversation to relevant graph entities
     */
    async getConversationContext(userId, conversationId, messageText, options = {}) {
        const config = { ...this.defaultConfig, ...options };

        try {
            // 1. Extract entities from the message using hybrid search
            const searchResults = await this.hybridSearch.search(userId, messageText, {
                limit: 5,
                vectorWeight: 0.7,
                keywordWeight: 0.3
            });

            if (!searchResults.success || searchResults.results.length === 0) {
                return {
                    success: true,
                    context: [],
                    linkedEntities: [],
                    message: 'No relevant context found'
                };
            }

            // 2. Get graph context for each relevant entity
            const contexts = [];
            const linkedEntities = [];

            for (const entity of searchResults.results.slice(0, 3)) {
                const graphContext = await this.queryContext(userId, entity.label, {
                    maxDepth: 2,
                    daysWindow: config.daysWindow
                });

                if (graphContext.success && graphContext.context.length > 0) {
                    contexts.push({
                        entity: entity.label,
                        context: graphContext.context,
                        score: entity.final_score || entity.combined_score
                    });
                    linkedEntities.push(entity.node_id);
                }
            }

            // 3. Store conversation context links
            for (const entityId of linkedEntities) {
                await this.supabase
                    .from('conversation_context')
                    .upsert({
                        user_id: userId,
                        conversation_id: conversationId,
                        node_id: entityId,
                        relevance_score: searchResults.results.find(r => r.node_id === entityId)?.final_score || 0.5
                    }, {
                        onConflict: 'user_id,conversation_id,node_id'
                    });
            }

            // 4. Merge and rank all context
            const mergedContext = this.mergeContexts(contexts);

            return {
                success: true,
                context: mergedContext,
                linkedEntities,
                totalContexts: contexts.length
            };

        } catch (error) {
            console.error('❌ [GraphRAG] Conversation context failed:', error);
            return { success: false, error: error.message, context: [] };
        }
    }

    /**
     * Merge multiple contexts and remove duplicates
     */
    mergeContexts(contexts) {
        const seen = new Set();
        const merged = [];

        // Sort contexts by score
        contexts.sort((a, b) => b.score - a.score);

        for (const ctx of contexts) {
            for (const node of ctx.context) {
                if (!seen.has(node.id)) {
                    seen.add(node.id);
                    merged.push({
                        ...node,
                        sourceEntity: ctx.entity,
                        contextScore: ctx.score
                    });
                }
            }
        }

        return merged;
    }

    /**
     * Get recent agreements and decisions
     */
    async getRecentAgreements(userId, days = 7, limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('memory_edges')
                .select('*, source:source_id(*), target:target_id(*)')
                .eq('user_id', userId)
                .in('relation_type', ['AGREED_ON', 'DECIDED_ON', 'APPROVED_BY'])
                .gt('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return {
                success: true,
                agreements: (data || []).map(edge => ({
                    id: edge.id,
                    type: edge.relation_type,
                    from: edge.source?.label,
                    fromType: edge.source?.type,
                    to: edge.target?.label,
                    toType: edge.target?.type,
                    properties: edge.properties,
                    confidence: edge.confidence,
                    createdAt: edge.created_at
                }))
            };

        } catch (error) {
            console.error('❌ [GraphRAG] Get agreements failed:', error);
            return { success: false, error: error.message, agreements: [] };
        }
    }

    /**
     * Update recency scores for all nodes (call periodically)
     */
    async updateRecencyScores() {
        try {
            await this.supabase.rpc('update_recency_scores');
            return { success: true };
        } catch (error) {
            console.error('❌ [GraphRAG] Update recency failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get graph statistics for a user
     */
    async getGraphStats(userId) {
        try {
            const { data: nodeCount, error: nodeError } = await this.supabase
                .from('memory_nodes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            const { data: edgeCount, error: edgeError } = await this.supabase
                .from('memory_edges')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            const { data: recentEdges, error: recentError } = await this.supabase
                .from('memory_edges')
                .select('relation_type')
                .eq('user_id', userId)
                .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            if (nodeError || edgeError) throw nodeError || edgeError;

            // Count relation types
            const relationCounts = {};
            (recentEdges || []).forEach(e => {
                relationCounts[e.relation_type] = (relationCounts[e.relation_type] || 0) + 1;
            });

            return {
                success: true,
                stats: {
                    totalNodes: nodeCount?.count || 0,
                    totalEdges: edgeCount?.count || 0,
                    recentEdges: recentEdges?.length || 0,
                    relationTypes: relationCounts
                }
            };

        } catch (error) {
            console.error('❌ [GraphRAG] Stats failed:', error);
            return { success: false, error: error.message };
        }
    }
}

export default GraphRAGService;
