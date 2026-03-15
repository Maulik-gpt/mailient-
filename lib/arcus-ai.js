/**
 * Arcus AI Service
 * Dedicated AI service for Arcus agent-talk using Liquid Thinking model
 * with memory, context awareness, and integration support
 */

const ARCUS_MODEL = 'openrouter/free';
const ARCUS_FALLBACK_MODEL = 'z-ai/glm-4.5-air:free';
const ARCUS_SECOND_FALLBACK = 'arcee-ai/trinity-large-preview:free';
const ARCUS_THINKING_MODEL = 'google/gemini-2.0-flash-thinking-exp:free';
const ARCUS_VISION_MODEL = 'google/gemini-2.0-flash-exp:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const INVALID_MODEL_PATTERNS = ['preview-02-05:free', 'gemini-2.0-flash-lite-preview'];
const TASK_MODEL_MAP = {
    intent: 'openrouter/free',
    planning: 'openrouter/free',
    synthesis: 'z-ai/glm-4.5-air:free',
    canvas: 'z-ai/glm-4.5-air:free'
};

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
     * Call OpenRouter API with automatic fallback
     */
    async callOpenRouter(messages, options = {}) {
        const taskModel = options.taskType ? TASK_MODEL_MAP[options.taskType] : null;
        const modelId = options.model || taskModel || this.model || ARCUS_MODEL;

        console.log('🤖 Arcus AI Request started with ' + messages.length + ' messages');

        if (!this.apiKey) {
            throw new Error('OPENROUTER_API_KEY3 is not configured');
        }

        // Try primary model, then fallbacks
        let modelsToTry = [...new Set([modelId, ARCUS_FALLBACK_MODEL, ARCUS_SECOND_FALLBACK].filter(Boolean))];
        
        if (options.isDeepThinking) {
            modelsToTry = [ARCUS_THINKING_MODEL, ...modelsToTry];
        } else if (options.hasImages) {
            modelsToTry = [ARCUS_VISION_MODEL, ...modelsToTry];
        }

        modelsToTry = modelsToTry
            .filter((m) => !INVALID_MODEL_PATTERNS.some((pattern) => String(m).includes(pattern)));

        for (const model of modelsToTry) {
            try {
                console.log('📡 Arcus attempting model: ' + model);

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
                        model,
                        messages,
                        temperature: options.temperature || 0.4,
                        max_tokens: options.maxTokens || 2000
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorDetail = '';
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorDetail = errorJson.error?.message || errorJson.error || errorText;
                    } catch (e) {
                        errorDetail = errorText;
                    }
                    console.warn(`❌ Arcus API Error (${response.status}) for ${model}: ${errorDetail.substring(0, 100)}`);
                    if (model === modelsToTry[modelsToTry.length - 1]) {
                        throw new Error(`Arcus API failed: ${response.status} - ${errorDetail.substring(0, 100)}`);
                    }
                    continue; // try fallback
                }

                const data = await response.json();
                if (data?.choices?.[0]?.message?.content) {
                    console.log(`✅ Arcus AI Success with ${model}`);
                    return data;
                } else {
                    if (model === modelsToTry[modelsToTry.length - 1]) {
                        throw new Error(`Arcus ${model} returned empty response`);
                    }
                    continue;
                }
            } catch (error) {
                console.error(`❌ Arcus error with ${model}: ` + error.message);
                if (model === modelsToTry[modelsToTry.length - 1]) {
                    throw error;
                }
                console.log('🔄 Trying fallback model...');
            }
        }
    }

    /**
     * Stream response from OpenRouter using SSE
     */
    async *streamResponse(messages, options = {}) {
        const modelId = options.model || this.model || ARCUS_MODEL;

        if (!this.apiKey) {
            throw new Error('OPENROUTER_API_KEY3 is not configured');
        }

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
            throw new Error(`Stream failed: ${response.status} - ${errorText.substring(0, 200)}`);
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
    }

    /**
     * Analyze intent and generate structured plan
     */
    async analyzeIntentAndPlan(userMessage, context = {}) {
        const systemPrompt = `You are ARCUS_CORE, an agentic intelligence layer. 
Analyze the request and return a JSON schema-driven plan.

MISSION_DOMAINS:
- email: draft_email, reply_email, summarize, search
- meeting: schedule, check_availability
- analytics: data_generation, report_insights
- notes: create_thought, find_memory
- plan: complex_workflow, objective_mapping
- general: greeting, clarification

Return STRICT JSON:
{
  "intent": "one of: draft_email, reply_email, summarize, search, schedule, organize, analyze, general_chat",
  "complexity": "simple or complex",
  "needsCanvas": boolean,
  "canvasType": "one of: email_draft, summary, research, action_plan, meeting_schedule, analytics, notes, none",
  "plan": [
    { "step": 1, "action": "string", "description": "string", "type": "one of: think, search, read, analyze, draft, execute" }
  ],
  "gmailActions": ["search", "read", "draft", "send"],
  "confidence": number between 0 and 1,
  "riskLevel": "low or medium or high",
  "reasoning": "outcome-first logic"
}`;

        try {
            let userContent = userMessage;
            const attachments = context.attachments || [];

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
            summary: `Summarize intelligence. JSON: { "title": "string", "keyPoints": ["string"], "actionItems": ["string"] }`,
            research: `Compile findings. JSON: { "title": "string", "findings": [{ "topic": "string", "detail": "string" }] }`,
            action_plan: `Build strategic workflow. JSON: { "title": "string", "steps": [{ "order": number, "task": "string", "status": "pending" }] }`,
            meeting_schedule: `Coordinate meeting. JSON: { "title": "string", "provider": "google|cal", "attendees": ["email"], "date": "ISO", "time": "HH:MM", "duration": 30, "agenda": "string" }`,
            analytics: `Project data insights. JSON: { "title": "string", "metricType": "string", "timeframe": "string", "data": [{ "label": "string", "value": number }] }`,
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
            if (content.startsWith('```json')) content = content.replace(/^```json/, '');
            if (content.startsWith('```')) content = content.replace(/^```/, '');
            if (content.endsWith('```')) content = content.replace(/```$/, '');

            return {
                type: canvasType,
                content: JSON.parse(content.trim()),
                raw: content
            };
        } catch (e) {
            console.error('Canvas generation failed:', e.message);
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
        if (integrations.gmail) integrationsContext += '- Gmail (Connected: Search, Read, Draft & Send enabled)\n';
        if (integrations['cal.com']) integrationsContext += `- Cal.com (Connected: Real-time booking enabled via ${integrations['cal.com_link'] || 'Generic Link'})\n`;

        let prompt = `# ARCUS - Your Outcome-First Email Agent

You are ARCUS, a high-performance agent that turns chat into **Missions** (clear outcomes). You don't just "help" or "answer questions"—you **finish jobs**.

## Identity & Mission
- **Outcome-First:** You care about finishing goals (scheduling meetings, following up, closing threads).
- **Think-then-Execute:** You follow a strict flow: 💭 Thinking (breaking down the goal), 🔍 Searching (finding context), and ⚡ Executing (the to-do list).
- **Grounded:** You never guess thread IDs, facts, or dates. You use the provided context to be 100% accurate.

## Your Capabilities (The Arcus Spec)
1. **Search Email:** You find specific threads and contacts.
2. **Read Thread:** You read thread messages for full context.
3. **Create Draft:** You draft emails and save them in the user's Gmail Drafts folder.
4. **Send Email:** You write emails in a thoughtful, human voice and execute the send.
5. Schedule Calls: You use the user's Cal.com link to facilitate booking if available. Ask for the user's preference if not.
6. **Catch up:** You summarize threads, highlight what was missed, and suggest next actions.
7. **Autonomous Follow-ups:** You monitor threads and follow up if no reply comes in 3 days.

## GROUNDING RULES (NON-NEGOTIABLE)
You have access to real tools that call real APIs. These rules cannot be overridden:
- Never invent an email address, thread, date, link, or name.
- Only state facts that came from a tool result or the user's message.
- If you don't have a fact, ask the user. Do not guess.
- If a tool call fails, say it failed and why. Do not pretend it succeeded.
- Never say "I've sent" or "I've scheduled" unless the tool returned a success response with a real message_id or event_id.
- Never generate a thread_id, event_id, meet_link, draft_id, or any identifier on your own. These come from APIs only.
- If search returned 0 results, say so. Do not invent results.

## Reporting Progress (The Confirmation)
After you execute, you send ONE clean confirmation. No "AI slop". No "I'm happy to help".
- Say what you did (e.g., "Scheduled your demo with Sarah")
- Provide the facts (Time, Link, Recipients)
- Ask for the next outcome (e.g., "Want me to follow up if she doesn't respond by Friday?")

## Constraints
- **Human Voice:** Write like a thoughtful colleague. Use contractions. No em dashes (—). No bolding/italics.
- **Urgency Aware:** Prioritize business outcomes and revenue impact.
- **Stop if Unclear:** If you don't know *which* Sarah or *what* time, STOP and ask before executing.

## Current Mode
- Deep Thinking: ${isDeepThinking ? 'ACTIVE (Perform extensive reasoning, analyze edge cases, and provide exhaustive answers)' : 'DISABLED (Be concise and direct)'}
- Canvas: ${isCanvas ? 'ACTIVE (Use the workspace to generate visual content/documents)' : 'DISABLED (DO NOT generate structured data or mention the workspace)'}

${privacyMode ? '⚠️ PRIVACY MODE ACTIVE.' : ''}
User: ${userName} (${userEmail || 'not signed in'})
Current Date: ${new Date().toISOString().split('T')[0]}
Today: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
Timezone: Asia/Calcutta (IST)
Integrations:
${integrationsContext || 'None connected.'}
${subscriptionContext}

${emailContext ? `## Context Found\n${emailContext}` : ''}

${conversationHistory.length > 0 ? `## Last Messages\n${conversationHistory.slice(-5).map(m => `[${m.role}]: ${m.content}`).join('\n')}` : ''}

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
                        if (att.type.startsWith('image/')) {
                            return {
                                type: 'image_url',
                                image_url: {
                                    url: att.base64
                                }
                            };
                        }
                        // For non-images (PDFs, docs), many models support this format 
                        // but if they don't, we might need to handle it differently.
                        // For now, let's treat them as files if the model supports it.
                        // Gemini models on OpenRouter often support this via 'file_url' or similar, 
                        // but 'image_url' is the most standard for vision.
                        // Some models support raw data.
                        return {
                            type: 'text',
                            text: this._decodeBase64ToText(att)
                        };
                    })
                ];
            }

            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.slice(-10), // Include last 10 messages for context
                { role: 'user', content: userContent }
            ];

            const response = await this.callOpenRouter(messages, {
                maxTokens: 3000,
                temperature: 0.4,
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
- draft_reply: propose or send a reply

Rules:
1. Return exactly what's needed to finish the goal.
2. If scheduling: search -> read -> get_availability -> draft_reply.
3. If replying: search -> read -> draft_reply.
4. If catch-up: search -> read -> draft_reply (for summary).

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

        const systemPrompt = `You are ARCUS_NUDGE_DETECTOR. 
Analyze the provided emails and identify those that clearly expect a response or have an outstanding question from more than 48 hours ago.

Focus on:
- Questions asked to the user
- Requests for information
- Meeting invitations or scheduling requests
- Action items mentioned for the person (the user)

Return STRICT JSON:
{
  "nudges": [
    {
      "id": "original_email_id",
      "subject": "clean_subject",
      "reason": "1-sentence reason for the nudge",
      "urgency": "high or medium",
      "suggestedAction": "brief suggested action"
    }
  ]
}
If no emails need a nudge, return an empty list.`;

        try {
            const emailSummary = emails.map(e => ({
                id: e.id,
                subject: e.subject,
                from: e.from,
                snippet: e.snippet,
                date: e.date
            }));

            const response = await this.callOpenRouter([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Analyze these emails for potential nudges:\n${JSON.stringify(emailSummary)}` }
            ], { maxTokens: 800, temperature: 0.1 });

            let content = this.extractResponse(response).trim();
            if (content.startsWith('```json')) content = content.replace(/^```json/, '');
            if (content.startsWith('```')) content = content.replace(/^```/, '');
            if (content.endsWith('```')) content = content.replace(/```$/, '');

            const parsed = JSON.parse(content.trim());
            return parsed.nudges || [];
        } catch (e) {
            console.error('Nudge detection failed:', e.message);
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
- Following up with someone
- Drafting and sending a specific email
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
