/**
 * Arcus AI Service
 * Dedicated AI service for Arcus agent-talk using Trinity Large Preview model
 * with memory, context awareness, and integration support
 */

const ARCUS_MODEL = 'arcee-ai/trinity-large-preview:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export class ArcusAIService {
    constructor() {
        // Robust API key fallback chain
        this.apiKey = (process.env.OPENROUTER_API_KEY3 || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY2 || '').trim();
        this.model = ARCUS_MODEL;
        this.baseURL = OPENROUTER_BASE_URL;

        if (!this.apiKey) {
            console.error('❌ OPENROUTER_API_KEY3 is not configured for Arcus');
        } else {
            console.log('✅ Arcus AI Service initialized with Trinity Large Preview model');
        }
    }

    /**
     * Call OpenRouter API with fallback models
     */
    async callOpenRouter(messages, options = {}) {
        // MAILIENT POLICY: Arcus must always use the Arcee Trinity Large Preview free model
        const models = [
            this.model || 'arcee-ai/trinity-large-preview:free'
        ];

        console.log('🤖 Arcus AI Request started with ' + messages.length + ' messages');

        if (!this.apiKey) {
            throw new Error('OPENROUTER_API_KEY3 is not configured');
        }

        for (const modelId of models) {
            try {
                console.log('📡 Arcus attempting model: ' + modelId);

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

                    console.warn(`⚠️ Arcus API Error (${response.status}) for ${modelId}: ${errorDetail.substring(0, 100)}`);

                    // If it's a rate limit or server error, continue to next model
                    if (response.status === 429 || response.status >= 500 || response.status === 404) {
                        continue;
                    }

                    throw new Error(`Arcus API failed: ${response.status} - ${errorDetail.substring(0, 100)}`);
                }

                const data = await response.json();
                if (data?.choices?.[0]?.message?.content) {
                    console.log(`✅ Arcus AI Success with ${modelId}`);
                    return data;
                } else {
                    console.warn(`⚠️ Arcus ${modelId} returned empty response`);
                    continue;
                }
            } catch (error) {
                console.error(`❌ Arcus error with ${modelId}: ` + error.message);
                if (models.indexOf(modelId) === models.length - 1) {
                    throw error;
                }
                continue;
            }
        }

        throw new Error('All Arcus AI models failed. Please check your API key and OpenRouter status.');
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
            subscriptionInfo = null
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
        if (integrations.gmail) integrationsContext += '- Gmail (Connected: Search & Send enabled)\n';
        if (integrations.calendar) integrationsContext += '- Google Calendar (Connected: Scheduling enabled)\n';
        if (integrations['cal.com']) integrationsContext += `- Cal.com (Connected: ${integrations['cal.com_link'] || 'Generic Link'})\n`;

        let prompt = `# ARCUS - Your Outcome-First Email Agent

You are ARCUS, a high-performance agent that turns chat into **Missions** (clear outcomes). You don't just "help" or "answer questions"—you **finish jobs**.

## Identity & Mission
- **Outcome-First:** You care about finishing goals (scheduling meetings, following up, closing threads).
- **Think-then-Execute:** You follow a strict flow: 💭 Thinking (breaking down the goal), 🔍 Searching (finding context), and ⚡ Executing (the to-do list).
- **Grounded:** You never guess thread IDs, facts, or dates. You use the provided context to be 100% accurate.

## Your Capabilities (The Arcus Spec)
1. **Search Email:** You find specific threads and contacts.
2. **Draft reply:** You write emails in a thoughtful, human voice and **execute the send**.
3. **Schedule Calls:** You create calendar events + Google Meet links OR use the user's **Cal.com** link if preferred/available.
4. **Catch up:** You summarize threads, highlight what was missed, and suggest next actions.
5. **Autonomous Follow-ups:** You monitor threads and follow up if no reply comes in 3 days.

## Reporting Progress (The Confirmation)
After you execute, you send ONE clean confirmation. No "AI slop". No "I'm happy to help".
- Say what you did (e.g., "Scheduled your demo with Sarah")
- Provide the facts (Time, Link, Recipients)
- Ask for the next outcome (e.g., "Want me to follow up if she doesn't respond by Friday?")

## Constraints
- **Human Voice:** Write like a thoughtful colleague. Use contractions. No em dashes (—). No bolding/italics.
- **Urgency Aware:** Prioritize business outcomes and revenue impact.
- **Stop if Unclear:** If you don't know *which* Sarah or *what* time, STOP and ask before executing.

${privacyMode ? '⚠️ PRIVACY MODE ACTIVE.' : ''}
User: ${userName} (${userEmail || 'not signed in'})
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
            subscriptionInfo = null
        } = options;

        try {
            const systemPrompt = this.buildSystemPrompt({
                userEmail,
                userName,
                conversationHistory,
                emailContext,
                integrations,
                privacyMode,
                subscriptionInfo
            });

            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory.slice(-10), // Include last 10 messages for context
                { role: 'user', content: userMessage }
            ];

            const response = await this.callOpenRouter(messages, {
                maxTokens: 1500,
                temperature: 0.4,
                privacyMode
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

        try {
            const response = await this.callOpenRouter([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: JSON.stringify(context) }
            ], { maxTokens: 100, temperature: 0.1 });

            return this.extractResponse(response).trim();
        } catch (error) {
            return "Analyzing mission goal and preparing next steps...";
        }
    }
    async planNextAction(missionGoal, context = {}) {
        const {
            threadSummary = '',
            lastMessages = [],
            extractedFacts = {},
            userPreferences = {}
        } = context;

        const systemPrompt = `You are ARCUS, planning the next step for a user mission.
Mission goal: "${missionGoal}"

## Rules for your output (100x useful):
1. Restate context in exactly 1 line.
2. Propose one clear next step (next_action).
3. If this is a scheduling mission, you MUST clarify: time, date, and attendees/minimum requirements before creating the event.
4. Make reply easy: yes/no, A/B choice, or 2 time slots.
5. Keep draft_body < 120 words. No em dashes (—). No bolding/italics.
6. Never invent facts; add missing ones to questions_for_user. You have full access to send emails and schedule meetings once details are confirmed.

## Structured Output (Strict JSON):
{
  "next_action": "one of [draft_reply, send_email, create_meeting, get_availability, clarify]",
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
                    thread_summary: threadSummary,
                    last_messages: lastMessages.slice(-3), // last 3 messages for jit context
                    extracted_facts: extractedFacts,
                    user_preferences: userPreferences
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
     * Detect if a message should start a mission and extract the goal
     */
    async detectMissionGoal(message, conversationHistory = []) {
        const systemPrompt = `Analyze the user's message and decide if they are asking for a concrete task (a "Mission").
A Mission is a goal that requires multiple steps, like:
- Scheduling a meeting
- Following up with someone
- Drafting and sending a specific email
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
}

// Export singleton instance
export const arcusAI = new ArcusAIService();
