import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';
import { AIConfig } from '@/lib/ai-config';
import { decrypt } from '@/lib/crypto';
import { DatabaseService } from '@/lib/supabase';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;

        // Check subscription and feature usage
        const canUse = await subscriptionService.canUseFeature(userId, FEATURE_TYPES.DRAFT_REPLY);
        if (!canUse) {
            const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.DRAFT_REPLY);
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

        const { emailId, category, context } = await request.json();
        if (!emailId) {
            return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
        }

        // Get Gmail access token
        let accessToken = session?.accessToken;
        let refreshToken = session?.refreshToken;

        // CRITICAL: Fetch tokens from database if EITHER accessToken OR refreshToken is missing
        if (!accessToken || !refreshToken) {
            try {
                const db = new DatabaseService();
                console.log('🔑 Fetching tokens from database for:', session.user.email);
                const userTokens = await db.getUserTokens(session.user.email);
                if (userTokens?.encrypted_access_token) {
                    accessToken = accessToken || decrypt(userTokens.encrypted_access_token);
                    refreshToken = refreshToken || (userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '');
                    console.log('✅ Tokens retrieved from database');
                }
            } catch (e) {
                console.error('Failed to fetch tokens from database:', e);
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Gmail not connected' }, { status: 403 });
        }

        const gmailService = new GmailService(accessToken, refreshToken);
        gmailService.setUserEmail(session.user.email); // Enable token refresh persistence

        // Fetch email content
        const emailDetails = await gmailService.getEmailDetails(emailId);
        const parsedEmail = gmailService.parseEmailData(emailDetails);

        // Prepare content for AI
        const cleanBody = (parsedEmail.body || '')
            .replace(/<[^>]*>?/gm, '')
            .replace(/\s+/g, ' ')
            .trim();

        const truncatedBody = cleanBody.substring(0, 5000);

        const emailContent = `
      Subject: ${parsedEmail.subject}
      From: ${parsedEmail.from}
      Date: ${parsedEmail.date}
      Snippet: ${parsedEmail.snippet}
      Body: ${truncatedBody}
    `;

        // Generate Draft Reply
        const aiConfig = new AIConfig();

        if (!aiConfig.hasAIConfigured()) {
            return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
        }

        // Prepare user context, merging session data with onboarding context
        const userContext = {
            name: session.user.name || session.user.email.split('@')[0],
            email: session.user.email,
            role: context?.role || null,
            goals: context?.goals || []
        };

        // Use follow-up generator for follow-up categories, otherwise use draft reply
        const isFollowUp = category && typeof category === 'string' &&
            (category.toLowerCase() === 'follow-up' || category.toLowerCase() === 'missed-followups' || category.toLowerCase() === 'missed-followups');

        const draftReply = isFollowUp
            ? await aiConfig.generateFollowUp(emailContent, userContext)
            : await aiConfig.generateDraftReply(emailContent, category || 'Opportunity', userContext);

        // Increment usage after successful generation
        await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.DRAFT_REPLY);

        return NextResponse.json({ draftReply });

    } catch (error) {
        console.error('Error generating draft reply:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
