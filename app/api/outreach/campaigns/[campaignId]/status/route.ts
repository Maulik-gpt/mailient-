import { NextRequest, NextResponse } from 'next/server';

// @ts-expect-error - auth.js module
import { auth } from '@/lib/auth';

export async function PATCH(
    req: NextRequest,
    { params }: { params: { campaignId: string } }
) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { status } = await req.json();

        if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
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

        // Update campaign status
        const updateData: any = {
            status,
            updated_at: new Date().toISOString()
        };

        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
        }

        const { data: campaign, error } = await supabase
            .from('outreach_campaigns')
            .update(updateData)
            .eq('id', params.campaignId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('Update status error:', error);
            return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
        }

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('Status update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
