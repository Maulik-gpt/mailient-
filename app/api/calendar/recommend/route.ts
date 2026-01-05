import { NextResponse } from 'next/server';
import { SchedulingAIService } from '@/lib/scheduling-ai';
import { GmailService } from '@/lib/gmail';
import { DatabaseService } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';

// Import auth with proper typing
const authFunction: () => Promise<{
    user?: {
        email?: string;
    };
    accessToken?: string;
    refreshToken?: string;
}> = require('@/lib/auth').auth;

export async function POST(request: Request) {
    try {
        const session = await authFunction();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;

        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { emailId } = body;
        if (!emailId) {
            return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
        }

        // Get tokens
        let accessToken = session?.accessToken;
        let refreshToken = session?.refreshToken;

        if (!accessToken) {
            const db = new DatabaseService();
            const userTokens = await db.getUserTokens(session.user.email);
            if (userTokens?.encrypted_access_token) {
                accessToken = decrypt(userTokens.encrypted_access_token);
                refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Account not connected' }, { status: 403 });
        }

        const gmailService = new GmailService(accessToken, refreshToken);
        const emailDetails = await gmailService.getEmailDetails(emailId);
        const parsedEmail = gmailService.parseEmailData(emailDetails);

        const aiService = new SchedulingAIService();
        const recommendation = await aiService.recommendMeetingDetails(parsedEmail.body || parsedEmail.snippet);

        const canUse = await subscriptionService.canUseFeature(userId, FEATURE_TYPES.SCHEDULE_CALL);
        if (!canUse) {
            const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.SCHEDULE_CALL);
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

        if (recommendation) {
            await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.SCHEDULE_CALL);
        }

        return NextResponse.json({
            success: true,
            recommendation,
            sender: parsedEmail.from,
            subject: parsedEmail.subject
        });

    } catch (error: any) {
        console.error('❌ Recommendation error:', error);

        // Provide more user-friendly error messages for common issues
        if (error.message.includes('authentication required') || error.message.includes('Access token expired')) {
            return NextResponse.json({
                error: error.message,
                userAction: 'Please sign out and sign back in with Google to restore calendar functionality.'
            }, { status: 401 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
