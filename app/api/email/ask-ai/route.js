import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';
import { AIConfig } from '@/lib/ai-config';
import { decrypt } from '@/lib/crypto';
import { DatabaseService } from '@/lib/supabase';

export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { emailId, question } = await request.json();
        if (!emailId || !question) {
            return NextResponse.json({ error: 'Email ID and question required' }, { status: 400 });
        }

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

        // Get Gmail access token
        let accessToken = session?.accessToken;
        let refreshToken = session?.refreshToken;

        if (!accessToken) {
            const userTokens = await db.getUserTokens(session.user.email);
            if (userTokens?.encrypted_access_token) {
                accessToken = decrypt(userTokens.encrypted_access_token);
                refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Gmail not connected' }, { status: 403 });
        }

        const gmailService = new GmailService(accessToken, refreshToken);

        // Fetch email content
        const emailDetails = await gmailService.getEmailDetails(emailId);
        const parsedEmail = gmailService.parseEmailData(emailDetails);

        // Prepare context
        const cleanBody = (parsedEmail.body || '')
            .replace(/<[^>]*>?/gm, '') // Strip HTML
            .replace(/\s+/g, ' ')      // Normalize whitespace
            .trim();

        const context = `
            SUBJECT: ${parsedEmail.subject}
            FROM: ${parsedEmail.from}
            DATE: ${parsedEmail.date}
            CONTENT: ${cleanBody.substring(0, 10000)}
        `;

        // Generate AI Response
        const aiConfig = new AIConfig();
        if (!aiConfig.hasAIConfigured()) {
            return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
        }

        const response = await aiConfig.generateChatResponse(
            `QUESTION: ${question}\n\nBased on this email context, please answer the user's question concisely and accurately.`,
            context,
            null,
            privacyMode
        );

        return NextResponse.json({ response });

    } catch (error) {
        console.error('Error in Ask AI:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
