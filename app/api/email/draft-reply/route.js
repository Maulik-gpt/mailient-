import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { GmailService } from '../../../../lib/gmail';
import { AIConfig } from '../../../../lib/ai-config';
import { decrypt } from '../../../../lib/crypto';
import { DatabaseService } from '../../../../lib/supabase';

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

        if (!accessToken) {
            const db = new DatabaseService();
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

        const userContext = {
            name: session.user.name || session.user.email.split('@')[0],
            email: session.user.email
        };

        const draftReply = await aiConfig.generateDraftReply(emailContent, category || 'Opportunity', userContext);

        return NextResponse.json({ draftReply });

    } catch (error) {
        console.error('Error generating draft reply:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
