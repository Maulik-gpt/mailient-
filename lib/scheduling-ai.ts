/**
 * Scheduling AI Service
 * Uses a secondary OpenRouter key and cheaper models for scheduling tasks
 */
export class SchedulingAIService {
    private apiKey: string;
    private models: string[];
    private baseURL: string;

    constructor() {
        // Use the secondary key if provided, fallback to primary if not (safety first)
        this.apiKey = (process.env.OPENROUTER_API_KEY2 || process.env.OPENROUTER_API_KEY || '').trim();
        // Fallback chain of free/cheap models to handle rate limits
        this.models = [
            'bytedance-seed/seed-1.6-flash',
            'google/gemini-exp-1206:free',
            'google/gemini-1.5-flash-8b',
            'meta-llama/llama-3.3-70b-instruct:free',
            'qwen/qwen-2.5-72b-instruct:free'
        ];
        this.baseURL = 'https://openrouter.ai/api/v1';
    }

    async callOpenRouter(
        messages: Array<{ role: string; content: string }>,
        options: { temperature?: number; maxTokens?: number } = {}
    ) {
        let lastError: Error | null = null;

        for (const model of this.models) {
            try {
                console.log(`🤖 Scheduling AI: Trying model ${model}...`);
                const response = await fetch(`${this.baseURL}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                        'X-Title': 'Mailient Scheduling'
                    },
                    body: JSON.stringify({
                        model,
                        messages,
                        temperature: options.temperature || 0.3,
                        max_tokens: options.maxTokens || 1000
                    })
                });

                if (response.status === 429) {
                    console.warn(`⚠️ Model ${model} rate limited, trying next...`);
                    continue;
                }

                if (!response.ok) {
                    const error = await response.text();
                    console.warn(`⚠️ Model ${model} failed: ${error}`);
                    lastError = new Error(`AI error: ${error}`);
                    continue;
                }

                const data = await response.json();
                console.log(`✅ Scheduling AI: Success with ${model}`);
                return data?.choices?.[0]?.message?.content || '';
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error);
                console.warn(`⚠️ Model ${model} threw exception:`, msg);
                lastError = error instanceof Error ? error : new Error(msg);
            }
        }

        // If all models failed, throw the last error
        throw lastError || new Error('All AI models failed');
    }

    /**
     * Recommends meeting details based on the conversation
     */
    async recommendMeetingDetails(emailContent: string) {
        const prompt = `
        Analyze this email and recommend meeting details for a follow-up call.
        
        EMAIL CONTENT:
        ${emailContent}
        
        RETURN JSON ONLY:
        {
          "suggested_title": "1-5 words summary",
          "suggested_description": "A brief objective for the call",
          "suggested_duration": 15, 30, or 60 (minutes)
        }
        `;

        try {
            const response = await this.callOpenRouter([{ role: 'user', content: prompt }]);
            const cleanJson = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            return JSON.parse(cleanJson);
        } catch {
            console.warn('⚠️ AI recommendation failed, using defaults');
            return {
                suggested_title: 'Follow-up Call',
                suggested_description: 'Discussing the recent email exchange.',
                suggested_duration: 30
            };
        }
    }

    /**
     * Generate a personalized notification email for meeting attendees
     */
    async generatePersonalizedNotification({
        senderName,
        recipientEmail,
        meetingTitle,
        meetingTime,
        meetingLink,
        emailContext
    }: {
        senderName: string;
        recipientEmail: string;
        meetingTitle: string;
        meetingTime: string;
        meetingLink: string;
        emailContext?: string;
    }): Promise<string> {
        const prompt = `
        Write a short, friendly, and professional meeting invitation email.
        
        SENDER: ${senderName}
        RECIPIENT: ${recipientEmail}
        MEETING: ${meetingTitle}
        TIME: ${meetingTime}
        LINK: ${meetingLink}
        ${emailContext ? `CONTEXT FROM PREVIOUS EMAIL: ${emailContext.substring(0, 500)}` : ''}
        
        RULES:
        - Be warm but professional
        - Keep it under 100 words
        - Reference the context naturally if provided
        - Include the meeting link
        - End with a friendly sign-off using ${senderName}
        
        RETURN ONLY THE EMAIL BODY TEXT, NO SUBJECT LINE.
        `;

        try {
            const response = await this.callOpenRouter([{ role: 'user', content: prompt }]);
            return response.trim();
        } catch {
            // Fallback to a basic template if AI fails
            return `Hi there,

I've scheduled a call for us: "${meetingTitle}"

📅 When: ${meetingTime}
🔗 Join here: ${meetingLink}

Looking forward to connecting!

Best,
${senderName}`;
        }
    }
}
