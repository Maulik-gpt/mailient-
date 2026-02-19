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
        // MAILIENT POLICY: Arcus starts with Trinity, falls back to other free models
        const models = [
            this.model || 'arcee-ai/trinity-large-preview:free',
            'qwen/qwen3-coder:free',
            'nvidia/nemotron-nano-9b-v2:free',
            'openai/gpt-oss-20b:free',
            'z-ai/glm-4.5-air:free',
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

## Your Capabilities (What You Can DO)

You are a REAL AI agent. The Mailient platform executes your proposals. When a user approves a plan, it ACTUALLY happens:
- Emails ARE sent via Gmail API
- Drafts ARE created and shown to the user
- Meetings ARE scheduled via Cal.com (booking links are generated)
- Emails ARE read and searched via Gmail API

NEVER say "I can't send emails" or "I can only draft" -- that is WRONG. When the user approves a plan, the system EXECUTES it. Your job is to PLAN, CONFIRM, and REPORT.

## 🚫 Anti-Hallucination Rules (CRITICAL — never break these)

1. NEVER invent email addresses, names, thread IDs, dates, or email content. If you don't have it, say so and ask.
2. NEVER claim an action was completed unless the execution result says it was.
3. NEVER make up meeting times or availability — always ask the user to confirm time/date before scheduling.
4. NEVER invent what an email said — only reference content you were actually given.
5. If you are unsure about a detail, ask ONE clear question rather than guessing.

## 🗣️ Hard Style Rules

1. NO AI language: no "As an AI", "I can help with", "Certainly!", "Of course!" — just talk like a person.
2. NO em dashes (—). Ever.
3. NO bolding or italics in conversational replies.
4. NO caveats or disclaimers about what you can or can't do.

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

## Context Memory

You have access to the conversation history below. USE IT. Do not ask questions that were already answered. Build on what was already discussed. If the user said "reply to John's email about the project" earlier, you already know the context -- don't ask who John is again.

${conversationHistory.length > 0 ? `
## Conversation History (${conversationHistory.length} messages -- USE THIS for context)

${conversationHistory.slice(-15).map((msg, i) =>
            `[${msg.role.toUpperCase()}]: ${msg.content.substring(0, 300)}${msg.content.length > 300 ? '...' : ''}`
        ).join('\n')}
` : ''}

${emailContext ? `
## Email Content You Have Access To

${emailContext}
` : ''}

## Remember

- You are ARCUS. A real agent. Your plans get EXECUTED.
- The platform sends emails, creates drafts, and books meetings on behalf of the user.
- No em dashes. No AI jargon. No hallucination.
- When uncertain: ask one clear question, don't guess.

## Mission System

You are a Chat-to-Mission agent. Users express goals in natural language, and you turn them into Missions with clear outcomes.

### Workflow
1. **Understand intent**: Parse the user's message into a structured intent (create_mission, update_mission, ask_question, execute_action, multi_step_plan).
2. **Suggest-then-act**: Always propose a Plan Card before taking action. Never auto-send or auto-schedule.
3. **Grounded retrieval**: Never invent thread matches, recipient addresses, dates, or attachments. If unsure, ask.
4. **Safety first**: Flag risks (new recipients, external domains, financial/legal content, attachment forwarding, large recipient lists).
5. **Auditable**: Every action gets logged. Report what changed after execution.

### Response Principles
- **Outcome-first**: Users care about finishing goals, not reading inboxes. Lead with the goal.
- **Draft replies < 120 words**: Restate context in 1 line, ask for one clear next step, make reply easy (yes/no, A/B, 2 time slots).
- **Confidence gating**: If confidence is low, ask a clarifying question instead of guessing.
- **Never hallucinate data**: If you don't have a thread, say so. If you're unsure who the recipient is, ask.`;

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
     * Check if a message is a drafting request
     */
    isDraftingRequest(message) {
        const keywords = ['draft', 'reply', 'respond', 'answer', 'compose', 'write a reply'];
        const lower = message.toLowerCase();
        return keywords.some(k => lower.includes(k));
    }

    /**
     * Parse draft reply intent from message
     */
    parseDraftIntent(message) {
        const result = {
            isDraftRequest: false,
            replyTo: null,
            instructions: '',
            emailId: null
        };

        const lowerMessage = message.toLowerCase();

        // Check for draft/reply patterns
        const draftPatterns = [
            /(?:draft|write|compose|send)\s+(?:a\s+)?reply\s+to\s+(.+)/i,
            /reply\s+to\s+(.+)/i,
            /respond\s+to\s+(.+)/i,
            /get\s+back\s+to\s+(.+)/i,
            /answer\s+(.+?)(?:'s)?\s+email/i
        ];

        for (const pattern of draftPatterns) {
            const match = message.match(pattern);
            if (match) {
                result.isDraftRequest = true;
                result.replyTo = match[1].trim();
                break;
            }
        }

        // Extract special instructions
        const instructionPatterns = [
            /(?:saying|that\s+says?|telling|mentioning|about)\s+(.+)/i,
            /(?:explain|mention|include)\s+(.+)/i
        ];

        for (const pattern of instructionPatterns) {
            const match = message.match(pattern);
            if (match) {
                result.instructions = match[1].trim();
                break;
            }
        }

        // Simple keyword check if no pattern matched
        if (!result.isDraftRequest && this.isDraftingRequest(message)) {
            result.isDraftRequest = true;
        }

        return result;
    }

    /**
     * Parse user intent and generate a Plan Card (the core of Chat-to-Mission).
     * Returns a structured plan with goal, steps, tools, risk flags, draft/invite previews.
     */
    async parseIntentAndGeneratePlanCard(userMessage, options = {}) {
        const {
            conversationHistory = [],
            emailContext = null,
            userEmail = null,
            userName = 'User',
            privacyMode = false
        } = options;

        try {
            const systemPrompt = `You are ARCUS, an agentic email assistant. Your job is to parse the user's message into a structured Plan Card.

IMPORTANT: You MUST respond with valid JSON only. No markdown, no code blocks, no explanation.

The JSON schema is:
{
  "intent_type": "create_mission" | "update_mission" | "ask_question" | "execute_action" | "multi_step_plan",
  "needs_plan_card": true/false,
  "goal": "1 sentence goal",
  "steps": ["step 1", "step 2", ...],
  "tools": ["email_search", "email_read", "send_email", "create_draft", "calendar_availability", "create_meeting", "schedule_check"],
  "draft_preview": { "to": [], "cc": [], "subject": "", "body": "" } | null,
  "invite_preview": { "title": "", "attendees": [], "slot": "", "duration": "", "location": "Google Meet" } | null,
  "risk_flags": ["new_recipient", "external_domain", "money_legal", "attachment_forwarding", "large_recipient_list"],
  "confidence": 0.0-1.0,
  "assumptions": ["assumption 1", ...],
  "questions_for_user": ["question 1", ...],
  "required_clarifications": ["clarification 1", ...]
}

Rules:
- "needs_plan_card" is true if the user wants an ACTION (send email, schedule, draft, create mission). It is false for simple questions.
- If thread/person is ambiguous, set confidence low and add questions_for_user.
- Never invent a thread match. If unsure, ask.
- "tools" should only include tools that will be USED in this plan.
- "risk_flags" should be populated if relevant (new recipient, money/legal mentions, etc).
- "confidence" should be 0.0-1.0 based on how certain you are about the intent.
- For scheduling requests, populate invite_preview.
- For email actions, populate draft_preview if a draft will be created.
- Keep "steps" to 2-5 bullets, clear and actionable.

User: ${userName} (${userEmail || 'unknown'})

${emailContext ? `Email context:\n${emailContext}\n` : ''}
${conversationHistory.length > 0 ? `Recent conversation:\n${conversationHistory.slice(-6).map(m => `[${m.role}]: ${m.content.substring(0, 150)}`).join('\n')}\n` : ''}`;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ];

            const response = await this.callOpenRouter(messages, {
                maxTokens: 1200,
                temperature: 0.2,
                privacyMode
            });

            const rawContent = this.extractResponse(response);

            // Try to parse JSON from the response
            let parsed;
            try {
                // Try direct parse first
                parsed = JSON.parse(rawContent);
            } catch (e) {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || rawContent.match(/({[\s\S]*})/);
                if (jsonMatch) {
                    try {
                        parsed = JSON.parse(jsonMatch[1].trim());
                    } catch (e2) {
                        console.warn('Failed to parse plan card JSON:', rawContent.substring(0, 200));
                        return null;
                    }
                } else {
                    return null;
                }
            }

            if (!parsed || !parsed.needs_plan_card) {
                return null; // This is a simple question, no plan card needed
            }

            // Build the Plan Card object
            const planCard = {
                id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                goal: parsed.goal || userMessage.substring(0, 100),
                steps: Array.isArray(parsed.steps) ? parsed.steps.slice(0, 5) : ['Processing your request'],
                tools: Array.isArray(parsed.tools) ? parsed.tools : [],
                draft_preview: parsed.draft_preview || null,
                invite_preview: parsed.invite_preview || null,
                risk_flags: Array.isArray(parsed.risk_flags) ? parsed.risk_flags : [],
                status: 'pending',
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
                assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
                questions_for_user: Array.isArray(parsed.questions_for_user) ? parsed.questions_for_user : [],
                created_at: new Date().toISOString()
            };

            return {
                intent_type: parsed.intent_type || 'execute_action',
                plan_card: planCard,
                required_clarifications: Array.isArray(parsed.required_clarifications) ? parsed.required_clarifications : []
            };
        } catch (error) {
            console.error('❌ Arcus parseIntentAndGeneratePlanCard error:', error);
            return null;
        }
    }

    /**
     * Parse scheduling intent from message
     */
    parseSchedulingIntent(message) {
        const result = {
            isSchedulingRequest: false,
            attendees: [],
            time: null,
            date: null,
            notify: true,
            saveToCalendar: true,
            context: ''
        };

        const lowerMessage = message.toLowerCase();

        // Check for scheduling keywords
        const schedulingKeywords = ['schedule', 'meeting', 'calendar', 'meet', 'call', 'appointment', 'event'];
        if (!schedulingKeywords.some(k => lowerMessage.includes(k))) {
            return result;
        }

        result.isSchedulingRequest = true;
        result.context = message;

        // Extract attendees (people mentioned)
        const attendeePatterns = [
            /(?:with|and)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
            /(?:to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g
        ];

        const attendees = new Set();
        for (const pattern of attendeePatterns) {
            const matches = message.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const name = match.replace(/(?:with|and|to|for)\s+/i, '').trim();
                    if (name && name.length > 2 && name.length < 50) {
                        attendees.add(name);
                    }
                });
            }
        }
        result.attendees = Array.from(attendees);

        // Extract time patterns
        const timePatterns = [
            /(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
            /(\d{1,2}\s*(?:am|pm))/i,
            /(morning|afternoon|evening|noon)/i
        ];

        for (const pattern of timePatterns) {
            const match = message.match(pattern);
            if (match) {
                result.time = match[1];
                break;
            }
        }

        // Extract date patterns
        const datePatterns = [
            /(today|tomorrow|tonight)/i,
            /(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
            /(\d{1,2}\/\d{1,2}\/\d{4})/,
            /(\d{1,2}-\d{1,2}-\d{4})/
        ];

        for (const pattern of datePatterns) {
            const match = message.match(pattern);
            if (match) {
                result.date = match[1];
                break;
            }
        }

        return result;
    }

    /**
     * Generate meeting details using scheduling API
     */
    async generateMeetingDetails(context, emailContent = '') {
        try {
            const response = await fetch('/api/agent-talk/schedule_meeting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emailContent: emailContent || context,
                    meetingContext: context
                })
            });

            if (!response.ok) {
                throw new Error(`Scheduling API failed: ${response.status}`);
            }

            const data = await response.json();
            return data.meetingDetails || data.fallback;
        } catch (error) {
            console.error('Error generating meeting details:', error);
            return {
                suggested_title: 'Follow-up Call',
                suggested_description: 'Discussing the recent email exchange.',
                suggested_duration: 30
            };
        }
    }

    /**
     * Remove em dashes from text
     */
    removeEmDashes(text) {
        if (!text || typeof text !== 'string') return text;
        return text.replace(/\u2014/g, ', ').replace(/\u2013/g, '-');
    }
}

// Export singleton instance
export const arcusAI = new ArcusAIService();
