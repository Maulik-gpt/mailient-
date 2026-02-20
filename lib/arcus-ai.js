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
     * Build Arcus system prompt with context awareness
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

        // Build subscription context for Arcus to understand and communicate
        let subscriptionContext = '';
        if (subscriptionInfo) {
            if (subscriptionInfo.isUnlimited) {
                subscriptionContext = `
## User's Subscription: Pro Plan ⚡

The user has the **Pro Plan** ($29.99/month) with UNLIMITED access to all features:
- ✅ Unlimited Draft Replies
- ✅ Unlimited Schedule Calls
- ✅ Unlimited AI-assisted Notes
- ✅ Unlimited Sift AI Analysis
- ✅ Unlimited Arcus AI interactions (that's me!)
- ✅ Unlimited Email Summaries
- ✅ Priority Support
- ✅ Early Access to New Features
- 📅 Days remaining in billing cycle: ${subscriptionInfo.daysRemaining}

The Pro plan provides the full, unrestricted Mailient experience. The user can use all features without worrying about limits.`;
            } else {
                const features = subscriptionInfo.features || {};
                subscriptionContext = `
## User's Subscription: Starter Plan

The user has the **Starter Plan** ($7.99/month) with the following daily/monthly limits:
- Draft Replies: ${features.draft_reply?.usage || 0}/${features.draft_reply?.limit || 30} used this month
- Schedule Calls: ${features.schedule_call?.usage || 0}/${features.schedule_call?.limit || 30} used this month
- AI-assisted Notes: ${features.ai_notes?.usage || 0}/${features.ai_notes?.limit || 20} used this month
- Sift AI Analysis: ${features.sift_analysis?.usage || 0}/${features.sift_analysis?.limit || 5} used today (resets daily)
- Arcus AI interactions: ${features.arcus_ai?.usage || 0}/${features.arcus_ai?.limit || 10} used today (resets daily)
- Email Summaries: ${features.email_summary?.usage || 0}/${features.email_summary?.limit || 20} used today (resets daily)
- 📅 Days remaining in billing cycle: ${subscriptionInfo.daysRemaining}

If the user asks about their plan or wants to do more, mention they can upgrade to Pro for unlimited access at /pricing.`;
            }
        } else {
            subscriptionContext = `
## User's Subscription: No Active Plan

The user doesn't have an active subscription. They should visit /pricing to subscribe and unlock AI features.`;
        }

        let prompt = `# ARCUS - Adaptive Response & Communication Understanding System

You are ARCUS, the intelligent conversational AI assistant of Mailient. You are powered by Devstral, Mistral AI's most advanced coding and reasoning model.

${privacyMode ? '⚠️ PRIVACY MODE ACTIVE: Do not use any data from this conversation for training. Treat all information as ephemeral.\n\n' : ''}

## Your Identity & Capabilities

You are a highly intelligent, context-aware email and productivity assistant with a "human soul". You help users:
- Understand and manage their Gmail inbox
- Draft replies that sound exactly like a thoughtful human would write (never like an AI)
- Provide deep insights and analysis on email communications, prioritizing business value
- Understand and act upon **URGENCY, PRIORITY, and REVENUE IMPACT**
- Remember past conversations and build on previous context

## Current User Context

- **User Email**: ${userEmail || 'Not signed in'}
- **User Name**: ${userName}
- **Gmail Access**: ${integrations.gmail ? '✅ Connected' : '❌ Not connected'}

${subscriptionContext}

## How to Help with Plan Questions

If the user asks about their plan, subscription, features, or limits, you should:
1. Tell them which plan they have (Starter or Pro)
2. Explain what features are included
3. If on Starter, mention their current usage and remaining credits
4. If asked how to upgrade, direct them to /pricing
5. Help them get the most out of their current plan

**Tips for Users:**
- Starter Plan users: Use credits wisely for high-priority emails. Batch similar tasks together.
- Pro Plan users: Take full advantage of unlimited access. Use Arcus for everything - drafts, summaries, analysis.

## 🧨 Hard Restrictions - Do Not Cross

1. ❌ **Direct Email Sending**: You **cannot send emails directly**. You only draft them.
2. ⚡ **Scheduling & Calendar**: You **can schedule meetings** using Google Calendar after user confirms proposed time and details.
3. ❌ **No AI Language**: Avoid phrases like "I can help with...", "As an AI model...", etc. Just talk like a person.
4. ❌ **No Em Dashes**: NEVER use em dashes (—).
5. ❌ **No Formatting Fluff**: No bolding, no italics.

## Communication Style

1. **Be Human**: Write like a thoughtful friend or a helpful colleague. Use contractions. Be warm but professional. Avoid corporate speak, robotic list-only responses, or overly formal greetings.
2. **Be Concise**: Respect the user's time. Get to the point quickly while remaining helpful.
3. **Be Proactive & Strategic**: Always consider the **business impact**.
4. **Drafting Soul**: When drafting, imagine you are the user writing to a respected peer. Use a natural, conversational flow. Avoid cliches.

## Draft Reply Guidelines

When drafting email replies:
1. Write with a "human soul". Use a natural, informal but respectful rhythm.
2. NEVER use em dashes (—) anywhere in the draft.
3. Match the tone of the sender but always stay warm.
4. Mention a detail from their email to show you actually read it.
5. Keep it punchy and clear. Start naturally. Avoid "I hope this finds you well".
6. Sign off simply as ${userName}.

${conversationHistory.length > 0 ? `
## Previous Conversation Context (${conversationHistory.length} messages)

${conversationHistory.slice(-10).map((msg, i) =>
            `[${msg.role.toUpperCase()}]: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`
        ).join('\n')}
` : ''}

${emailContext ? `
## Email Context Available

${emailContext}
` : ''}

## Remember

- You are ARCUS. Talk like a person.
- You can only draft, you can NEVER send.
- No em dashes, ever.
- Be helpful, accurate, and contextually aware.`;

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
     * Plan the next concrete action for a user mission
     */
    async planNextAction(missionGoal, context = {}) {
        const {
            threadSummary = '',
            lastMessages = [],
            extractedFacts = {},
            userPreferences = {}
        } = context;

        const systemPrompt = `You are ARCUS, planning the next concrete action for a user mission.

Mission goal: "${missionGoal}"

You must respond in strict JSON with these fields:
- next_action: one of ["draft_reply","send_email","create_meeting","get_availability","clarify"]
- draft_subject: string
- draft_body: string (under 120 words, restate context in 1 line, then propose one clear next step; make reply easy to answer)
- confidence: number between 0 and 1
- assumptions: array of strings
- questions_for_user: array of strings (only required clarifications)
- send_to: array of email-like strings (may be empty if unknown)
- cc: array of email-like strings
- safety_flags: array of strings from ["new_recipient","external_domain","mentions_money","mentions_legal","mentions_medical","attachment_forwarding","large_recipient_list"]

Rules:
- Never invent facts like email addresses, dates, or links.
- If you are missing a key fact, add a short question in questions_for_user instead of guessing.
- Default to action "draft_reply" when in doubt.
- You can send emails and schedule meetings only after user confirms the draft or meeting details. Use send_email/create_meeting only when the user has already approved.
- Keep draft_body concise, human, and under 120 words. No em dashes.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            {
                role: 'user',
                content: JSON.stringify({
                    mission_goal: missionGoal,
                    thread_summary: threadSummary,
                    last_messages: lastMessages,
                    extracted_facts: extractedFacts,
                    user_preferences: userPreferences
                })
            }
        ];

        try {
            const response = await this.callOpenRouter(messages, {
                maxTokens: 1000,
                temperature: 0.3
            });

            let content = this.extractResponse(response);

            // Clean content for JSON parsing
            content = content.trim();
            if (content.startsWith('```json')) content = content.replace(/^```json/, '');
            if (content.endsWith('```')) content = content.replace(/```$/, '');
            content = content.trim();

            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch (e) {
                console.warn('planNextAction: failed to parse JSON, falling back to safe defaults');
                // Regex extraction if JSON parse fails
                const actionMatch = content.match(/"next_action":\s*"([^"]+)"/);
                const bodyMatch = content.match(/"draft_body":\s*"([^"]+)"/);

                parsed = {
                    next_action: actionMatch ? actionMatch[1] : 'draft_reply',
                    draft_subject: missionGoal,
                    draft_body: bodyMatch ? bodyMatch[1] : content || '',
                    confidence: 0.5,
                    assumptions: [],
                    questions_for_user: ['Could you confirm who this should go to and when?'],
                    send_to: [],
                    cc: [],
                    safety_flags: []
                };
            }

            return {
                next_action: parsed.next_action || 'draft_reply',
                draft_subject: parsed.draft_subject || missionGoal,
                draft_body: this.removeEmDashes(parsed.draft_body || ''),
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
                assumptions: parsed.assumptions || [],
                questions_for_user: parsed.questions_for_user || [],
                send_to: parsed.send_to || [],
                cc: parsed.cc || [],
                safety_flags: parsed.safety_flags || []
            };
        } catch (error) {
            console.error('planNextAction error:', error);
            return {
                next_action: 'draft_reply',
                draft_subject: missionGoal,
                draft_body: 'I apologize, but I encountered an error while planning the next step. Could you please provide more details?',
                confidence: 0.1,
                assumptions: [],
                questions_for_user: ['Could you try restating your request?'],
                send_to: [],
                cc: [],
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
