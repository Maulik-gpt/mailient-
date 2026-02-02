import { NextRequest, NextResponse } from 'next/server';
// @ts-expect-error - auth.js module doesn't have type definitions
import { auth } from '@/lib/auth';

interface Prospect {
    id: string;
    name: string;
    email: string;
    jobTitle: string;
    company: string;
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, subject, body, prospects, followUpDays } = await req.json();

        if (!subject || !body || !prospects?.length) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get user's Gmail tokens
        const tokens = await getGmailTokens(session.user.email);

        if (!tokens?.accessToken) {
            return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 });
        }

        // Create campaign record
        const campaignId = crypto.randomUUID();

        // Queue emails for sending (using batch processing)
        const sendResults = await sendCampaignEmails(
            tokens.accessToken,
            tokens.refreshToken,
            prospects,
            subject,
            body,
            session.user.email
        );

        return NextResponse.json({
            campaignId,
            name: name || `Campaign ${new Date().toLocaleDateString()}`,
            queued: sendResults.queued,
            sent: sendResults.sent,
            failed: sendResults.failed
        });
    } catch (error) {
        console.error('Campaign send error:', error);
        return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
    }
}

async function getGmailTokens(email: string) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await supabase
        .from('users')
        .select('access_token, refresh_token')
        .eq('email', email)
        .single();

    return data ? { accessToken: data.access_token, refreshToken: data.refresh_token } : null;
}

async function sendCampaignEmails(
    accessToken: string,
    refreshToken: string,
    prospects: Prospect[],
    subject: string,
    body: string,
    senderEmail: string
) {
    const results = { sent: 0, failed: 0, queued: prospects.length };

    for (const prospect of prospects) {
        try {
            // Personalize the email
            const personalizedSubject = personalizeTemplate(subject, prospect);
            const personalizedBody = personalizeTemplate(body, prospect);

            // Send via Gmail API
            await sendGmailEmail(
                accessToken,
                refreshToken,
                prospect.email,
                personalizedSubject,
                personalizedBody,
                senderEmail
            );

            results.sent++;

            // Rate limiting - wait between sends to avoid Gmail limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Failed to send to ${prospect.email}:`, error);
            results.failed++;
        }
    }

    return results;
}

function personalizeTemplate(template: string, prospect: Prospect): string {
    return template
        .replace(/\{\{name\}\}/gi, prospect.name.split(' ')[0])
        .replace(/\{\{fullName\}\}/gi, prospect.name)
        .replace(/\{\{company\}\}/gi, prospect.company)
        .replace(/\{\{jobTitle\}\}/gi, prospect.jobTitle)
        .replace(/\{\{email\}\}/gi, prospect.email);
}

async function sendGmailEmail(
    accessToken: string,
    refreshToken: string,
    to: string,
    subject: string,
    body: string,
    from: string
) {
    // Create raw email
    const emailLines = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
    ];

    const rawEmail = Buffer.from(emailLines.join('\r\n'))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawEmail })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gmail API error');
    }

    return response.json();
}
