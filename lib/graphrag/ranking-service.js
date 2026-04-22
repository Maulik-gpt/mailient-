/**
 * Recency + Relevance Ranking Service
 * 
 * Implements intelligent ranking that balances:
 * - Relevance: How well the result matches the query (BM25 + Vector)
 * - Recency: How recently the information was accessed/created
 * - Confidence: How certain we are about the relationship
 * 
 * Formula: final_score = (relevance * 0.6 + recency * 0.3 + confidence * 0.1)
 */

import { createClient } from '@supabase/supabase-js';

export class RankingService {
    constructor() {
        this.supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // Half-life for recency decay (30 days in seconds)
        this.recencyHalfLife = 2592000;
        
        // Default weights (configurable)
        this.defaultWeights = {
            relevance: 0.6,
            recency: 0.3,
            confidence: 0.1
        };
    }

    /**
     * Calculate recency score with exponential decay
     * Newer items get higher scores
     */
    calculateRecencyScore(timestamp, accessCount = 0) {
        const age = Date.now() - new Date(timestamp).getTime();
        const ageSeconds = age / 1000;
        
        // Exponential decay: score = e^(-age/halflife)
        let baseRecency = Math.exp(-ageSeconds / this.recencyHalfLife);
        
        // Boost for frequently accessed items
        const accessBoost = Math.min(accessCount * 0.05, 0.2);
        
        // Combine with minimum floor
        return Math.min(1.0, Math.max(0.1, baseRecency + accessBoost));
    }

    /**
     * Calculate relevance score combining multiple signals
     */
    calculateRelevanceScore(signals) {
        const {
            bm25Score = 0,
            vectorScore = 0,
            exactMatch = false,
            partialMatch = false,
            typeMatch = false
        } = signals;

        // Normalize BM25 (typically 0-1 after normalization)
        const normalizedBm25 = Math.min(1, Math.max(0, bm25Score));
        
        // Vector score is already 0-1
        const normalizedVector = Math.min(1, Math.max(0, vectorScore));

        // Combined relevance with boosts
        let relevance = (normalizedBm25 * 0.4 + normalizedVector * 0.6);

        // Boost for exact matches
        if (exactMatch) relevance = Math.min(1, relevance + 0.3);
        if (partialMatch) relevance = Math.min(1, relevance + 0.15);
        if (typeMatch) relevance = Math.min(1, relevance + 0.1);

        return relevance;
    }

    /**
     * Calculate final ranking score
     */
    calculateFinalScore({ relevance, recency, confidence = 0.8 }, weights = {}) {
        const w = { ...this.defaultWeights, ...weights };
        
        // Normalize weights
        const total = w.relevance + w.recency + w.confidence;
        const normalizedWeights = {
            relevance: w.relevance / total,
            recency: w.recency / total,
            confidence: w.confidence / total
        };

        return (
            relevance * normalizedWeights.relevance +
            recency * normalizedWeights.recency +
            confidence * normalizedWeights.confidence
        );
    }

    /**
     * Rank search results with all factors
     */
    async rankResults(results, query, options = {}) {
        const weights = { ...this.defaultWeights, ...options.weights };
        const now = Date.now();

        const ranked = results.map(result => {
            // Calculate individual scores
            const recencyScore = this.calculateRecencyScore(
                result.last_accessed_at || result.created_at || result.updated_at || now,
                result.access_count || 0
            );

            const relevanceSignals = {
                bm25Score: result.bm25_score || result.keyword_score || 0,
                vectorScore: result.vector_score || result.similarity || 0,
                exactMatch: this.isExactMatch(result, query),
                partialMatch: this.isPartialMatch(result, query),
                typeMatch: options.preferredTypes?.includes(result.type)
            };

            const relevanceScore = this.calculateRelevanceScore(relevanceSignals);
            const confidenceScore = result.confidence || result.confidence_score || 0.8;

            // Calculate final score
            const finalScore = this.calculateFinalScore(
                { relevance: relevanceScore, recency: recencyScore, confidence: confidenceScore },
                weights
            );

            return {
                ...result,
                scores: {
                    relevance: relevanceScore,
                    recency: recencyScore,
                    confidence: confidenceScore,
                    final: finalScore
                },
                rankedAt: new Date().toISOString()
            };
        });

        // Sort by final score descending
        ranked.sort((a, b) => b.scores.final - a.scores.final);

        return ranked;
    }

    /**
     * Check if result is an exact match for query
     */
    isExactMatch(result, query) {
        const label = (result.label || result.node_label || '').toLowerCase();
        const searchText = (result.search_text || '').toLowerCase();
        const queryLower = query.toLowerCase();
        
        return label === queryLower || 
               label.includes(queryLower) && label.length === queryLower.length;
    }

    /**
     * Check if result is a partial match
     */
    isPartialMatch(result, query) {
        const label = (result.label || result.node_label || '').toLowerCase();
        const searchText = (result.search_text || '').toLowerCase();
        const queryLower = query.toLowerCase();
        
        return label.includes(queryLower) || searchText.includes(queryLower);
    }

    /**
     * Rank graph traversal results
     */
    async rankTraversalResults(results, startEntity, options = {}) {
        const weights = { ...this.defaultWeights, ...options.weights };
        
        const ranked = results.map(result => {
            // Distance penalty (closer = better)
            const distancePenalty = Math.pow(0.85, result.distance || 0);
            
            // Recency from the graph
            const recencyScore = result.recency_score || 
                this.calculateRecencyScore(result.updated_at || result.created_at);
            
            // Confidence from edge
            const confidenceScore = result.confidence || 0.8;
            
            // Calculate traversal relevance (how relevant is this to the starting point)
            const traversalRelevance = distancePenalty * (result.combined_score || 0.5);
            
            const finalScore = this.calculateFinalScore(
                { relevance: traversalRelevance, recency: recencyScore, confidence: confidenceScore },
                weights
            );

            return {
                ...result,
                scores: {
                    traversalRelevance,
                    distancePenalty,
                    recency: recencyScore,
                    confidence: confidenceScore,
                    final: finalScore
                }
            };
        });

        ranked.sort((a, b) => b.scores.final - a.scores.final);
        return ranked;
    }

    /**
     * Get personalized ranking for a user
     * Considers user's interaction history and preferences
     */
    async getPersonalizedRanking(userId, results, query) {
        try {
            // Get user's recent interactions
            const { data: interactions, error } = await this.supabase
                .from('memory_nodes')
                .select('label, type, access_count, last_accessed_at')
                .eq('user_id', userId)
                .order('last_accessed_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Build user preference profile
            const userProfile = this.buildUserProfile(interactions || []);

            // Boost results matching user preferences
            const personalized = results.map(result => {
                let preferenceBoost = 0;
                
                // Boost if user frequently interacts with this type
                if (userProfile.typePreferences[result.type]) {
                    preferenceBoost += userProfile.typePreferences[result.type] * 0.1;
                }
                
                // Boost if similar to recently accessed
                const similarityToRecent = this.calculateSimilarityToRecent(result, userProfile.recentLabels);
                preferenceBoost += similarityToRecent * 0.15;

                // Adjust final score
                const adjustedScore = Math.min(1, (result.scores?.final || 0.5) + preferenceBoost);

                return {
                    ...result,
                    scores: {
                        ...result.scores,
                        preferenceBoost,
                        final: adjustedScore
                    }
                };
            });

            personalized.sort((a, b) => b.scores.final - a.scores.final);
            return personalized;

        } catch (error) {
            console.error('❌ [Ranking] Personalization failed:', error);
            return results;
        }
    }

    /**
     * Build user preference profile from interactions
     */
    buildUserProfile(interactions) {
        const typePreferences = {};
        const recentLabels = [];

        interactions.forEach((interaction, index) => {
            // Weight by recency (more recent = higher weight)
            const weight = 1 - (index / interactions.length) * 0.5;
            
            typePreferences[interaction.type] = 
                (typePreferences[interaction.type] || 0) + weight;
            
            if (index < 10) {
                recentLabels.push(interaction.label.toLowerCase());
            }
        });

        // Normalize type preferences
        const maxPref = Math.max(...Object.values(typePreferences), 1);
        Object.keys(typePreferences).forEach(type => {
            typePreferences[type] /= maxPref;
        });

        return { typePreferences, recentLabels };
    }

    /**
     * Calculate similarity to recently accessed items
     */
    calculateSimilarityToRecent(result, recentLabels) {
        const resultLabel = (result.label || result.node_label || '').toLowerCase();
        
        // Check for word overlap
        const resultWords = new Set(resultLabel.split(/\s+/));
        let maxSimilarity = 0;

        for (const recent of recentLabels) {
            const recentWords = new Set(recent.split(/\s+/));
            const intersection = new Set([...resultWords].filter(x => recentWords.has(x)));
            const union = new Set([...resultWords, ...recentWords]);
            
            const jaccard = intersection.size / union.size;
            maxSimilarity = Math.max(maxSimilarity, jaccard);
        }

        return maxSimilarity;
    }

    /**
     * Update recency scores for all nodes (scheduled job)
     */
    async updateAllRecencyScores() {
        try {
            await this.supabase.rpc('update_recency_scores');
            return { success: true };
        } catch (error) {
            console.error('❌ [Ranking] Update recency failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Batch rerank results with new weights
     */
    async rerankWithWeights(results, newWeights) {
        return this.rankResults(results, '', { weights: newWeights });
    }

    /**
     * Get ranking explanation for a result
     */
    explainRanking(result) {
        const scores = result.scores || {};
        
        return {
            resultId: result.id || result.node_id,
            label: result.label || result.node_label,
            explanation: {
                relevance: {
                    score: scores.relevance?.toFixed(3),
                    contribution: (scores.relevance * 0.6)?.toFixed(3),
                    description: 'How well the result matches your query (BM25 + Vector)'
                },
                recency: {
                    score: scores.recency?.toFixed(3),
                    contribution: (scores.recency * 0.3)?.toFixed(3),
                    description: 'How recently this was created or accessed'
                },
                confidence: {
                    score: scores.confidence?.toFixed(3),
                    contribution: (scores.confidence * 0.1)?.toFixed(3),
                    description: 'Certainty about the relationship or data'
                },
                final: {
                    score: scores.final?.toFixed(3),
                    description: 'Combined score (Relevance*0.6 + Recency*0.3 + Confidence*0.1)'
                }
            },
            rankingFactors: {
                isExactMatch: this.isExactMatch(result, ''),
                distance: result.distance,
                accessCount: result.access_count,
                lastAccessed: result.last_accessed_at
            }
        };
    }
}

export default RankingService;
