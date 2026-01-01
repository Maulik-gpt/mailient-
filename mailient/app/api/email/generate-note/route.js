import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { OpenRouterAIService } from '../../../../lib/openrouter-ai';
import { DatabaseService } from '../../../../lib/supabase';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { emailId, subject, snippet, category } = await request.json();

        // Fetch user profile for privacy check
        const db = new DatabaseService();
        let privacyMode = false;
        try {
            const profile = await db.getUserProfile(session.user.email);
            if (profile?.preferences?.ai_privacy_mode === 'enabled') {
                privacyMode = true;
                console.log('🛡️ Note Generation: AI Privacy Mode enabled.');
            }
        } catch (e) {
            console.warn('Privacy check error:', e);
        }

        // Generate AI note content
        const aiService = new OpenRouterAIService();

        // For note generation, use OPENROUTER_API_KEY2 and bytedance-seed/seed-1.6-flash model
        aiService.apiKey = (process.env.OPENROUTER_API_KEY2 || '').trim();
        aiService.model = 'bytedance-seed/seed-1.6-flash';

        if (!aiService.apiKey) {
            console.warn('⚠️ OPENROUTER_API_KEY2 not configured for note generation, using fallback');
        }

        try {
            const noteContent = await aiService.generateNote(snippet, category, privacyMode);

            if (noteContent) {
                return NextResponse.json({ noteContent });
            }
        } catch (aiError) {
            console.warn('⚠️ AI service error:', aiError.message);
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