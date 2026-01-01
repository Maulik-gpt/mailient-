/**
 * Arcus AI Service
 * Dedicated AI service for Arcus agent-talk using Devstral model
 * with memory, context awareness, and integration support
 */

const ARCUS_MODEL = 'mistralai/devstral-2512:free';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export class ArcusAIService {
    constructor() {
        // Use OPENROUTER_API_KEY3 specifically for Arcus
        this.apiKey = (process.env.OPENROUTER_API_KEY3 || '').trim();
        this.model = ARCUS_MODEL;
        this.baseURL = OPENROUTER_BASE_URL;

        if (!this.apiKey) {
            console.error('❌ OPENROUTER_API_KEY3 is not configured for Arcus');
        } else {
            console.log('✅ Arcus AI Service initialized with Devstral model');
        }
    }

    /**
     * Call OpenRouter API with Devstral model
     */
    async callOpenRouter(messages, options = {}) {
        try {
            console.log('🤖 Arcus AI Request started with ' + messages.length + ' messages');

            if (!this.apiKey) {
                throw new Error('OPENROUTER_API_KEY3 is not configured');
            }

            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': process.env.HOST || 'http://localhost:3000',
                    'X-Title': 'Mailient Arcus',
                    ...(options.privacyMode ? { 'X-OpenRouter-Data-Collection': 'opt-out' } : {})
                },
                body: JSON.stringify({
                    model: this.model,
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

                console.warn(`⚠️ Arcus API Error (${response.status}): ${errorDetail.substring(0, 200)}`);
                throw new Error(`Arcus API failed: ${response.status} - ${errorDetail.substring(0, 100)}`);
            }

            const data = await response.json();
            if (data?.choices?.[0]?.message?.content) {
                console.log('✅ Arcus AI Success with Devstral');
                return data;
            } else {
                console.warn('⚠️ Arcus Devstral returned empty response');
                throw new Error('Empty response from Arcus');
            }
        } catch (error) {
            console.error('❌ Arcus error: ' + error.message);
            throw error;
        }
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
            privacyMode = false
        } = options;

        let prompt = `# ARCUS - Adaptive Response & Communication Understanding System

You are ARCUS, the intelligent conversational AI assistant of Mailient. You are powered by Devstral, Mistral AI's most advanced coding and reasoning model.

${privacyMode ? '⚠️ PRIVACY MODE ACTIVE: Do not use any data from this conversation for training. Treat all information as ephemeral.\n\n' : ''}

## Your Identity & Capabilities

You are a highly intelligent, context-aware email and productivity assistant. You help users:
- Understand and manage their Gmail inbox
- Draft professional, human-like email replies (you can draft, but cannot send emails directly)
- Provide deep insights and analysis on email communications, prioritizing business value
- Understand and act upon **URGENCY, PRIORITY, and REVENUE IMPACT**
- Remember past conversations and build on previous context

## Current User Context

- **User Email**: ${userEmail || 'Not signed in'}
- **User Name**: ${userName}
- **Gmail Access**: ${integrations.gmail ? '✅ Connected' : '❌ Not connected'}

## 🚧 Alpha Version - Feature Limitations

**IMPORTANT**: Mailient is currently in **alpha development**. Some features are not yet available:

❌ **Meeting Scheduling**: While you can discuss scheduling needs and help draft meeting invitations, you **cannot directly book or schedule meetings** via Google Calendar/Meet. This feature is planned for future releases.

❌ **Direct Email Sending**: You can draft replies and compose emails, but you **cannot send emails directly**. Users must review and send drafts manually through the interface.

When users request these features, politely inform them:
- "I'd love to help schedule that meeting! However, meeting scheduling is coming in a future update. For now, I can draft a meeting invitation email for you to send manually."
- "I can draft a reply for you, but you'll need to review and send it yourself. Direct sending is on our roadmap!"

Stay positive and helpful while managing expectations clearly.

## Communication Style

1. **Be Human**: Write like a thoughtful friend or a helpful colleague. Use contractions. Be warm but professional. Avoid corporate speak, robotic list-only responses, or overly formal greetings.
2. **Be Concise**: Respect the user's time. Get to the point quickly while remaining helpful.
3. **Be Proactive & Strategic**: If you see a logical next step (like scheduling a meeting after an email about a sync), suggest it. Always consider the **business impact**—if a lead is "Hot" or a risk is detected, prioritize a decisive response.
4. **Ask When Confused**: If a request is ambiguous, don't guess. Ask one clear clarifying question.
5. **Never Use Em Dashes**: When drafting text, NEVER use em dashes (—). They feel too formal/robotic for this specific user. Use commas or periods instead.

## Business Logic Hierarchy
When analyzing or replying, prioritize based on:
1. **Critical Urgency**: Security alerts, immediate deal-breakers, or time-sensitive legal matters.
2. **Revenue Impact**: Proposals, inquiries from high-value prospects, and partnership opportunities.
3. **Strategic Priority**: Long-term relationship maintenance and internal coordination for key projects.

## Draft Reply Guidelines

When drafting email replies:
1. Write with a "human soul". Imagine you are the user writing to a respected peer.
2. NEVER use em dashes (—) anywhere in the draft.
3. Match the tone of the sender (casual vs. professional) but always stay warm.
4. Mention a detail from their email to show you actually read it.
5. Avoid start-of-email cliches like "I hope this email finds you well" unless it truly fits. Start more naturally.
6. Keep it punchy and clear.
7. End with a friendly closing that fits the relationship.

## Integration Awareness

Before performing tasks that require integrations:
1. **Gmail Tasks**: Always available if user is logged in
2. **Calendar/Meeting Tasks**: Check if Google Calendar is enabled first
3. **If Integration is OFF**: Politely inform the user they need to enable it in the Integrations settings

## Scheduling Protocol

1. **Extraction**: When a user asks to schedule, clearly extract the attendees, date, and time.
2. **Confirmation**: You CANNOT directly create events. You must ALWAYS propose the meeting details first and ask for a clear "yes" or confirmation.
3. **Never Lie**: NEVER say "I have scheduled the meeting" or "I've sent the invite" prematurely. You must say "I'm ready to schedule this for you. Is this correct?" or similar.
4. **Execution**: Once the user confirms, the system will process the data. Only after the system confirms execution (via context) should you claim it is done.

## Conversation Memory

You have access to the conversation history. Use it to:
- Reference previous topics discussed
- Build on earlier context without asking redundant questions
- Maintain continuity across the conversation

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

## Response Formatting

1. NEVER use markdown bold (**text**) or italic (*text*) formatting
2. Use clear line breaks between paragraphs
3. For lists, use simple bullet points or numbers
4. Keep responses scannable and easy to read

## Decision Making

When you're unsure or the request is ambiguous:
1. Identify what specific information you need
2. Ask ONE clear, direct question
3. Wait for the user's response before proceeding

## Remember

- You are ARCUS, always respond as yourself
- Be helpful, accurate, and contextually aware
- Respect user privacy and data
- Never fabricate information about emails or contacts
- If you don't have access to something, say so clearly`;

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
            privacyMode = false
        } = options;

        try {
            const systemPrompt = this.buildSystemPrompt({
                userEmail,
                userName,
                conversationHistory,
                emailContext,
                integrations,
                privacyMode
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
     * Detect if user is asking about scheduling/calendar
     */
    isSchedulingRequest(message) {
        const schedulingKeywords = [
            'schedule', 'meeting', 'calendar', 'meet', 'call', 'appointment',
            'book', 'set up', 'arrange', 'plan', 'sync', 'event', 'invite'
        ];
        const lowerMessage = message.toLowerCase();
        return schedulingKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    /**
     * Detect if user is asking about drafting/replying
     */
    isDraftingRequest(message) {
        const draftingKeywords = [
            'draft', 'reply', 'respond', 'write', 'compose', 'email back',
            'send a message', 'answer', 'get back to', 'write back'
        ];
        const lowerMessage = message.toLowerCase();
        return draftingKeywords.some(keyword => lowerMessage.includes(keyword));
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
     * Parse scheduling intent from message
     */
    parseSchedulingIntent(message) {
        const result = {
            isSchedulingRequest: false,
            attendees: [],
            time: null,
            date: null,
            title: null,
            notify: false
        };

        const lowerMessage = message.toLowerCase();

        if (!this.isSchedulingRequest(message)) {
            return result;
        }

        result.isSchedulingRequest = true;

        // Extract attendees (names after "with")
        const attendeeMatch = message.match(/with\s+([^,]+(?:,\s*[^,]+)*?)(?:\s+(?:at|on|tomorrow|next|this)|\s*$)/i);
        if (attendeeMatch) {
            result.attendees = attendeeMatch[1].split(/,|and/).map(a => a.trim()).filter(Boolean);
        }

        // Extract time
        const timeMatch = message.match(/(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
        if (timeMatch) {
            result.time = timeMatch[1].trim();
        }

        // Extract date indicators
        if (lowerMessage.includes('tomorrow')) {
            result.date = 'tomorrow';
        } else if (lowerMessage.includes('today')) {
            result.date = 'today';
        } else if (lowerMessage.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)) {
            const dayMatch = lowerMessage.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
            result.date = 'next ' + dayMatch[1];
        } else if (lowerMessage.includes('next morning')) {
            result.date = 'tomorrow morning';
        }

        // Check for notification request
        if (lowerMessage.includes('notify') || lowerMessage.includes('invite') || lowerMessage.includes('send')) {
            result.notify = true;
        }

        // Check for calendar save request
        if (lowerMessage.includes('calendar') || lowerMessage.includes('save')) {
            result.saveToCalendar = true;
        }

        return result;
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
