import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const userId = session.user.email;

        // Get all campaigns for the user
        const { data: campaigns, error } = await supabase
            .from('outreach_campaigns')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching campaigns:', error);
            return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
        }

        return NextResponse.json({ campaigns: campaigns || [] });
    } catch (error) {
        console.error('Campaigns fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, subject, body: emailBody, status = 'draft', followUpDays = 3 } = body;

        if (!name || !subject || !emailBody) {
            return NextResponse.json({ error: 'Name, subject, and body are required' }, { status: 400 });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const userId = session.user.email;

        // Create the campaign
        const { data: campaign, error } = await supabase
            .from('outreach_campaigns')
            .insert({
                user_id: userId,
                name,
                subject,
                body: emailBody,
                status,
                follow_up_days: followUpDays,
                total_prospects: 0,
                sent_count: 0,
                opened_count: 0,
                replied_count: 0,
                bounced_count: 0
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating campaign:', error);
            return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
        }

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('Campaign creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
