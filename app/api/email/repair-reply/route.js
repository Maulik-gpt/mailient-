import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';
import { OpenRouterAIService } from '@/lib/openrouter-ai';
import { decrypt } from '@/lib/crypto';
import { DatabaseService } from '@/lib/supabase';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { emailId, category } = await request.json();
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

        // Generate Repair Reply using specialized AI method
        const aiService = new OpenRouterAIService();

        if (!aiService.apiKey) {
            return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
        }

        const userContext = {
            name: session.user.name || session.user.email.split('@')[0],
            email: session.user.email
        };

        const repairReply = await aiService.generateRepairReply(emailContent, userContext, privacyMode);

        return NextResponse.json({ repairReply });

    } catch (error) {
        console.error('Error generating repair reply:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
