import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GmailService } from '@/lib/gmail';
import { AIConfig } from '@/lib/ai-config';
import { decrypt } from '@/lib/crypto';
import { DatabaseService } from '@/lib/supabase';

/**
 * Special onboarding AI action endpoint - NO subscription check
 * Allows users to try AI features during onboarding without paying first
 * Limited to onboarding flow only
 */
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { emailId, actionType, question, context } = await request.json();

        if (!emailId) {
            return NextResponse.json({ error: 'Email ID required' }, { status: 400 });
        }

        if (!actionType || !['summary', 'reply', 'ask'].includes(actionType)) {
            return NextResponse.json({ error: 'Valid action type required (summary, reply, ask)' }, { status: 400 });
        }

        if (actionType === 'ask' && !question) {
            return NextResponse.json({ error: 'Question required for ask action' }, { status: 400 });
        }

        const db = new DatabaseService();

        // Get Gmail access token
        let accessToken = session?.accessToken;
        let refreshToken = session?.refreshToken;

        if (!accessToken || !refreshToken) {
            try {
                console.log('🔑 Fetching tokens from database for:', session.user.email);
                const userTokens = await db.getUserTokens(session.user.email);
                if (userTokens?.encrypted_access_token) {
                    accessToken = accessToken || decrypt(userTokens.encrypted_access_token);
                    refreshToken = refreshToken || (userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '');
                }
            } catch (e) {
                console.error('Failed to fetch tokens from database:', e);
            }
        }

        if (!accessToken) {
            return NextResponse.json({ error: 'Gmail not connected' }, { status: 403 });
        }

        const gmailService = new GmailService(accessToken, refreshToken);
        gmailService.setUserEmail(session.user.email);

        // Fetch email content
        const emailDetails = await gmailService.getEmailDetails(emailId);
        const parsedEmail = gmailService.parseEmailData(emailDetails);

        // Prepare content for AI
        const cleanBody = (parsedEmail.body || '')
            .replace(/<[^>]*>?/gm, '')
            .replace(/\s+/g, ' ')
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

        // Initialize AI service
        const aiService = new AIConfig();

        if (!aiService.hasAIConfigured()) {
            console.error('❌ AI service not configured');
            return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
        }

        let result;

        switch (actionType) {
            case 'summary':
                console.log('🤖 [Onboarding] Generating email summary...');
                result = {
                    type: 'summary',
                    content: await aiService.generateEmailSummary(emailContent, false, context)
                };
                break;

            case 'reply':
                console.log('🤖 [Onboarding] Generating draft reply...');
                const userContext = {
                    name: session.user.name || session.user.email.split('@')[0],
                    email: session.user.email,
                    role: context?.role || null,
                    goals: context?.goals || []
                };
                result = {
                    type: 'reply',
                    content: await aiService.generateDraftReply(emailContent, 'Opportunity', userContext, false)
                };
                break;

            case 'ask':
                console.log('🤖 [Onboarding] Answering question about email...');
                const prompt = `QUESTION: ${question}\n\nBased on this email context, please answer the user's question concisely and accurately. Be helpful and insightful.`;
                result = {
                    type: 'ask',
                    content: await aiService.generateChatResponse(prompt, emailContent, null, false)
                };
                break;
        }

        console.log('✅ [Onboarding] AI action completed successfully');

        return NextResponse.json({
            success: true,
            actionType: result.type,
            result: result.content
        });

    } catch (error) {
        console.error('Error in onboarding AI action:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
