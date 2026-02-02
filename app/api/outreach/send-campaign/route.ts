import { NextRequest, NextResponse } from 'next/server';
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

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get user ID
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get user's Gmail tokens
        const tokens = await getGmailTokens(session.user.email);

        if (!tokens?.accessToken) {
            return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 });
        }

        // 1. Create campaign record in database
        const { data: campaign, error: campaignError } = await supabase
            .from('outreach_campaigns')
            .insert({
                user_id: user.id,
                name: name || `Campaign ${new Date().toLocaleDateString()}`,
                subject,
                body,
                status: 'active',
                total_prospects: prospects.length,
                follow_up_days: followUpDays || 3
            })
            .select()
            .single();

        if (campaignError) throw campaignError;

        // 2. Queue emails for sending (this would ideally be a background job)
        // For now, we'll send them directly but update the database
        const sendResults = await sendCampaignEmails(
            tokens.accessToken,
            tokens.refreshToken,
            prospects,
            subject,
            body,
            session.user.email,
            campaign.id,
            user.id
        );

        return NextResponse.json({
            campaignId: campaign.id,
            name: campaign.name,
            queued: prospects.length,
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
    senderEmail: string,
    campaignId: string,
    userId: string
) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results = { sent: 0, failed: 0 };

    for (const prospect of prospects) {
        let emailRecordId = null;
        try {
            // 1. Create a "pending" email record
            const { data: emailRecord } = await supabase
                .from('campaign_emails')
                .insert({
                    campaign_id: campaignId,
                    prospect_id: prospect.id,
                    to_email: prospect.email,
                    to_name: prospect.name,
                    subject: personalizeTemplate(subject, prospect),
                    body: personalizeTemplate(body, prospect),
                    status: 'pending'
                })
                .select()
                .single();

            emailRecordId = emailRecord?.id;

            // 2. Personalize and add tracking pixel
            const personalizedSubject = personalizeTemplate(subject, prospect);
            const personalizedBody = personalizeTemplate(body, prospect);

            // Add pixel (Base URL should come from env)
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            const trackingPixel = `<img src="${baseUrl}/api/outreach/track/open?cid=${campaignId}&eid=${emailRecordId}" width="1" height="1" style="display:none;" />`;
            const htmlBody = personalizedBody.replace(/\n/g, '<br/>') + trackingPixel;

            // 3. Send via Gmail API
            const sendResult = await sendGmailEmail(
                accessToken,
                refreshToken as string,
                prospect.email,
                personalizedSubject,
                htmlBody,
                senderEmail
            );

            // 4. Update record to "sent"
            await supabase
                .from('campaign_emails')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    gmail_message_id: sendResult.id
                })
                .eq('id', emailRecordId);

            // 5. Atomic increment of sent count
            await supabase.rpc('increment_campaign_sent_count', {
                campaign_id_input: campaignId
            });

            results.sent++;

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.error(`Failed to send to ${prospect.email}:`, error);
            results.failed++;

            if (emailRecordId) {
                await supabase
                    .from('campaign_emails')
                    .update({ status: 'failed' })
                    .eq('id', emailRecordId);
            }
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
    // Create raw email (HTML format)
    const emailLines = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
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
        console.error('Gmail API detail:', error);
        throw new Error(error.error?.message || 'Gmail API error');
    }

    return response.json();
}
