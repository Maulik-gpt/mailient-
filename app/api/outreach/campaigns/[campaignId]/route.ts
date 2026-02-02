import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    { params }: { params: { campaignId: string } }
) {
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

        // Get campaign
        const { data: campaign, error: campaignError } = await supabase
            .from('outreach_campaigns')
            .select('*')
            .eq('id', params.campaignId)
            .eq('user_id', userId)
            .single();

        if (campaignError || !campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // Get campaign emails
        const { data: emails } = await supabase
            .from('campaign_emails')
            .select('*')
            .eq('campaign_id', params.campaignId)
            .order('created_at', { ascending: false })
            .limit(100);

        return NextResponse.json({ campaign, emails: emails || [] });
    } catch (error) {
        console.error('Campaign fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { campaignId: string } }
) {
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

        // Delete campaign (cascade will delete emails)
        const { error } = await supabase
            .from('outreach_campaigns')
            .delete()
            .eq('id', params.campaignId)
            .eq('user_id', userId);

        if (error) {
            console.error('Delete campaign error:', error);
            return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Campaign delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
