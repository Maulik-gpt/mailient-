import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { GmailService } from '../../../../lib/gmail';
import { AIConfig } from '../../../../lib/ai-config';
import { decrypt } from '../../../../lib/crypto';
import { DatabaseService } from '../../../../lib/supabase';
import { subscriptionService, FEATURE_TYPES } from '../../../../lib/subscription-service';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.email;

        // Check subscription and feature usage for email summary (20/day for Starter)
        const canUse = await subscriptionService.canUseFeature(userId, FEATURE_TYPES.EMAIL_SUMMARY);
        if (!canUse) {
            const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.EMAIL_SUMMARY);
            return NextResponse.json({
                error: 'limit_reached',
                message: 'You have used all 20 email summary credits for today. Credits reset at midnight.',
                usage: usage.usage,
                limit: usage.limit,
                upgradeUrl: '/pricing'
            }, { status: 403 });
        }

        const { emailId } = await request.json();
        if (!emailId) {
            return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
        }

        // Get Gmail access token
        let accessToken = session?.accessToken;
        let refreshToken = session?.refreshToken;

        const db = new DatabaseService();
        let privacyMode = false;
        try {
            const profile = await db.getUserProfile(session.user.email);
            if (profile?.preferences?.ai_privacy_mode === 'enabled') {
                privacyMode = true;
            }
        } catch (e) {
            console.warn('Privacy check error:', e);
        }

        // CRITICAL: Fetch tokens from database if EITHER accessToken OR refreshToken is missing
        if (!accessToken || !refreshToken) {
            try {
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

        // Prepare content for AI - truncate body to avoid token limits
        const cleanBody = (parsedEmail.body || '')
            .replace(/<[^>]*>?/gm, '') // Strip HTML tags
            .replace(/\s+/g, ' ')      // Normalize whitespace
            .trim();

        const truncatedBody = cleanBody.length > 5000
            ? cleanBody.substring(0, 5000) + '... [truncated]'
            : cleanBody;

        const emailContent = `
      Subject: ${parsedEmail.subject}
      From: ${parsedEmail.from}
      Date: ${parsedEmail.date}
      Snippet: ${parsedEmail.snippet}
      Body: ${truncatedBody}
    `;

        // Generate Summary
        const aiConfig = new AIConfig();

        let summary = "";
        if (aiConfig.hasAIConfigured()) {
            summary = await aiConfig.generateEmailSummary(emailContent, privacyMode);
        } else {
            summary = "AI service not configured.";
        }

        // Increment usage after successful summary generation
        await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.EMAIL_SUMMARY);

        return NextResponse.json({ summary });

    } catch (error) {
        console.error('Error generating summary:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
