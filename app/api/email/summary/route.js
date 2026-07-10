import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';
import { AIConfig } from '@/lib/ai-config';
import { decrypt } from '@/lib/crypto';
import { DatabaseService } from '@/lib/supabase';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service';
import { AIPolicyCompliance } from '@/lib/ai-policy-compliance';
import { logEvent } from "@/lib/logsso";

export const maxDuration = 60;

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
                message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
                usage: usage.usage,
                limit: usage.limit,
                period: usage.period,
                planType: usage.planType,
                upgradeUrl: '/pricing'
            }, { status: 403 });
        }

        const { emailId, context } = await request.json();
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
        logEvent({ channel: "failures", event: "❌ API Error", description: String(e) });
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
            logEvent({ channel: "failures", event: "❌ API Error", description: String(e) });
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

        // Check Google data policy compliance
        const compliance = new AIPolicyCompliance();
        const complianceConfig = compliance.getAIConfig();
        
        console.log(`🔒 Compliance mode: ${compliance.isComplianceMode ? 'ENABLED' : 'DISABLED'}`);

        // Generate Summary
        const apiKey = process.env.OPENROUTER_API_KEY;
        console.log('🔧 [Summary API] Environment check:');
        console.log('🔧 [Summary API] - OPENROUTER_API_KEY exists:', !!apiKey);
        console.log('🔧 [Summary API] - OPENROUTER_API_KEY length:', apiKey?.length);
        if (apiKey) console.log('🔧 [Summary API] - OPENROUTER_API_KEY prefix:', apiKey.substring(0, 10));
        
        const aiService = new AIConfig();
        console.log('🔧 [Summary API] AIConfig initialized, hasAIConfigured:', aiService.hasAIConfigured());

        if (!aiService.hasAIConfigured()) {
            console.error('❌ [Summary API] AI service not configured - OPENROUTER_API_KEY missing or invalid in process.env');
            return NextResponse.json({ error: 'AI service not configured - Please check your OpenRouter API key configuration' }, { status: 500 });
        }

        console.log('🤖 [Summary API] Generating email summary with AI...');
        
        let summary;
        try {
            // Wrap in a 20s timeout race to prevent serverless 504 timeouts
            summary = await Promise.race([
                aiService.generateEmailSummary(emailContent, complianceConfig.privacyMode, context),
                new Promise((_, reject) => setTimeout(() => reject(new Error('AI Request Timed Out')), 20000))
            ]);
        } catch (timeoutError) {
        logEvent({ channel: "failures", event: "❌ API Error", description: String(timeoutError) });
            console.warn('⚠️ [Summary API] AI timeout or failure, using fallback summary:', timeoutError.message);
            const subject = parsedEmail.subject || 'an email';
            const from = parsedEmail.from?.split('<')[0]?.trim().replace(/"/g, '') || 'Someone';
            summary = `Email from ${from} regarding "${subject}".`;
        }
        
        console.log('✅ [Summary API] Summary generated:', summary?.substring(0, 50));

        // Ensure we always have a non-empty summary
        if (!summary || summary.trim().length === 0) {
            console.warn('⚠️ [Summary API] Empty summary returned, using fallback');
            summary = 'No summary available for this email.';
        }

        if (typeof summary === 'string' && summary.trim().length > 0) {
            await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.EMAIL_SUMMARY);
        }

        return NextResponse.json({ summary });

    } catch (error) {
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
        console.error('Error generating summary:', error);
        const isAIError = error.message?.includes('AI summary failed') || error.message?.includes('OpenRouter');
        return NextResponse.json(
            { error: isAIError ? error.message : 'Failed to generate summary. Please try again.' },
            { status: 500 }
        );
    }
}
