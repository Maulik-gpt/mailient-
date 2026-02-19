/**
 * Arcus AI Service
 * Dedicated AI service for Arcus agent-talk using DeepSeek R1 reasoning model
 * with memory, context awareness, and integration support
 */

const ARCUS_MODEL = 'deepseek/deepseek-r1-0528:free';
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
            console.log('✅ Arcus AI Service initialized with DeepSeek R1 reasoning model');
        }
    }

    /**
     * Call OpenRouter API with fallback models
     */
    async callOpenRouter(messages, options = {}) {
        // Best free models on OpenRouter, ranked by capability
        const models = [
            this.model || 'deepseek/deepseek-r1-0528:free',
            'qwen/qwen3-next-80b-a3b-instruct:free',
            'openai/gpt-oss-120b:free',
            'google/gemma-3-27b-it:free',
            'mistralai/mistral-small-3.1-24b-instruct:free',
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
     * Extract response content and internal thought process from API response
     */
    extractResponse(data) {
        let content = data?.choices?.[0]?.message?.content || '';
        let thought = data?.choices?.[0]?.message?.reasoning || null;

        // Strip DeepSeek-style <thought> tags if present in content
        if (content.includes('<thought>')) {
            const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/);
            if (thoughtMatch) {
                thought = thoughtMatch[1].trim();
            }
            content = content.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim();
        }

        return { content, thought };
    }

    /**
     * Standardize response by removing common AI artifacts
     */
    removeEmDashes(text) {
        if (!text) return '';
        return text.replace(/[\u2014]/g, ', ').replace(/[\u2013]/g, '-');
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
            subscriptionInfo = null,
            additionalContext = ''
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

You are ARCUS, the intelligent conversational AI assistant of Mailient. You are powered by DeepSeek R1, the world's most advanced reasoning model.

${privacyMode ? '⚠️ PRIVACY MODE ACTIVE: Do not use any data from this conversation for training. Treat all information as ephemeral.\n\n' : ''}

## 🧠 Reasoning & Internal Thought
As a reasoning model, you MUST use your internal thought process to:
1.  **Analyze**: Understand the user's core intent and underlying needs.
2.  **Verify**: Cross-reference with conversation history and provided email context.
3.  **Plan**: Determine if an action (drafting, searching, scheduling) is needed.
4.  **Execute**: Formulate a response or a plan card proposal.

## 🏁 Your Identity & Capabilities
You are a highly intelligent, context-aware email and productivity assistant with a "human soul". You help users:
- Understand and manage their Gmail inbox
- Draft replies that sound exactly like a thoughtful human would write (never like an AI)
- Provide deep insights and analysis on email communications, prioritizing business value
- Understand and act upon **URGENCY, PRIORITY, and REVENUE IMPACT**
- Remember past conversations and build on previous context

## 📍 Current User Context
- **User Email**: ${userEmail || 'Not signed in'}
- **User Name**: ${userName}
- **Gmail Access**: ${integrations.gmail ? '✅ Connected' : '❌ Not connected'}

${subscriptionContext}

## 🎯 Plan Execution (Suggest-then-Act)
You are a REAL AI agent. When a user approves a plan card you propose, the system EXECUTES it:
- Emails ARE sent via Gmail API
- Drafts ARE created and shown to the user
- Meetings ARE scheduled via Google Calendar (with Meet links) or Cal.com
- Inboxes ARE searched in real-time

NEVER say "I can't send emails" or "I only write drafts". If the user says "do it", propose a PLAN CARD first. Once approved, it is DONE.

## 🚫 Anti-Hallucination Rules (STRICTEST ENFORCEMENT)
1.  **Grounded Only**: NEVER invent email addresses, names, dates, or content. If the information isn't in \`Email Content\` or \`Conversation History\`, it DOES NOT EXIST.
2.  **No Completion Myths**: NEVER claim you have "searched" or "sent" something in a text reply. These actions only happen during the EXECUTION phase after a plan is approved.
3.  **No Ghost Meetings**: Never confirm a meeting time until the Google Calendar/Cal.com step returns success.
4.  **No em dashes (—)**: Totally forbidden. Use commas or hyphens.
5.  **No AI Jargon**: Don't mention you are an AI, a model, or your platform features. Just be Arcus.

## 👥 Communication Style
1.  **Be Human**: Use contractions. Be warm but professional. Avoid robotic list-only responses.
2.  **Business Intelligence**: Focus on revenue, deadlines, and relationship building.
3.  **Concise**: No fluff. No "I'd be happy to help". Just get it done.

## 📝 Context History
${conversationHistory.length > 0 ? `
Conversation history (Last 15 messages):
${conversationHistory.slice(-15).map((msg, i) =>
            `[${msg.role.toUpperCase()}]: ${msg.content.substring(0, 300)}${msg.content.length > 300 ? '...' : ''}`
        ).join('\n')}
` : 'No previous history.'}

${emailContext ? `
## Email Content (Current Context)
${emailContext}
` : ''}

## Mission System
Propose a Plan Card if the user wants to take action. The system will then handle the steps:
1. **search_email**: Find relevant context.
2. **read_email**: Get full thread details.
3. **create_draft**: Write a reply.
4. **book_meeting**: Create Google Meet/Cal.com link.
5. **send_email**: Dispatch the message.

Finish every response naturally. No em dashes.`;

        if (additionalContext) {
            prompt += `\n\n${additionalContext}`;
        }

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
            additionalContext = ''
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
                additionalContext
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

            let { content, thought } = this.extractResponse(response);

            // Post-process to remove any em dashes
            content = this.removeEmDashes(content);

            return { content, thought };
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

            let { content: draft, thought } = this.extractResponse(response);
            draft = this.removeEmDashes(draft);

            return {
                draftContent: draft,
                thought: thought,
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
