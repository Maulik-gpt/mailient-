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

        // Perform SIMPLE analysis for onboarding demo
        // Less strict filtering to ensure users see some results

        // Filter for human emails (not automated)
        const humanEmails = emailsWithDetails.filter(e => {
            const isHuman = !/\b(noreply|no-reply|newsletter|automated|unsubscribe|donotreply|mailer-daemon|notifications?@|updates?@|alerts?@|info@|support@)\b/i.test(e.from || '');
            const isInbound = !e.labels?.includes('SENT');
            const isNotSpam = !e.labels?.includes('SPAM') && !e.labels?.includes('TRASH');
            return isHuman && isInbound && isNotSpam;
        });

        console.log(`📧 Found ${humanEmails.length} human emails out of ${emailsWithDetails.length} total`);

        // Emails to reply: First 5 unread inbound human emails, or recent ones if no unread
        let toReply = humanEmails.filter(e => e.labels?.includes('UNREAD')).slice(0, 5);

        // If not enough unread, add some recent inbox emails
        if (toReply.length < 3) {
            const additionalEmails = humanEmails
                .filter(e => e.labels?.includes('INBOX') && !toReply.some(r => r.id === e.id))
                .slice(0, 5 - toReply.length);
            toReply = [...toReply, ...additionalEmails];
        }

        // Unanswered threads: Emails older than 12 hours that are still in inbox
        const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
        let unanswered = humanEmails.filter(e => {
            const emailDate = new Date(e.date).getTime();
            return emailDate < twelveHoursAgo && e.labels?.includes('INBOX');
        }).slice(0, 5);

        // If still not enough unanswered, just show some emails from inbox
        if (unanswered.length < 2 && humanEmails.length > toReply.length) {
            const remaining = humanEmails
                .filter(e => !toReply.some(r => r.id === e.id) && !unanswered.some(u => u.id === e.id))
                .slice(0, 5 - unanswered.length);
            unanswered = [...unanswered, ...remaining];
        }

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
