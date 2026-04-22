/**
 * Knowledge Extraction Agent
 * 
 * Background worker that extracts entities and relationships from conversations,
 * emails, and other content to populate the Knowledge Graph.
 * 
 * Implements "Incremental Knowledge Extraction" - processes history in the background
 * and injects edges into the graph when conclusions are reached.
 */

import { OpenRouterAIService } from '../openrouter-ai.js';
import { GraphRAGService } from './graph-rag-service.js';

export class KnowledgeExtractionAgent {
    constructor() {
        this.ai = new OpenRouterAIService();
        this.graph = new GraphRAGService();
        
        // Entity types we can extract
        this.validEntityTypes = [
            'person', 'project', 'feature', 'decision', 'agreement', 
            'deadline', 'bug', 'conversation', 'task', 'document', 
            'concept', 'organization', 'location'
        ];
        
        // Relationship types we can extract
        this.validRelationTypes = [
            'AGREED_ON', 'DECIDED_ON', 'LEAD_ON', 'WORKS_ON', 'MENTIONED_IN',
            'RELATED_TO', 'DEPENDS_ON', 'BLOCKED_BY', 'RESOLVED', 'CREATED',
            'ASSIGNED_TO', 'DUE_ON', 'PART_OF', 'HAS_FEATURE', 'REPORTED_BY',
            'FIXED_BY', 'REVIEWED_BY', 'APPROVED_BY', 'REJECTED_BY', 'REFERENCES'
        ];
    }

    /**
     * Process a conversation and extract knowledge
     * Call this when a conversation concludes or reaches a decision point
     */
    async processConversation(userId, conversationId, messages, context = {}) {
        console.log(`🧠 [KnowledgeAgent] Processing conversation ${conversationId} with ${messages.length} messages`);

        try {
            // 1. Build conversation summary for extraction
            const conversationText = this.buildConversationText(messages);
            
            // 2. Extract entities and relationships using LLM
            const extraction = await this.extractFromText(userId, conversationText, {
                conversationId,
                ...context
            });

            if (!extraction.success || extraction.relationships.length === 0) {
                return {
                    success: true,
                    extracted: false,
                    reason: 'No extractable knowledge found'
                };
            }

            // 3. Inject relationships into the graph
            const injected = [];
            for (const rel of extraction.relationships) {
                const result = await this.graph.injectRelationship(
                    userId,
                    rel.from,
                    rel.to,
                    rel.relation,
                    {
                        confidence: rel.confidence,
                        sourceContext: conversationId,
                        extractedFrom: 'conversation',
                        evidence: rel.evidence,
                        ...rel.metadata
                    }
                );

                if (result.success) {
                    injected.push(result);
                }
            }

            console.log(`✅ [KnowledgeAgent] Injected ${injected.length} relationships`);

            return {
                success: true,
                extracted: true,
                entities: extraction.entities,
                relationships: injected,
                conversationId
            };

        } catch (error) {
            console.error('❌ [KnowledgeAgent] Processing failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Process emails and extract knowledge
     */
    async processEmails(userId, emails, context = {}) {
        console.log(`🧠 [KnowledgeAgent] Processing ${emails.length} emails`);

        try {
            const emailSummary = emails.map(e => ({
                id: e.id,
                from: e.sender?.name || e.from,
                subject: e.subject,
                date: e.date,
                snippet: e.snippet || e.body?.substring(0, 500) || ''
            }));

            // Extract knowledge from batch of emails
            const systemPrompt = `You are a Knowledge Graph Architect specializing in email analysis.

Extract strategic relationships between entities from the following emails.

**ENTITY TYPES**: person, project, feature, decision, agreement, deadline, bug, task, document, organization, concept

**RELATIONSHIP TYPES**: 
- AGREED_ON: An agreement was made
- DECIDED_ON: A decision was reached
- LEAD_ON: Someone leads or is responsible for
- WORKS_ON: Active work being done
- DUE_ON: Has a deadline
- ASSIGNED_TO: Task assigned to person
- REPORTED_BY: Issue reported by person
- RESOLVED: Issue/bug was fixed
- PART_OF: Component of larger whole
- REFERENCES: Links to other items

**OUTPUT FORMAT**:
Return a JSON object with:
{
  "entities": [
    { "label": "Entity Name", "type": "entity_type", "properties": { "key": "value" } }
  ],
  "relationships": [
    { 
      "from": { "label": "Source", "type": "entity_type" },
      "to": { "label": "Target", "type": "entity_type" },
      "relation": "RELATIONSHIP_TYPE",
      "confidence": 0.9,
      "evidence": "quote from email",
      "metadata": { "emailId": "id", "date": "2024-01-01" }
    }
  ]
}

**INSTRUCTIONS**:
1. Only extract high-confidence relationships (confidence >= 0.7)
2. Include the exact evidence text from the email
3. Set appropriate metadata with email ID and date
4. Focus on: Agreements, Decisions, Deadlines, Assignments, Issues
5. Ignore generic/social emails

Context: ${JSON.stringify(context)}

Emails to analyze:
${JSON.stringify(emailSummary, null, 2)}`;

            const response = await this.ai.callOpenRouter([
                { role: 'system', content: systemPrompt }
            ], {
                temperature: 0.2,
                maxTokens: 2000
            });

            const extraction = this.parseExtraction(response);
            
            if (!extraction || extraction.relationships.length === 0) {
                return {
                    success: true,
                    extracted: false,
                    reason: 'No high-confidence relationships found'
                };
            }

            // Inject into graph
            const injected = [];
            for (const rel of extraction.relationships) {
                // Validate relation type
                if (!this.validRelationTypes.includes(rel.relation)) {
                    console.warn(`⚠️ [KnowledgeAgent] Invalid relation type: ${rel.relation}`);
                    continue;
                }

                const result = await this.graph.injectRelationship(
                    userId,
                    rel.from,
                    rel.to,
                    rel.relation,
                    {
                        confidence: rel.confidence,
                        sourceContext: rel.metadata?.emailId || 'batch_extraction',
                        extractedFrom: 'email',
                        evidence: rel.evidence,
                        emailDate: rel.metadata?.date,
                        ...rel.metadata
                    }
                );

                if (result.success) {
                    injected.push(result);
                }
            }

            return {
                success: true,
                extracted: true,
                entities: extraction.entities.length,
                relationships: injected.length,
                details: injected
            };

        } catch (error) {
            console.error('❌ [KnowledgeAgent] Email processing failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Extract knowledge from a single text input
     */
    async extractFromText(userId, text, metadata = {}) {
        console.log(`🧠 [KnowledgeAgent] Extracting from text (${text.length} chars)`);

        try {
            const systemPrompt = `You are a Knowledge Extraction Agent. Analyze the text and extract entities and relationships.

**ENTITY TYPES**: person, project, feature, decision, agreement, deadline, bug, task, document, organization, concept

**RELATIONSHIP TYPES**: 
- AGREED_ON, DECIDED_ON, LEAD_ON, WORKS_ON, DUE_ON, ASSIGNED_TO
- REPORTED_BY, RESOLVED, PART_OF, REFERENCES, BLOCKED_BY

**EXTRACTION RULES**:
1. Extract concrete agreements ("we agreed to...", "let's decide on...")
2. Extract decisions made ("we decided...", "the decision is...")
3. Extract deadlines ("due by...", "deadline is...")
4. Extract assignments ("assigned to...", "responsible for...")
5. Extract blockers ("blocked by...", "waiting for...")

**OUTPUT FORMAT**:
{
  "entities": [
    { "label": "Name", "type": "entity_type", "properties": {} }
  ],
  "relationships": [
    {
      "from": { "label": "Source", "type": "type" },
      "to": { "label": "Target", "type": "type" },
      "relation": "RELATIONSHIP_TYPE",
      "confidence": 0.9,
      "evidence": "exact quote",
      "metadata": {}
    }
  ]
}

**IMPORTANT**: 
- Only include relationships with confidence >= 0.7
- Provide exact evidence quotes
- Be conservative - only extract clear, unambiguous facts

Text to analyze:
${text}`;

            const response = await this.ai.callOpenRouter([
                { role: 'system', content: systemPrompt }
            ], {
                temperature: 0.1,
                maxTokens: 1500
            });

            const extraction = this.parseExtraction(response);

            // Filter by confidence
            const highConfidence = extraction.relationships.filter(
                r => r.confidence >= 0.7 && this.validRelationTypes.includes(r.relation)
            );

            return {
                success: true,
                entities: extraction.entities,
                relationships: highConfidence
            };

        } catch (error) {
            console.error('❌ [KnowledgeAgent] Text extraction failed:', error);
            return { success: false, error: error.message, entities: [], relationships: [] };
        }
    }

    /**
     * Process a specific conclusion/agreement explicitly
     * Call this when user explicitly confirms something
     */
    async recordAgreement(userId, agreement, context = {}) {
        console.log(`📝 [KnowledgeAgent] Recording agreement: ${agreement}`);

        try {
            // Parse the agreement to extract entities
            const extraction = await this.extractFromText(userId, agreement, context);

            if (extraction.success && extraction.relationships.length > 0) {
                const injected = [];
                
                for (const rel of extraction.relationships) {
                    const result = await this.graph.injectRelationship(
                        userId,
                        rel.from,
                        rel.to,
                        rel.relation,
                        {
                            confidence: 1.0, // Explicit agreements have high confidence
                            sourceContext: context.conversationId || 'explicit',
                            extractedFrom: 'explicit_agreement',
                            evidence: agreement,
                            isExplicit: true,
                            ...context
                        }
                    );

                    if (result.success) {
                        injected.push(result);
                    }
                }

                return {
                    success: true,
                    recorded: true,
                    relationships: injected
                };
            }

            // If no structured extraction, create a generic agreement node
            const result = await this.graph.injectRelationship(
                userId,
                { label: context.participant || 'User', type: 'person' },
                { label: this.summarizeAgreement(agreement), type: 'agreement' },
                'AGREED_ON',
                {
                    confidence: 1.0,
                    sourceContext: context.conversationId || 'explicit',
                    extractedFrom: 'explicit_agreement',
                    fullText: agreement,
                    isExplicit: true,
                    ...context
                }
            );

            return {
                success: result.success,
                recorded: result.success,
                relationship: result
            };

        } catch (error) {
            console.error('❌ [KnowledgeAgent] Record agreement failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Record a decision made during a conversation
     */
    async recordDecision(userId, decision, context = {}) {
        console.log(`🎯 [KnowledgeAgent] Recording decision: ${decision}`);

        try {
            const extraction = await this.extractFromText(userId, decision, context);

            if (extraction.success && extraction.relationships.length > 0) {
                const injected = [];
                
                for (const rel of extraction.relationships) {
                    // Force relation type to DECIDED_ON for explicit decisions
                    const relationType = rel.relation === 'DECIDED_ON' ? rel.relation : 'DECIDED_ON';
                    
                    const result = await this.graph.injectRelationship(
                        userId,
                        rel.from,
                        rel.to,
                        relationType,
                        {
                            confidence: 1.0,
                            sourceContext: context.conversationId || 'explicit',
                            extractedFrom: 'explicit_decision',
                            evidence: decision,
                            isExplicit: true,
                            ...context
                        }
                    );

                    if (result.success) {
                        injected.push(result);
                    }
                }

                return {
                    success: true,
                    recorded: true,
                    relationships: injected
                };
            }

            // Fallback: create decision node
            const result = await this.graph.injectRelationship(
                userId,
                { label: context.participant || 'User', type: 'person' },
                { label: this.summarizeAgreement(decision), type: 'decision' },
                'DECIDED_ON',
                {
                    confidence: 1.0,
                    sourceContext: context.conversationId || 'explicit',
                    extractedFrom: 'explicit_decision',
                    fullText: decision,
                    isExplicit: true,
                    ...context
                }
            );

            return {
                success: result.success,
                recorded: result.success,
                relationship: result
            };

        } catch (error) {
            console.error('❌ [KnowledgeAgent] Record decision failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Build conversation text from messages
     */
    buildConversationText(messages) {
        return messages.map(m => {
            const role = m.role || m.sender || 'unknown';
            const content = m.content || m.text || m.message || '';
            return `${role}: ${content}`;
        }).join('\n\n');
    }

    /**
     * Parse LLM extraction response
     */
    parseExtraction(response) {
        try {
            // Clean the response
            let clean = response;
            if (typeof response === 'object' && response.content) {
                clean = response.content;
            }
            
            clean = clean.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            
            // Find JSON object
            const match = clean.match(/\{[\s\S]*\}/);
            if (!match) {
                console.warn('⚠️ [KnowledgeAgent] No JSON found in response');
                return { entities: [], relationships: [] };
            }

            const parsed = JSON.parse(match[0]);

            return {
                entities: parsed.entities || [],
                relationships: (parsed.relationships || []).map(r => ({
                    ...r,
                    confidence: r.confidence || 0.8,
                    metadata: r.metadata || {}
                }))
            };

        } catch (error) {
            console.error('❌ [KnowledgeAgent] Parse failed:', error);
            return { entities: [], relationships: [] };
        }
    }

    /**
     * Summarize agreement text into a concise label
     */
    summarizeAgreement(text) {
        // Extract key action words
        const words = text.toLowerCase().split(/\s+/);
        const keywords = words.filter(w => 
            !['the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'we', 'will', 'agreed', 'decided'].includes(w)
        );
        
        // Take first 5-7 meaningful words
        const summary = keywords.slice(0, 7).join(' ');
        return summary.charAt(0).toUpperCase() + summary.slice(1);
    }

    /**
     * Batch process historical conversations
     * Call this to backfill the knowledge graph
     */
    async batchProcessHistory(userId, conversations, options = {}) {
        console.log(`📚 [KnowledgeAgent] Batch processing ${conversations.length} conversations`);

        const results = {
            processed: 0,
            extracted: 0,
            failed: 0,
            relationships: 0
        };

        for (const conversation of conversations) {
            try {
                const result = await this.processConversation(
                    userId,
                    conversation.id,
                    conversation.messages,
                    { batch: true, ...options }
                );

                results.processed++;
                
                if (result.extracted) {
                    results.extracted++;
                    results.relationships += result.relationships?.length || 0;
                }

                // Add small delay to avoid rate limits
                if (options.delay) {
                    await new Promise(r => setTimeout(r, options.delay));
                }

            } catch (error) {
                results.failed++;
                console.error(`❌ [KnowledgeAgent] Failed to process ${conversation.id}:`, error);
            }
        }

        return {
            success: true,
            results
        };
    }
}

export default KnowledgeExtractionAgent;
