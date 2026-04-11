/**
 * Arcus AI Service
 * Dedicated AI service for Arcus agent-talk using Liquid Thinking model
 * with memory, context awareness, and integration support
 */

import { subscriptionService } from './subscription-service.js';

// Primary: Gemini Flash Lite (Ultra-fast, single model architecture)
const ARCUS_MODEL = 'google/gemini-2.0-flash-lite-preview-02-05:free';
// Vision model specifically validated from OpenRouter API
const ARCUS_VISION_MODEL = 'google/gemini-2.0-flash-lite-preview-02-05:free';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Fast models for structural tasks
const TASK_MODEL_MAP = {
    intent: 'google/gemini-2.0-flash-lite-preview-02-05:free', 
    planning: 'google/gemini-2.0-flash-lite-preview-02-05:free',
    synthesis: 'google/gemini-2.0-flash-lite-preview-02-05:free',
    canvas: 'nvidia/llama-3.1-nemotron-70b-instruct:free'
};

import { extractTextFromPdf } from './pdf-service.js';

export class ArcusAIService {
    constructor() {
        // Robust API key fallback chain
        this.apiKey = (process.env.OPENROUTER_API_KEY3 || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY2 || '').trim();
        this.model = ARCUS_MODEL;
        this.baseURL = OPENROUTER_BASE_URL;

        if (!this.apiKey) {
            console.error('❌ OPENROUTER_API_KEY3 is not configured for Arcus');
        } else {
            console.log('✅ Arcus AI Service initialized with GLM/Gemini Hybrid model');
        }
    }

    /**
     * Call OpenRouter API with a single, fast model (No delays/fallbacks)
     */
    async callOpenRouter(messages, options = {}) {
        const primaryModel = options.model || (options.taskType ? TASK_MODEL_MAP[options.taskType] : null) || this.model || ARCUS_MODEL;
        
        // Fallback chain for reliability
        const models = [
            primaryModel,
            'nvidia/llama-3.1-nemotron-70b-instruct:free',
            'google/gemini-2.0-flash-lite-preview-02-05:free'
        ];

        let lastError = null;

        for (const modelId of models) {
            console.log(`🚀 Arcus attempting mission via: ${modelId}`);
            
            const timeoutMs = options.isDeepThinking ? 45000 : 25000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const response = await fetch(`${this.baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                        'X-Title': 'Mailient Arcus',
                        ...(options.privacyMode ? { 'X-OpenRouter-Data-Collection': 'opt-out' } : {})
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages,
                        temperature: options.temperature || 0.4,
                        max_tokens: options.maxTokens || 2000
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    if (data?.choices?.[0]?.message?.content) {
                        console.log(`✅ Arcus AI Success with ${modelId}`);
                        if (data.usage?.total_tokens && options.userEmail) {
                            subscriptionService.logTokenUsage(options.userEmail, data.usage.total_tokens);
                        }
                        return data;
                    }
                }

                const errorText = await response.text();
                lastError = new Error(`Arcus API failed: ${response.status}`);
                console.warn(`⚠️ Arcus model ${modelId} failed (${response.status}): ${errorText.substring(0, 50)}...`);
                
                // If it's a 401/403, don't bother retrying (auth issue)
                if (response.status === 401 || response.status === 403) break;
                
                continue; // Try next model

            } catch (error) {
                clearTimeout(timeoutId);
                lastError = error;
                if (error.name === 'AbortError') {
                    console.warn(`⏱️ Arcus model ${modelId} timed out`);
                } else {
                    console.error(`💥 Arcus AI Call Error (${modelId}): ${error.message}`);
                }
                continue; // Try next model
            }
        }

        throw lastError || new Error('All Arcus AI models failed');
    }

    /**
     * Stream response from OpenRouter using SSE (Direct mapping, no loops)
     */
    async *streamResponse(messages, options = {}) {
        const primaryModel = options.model || (options.taskType ? TASK_MODEL_MAP[options.taskType] : null) || this.model || ARCUS_MODEL;
        const models = [
            primaryModel,
            'nvidia/llama-3.1-nemotron-70b-instruct:free'
        ];

        let lastError = null;

        for (const modelId of models) {
            console.log(`📡 Arcus attempting streaming mission with: ${modelId}`);
            try {
                const response = await fetch(`${this.baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                        'X-Title': 'Mailient Arcus',
                        ...(options.privacyMode ? { 'X-OpenRouter-Data-Collection': 'opt-out' } : {})
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages,
                        temperature: options.temperature || 0.4,
                        max_tokens: options.maxTokens || 2000,
                        stream: true
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`⚠️ Arcus streaming model ${modelId} failed (${response.status}): ${errorText.substring(0, 50)}...`);
                    lastError = new Error(`Stream failed: ${response.status}`);
                    
                    if (response.status === 401 || response.status === 403) break;
                    continue;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') return;
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    yield content;
                                }
                            } catch (e) {
                                // skip malformed chunks
                            }
                        }
                    }
                }
                
                // If we successfully finished streaming, return
                return;

            } catch (error) {
                console.error(`💥 Arcus stream error (${modelId}): ${error.message}`);
                lastError = error;
                continue;
            }
        }
        
        throw lastError || new Error('All Arcus AI streaming models failed');
    }

    /**
     * Analyze intent and generate structured plan
     */
    async analyzeIntentAndPlan(userMessage, context = {}) {
        const systemPrompt = `You are ARCUS, a high-performance work layer.
Analyze the request and return a JSON schema-driven plan.

WORK_DOMAINS:
- email: draft_email, reply_email, summarize, search, arcus_outreach, arcus_inbox_review, arcus_auto_pilot
- meeting: schedule, check_availability
- analytics: data_generation, report_insights
- notes: create_thought, find_memory
- plan: complex_workflow, objective_mapping
- general: greeting, clarification
- plan: detailed_strategy, artifact_generation

MODE_SETTING: ${context.isPlanMode ? 'PLAN MODE ENABLED (Focus on creating a detailed artifact, needsCanvas=false, canvasType=action_plan)' : 'AGENT MODE (Focus on direct action or chat)'}

Return STRICT JSON:
{
  "initialResponse": "immediate human acknowledgment using their specific goal/numbers (I hear you loud and clear... summarize objective... state plan)",
  "intent": "one of: draft_email, reply_email, summarize, search, schedule, organize, analyze, general_chat, arcus_outreach, arcus_inbox_review, arcus_auto_pilot",
  "complexity": "simple or complex",
  "needsCanvas": boolean,
  "searchQuery": "refined search query for Gmail/Notes (e.g. 'recent invoices from Stripe' or 'follow up from John about the project')",
  "canvasType": "one of: email_draft, summary, research, action_plan, meeting_schedule, analytics, none",
  "thinkingBlocks": [
    { 
       "id": "block-1",
       "title": "A LONG, STRATEGIC, and DESCRIPTIVE title (15-30 words) explaining EXACTLY what is being done, highlighting the scale and technology (e.g., 'Execute massive-scale extraction of 100,000+ agency and business leads from global directories...').",
       "initialContext": "Strategic narrative intro (e.g. I confirmed the need for 5,500+ verified leads fitting Mailient's profile. I'll expand to...)",
       "steps": [
         { "action": "specific pill label (e.g. Search for YC databases on GitHub)", "type": "one of: search, read, think, draft, execute, code" }
       ],
       "interimConclusion": "Brief discovery statement (e.g. Found multiple large datasets, including YC startups CSV with founder info.)",
       "nextActionContext": "Small transition text (e.g. Next, will extract relevant contact details to build the lead list.)"
    }
  ],
  "confidence": number between 0 and 1
}
`;

        try {
            let userContent = userMessage;
            const attachments = context.attachments || [];

            // OPTIMIZATION: For intent analysis, we only need to know IF there are attachments, 
            // not the full base64 content. This saves massive token overhead and image processing time.
            if (attachments.length > 0) {
              const types = [...new Set(attachments.map(a => a.type))];
              userContent = `${userMessage}\n\n[Context: User has attached ${attachments.length} files of types: ${types.join(', ')}]`;
            }

            const response = await this.callOpenRouter([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ], { maxTokens: 800, temperature: 0.1 });

            let content = this.extractResponse(response);
            content = content.trim();
            if (content.startsWith('```json')) content = content.replace(/^```json/, '');
            if (content.startsWith('```')) content = content.replace(/^```/, '');
            if (content.endsWith('```')) content = content.replace(/```$/, '');

            return JSON.parse(content.trim());
        } catch (e) {
            console.error('Intent analysis failed:', e.message);
            return {
                intent: 'general_chat',
                complexity: 'simple',
                needsCanvas: false,
                canvasType: 'none',
                plan: [{ step: 1, action: 'respond', description: 'Generate response', type: 'think' }],
                gmailActions: [],
                confidence: 0.5,
                reasoning: 'Fallback to general chat'
            };
        }
    }

    /**
     * Generate canvas content (structured output for the workspace panel)
     */
    async generateCanvasContent(userMessage, canvasType, emailContext = '', options = {}) {
        const canvasPrompts = {
            email_draft: `Draft a refined email. JSON: { "subject": "string", "to": "email", "body": "string" }`,
            summary: `Summarize each email individually as a slide deck. Return JSON: { "title": "string", "items": [{ "subject": "string", "sender": "string", "summary": "A 2-3 sentence summary of this specific email", "priority": "high|medium|low" }] }. Each item is one email. Be specific and concise. Do NOT combine emails.`,
            research: `Compile findings. JSON: { "title": "string", "findings": [{ "topic": "string", "detail": "string" }] }`,
            action_plan: `Build strategic workflow. JSON: { "title": "string", "steps": [{ "order": number, "task": "string", "status": "pending" }] }`,
            meeting_schedule: `Coordinate meeting. JSON: { "title": "string", "provider": "google|cal", "attendees": ["email"], "date": "ISO", "time": "HH:MM", "duration": 30, "agenda": "string" }`,
            analytics: `Generate email analytics with real chart data. Return JSON: { "title": "string", "stats": [{ "label": "string", "value": "string", "change": "string", "changeDirection": "up|down|neutral" }], "areaChart": { "label": "string", "data": [{ "name": "string", "value": number }] }, "pieChart": { "label": "string", "data": [{ "name": "string", "value": number }] } }. Use realistic numbers based on the email context provided. Stats should have 2-4 items. Area chart 5-7 data points. Pie chart 3-4 segments.`,
            notes: `Commit to memory. JSON: { "title": "string", "content": "string", "tags": ["string"] }`
        };

        const systemPrompt = canvasPrompts[canvasType] || canvasPrompts.summary;

        try {
            let userContent = userMessage;
            const attachments = options.attachments || [];

            if (attachments.length > 0) {
                userContent = [
                    { type: 'text', text: userMessage },
                    ...attachments.map(att => {
                        if (att.type.startsWith('image/')) {
                            return {
                                type: 'image_url',
                                image_url: { url: att.base64 }
                            };
                        }
                        return {
                            type: 'text',
                            text: this._decodeBase64ToText(att)
                        };
                    })
                ];
            }

            const messages = [
                { role: 'system', content: systemPrompt + '\n\nUser: ' + (options.userName || 'User') },
                ...(emailContext ? [{ role: 'system', content: `Email Context:\n${emailContext}` }] : []),
                { role: 'user', content: userContent }
            ];

            const response = await this.callOpenRouter(messages, {
                maxTokens: 1500,
                temperature: 0.3,
                privacyMode: options.privacyMode
            });

            let content = this.extractResponse(response);
            content = content.trim();
            
            // Clean markdown indicators
            let cleanJson = content;
            if (cleanJson.includes('```json')) cleanJson = cleanJson.split('```json')[1].split('```')[0];
            else if (cleanJson.includes('```')) cleanJson = cleanJson.split('```')[1].split('```')[0];
            
            try {
                const parsedContent = JSON.parse(cleanJson.trim());
                return {
                    type: canvasType,
                    content: parsedContent,
                    raw: content
                };
            } catch (err) {
                console.warn('⚠️ Arcus returned non-JSON content for Canvas. Falling back to text mode.');
                // Fallback: If it's not JSON, treat it as a summary/raw text
                return {
                    type: 'summary',
                    content: {
                        title: 'Drafting Update',
                        rawText: content
                    },
                    raw: content
                };
            }
        } catch (e) {
            console.error('💥 Canvas generation failed:', e.message);
            return {
                type: canvasType,
                content: null,
                raw: '',
                error: e.message
            };
        }
    }

    /**
     * Extract response content from API response
     */
    extractResponse(data) {
        return data?.choices?.[0]?.message?.content || '';
    }

    /**
     * Build Arcus system prompt with context awareness and agentic mission focus
     */
    buildSystemPrompt(options = {}) {
        const {
            userEmail = null,
            userName = 'User',
            conversationHistory = [],
            emailContext = null,
            integrations = {},
            privacyMode = false,
            subscriptionInfo = null,
            isDeepThinking = false,
            isCanvas = false
        } = options;

        // Build subscription context
        let subscriptionContext = '';
        if (subscriptionInfo) {
            if (subscriptionInfo.isUnlimited) {
                subscriptionContext = `User is on PRO plan. They have UNLIMITED Arcus AI agentic capabilities.`;
            } else {
                const features = subscriptionInfo.features || {};
                subscriptionContext = `User is on STARTER plan. Arcus AI remaining: ${features.arcus_ai?.usage || 0}/${features.arcus_ai?.limit || 10} used today (resets daily).`;
            }
        }

        let integrationsContext = '';
        if (integrations.gmail) integrationsContext += '- Gmail (Connected: Full Search, Read, Send, Auto-Reply, and Intro capabilities enabled)\n';
        if (integrations.google_calendar) integrationsContext += '- Google Calendar (Connected: Create, Edit, Search, and Organize events enabled)\n';
        if (integrations.google_meet) integrationsContext += '- Google Meet (Connected: Auto-generate meeting rooms and manage video conferences enabled)\n';
        if (integrations.google_tasks) integrationsContext += '- Google Tasks (Connected: Create, List, and Complete tasks enabled)\n';
        if (integrations.notion) integrationsContext += '- Notion (Connected: Create pages, Search workspace, and Append to databases enabled)\n';
        if (integrations.notion_calendar) integrationsContext += '- Notion Calendar (Connected: Bridge project timelines with personal schedule enabled)\n';
        if (integrations.slack) integrationsContext += '- Slack (Connected: Read and Write conversations for team coordination enabled)\n';
        if (integrations.cal_com || integrations['cal.com']) {
            const link = integrations.cal_com_link || integrations['cal.com_link'] || 'Generic Link';
            integrationsContext += `- Cal.com (Connected: Real-time booking enabled via ${link})\n`;
        }
        integrationsContext += '- Inbox Review (Enabled: Can perform bulk reviews and summaries)\n';
        integrationsContext += '- Arcus Engine (Connected: Real-time execution of all tasks)\n';

        let prompt = `# ARCUS - Your Result-First Colleague

You are ARCUS. You don't just "help"—you finish what you start. You are direct, fast, and completely focused on the work at hand.

## Actions
- **Protocol_Send:** Send a specific email (requires recipient, subject, body).
- **Outreach_Protocol:** (arcus_outreach) Send an intro or cold outreach email.
- **Inbox_Review:** (arcus_inbox_review) Fetch and review recent inbox activity.
- **Response_Auto_Pilot:** (arcus_auto_pilot) Automatically respond to a thread or message ID.
- **Draft_Protocol:** Create a draft for the user to review.
- **Insight_Generation:** Generate analytics about the inbox or workspace.

## How You Help
- **Active Execution:** You have FULL ACCESS to send emails, manage the inbox, and schedule events. You don't just draft—you EXECUTE when approved.
- **Result-First:** Speak like a colleague. Use specific numbers and facts. If there are 36 leads but we need 5,500, say exactly that.
- **Hooked in Context:** Always start by repeating the user's goal with their specific numbers.

## MISSION REPORT STRUCTURE (FOR COMPLETIONS)
When a multi-step project or deep research task is finished, your response MUST follow this structured format:

1. **Opening**: "I have successfully completed the [mission name] for [objective]."
2. **Campaign Status**: Create a section titled "Campaign Status:". Use bullet points where EACH point has a bold heading followed by a descriptive context.
3. **Deliverables**: Create a section titled "Deliverables:". Use a numbered list (1, 2, 3) to index results.
4. **Forward Synthesis**: Conclude with tactical next steps.

## protocol_arcus_mission
1. NEVER output raw tool parameters, function arguments, or internal code fragments (e.g., 'last_7_days', 'performance_metrics', 'True', 'true', 'false'). These are internal telemetry and should NEVER be visible to the user.
2. DO NOT output bulleted lists of search terms or system commands. Maintain a conversational, professional tone. If searching, say "I am searching for [X]."
3. If you need data, perform a mission search but ONLY report the findings in natural language or the Mission Report Structure.
4. If the user asks for an "audit", "analytics", "summary", "report", or you performed a massive data extraction, you MUST trigger the Canvas mode and use the Mission Report Structure.
5. NO AI FLUFF. No "How can I help you?", "Let me know what you think", or formal sign-offs. Use contractions.
6. DO NOT use em dashes (—). Use commas or hyphens.
7. **MISSION REPORT structure is MANDATORY** for all mission findings (sections: Campaign Status, Deliverables, Forward Synthesis).

${privacyMode ? '⚠️ PRIVACY MODE ACTIVE.' : ''}
User: ${userName} (${userEmail || 'not signed in'})
Current Date: ${new Date().toISOString().split('T')[0]}
Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
Timezone: Asia/Calcutta (IST)

Integrations:
${integrationsContext || 'None connected.'}
${subscriptionContext}

${emailContext ? `## Context Found\n${emailContext}` : ''}

${conversationHistory.length > 0 ? `## Last Messages (Contextual History)\n${conversationHistory.slice(-5).map(m => `[${m.role}]: ${m.content}`).join('\n')}` : ''}

## Current Status
- Deep Thinking: ${isDeepThinking ? 'ENABLED' : 'DISABLED'}
- Canvas Workspace: ${isCanvas ? 'AVAILABLE' : 'READ-ONLY'}

Remember: You are ARCUS. You do the work. You confirm. You move to Done.`;

        return prompt;
    }

    /**
     * Generate conversational response with full context
     */
    async generateResponse(userMessage, options = {}) {
        const {
            conversationHistory = [],
            emailContext = null,
            integrations = {},
            userEmail = null,
            userName = 'User',
            privacyMode = false,
            subscriptionInfo = null,
            attachments = [],
            isDeepThinking = false,
            isCanvas = false
        } = options;

        try {
            const systemPrompt = this.buildSystemPrompt({
                userEmail,
                userName,
                conversationHistory,
                emailContext,
                integrations,
                privacyMode,
                subscriptionInfo,
                isDeepThinking,
                isCanvas: options.isCanvas // Explicitly pass from options or flags
            });

            let userContent = userMessage;

            if (attachments && attachments.length > 0) {
                userContent = [
                    { type: 'text', text: userMessage },
                    ...attachments.map(att => {
                        // Vision support for images
                        if (att.type?.startsWith('image/')) {
                            return {
                                type: 'image_url',
                                image_url: { url: att.base64 }
                            };
                        }
                        
                        // Handle PDFs and other documents via description and text extraction
                        const isPDF = att.type?.includes('pdf');
                        let attachmentDesc = `[Attached File: ${att.name} (${att.type})]`;
                        
                        if (isPDF) {
                            const pdfText = extractTextFromPdf(att.base64);
                            if (pdfText && pdfText.length > 50) {
                                return { type: 'text', text: `${attachmentDesc}\nExtracted PDF Content:\n${pdfText}` };
                            }
                            attachmentDesc += `\n(Note: This is a PDF document. If it was an image-based PDF, I may need OCR or the user to describe it if my vision cannot see it directly. Otherwise, I will analyze the metadata and provide the best help I can.)`;
                        }
                        
                        const extractedText = this._decodeBase64ToText(att);
                        if (extractedText && !extractedText.includes('[Binary Data]')) {
                            return { type: 'text', text: `${attachmentDesc}\nExtracted Content:\n${extractedText}` };
                        }
                        
                        // Final attempt: Pass PDF as a "file_url" or similar if the model supports it 
                        // by spoofing it in image_url (some OpenRouter models handle this)
                        if (isPDF) {
                            return {
                                type: 'image_url',
                                image_url: { url: att.base64 }
                            };
                        }
                        
                        return { type: 'text', text: attachmentDesc + "\n(Content type is binary/unsupported for direct text extraction. I am aware this file exists and can refer to it by name.)" };
                    })
                ];
            }

            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.slice(-10), // Include last 10 messages for context
                { role: 'user', content: userContent }
            ];

            const response = await this.callOpenRouter(messages, {
                maxTokens: isDeepThinking ? 6000 : 3000,
                temperature: isDeepThinking ? 0.5 : 0.4,
                privacyMode,
                isDeepThinking,
                hasImages: attachments.some(a => a.type?.startsWith('image/'))
            });

            let content = this.extractResponse(response);

            // Post-process to remove any em dashes if method exists
            if (content && typeof content === 'string') {
                content = content.replace(/\u2014/g, ', ').replace(/\u2013/g, '-');
            }

            return content;
        } catch (error) {
            console.error('❌ Arcus generateResponse error:', error);
            throw error;
        }
    }

    /**
     * Generate a draft reply for an email
     */
    async generateDraftReply(emailContent, options = {}) {
        const {
            userName = 'User',
            userEmail = null,
            replyInstructions = '',
            conversationHistory = [],
            privacyMode = false
        } = options;

        try {
            // Extract sender information
            let fromName = 'there';
            let fromEmail = '';
            const fromMatch = emailContent.match(/From:\s*([^<\n]+)(?:<([^>]+)>)?/);
            if (fromMatch) {
                fromName = fromMatch[1].trim().replace(/[\"']/g, '').split(' ')[0];
                fromEmail = fromMatch[2] || '';
            }

            const systemPrompt = `You are ARCUS, drafting an email reply for ${userName}.

CRITICAL RULES:
1. NEVER use em dashes (—) anywhere in your response
2. Write in a natural, human tone
3. Be warm but professional
4. Reference specific details from the original email
5. Keep it concise but complete
6. **BUSINESS ALIGNMENT**: Prioritize the most urgent and revenue-impactful details. If this is a follow-up to a prospect, be exceptionally clear on the value proposition. If it's an urgent risk, address it with accountability and a clear solution.

You are replying to: ${fromName}${fromEmail ? ` <${fromEmail}>` : ''}
Reply instructions from user: ${replyInstructions || 'None provided'}

Write a complete, ready-to-send email reply. Start with an appropriate greeting and end with a sign-off using "${userName}" as the name.`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Draft a reply to this email:\n\n${emailContent.substring(0, 4000)}` }
            ];

            const response = await this.callOpenRouter(messages, {
                maxTokens: 600,
                temperature: 0.5,
                privacyMode
            });

            let draft = this.extractResponse(response);
            draft = this.removeEmDashes(draft);

            return {
                draftContent: draft,
                recipientName: fromName,
                recipientEmail: fromEmail,
                senderName: userName
            };
        } catch (error) {
            console.error('❌ Arcus generateDraftReply error:', error);
            throw error;
        }
    }

    /**
     * Remove all em dashes from text
     */
    removeEmDashes(text) {
        if (!text) return text;
        // Replace em dash with a comma and space, or just space depending on context
        return text
            .replace(/\s*—\s*/g, ', ')  // Em dash with optional spaces -> comma
            .replace(/–/g, '-')          // En dash -> hyphen
            .replace(/\s+,/g, ',')       // Clean up double spaces before comma
            .replace(/,\s*,/g, ',');     // Clean up double commas
    }

    /**
     * Generate internal thoughts for the Thinking indicator
     */
    async generateThoughts(missionGoal, context = {}) {
        const systemPrompt = `You are ARCUS. Briefly explain what you are thinking as you start this mission: "${missionGoal}".
Keep it under 30 words. Focus on verbs: Analyzing, Searching, Preparing. No AI fluff.`;

        // Create a safe, minimal context to avoid huge payloads
        const safeContext = {
            goal: missionGoal,
            currentStep: context.currentStep?.label,
            actionType: context.currentStep?.actionType,
            hasEmailContext: !!context.emailContext,
            historyLength: context.conversationHistory?.length || 0
        };

        try {
            const response = await this.callOpenRouter([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Current state: ${JSON.stringify(safeContext)}` }
            ], { maxTokens: 100, temperature: 0.1 });

            return this.extractResponse(response).trim();
        } catch (error) {
            console.warn('Thought generation failed, using fallback:', error.message);
            return "Analyzing mission goal and preparing next steps...";
        }
    }
    async planNextAction(missionGoal, context = {}) {
        const {
            threadSummary = '',
            lastMessages = [],
            extractedFacts = {},
            userPreferences = {},
            conversationHistory = []
        } = context;

        const systemPrompt = `You are ARCUS, planning the next step for a user mission.
Mission goal: "${missionGoal}"

## Rules for your output (100x useful):
1. Restate context in exactly 1 line.
2. Propose one clear next step (next_action).
3. If this is a scheduling mission, you MUST clarify: time, date, and attendees/minimum requirements before creating the event.
4. If the user explicitly asks to "SEND" or "REPLY" and you have the content ready, use send_email immediately instead of create_draft (unless it is a high-risk recipient).
5. Make reply easy: yes/no, A/B choice, or 2 time slots.
6. Keep draft_body < 120 words. No em dashes (—). No bolding/italics.
7. Never invent facts; add missing ones to questions_for_user. You have full access to send emails and schedule meetings once details are confirmed.
8. If you have safety concerns (mentions money/legal), prefer create_draft over send_email to let the user review first.
9. If summarizing threads (catch-up), use summarize as next_action and put the summary in draft_body.
10. For Cal.com scheduling: mention that you can book directly via their Cal.com integration.

## Structured Output (Strict JSON):
{
  "next_action": "one of [draft_reply, send_email, create_draft, create_meeting, get_availability, summarize, clarify]",
  "draft_subject": "string",
  "draft_body": "string",
  "confidence": number,
  "assumptions": ["string"],
  "questions_for_user": ["string"],
  "send_to": ["email"],
  "cc": ["email"],
  "safety_flags": ["one or more of: new_recipient, external_domain, mentions_money, mentions_legal, mentions_medical, attachment_forwarding, large_recipient_list"]
}`;

        const messages = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: JSON.stringify({
                    mission_goal: missionGoal,
                    thread_summary: threadSummary?.substring(0, 500),
                    last_messages: lastMessages.slice(-3).map(m => ({
                        from: m.from,
                        date: m.date,
                        body: m.body?.substring(0, 1000)
                    })),
                    extracted_facts: extractedFacts,
                    user_preferences: userPreferences,
                    recent_conversation: conversationHistory.slice(-3).map(m => ({
                        role: m.role,
                        content: m.content?.substring(0, 200)
                    }))
                })
            }
        ];

        try {
            const response = await this.callOpenRouter(messages, {
                maxTokens: 1000,
                temperature: 0.2
            });

            let content = this.extractResponse(response);
            content = content.trim();
            if (content.startsWith('```json')) content = content.replace(/^```json/, '');
            if (content.endsWith('```')) content = content.replace(/```$/, '');

            const parsed = JSON.parse(content);

            return {
                next_action: parsed.next_action || 'clarify',
                draft_subject: parsed.draft_subject || missionGoal,
                draft_body: this.removeEmDashes(parsed.draft_body || ''),
                confidence: parsed.confidence || 0.5,
                assumptions: parsed.assumptions || [],
                questions_for_user: parsed.questions_for_user || [],
                send_to: parsed.send_to || [],
                cc: parsed.cc || [],
                safety_flags: parsed.safety_flags || []
            };
        } catch (error) {
            console.error('Plan error:', error);
            return {
                next_action: 'clarify',
                questions_for_user: ["I couldn't plan the next step. Could you provide more details?"],
                safety_flags: []
            };
        }
    }



    /**
     * Dynamically generate steps for a mission
     */
    async generateMissionSteps(goal, context = {}) {
        const systemPrompt = `You are the ARCUS Mission Planner. Convert a user goal into a sequence of technical steps.
Available actionTypes:
- search_email: find threads/contacts by query
- read_thread: analyze messages in the found thread
- arcus_inbox_review: fetch and summarize recent messages
- arcus_outreach: send outreach/intro email
- arcus_auto_pilot: respond to a message or thread
- draft_reply: propose a reply in canvas

Rules:
1. Return exactly what's needed to finish the goal.
2. If scheduling: search -> read -> get_availability -> draft_reply.
3. If replying: search -> read -> arcus_auto_pilot.
4. If intro outreach: arcus_outreach.
5. If catch-up: arcus_inbox_review -> summarize.

Return strict JSON:
{
  "steps": [
    { "actionType": "string", "label": "Human readable label (e.g. Searching for John's email)", "description": "Tool-specific instructions (e.g. from:John)" }
  ]
}`;

        try {
            const response = await this.callOpenRouter([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Goal: ${goal}` }
            ], { maxTokens: 500, temperature: 0.1 });

            let content = this.extractResponse(response);
            content = content.trim();
            if (content.startsWith('```json')) content = content.replace(/^```json/, '');
            if (content.endsWith('```')) content = content.replace(/```$/, '');

            const parsed = JSON.parse(content);
            return parsed.steps || [];
        } catch (e) {
            console.error('Step generation failed, using fallback templates.');
            return [];
        }
    }

    /**
     * Analyze a list of emails to determine if any "nudges" (reminders) are needed.
     * Returns a list of nudge objects.
     */
    async analyzeNeedsNudge(emails, options = {}) {
        if (!emails || emails.length === 0) return [];

        try {
            console.log(`🤖 [ArcusAI] Analyzing ${emails.length} emails for nudges...`);
            const systemPrompt = `You are ARCUS_NUDGE_DETECTOR. 
Analyze these emails (last 30 days) and identify any unreplied human emails that expect a response or have an outstanding question.

ONLY include:
- Direct questions or requests
- Urgent business inquiries

IGNORE:
- Newsletters/Promos/Alerts
- Acknowledgments/Thank yous

JSON format:
{ "nudges": [{"id": "...", "subject": "...", "reason": "...", "urgency": "high/medium", "suggestedAction": "..."}] }
If none, return {"nudges": []}. No preamble.`;

            const emailSummaries = emails.map(e => ({
                id: e.id,
                from: e.from,
                subject: e.subject,
                date: e.date,
                snippet: e.snippet
            }));

            const response = await this.callOpenRouter([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Identify nudges in these emails: ${JSON.stringify(emailSummaries)}` }
            ], { maxTokens: 800, temperature: 0.1, taskType: 'intent' });

            let content = this.extractResponse(response).trim();
            if (!content) {
                console.warn('⚠️ [ArcusAI] Empty response from AI for nudges');
                return [];
            }

            // Extract JSON if AI wrapped it in markdown or included conversational text
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;

            try {
                const parsed = JSON.parse(jsonStr);
                const nudges = parsed.nudges || [];
                console.log(`✅ [ArcusAI] Detected ${nudges.length} nudges`);
                return nudges;
            } catch (err) {
                console.error('💥 [ArcusAI] Failed to parse nudge JSON:', err.message, '\nResponse was:', content);
                return [];
            }
        } catch (error) {
            console.error('💥 [ArcusAI] Error in analyzeNeedsNudge:', error);
            return [];
        }
    }

    /**
     * Detect if a message should start a mission and extract the goal
     */
    async detectMissionGoal(message, conversationHistory = []) {
        const systemPrompt = `Analyze the user's message and decide if they are asking for a concrete task (a "Mission").
A Mission is a goal that requires multiple steps, like:
- Scheduling a meeting
- Sending an intro or outreach email (arcus_outreach)
- Reviewing latest inbox activity (arcus_inbox_review)
- Following up or responding to one or more emails (arcus_auto_pilot)
- Categorizing or summarizing threads (Catch up)
- Managing a thread

Respond with strict JSON:
{
  "isMission": boolean,
  "goal": string (concise mission goal title, e.g. "Schedule Demo with Sarah"),
  "reasoning": string
}

If it's just general conversation or asking a simple question, isMission is false.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-3),
            { role: 'user', content: message }
        ];

        try {
            const response = await this.callOpenRouter(messages, {
                maxTokens: 300,
                temperature: 0.1
            });

            let content = this.extractResponse(response);
            content = content.trim();
            if (content.startsWith('```json')) content = content.replace(/^```json/, '');
            if (content.endsWith('```')) content = content.replace(/```$/, '');

            const parsed = JSON.parse(content);
            return {
                isMission: !!parsed.isMission,
                goal: parsed.goal || '',
                reasoning: parsed.reasoning || ''
            };
        } catch (e) {
            return { isMission: false, goal: '', reasoning: 'error parsing' };
        }
    }

    /**
     * Remove all em dashes from text
     */
    removeEmDashes(text) {
        if (!text || typeof text !== 'string') return text;
        return text.replace(/\u2014/g, ', ').replace(/\u2013/g, '-');
    }
    /**
     * Helper to decode base64 to text for common text types
     */
    _decodeBase64ToText(att) {
        if (!att || !att.base64) return '[Empty File]';
        
        // Try to decode text files
        let fileContent = '[Binary Data]';
        if (att.type?.includes('text') || att.type?.includes('json') || att.type?.includes('javascript') || att.type?.includes('xml')) {
            try {
                const base64Data = att.base64.split(',')[1] || att.base64;
                fileContent = Buffer.from(base64Data, 'base64').toString('utf-8');
                if (fileContent.length > 5000) fileContent = fileContent.substring(0, 5000) + '... [truncated]';
            } catch (e) {
                fileContent = '[Error decoding file]';
            }
        }
        return `[Attached File: ${att.name} (${att.type})]\nContent:\n${fileContent}`;
    }
}

// Export singleton instance
export const arcusAI = new ArcusAIService();
