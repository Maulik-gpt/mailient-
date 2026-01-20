import { GmailService } from '@/lib/gmail.ts';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt } from '@/lib/crypto.js';
import { AIConfig } from '@/lib/ai-config';

/**
 * Special onboarding endpoint that fetches user's emails WITHOUT subscription check
 * This allows new users to see AI value before they pay
 * Limited to 20 emails and basic analysis only
 */
export async function GET(request) {
    try {
        console.log('=== ONBOARDING EMAIL FETCH START ===');

        // Get session
        const session = await auth();
        if (!session?.user?.email) {
            return Response.json({ error: 'No valid session found' }, { status: 401 });
        }

        const userEmail = session.user.email;
        let accessToken = session.accessToken;
        let refreshToken = session.refreshToken;

        // Fetch tokens from database if missing from session
        const db = new DatabaseService();
        if (!accessToken || !refreshToken) {
            try {
                console.log('📦 Fetching tokens from database for:', userEmail);
                const userTokens = await db.getUserTokens(userEmail);

                if (userTokens) {
                    if (userTokens.encrypted_access_token) {
                        accessToken = decrypt(userTokens.encrypted_access_token);
                    }
                    if (userTokens.encrypted_refresh_token) {
                        refreshToken = decrypt(userTokens.encrypted_refresh_token);
                    }
                }
            } catch (dbError) {
                console.error('Database error getting tokens:', dbError);
            }
        }

        if (!accessToken) {
            console.log('❌ No access token available');
            return Response.json({ error: 'Gmail not connected', emails: [] }, { status: 401 });
        }

        // Initialize Gmail service
        const gmailService = new GmailService(accessToken, refreshToken || '');
        gmailService.setUserEmail(userEmail);

        console.log('📧 Fetching emails for onboarding analysis...');

        // Fetch messages list - limited to 20 for onboarding
        const messagesResponse = await gmailService.getEmails(20, '', null);

        if (!messagesResponse.messages || messagesResponse.messages.length === 0) {
            console.log('📭 No messages found');
            return Response.json({
                emails: [],
                analysis: {
                    toReply: [],
                    unanswered: []
                }
            });
        }

        // Get detailed information for each message
        const messageIds = messagesResponse.messages.map(m => m.id);
        const emailsWithDetails = [];

        for (let i = 0; i < Math.min(messageIds.length, 20); i += 5) {
            const batch = messageIds.slice(i, i + 5);
            const batchDetails = await Promise.all(
                batch.map(async (id) => {
                    try {
                        const details = await gmailService.getEmailDetails(id);
                        return gmailService.parseEmailData(details);
                    } catch (error) {
                        console.error(`Error fetching detail for ${id}:`, error);
                        return null;
                    }
                })
            );
            emailsWithDetails.push(...batchDetails.filter(Boolean));
        }

        console.log(`✅ Processed ${emailsWithDetails.length} messages for onboarding`);

        // Sort by date descending
        emailsWithDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Perform SMART analysis using AI heuristics
        // Filter emails that actually need replies
        const toReply = emailsWithDetails.filter(e => {
            // Check if it's unread
            const isUnread = e.labels?.includes('UNREAD');
            // Check if it's FROM someone (not sent by user)
            const isInbound = !e.labels?.includes('SENT');
            // Check if it has a question-like subject or ends with ?
            const hasQuestion = e.subject?.includes('?') ||
                e.snippet?.includes('?') ||
                /\b(can you|could you|would you|please|urgent|asap|need|help)\b/i.test(e.snippet || '');
            // Check if it's a human email (not automated/newsletter)
            const isHuman = !/\b(noreply|no-reply|newsletter|automated|unsubscribe|donotreply)\b/i.test(e.from || '');

            return isUnread && isInbound && isHuman && (hasQuestion || e.labels?.includes('IMPORTANT'));
        }).slice(0, 5);

        // Find threads waiting for reply (unanswered threads where user was involved but no recent sent)
        const unanswered = emailsWithDetails.filter(e => {
            const isInbound = !e.labels?.includes('SENT');
            const isHuman = !/\b(noreply|no-reply|newsletter|automated|unsubscribe|donotreply)\b/i.test(e.from || '');
            const isOlderThan24h = e.date && (Date.now() - new Date(e.date).getTime()) > 24 * 60 * 60 * 1000;
            const isNotSpam = !e.labels?.includes('SPAM') && !e.labels?.includes('TRASH');
            // Looking for follow-up signals
            const needsFollowUp = /\b(waiting|follow.?up|circling back|checking in|any update|heard back|response)\b/i.test(e.snippet || '');

            return isInbound && isHuman && isNotSpam && (needsFollowUp || (isOlderThan24h && e.labels?.includes('INBOX')));
        }).slice(0, 5);

        const analysis = {
            toReply,
            unanswered
        };

        console.log(`📊 Analysis: ${toReply.length} emails to reply, ${unanswered.length} unanswered threads`);

        return Response.json({
            emails: emailsWithDetails,
            analysis
        });

    } catch (error) {
        console.error('=== ERROR IN ONBOARDING EMAIL FETCH ===');
        console.error('Error:', error);
        return Response.json(
            { error: 'Failed to fetch emails', details: error.message, emails: [], analysis: { toReply: [], unanswered: [] } },
            { status: 500 }
        );
    }
}
