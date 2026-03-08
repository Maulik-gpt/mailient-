import { GmailService } from '@/lib/gmail';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt } from '@/lib/crypto.js';

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
        const messagesResponse = await gmailService.getEmails(20, 'in:inbox', null);
        const listedCount = messagesResponse?.messages?.length || 0;
        console.log(`📨 Gmail list returned ${listedCount} message IDs`);

        if (!messagesResponse.messages || messagesResponse.messages.length === 0) {
            console.log('📭 No messages found');
            return Response.json({
                emails: [],
                analysis: {
                    toReply: [],
                    unanswered: []
                },
                debug: {
                    listedCount: 0,
                    detailsFetched: 0,
                    detailErrors: 0,
                    usedFallbackHuman: false
                }
            });
        }

        // Get detailed information for each message
        const messageIds = messagesResponse.messages.map(m => m.id);
        const emailsWithDetails = [];
        let detailErrors = 0;
        let sawReauthError = false;
        let sawCircuitBreaker = false;

        for (let i = 0; i < Math.min(messageIds.length, 20); i += 2) {
            const batch = messageIds.slice(i, i + 2);
            const batchDetails = await Promise.all(
                batch.map(async (id) => {
                    try {
                        const details = await gmailService.getEmailDetails(id);
                        return gmailService.parseEmailData(details);
                    } catch (error) {
                        console.error(`Error fetching detail for ${id}:`, error);
                        detailErrors++;
                        const msg = error?.message || '';
                        if (/sign out and sign back in|Google permissions missing|Google authentication required/i.test(msg)) {
                            sawReauthError = true;
                        }
                        if (/circuit breaker is open/i.test(msg)) {
                            sawCircuitBreaker = true;
                        }
                        return null;
                    }
                })
            );
            emailsWithDetails.push(...batchDetails.filter(Boolean));
        }

        console.log(`✅ Processed ${emailsWithDetails.length} messages for onboarding`);

        // If the list returned messages but we couldn't fetch ANY details, don't pretend the inbox is empty.
        // This is usually rate limiting/circuit breaker or auth/scopes issues.
        if (emailsWithDetails.length === 0 && messageIds.length > 0) {
            if (sawReauthError) {
                return Response.json(
                    {
                        error: 'Failed to fetch emails',
                        details: 'Google permissions missing for Gmail read access. Please sign out and sign back in to grant Gmail permissions.',
                        needsReauth: true,
                        emails: [],
                        analysis: { toReply: [], unanswered: [] },
                        debug: {
                            listedCount: messageIds.length,
                            detailsFetched: 0,
                            detailErrors,
                            usedFallbackHuman: false
                        }
                    },
                    { status: 403 }
                );
            }

            const details = sawCircuitBreaker
                ? 'Gmail rate limiting protection is temporarily active. Please retry in a minute.'
                : 'Unable to load email details from Gmail. Please retry.';

            return Response.json(
                {
                    error: 'Failed to fetch emails',
                    details,
                    needsReauth: false,
                    needsRetry: true,
                    emails: [],
                    analysis: { toReply: [], unanswered: [] },
                    debug: {
                        listedCount: messageIds.length,
                        detailsFetched: 0,
                        detailErrors,
                        usedFallbackHuman: false
                    }
                },
                { status: 503 }
            );
        }

        // Sort by date descending
        emailsWithDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Perform SIMPLE analysis for onboarding demo
        // Less strict filtering to ensure users see some results

        // Filter for inbound, non-spam emails first
        const baseInboundEmails = emailsWithDetails.filter(e => {
            const isInbound = !e.labels?.includes('SENT');
            const isNotSpam = !e.labels?.includes('SPAM') && !e.labels?.includes('TRASH');
            return isInbound && isNotSpam;
        });

        // Filter for human emails (not automated)
        let humanEmails = baseInboundEmails.filter(e => {
            const isHuman = !/\b(noreply|no-reply|newsletter|automated|unsubscribe|donotreply|mailer-daemon|notifications?@|updates?@|alerts?@|info@|support@)\b/i.test(e.from || '');
            return isHuman;
        });

        // Fallback: if everything looks automated, still show inbound inbox emails so the user can try an action.
        const usedFallbackHuman = humanEmails.length === 0 && baseInboundEmails.length > 0;
        if (usedFallbackHuman) {
            humanEmails = baseInboundEmails;
        }

        console.log(`📧 Found ${humanEmails.length} human emails out of ${emailsWithDetails.length} total`);

        // Emails to reply: First 5 unread inbound human emails, or recent ones if no unread
        let toReply = humanEmails.filter(e => e.labels?.includes('UNREAD')).slice(0, 5);

        // If not enough unread, add some recent inbox emails
        if (toReply.length < 3) {
            const additionalEmails = humanEmails
                .filter(e => (e.labels?.includes('INBOX') || e.labels?.length === 0) && !toReply.some(r => r.id === e.id))
                .slice(0, 5 - toReply.length);
            toReply = [...toReply, ...additionalEmails];
        }

        // Final fallback: if labels are missing or inbox is unusual, still surface a few recent emails
        if (toReply.length === 0 && humanEmails.length > 0) {
            toReply = humanEmails.slice(0, 3);
        }

        // Unanswered threads: Emails older than 12 hours that are still in inbox
        const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
        let unanswered = humanEmails.filter(e => {
            const emailDate = new Date(e.date).getTime();
            return emailDate < twelveHoursAgo && (e.labels?.includes('INBOX') || e.labels?.length === 0);
        }).slice(0, 5);

        // If still not enough unanswered, just show some emails from inbox
        if (unanswered.length < 2 && humanEmails.length > toReply.length) {
            const remaining = humanEmails
                .filter(e => !toReply.some(r => r.id === e.id) && !unanswered.some(u => u.id === e.id))
                .slice(0, 5 - unanswered.length);
            unanswered = [...unanswered, ...remaining];
        }

        // Final fallback: if everything is "too fresh" or labels missing, still provide something to demo
        if (unanswered.length === 0 && humanEmails.length > 0) {
            unanswered = humanEmails.filter(e => !toReply.some(r => r.id === e.id)).slice(0, 2);
        }

        const analysis = {
            toReply,
            unanswered
        };

        console.log(`📊 Analysis: ${toReply.length} emails to reply, ${unanswered.length} unanswered threads`);

        return Response.json({
            emails: emailsWithDetails,
            analysis,
            debug: {
                listedCount: messageIds.length,
                detailsFetched: emailsWithDetails.length,
                detailErrors,
                usedFallbackHuman
            }
        });

    } catch (error) {
        console.error('=== ERROR IN ONBOARDING EMAIL FETCH ===');
        console.error('Error:', error);

        const message = error?.message || 'Failed to fetch emails';
        const needsReauth = /sign out and sign back in|Google permissions missing|Google authentication required/i.test(message);

        return Response.json(
            { error: 'Failed to fetch emails', details: message, needsReauth, emails: [], analysis: { toReply: [], unanswered: [] } },
            { status: needsReauth ? 403 : 500 }
        );
    }
}
