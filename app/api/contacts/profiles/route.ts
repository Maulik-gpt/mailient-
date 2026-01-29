import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
// @ts-ignore
import { GmailService } from '@/lib/gmail';
// @ts-ignore
import { DatabaseService } from '@/lib/supabase.js';
// @ts-ignore
import { decrypt } from '@/lib/crypto.js';
// @ts-ignore
import { subscriptionService } from '@/lib/subscription-service.js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface EmailContact {
    email: string;
    name: string;
    avatar?: string;
    firstContact: string;
    lastContact: string;
    totalEmails: number;
    sentEmails: number;
    receivedEmails: number;
    phone?: string;
    company?: string;
    sentiment: {
        positive: number;
        negative: number;
        neutral: number;
    };
    frequency: 'daily' | 'weekly' | 'monthly' | 'rare';
}

/**
 * Email Profiles API - Extract all contacts from Gmail history
 * GET: Fetch all unique contacts
 */
export async function GET(request: Request) {
    try {
        // @ts-ignore
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userEmail = session.user.email.toLowerCase();

        // 🔒 SECURITY: Check subscription
        const hasSubscription = await subscriptionService.isSubscriptionActive(userEmail);
        if (!hasSubscription) {
            return NextResponse.json({
                error: 'subscription_required',
                message: 'An active subscription is required to access your network.'
            }, { status: 403 });
        }

        // Get tokens
        let accessToken = session.accessToken;
        let refreshToken = session.refreshToken;

        // Fetch tokens from database if missing from session
        const db = new DatabaseService();
        if (!accessToken || !refreshToken) {
            try {
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
            return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const searchQuery = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        // Initialize Gmail service
        const gmailService = new GmailService(accessToken, refreshToken || '');
        gmailService.setUserEmail(userEmail);

        // Fetch messages to extract contacts
        const contactMap = new Map<string, EmailContact>();

        // Fetch sent and inbox emails in parallel
        const [sentResponse, receivedResponse] = await Promise.all([
            gmailService.getEmails(Math.min(limit * 2, 100), searchQuery ? `in:sent ${searchQuery}` : 'in:sent'),
            gmailService.getEmails(Math.min(limit * 2, 100), searchQuery ? `in:inbox ${searchQuery}` : 'in:inbox')
        ]);

        const allMessages = [
            ...(sentResponse.messages || []),
            ...(receivedResponse.messages || [])
        ];

        // Process messages in batches of 10 to avoid timeouts and rate limits
        const messagesToProcess = allMessages.slice(0, 40);
        const batchSize = 10;

        for (let i = 0; i < messagesToProcess.length; i += batchSize) {
            const batch = messagesToProcess.slice(i, i + batchSize);
            await Promise.all(batch.map(async (message) => {
                try {
                    const msgDetails = await gmailService.getEmailDetails(message.id);
                    const parsed = gmailService.parseEmailData(msgDetails);

                    const fromHeader = parsed.from;
                    const toHeader = parsed.to;
                    const dateHeader = parsed.date;

                    // Parse email addresses
                    const parseEmailAddress = (addr: string): { email: string; name: string } | null => {
                        if (!addr) return null;
                        const match = addr.match(/(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?/);
                        if (match && match[2]) {
                            const email = match[2].toLowerCase().trim();
                            let name = match[1]?.trim() || '';

                            // If no name provided, try to extract from email
                            if (!name) {
                                name = email.split('@')[0];
                            }

                            // Check if name looks like a hash/random string (more than 20 chars with numbers)
                            const looksLikeHash = name.length > 20 && /\d/.test(name) && !/\s/.test(name);
                            if (looksLikeHash) {
                                // Use the domain part instead, formatted nicely
                                const domain = email.split('@')[1]?.split('.')[0] || 'Unknown';
                                name = domain.charAt(0).toUpperCase() + domain.slice(1);
                            }

                            return { name, email };
                        }
                        return null;
                    };

                    // Filter out automated/system email addresses
                    const isAutomatedEmail = (email: string): boolean => {
                        const lowerEmail = email.toLowerCase();
                        const automatedPatterns = [
                            'noreply', 'no-reply', 'donotreply', 'do-not-reply',
                            'unsubscribe', 'notifications', 'notification',
                            'mailer-daemon', 'postmaster', 'bounce',
                            'newsletter', 'marketing', 'promo', 'promotions',
                            'updates@', 'info@', 'support@', 'hello@', 'team@',
                            'customer.io', 'sendgrid', 'mailchimp', 'mailgun',
                            'amazonses', 'postmarkapp', 'mandrill', 'sparkpost',
                            'campaign', 'broadcast', 'bulk', 'mass',
                            '.customer.io', 'reply+', 'reply-'
                        ];

                        // Check if email matches any automated pattern
                        for (const pattern of automatedPatterns) {
                            if (lowerEmail.includes(pattern)) {
                                return true;
                            }
                        }

                        // Check if local part (before @) is a long hash-like string
                        const localPart = lowerEmail.split('@')[0];
                        if (localPart.length > 30 && /^[a-z0-9]+$/.test(localPart)) {
                            return true;
                        }

                        return false;
                    };

                    const fromParsed = parseEmailAddress(fromHeader);
                    const toParsed = parseEmailAddress(toHeader);

                    const emailDate = new Date(dateHeader);
                    if (isNaN(emailDate.getTime())) return;

                    // Process sender (received email)
                    if (fromParsed && fromParsed.email !== userEmail && !isAutomatedEmail(fromParsed.email)) {
                        const existingContact = contactMap.get(fromParsed.email);
                        if (existingContact) {
                            existingContact.receivedEmails++;
                            existingContact.totalEmails++;
                            if (emailDate < new Date(existingContact.firstContact)) {
                                existingContact.firstContact = emailDate.toISOString();
                            }
                            if (emailDate > new Date(existingContact.lastContact)) {
                                existingContact.lastContact = emailDate.toISOString();
                            }
                        } else {
                            contactMap.set(fromParsed.email, {
                                email: fromParsed.email,
                                name: fromParsed.name,
                                firstContact: emailDate.toISOString(),
                                lastContact: emailDate.toISOString(),
                                totalEmails: 1,
                                sentEmails: 0,
                                receivedEmails: 1,
                                sentiment: { positive: 0, negative: 0, neutral: 1 },
                                frequency: 'rare'
                            });
                        }
                    }

                    // Process recipient (sent email)
                    if (toParsed && toParsed.email !== userEmail && !isAutomatedEmail(toParsed.email)) {
                        const existingContact = contactMap.get(toParsed.email);
                        if (existingContact) {
                            existingContact.sentEmails++;
                            existingContact.totalEmails++;
                            if (emailDate < new Date(existingContact.firstContact)) {
                                existingContact.firstContact = emailDate.toISOString();
                            }
                            if (emailDate > new Date(existingContact.lastContact)) {
                                existingContact.lastContact = emailDate.toISOString();
                            }
                        } else {
                            contactMap.set(toParsed.email, {
                                email: toParsed.email,
                                name: toParsed.name,
                                firstContact: emailDate.toISOString(),
                                lastContact: emailDate.toISOString(),
                                totalEmails: 1,
                                sentEmails: 1,
                                receivedEmails: 0,
                                sentiment: { positive: 0, negative: 0, neutral: 1 },
                                frequency: 'rare'
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error processing message:', err);
                }
            }));
        }

        // Calculate frequency and sort
        const contacts = Array.from(contactMap.values()).map(contact => {
            const daysSinceFirst = Math.ceil(
                (new Date().getTime() - new Date(contact.firstContact).getTime()) / (1000 * 60 * 60 * 24)
            ) || 1;

            const emailsPerDay = contact.totalEmails / daysSinceFirst;

            if (emailsPerDay >= 0.5) contact.frequency = 'daily';
            else if (emailsPerDay >= 0.1) contact.frequency = 'weekly';
            else if (emailsPerDay >= 0.03) contact.frequency = 'monthly';
            else contact.frequency = 'rare';

            return contact;
        });

        contacts.sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime());

        return NextResponse.json({
            success: true,
            contacts: contacts.slice(0, limit),
            totalCount: contacts.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Email Profiles API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch email profiles', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
