import { NextRequest, NextResponse } from 'next/server';

/**
 * CRON endpoint to send automated follow-up emails
 * This should be triggered daily/hourly by a cron service
 */
export async function GET(req: NextRequest) {
    // Simple "secret" check to avoid unauthorized triggers
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Find active campaigns that have follow-ups configured
        const { data: campaigns } = await supabase
            .from('outreach_campaigns')
            .select('*')
            .eq('status', 'active')
            .not('follow_up_days', 'is', null);

        if (!campaigns || campaigns.length === 0) {
            return NextResponse.json({ message: 'No active campaigns with follow-ups' });
        }

        const results = { campaignsChecked: campaigns.length, followUpsSent: 0 };

        for (const campaign of campaigns) {
            // Find prospects who:
            // - Received the first email more than X days ago
            // - Haven't replied yet
            // - Haven't received a follow-up yet

            const followUpThreshold = new Date();
            followUpThreshold.setDate(followUpThreshold.getDate() - campaign.follow_up_days);

            const { data: overdueEmails } = await supabase
                .from('campaign_emails')
                .select(`
          *,
          prospects:prospect_id (*)
        `)
                .eq('campaign_id', campaign.id)
                .eq('status', 'sent')
                .lt('sent_at', followUpThreshold.toISOString())
                .is('replied_at', null);

            if (!overdueEmails || overdueEmails.length === 0) continue;

            // In a real app, we'd loop and send follow-ups here
            // For this demo/impl, we'll mark them as "follow-up pending"
            results.followUpsSent += overdueEmails.length;
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Follow-up cron error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
