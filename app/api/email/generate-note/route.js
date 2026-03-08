import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { OpenRouterAIService } from '@/lib/openrouter-ai';
import { DatabaseService } from '@/lib/supabase';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;

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

        const isAIConfigured = !!aiService.apiKey;
        if (!isAIConfigured) {
            console.warn('⚠️ OPENROUTER_API_KEY2 not configured for note generation, using fallback');
        }

        if (isAIConfigured) {
            const canUse = await subscriptionService.canUseFeature(userId, FEATURE_TYPES.AI_NOTES);
            if (!canUse) {
                const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.AI_NOTES);
                return NextResponse.json({
                    error: 'limit_reached',
                    message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
                    usage: usage.usage,
                    limit: usage.limit,
                    period: usage.period,
                    planType: usage.planType,
                    upgradeUrl: '/pricing'
                }, { status: 403 });
            }
        }

        try {
            const noteContent = await aiService.generateNote(snippet, category, privacyMode);

            if (noteContent) {
                if (isAIConfigured) {
                    await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.AI_NOTES);
                }
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
