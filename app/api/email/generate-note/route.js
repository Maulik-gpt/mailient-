import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { OpenRouterAIService } from '../../../../lib/openrouter-ai';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { emailId, subject, snippet } = await request.json();
        
        // Generate AI note content
        const aiService = new OpenRouterAIService();
        
        // For note generation, use OPENROUTER_API_KEY2 and bytedance-seed/seed-1.6-flash model
        aiService.apiKey = (process.env.OPENROUTER_API_KEY2 || '').trim();
        aiService.model = 'bytedance-seed/seed-1.6-flash';
        
        if (!aiService.apiKey) {
            console.warn('⚠️ OPENROUTER_API_KEY2 not configured for note generation, using fallback');
        }

        const prompt = `Analyze this email and create a concise, insightful note. Focus on key points, action items, and important details. Write as if you are the AI assistant writing personal notes about this email.
 
Email Subject: ${subject}
Email Snippet: ${snippet}

Format your note as:
- **Summary**: 1-2 sentence summary (use **bold** for headings)
- **Key Points**: Bullet points of important information
- **Action Items**: Any tasks or follow-ups needed
- **Context**: Relevant background or connections

Be professional, insightful, and concise. Keep the note under 200 words total. Use markdown formatting for bold text (**bold**) and bullet points (-).`;

        const messages = [
            {
                role: 'system',
                content: 'You are an AI assistant creating professional email notes. Be concise, insightful, and focus on actionable information.'
            },
            { role: 'user', content: prompt }
        ];

        try {
            const response = await aiService.callOpenRouter(messages, { maxTokens: 300, temperature: 0.3 });
            const noteContent = aiService.extractResponse(response);

            if (noteContent && noteContent.trim().length > 10) {
                return NextResponse.json({ noteContent });
            }
        } catch (aiError) {
            console.warn('⚠️ AI service error, using fallback:', aiError.message);
        }

        // Fallback if AI response is too short
        return NextResponse.json({
            noteContent: `Note about: ${subject}\n\n- Summary: Email regarding ${subject}\n- Key Points: ${snippet}\n- Action Items: Review and respond\n- Context: Important communication`
        });

    } catch (error) {
        console.error('Error generating note:', error);
        return NextResponse.json({
            error: error.message,
            noteContent: `Note about: ${subject || 'Email'}\n\n- Summary: Important email communication\n- Key Points: Review required\n- Action Items: Follow up\n- Context: Business communication`
        }, { status: 500 });
    }
}