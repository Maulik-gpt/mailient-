import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
import { google } from 'googleapis';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface ContactDetail {
    email: string;
    name: string;
    phone?: string;
    company?: string;
    position?: string;
    address?: string;
    firstContact: string;
    lastContact: string;
    totalEmails: number;
    sentEmails: number;
    receivedEmails: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'rare';
    relationshipScore: number;
    sentimentHistory: {
        date: string;
        score: number;
    }[];
    aiSuggestion?: string;
    recentSubjects: string[];
}

/**
 * Individual Contact Profile API
 * GET: Fetch detailed profile for a specific contact
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ email: string }> }
) {
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

        const resolvedParams = await params;
        const contactEmail = decodeURIComponent(resolvedParams.email);

        // Initialize Gmail API
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Fetch all emails with this contact
        const response = await gmail.users.messages.list({
            userId: 'me',
            q: `from:${contactEmail} OR to:${contactEmail}`,
            maxResults: 100,
        });

        const messages = response.data.messages || [];

        let contactDetail: ContactDetail = {
            email: contactEmail,
            name: '',
            firstContact: new Date().toISOString(),
            lastContact: new Date().toISOString(),
            totalEmails: messages.length,
            sentEmails: 0,
            receivedEmails: 0,
            frequency: 'rare',
            relationshipScore: 50,
            sentimentHistory: [],
            recentSubjects: []
        };

        const sentimentScores: { date: string; score: number }[] = [];
        const userEmail = session.user.email.toLowerCase();

        // Process each message
        for (const message of messages) {
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
                const subjectHeader = headers.find(h => h.name === 'Subject')?.value || '';

                const emailDate = new Date(dateHeader);

                // Track first and last contact
                if (emailDate < new Date(contactDetail.firstContact)) {
                    contactDetail.firstContact = emailDate.toISOString();
                }
                if (emailDate > new Date(contactDetail.lastContact)) {
                    contactDetail.lastContact = emailDate.toISOString();
                }

                // Parse name from From header
                const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</);
                if (nameMatch && fromHeader.toLowerCase().includes(contactEmail.toLowerCase())) {
                    contactDetail.name = nameMatch[1].trim();
                }

                // Track sent vs received
                if (fromHeader.toLowerCase().includes(userEmail)) {
                    contactDetail.sentEmails++;
                    // Sent emails are neutral to slightly positive
                    sentimentScores.push({ date: emailDate.toISOString(), score: 60 });
                } else {
                    contactDetail.receivedEmails++;
                    // Received emails - analyze basic sentiment from subject
                    let sentimentScore = 50;
                    const lowerSubject = subjectHeader.toLowerCase();

                    if (lowerSubject.includes('thank') || lowerSubject.includes('great') || lowerSubject.includes('love') || lowerSubject.includes('appreciate')) {
                        sentimentScore = 80;
                    } else if (lowerSubject.includes('urgent') || lowerSubject.includes('issue') || lowerSubject.includes('problem') || lowerSubject.includes('concern')) {
                        sentimentScore = 30;
                    } else if (lowerSubject.includes('follow up') || lowerSubject.includes('reminder')) {
                        sentimentScore = 45;
                    }

                    sentimentScores.push({ date: emailDate.toISOString(), score: sentimentScore });
                }

                // Track recent subjects
                if (contactDetail.recentSubjects.length < 5) {
                    contactDetail.recentSubjects.push(subjectHeader);
                }

                // Try to extract phone/company from signature (simplified)
                // In reality, you'd parse the email body

            } catch (err) {
                console.error('Error processing message:', err);
            }
        }

        // Calculate frequency
        const daysSinceFirst = Math.ceil(
            (new Date().getTime() - new Date(contactDetail.firstContact).getTime()) / (1000 * 60 * 60 * 24)
        ) || 1;

        const emailsPerDay = contactDetail.totalEmails / daysSinceFirst;

        if (emailsPerDay >= 0.5) contactDetail.frequency = 'daily';
        else if (emailsPerDay >= 0.1) contactDetail.frequency = 'weekly';
        else if (emailsPerDay >= 0.03) contactDetail.frequency = 'monthly';
        else contactDetail.frequency = 'rare';

        // Calculate relationship score (0-100)
        const balanceRatio = Math.min(contactDetail.sentEmails, contactDetail.receivedEmails) /
            Math.max(contactDetail.sentEmails, contactDetail.receivedEmails, 1);
        const avgSentiment = sentimentScores.reduce((sum, s) => sum + s.score, 0) / (sentimentScores.length || 1);
        const frequencyBonus = emailsPerDay >= 0.5 ? 20 : emailsPerDay >= 0.1 ? 10 : 0;

        contactDetail.relationshipScore = Math.min(100, Math.round(
            (balanceRatio * 30) + (avgSentiment * 0.5) + frequencyBonus
        ));

        // Prepare sentiment history (last 10 data points)
        contactDetail.sentimentHistory = sentimentScores
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-10);

        // Generate AI suggestion using OpenRouter API
        try {
            const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY2 || '';

            if (apiKey) {
                const relationshipContext = `
                    Contact: ${contactDetail.name || contactEmail}
                    Total Emails: ${contactDetail.totalEmails}
                    Sent: ${contactDetail.sentEmails}, Received: ${contactDetail.receivedEmails}
                    Frequency: ${contactDetail.frequency}
                    Relationship Score: ${contactDetail.relationshipScore}/100
                    Recent Subjects: ${contactDetail.recentSubjects.join(', ')}
                    Days since first contact: ${daysSinceFirst}
                `;

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': process.env.HOST || 'https://mailient.xyz',
                        'X-Title': 'Mailient'
                    },
                    body: JSON.stringify({
                        model: 'google/gemini-2.0-flash-exp:free',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an AI that provides one-liner suggestions for email relationships. Keep it under 15 words, professional, and actionable.'
                            },
                            {
                                role: 'user',
                                content: `Based on this email relationship, provide a one-liner suggestion:\n${relationshipContext}`
                            }
                        ],
                        max_tokens: 50,
                        temperature: 0.3
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    contactDetail.aiSuggestion = data.choices?.[0]?.message?.content?.trim() ||
                        'Consider reaching out to maintain this connection.';
                } else {
                    contactDetail.aiSuggestion = 'Consider scheduling a follow-up to strengthen this relationship.';
                }
            } else {
                contactDetail.aiSuggestion = 'Consider scheduling a follow-up to strengthen this relationship.';
            }
        } catch (aiError) {
            console.error('AI suggestion error:', aiError);
            contactDetail.aiSuggestion = 'Consider scheduling a follow-up to strengthen this relationship.';
        }

        return NextResponse.json({
            success: true,
            contact: contactDetail,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Contact Profile API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contact profile', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
