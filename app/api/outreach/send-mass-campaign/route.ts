import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, personalizedEmails, sendImmediately = false, scheduleTime } = await req.json();

        if (!personalizedEmails?.length) {
            return NextResponse.json({ error: 'No emails to send' }, { status: 400 });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const userId = session.user.email;

        // Get user's Gmail tokens
        const tokens = await getGmailTokens(session.user.email);
        if (!tokens?.accessToken) {
            return NextResponse.json({ error: 'Gmail not connected' }, { status: 401 });
        }

        // Create campaign record
        const { data: campaign, error: campaignError } = await supabase
            .from('outreach_campaigns')
            .insert({
                user_id: userId,
                name: name || `Mass Campaign ${new Date().toLocaleDateString()}`,
                status: sendImmediately ? 'sending' : 'draft',
                total_prospects: personalizedEmails.length,
                follow_up_days: 3
            })
            .select()
            .single();

        if (campaignError) throw campaignError;

        // Queue all emails for sending
        const queueResults = await queueMassEmails(
            personalizedEmails,
            campaign.id,
            userId,
            sendImmediately,
            scheduleTime
        );

        return NextResponse.json({
            campaignId: campaign.id,
            name: campaign.name,
            totalEmails: personalizedEmails.length,
            queued: queueResults.queued,
            status: sendImmediately ? 'sending' : 'scheduled',
            message: `Successfully ${sendImmediately ? 'started sending' : 'queued'} ${queueResults.queued} emails`
        });
    } catch (error) {
        console.error('Mass campaign send error:', error);
        return NextResponse.json({ 
            error: 'Failed to send mass campaign',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

async function queueMassEmails(
    personalizedEmails: any[],
    campaignId: string,
    userId: string,
    sendImmediately: boolean,
    scheduleTime?: string
) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const emailRecords = personalizedEmails.map(email => ({
        campaign_id: campaignId,
        prospect_id: email.prospectId,
        to_email: email.to,
        to_name: email.name,
        subject: email.subject,
        body: email.body,
        status: sendImmediately ? 'pending' : 'scheduled',
        scheduled_at: scheduleTime || null,
        created_at: new Date().toISOString()
    }));

    // Insert all email records in bulk
    const { data, error } = await supabase
        .from('campaign_emails')
        .insert(emailRecords)
        .select();

    if (error) throw error;

    // If sending immediately, start the background sending process
    if (sendImmediately) {
        // In a production environment, this would be a background job
        // For now, we'll trigger it asynchronously
        setTimeout(() => {
            sendMassEmailsBackground(campaignId, userId).catch(console.error);
        }, 1000);
    }

    return {
        queued: emailRecords.length,
        records: data
    };
}

async function sendMassEmailsBackground(campaignId: string, userId: string) {
    console.log(`Starting background email sending for campaign ${campaignId}`);
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user's Gmail tokens
    const tokens = await getGmailTokens(userId);
    if (!tokens?.accessToken) {
        console.error('No Gmail tokens available for user', userId);
        return;
    }

    // Get pending emails for this campaign
    const { data: pendingEmails, error } = await supabase
        .from('campaign_emails')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(100); // Process in batches of 100

    if (error) {
        console.error('Error fetching pending emails:', error);
        return;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
        console.log('No pending emails to send for campaign', campaignId);
        return;
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const emailRecord of pendingEmails) {
        try {
            // Add tracking pixel
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            const trackingPixel = `<img src="${baseUrl}/api/outreach/track/open?cid=${campaignId}&eid=${emailRecord.id}" width="1" height="1" style="display:none;" />`;
            const htmlBody = emailRecord.body.replace(/\n/g, '<br/>') + trackingPixel;

            // Send via Gmail API
            await sendGmailEmail(
                tokens.accessToken,
                tokens.refreshToken as string,
                emailRecord.to_email,
                emailRecord.subject,
                htmlBody,
                userId
            );

            // Update record to sent
            await supabase
                .from('campaign_emails')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString()
                })
                .eq('id', emailRecord.id);

            sentCount++;

            // Rate limiting - wait between emails
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error(`Failed to send email ${emailRecord.id}:`, error);
            
            // Update record to failed
            await supabase
                .from('campaign_emails')
                .update({
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : String(error)
                })
                .eq('id', emailRecord.id);

            failedCount++;
        }
    }

    // Update campaign status
    await supabase
        .from('outreach_campaigns')
        .update({
            status: 'sent',
            sent_count: sentCount,
            failed_count: failedCount,
            completed_at: new Date().toISOString()
        })
        .eq('id', campaignId);

    console.log(`Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);

    // If there are still pending emails, continue processing
    const { count: remainingCount } = await supabase
        .from('campaign_emails')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

    if (remainingCount && remainingCount > 0) {
        // Continue processing remaining emails
        setTimeout(() => {
            sendMassEmailsBackground(campaignId, userId).catch(console.error);
        }, 5000);
    }
}

async function getGmailTokens(email: string) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data } = await supabase
        .from('user_tokens')
        .select('encrypted_access_token, encrypted_refresh_token')
        .eq('google_email', email)
        .single();

    if (!data) return null;

    const { decrypt } = await import('@/lib/crypto');
    return {
        accessToken: decrypt(data.encrypted_access_token),
        refreshToken: decrypt(data.encrypted_refresh_token)
    };
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
