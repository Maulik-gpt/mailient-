import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
import { google } from 'googleapis';

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
 * Query params: search (optional)
 */
export async function GET(request: Request) {
    try {
        // @ts-ignore
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // @ts-ignore
        const accessToken = session?.accessToken;
        if (!accessToken) {
            return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const searchQuery = searchParams.get('search') || '';
        const limit = parseInt(searchParams.get('limit') || '100');

        // Initialize Gmail API
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Fetch messages to extract contacts
        const contactMap = new Map<string, EmailContact>();

        // Fetch sent emails
        const sentResponse = await gmail.users.messages.list({
            userId: 'me',
            q: searchQuery ? `in:sent ${searchQuery}` : 'in:sent',
            maxResults: Math.min(limit * 2, 200),
        });

        // Fetch received emails  
        const receivedResponse = await gmail.users.messages.list({
            userId: 'me',
            q: searchQuery ? `in:inbox ${searchQuery}` : 'in:inbox',
            maxResults: Math.min(limit * 2, 200),
        });

        const allMessageIds = [
            ...(sentResponse.data.messages || []),
            ...(receivedResponse.data.messages || [])
        ];

        // Process messages to extract contacts
        for (const message of allMessageIds.slice(0, limit)) {
            try {
                const msgDetails = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id!,
                    format: 'metadata',
                    metadataHeaders: ['From', 'To', 'Date', 'Subject']
                });

                const headers = msgDetails.data.payload?.headers || [];
                const fromHeader = headers.find(h => h.name === 'From')?.value || '';
                const toHeader = headers.find(h => h.name === 'To')?.value || '';
                const dateHeader = headers.find(h => h.name === 'Date')?.value || '';

                // Parse email addresses
                const parseEmailAddress = (addr: string): { email: string; name: string } | null => {
                    if (!addr) return null;

                    // Handle format: "Name <email@example.com>" or just "email@example.com"
                    const match = addr.match(/(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?/);
                    if (match && match[2]) {
                        return {
                            name: match[1]?.trim() || match[2].split('@')[0],
                            email: match[2].toLowerCase().trim()
                        };
                    }
                    return null;
                };

                const fromParsed = parseEmailAddress(fromHeader);
                const toParsed = parseEmailAddress(toHeader);

                // Skip self-emails
                const userEmail = session.user.email.toLowerCase();

                // Process sender (received email)
                if (fromParsed && fromParsed.email !== userEmail) {
                    const existingContact = contactMap.get(fromParsed.email);
                    const emailDate = new Date(dateHeader);

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
                if (toParsed && toParsed.email !== userEmail) {
                    const existingContact = contactMap.get(toParsed.email);
                    const emailDate = new Date(dateHeader);

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
        }

        // Calculate frequency for each contact
        const contacts = Array.from(contactMap.values()).map(contact => {
            const daysSinceFirst = Math.ceil(
                (new Date().getTime() - new Date(contact.firstContact).getTime()) / (1000 * 60 * 60 * 24)
            ) || 1;

            const emailsPerDay = contact.totalEmails / daysSinceFirst;

            if (emailsPerDay >= 0.5) contact.frequency = 'daily';
            else if (emailsPerDay >= 0.1) contact.frequency = 'weekly';
            else if (emailsPerDay >= 0.03) contact.frequency = 'monthly';
            else contact.frequency = 'rare';

            // Generate avatar from initials (color-coded by first letter)
            const initial = contact.name.charAt(0).toUpperCase();

            return contact;
        });

        // Sort by total emails (most contacted first)
        contacts.sort((a, b) => b.totalEmails - a.totalEmails);

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
