import { NextResponse } from 'next/server';

/**
 * Generate a concise chat title based on the user's first message
 * Uses OPENROUTER_API_KEY3 with Gemini 2.0 Flash for fast, smart title generation
 */
export async function POST(request) {
    try {
        const { message } = await request.json();

        if (!message || typeof message !== 'string' || message.trim().length < 2) {
            return NextResponse.json(
                { error: 'Message is required for title generation' },
                { status: 400 }
            );
        }

        const apiKey = (process.env.OPENROUTER_API_KEY3 || process.env.OPENROUTER_API_KEY || '').trim();

        if (!apiKey) {
            console.error('❌ No API key available for title generation');
            // Fallback: Use first words of message
            const fallbackTitle = message.trim().split(' ').slice(0, 5).join(' ');
            return NextResponse.json({
                title: fallbackTitle.length > 40 ? fallbackTitle.substring(0, 40) + '...' : fallbackTitle,
                source: 'fallback'
            });
        }

        // Use Gemini 2.0 Flash for fast, intelligent title generation
        const model = 'google/gemini-2.0-flash-exp:free';

        const systemPrompt = `You are a chat title generator that creates SHORT, DESCRIPTIVE titles for conversations.

CRITICAL: Analyze the user's message as a 3rd-person observer and generate a TOPIC-BASED title that describes WHAT the conversation is about, NOT a rephrasing of their question.

RULES:
1. Write titles as TOPICS or DESCRIPTIONS, not questions
2. Use 3-5 words maximum
3. Use Title Case (capitalize first letter of each word)
4. DO NOT include personal pronouns like "my", "I", "your", "me"
5. DO NOT use quotes, colons, or special characters
6. Focus on the SUBJECT MATTER, not the action being requested

TRANSFORMATION EXAMPLES:
- "What emails did I get from John today?" → "Emails From John"
- "Help me draft a reply to my boss about the project deadline" → "Project Deadline Reply"
- "Can you summarize my unread emails?" → "Unread Email Summary"
- "Schedule a meeting with Sarah for next week" → "Meeting With Sarah"
- "Hello, how are you doing today?" → "General Greeting"
- "What are my urgent emails?" → "Urgent Emails Review"
- "Find notes about the marketing campaign" → "Marketing Campaign Notes"
- "Can you help me summarize my newsletter from last week?" → "Newsletter Summary"
- "What are my urgent emails from today?" → "Today's Urgent Emails"

OUTPUT: Just the title, nothing else. No explanations, no quotes, no colons.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                'X-Title': 'Mailient Chat Title Generator'
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Generate a short title for a conversation that starts with: "${message}"` }
                ],
                temperature: 0.3,
                max_tokens: 50
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ OpenRouter title generation failed:', response.status, errorText);

            // Fallback: Use first words of message
            const fallbackTitle = message.trim().split(' ').slice(0, 5).join(' ');
            return NextResponse.json({
                title: fallbackTitle.length > 40 ? fallbackTitle.substring(0, 40) + '...' : fallbackTitle,
                source: 'fallback'
            });
        }

        const data = await response.json();
        let generatedTitle = data?.choices?.[0]?.message?.content?.trim() || '';

        // Clean up the title
        generatedTitle = generatedTitle
            .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
            .replace(/^Title:\s*/i, '') // Remove "Title:" prefix if present
            .replace(/[:\n]/g, ' ') // Replace colons and newlines with spaces
            .trim();

        // If title is too long, truncate
        if (generatedTitle.length > 50) {
            generatedTitle = generatedTitle.substring(0, 47) + '...';
        }

        // If title generation failed or is empty, use fallback
        if (!generatedTitle || generatedTitle.length < 2) {
            const fallbackTitle = message.trim().split(' ').slice(0, 5).join(' ');
            generatedTitle = fallbackTitle.length > 40 ? fallbackTitle.substring(0, 40) + '...' : fallbackTitle;
        }

        console.log('✅ Generated chat title:', generatedTitle);

        return NextResponse.json({
            title: generatedTitle,
            source: 'ai'
        });

    } catch (error) {
        console.error('❌ Title generation error:', error);

        // Fallback: Try to use the message itself
        try {
            const { message } = await request.clone().json();
            const fallbackTitle = (message || 'New Chat').trim().split(' ').slice(0, 5).join(' ');
            return NextResponse.json({
                title: fallbackTitle.length > 40 ? fallbackTitle.substring(0, 40) + '...' : fallbackTitle,
                source: 'fallback'
            });
        } catch {
            return NextResponse.json({
                title: 'New Chat',
                source: 'fallback'
            });
        }
    }
}
