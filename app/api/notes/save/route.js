import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { DatabaseService } from '@/lib/supabase';
import { OpenRouterAIService } from '@/lib/openrouter-ai';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { emailId, subject, content, createdAt } = await request.json();

        // Validate required fields
        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
        }

        // Save note to Supabase
        const db = new DatabaseService();
        const userId = session.user.email;

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

        // AI Enhancement
        let finalSubject = subject || 'Untitled Note';
        let finalContent = content;
        let aiEnhanced = false;

        try {
            console.log('✨ Enhancing note from email via AI...');
            const ai = new OpenRouterAIService();
            const enhanced = await ai.enhanceNote(finalSubject, finalContent);

            if (enhanced && enhanced.subject && enhanced.content) {
                finalSubject = enhanced.subject;
                finalContent = enhanced.content;
                aiEnhanced = true;
            }
        } catch (aiError) {
            console.error('AI Enhancement failed for email note:', aiError);
        }

        const { data, error } = await db.supabase
            .from('notes')
            .insert({
                user_id: userId,
                subject: finalSubject,
                content: finalContent,
                tags: [],
                created_at: createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving note to Supabase:', error);
            return NextResponse.json({
                error: 'Failed to save note to database',
                success: false
            }, { status: 500 });
        }

        console.log('📝 Note saved to Supabase:', data);

        if (aiEnhanced) {
            await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.AI_NOTES);
        }

        return NextResponse.json({
            success: true,
            message: 'Note saved successfully',
            note: {
                id: data.id,
                emailId,
                subject: data.subject,
                content: data.content,
                createdAt: data.created_at,
                userEmail: session.user.email
            }
        });

    } catch (error) {
        console.error('Error saving note:', error);
        return NextResponse.json({
            error: error.message,
            success: false
        }, { status: 500 });
    }
}
