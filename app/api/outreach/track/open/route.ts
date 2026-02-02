import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const campaignId = searchParams.get('cid');
    const emailId = searchParams.get('eid');

    if (campaignId && emailId) {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Record the open event
            const now = new Date().toISOString();

            // Update campaign_emails table
            const { error: emailError } = await supabase
                .from('campaign_emails')
                .update({
                    status: 'opened',
                    opened_at: now
                })
                .eq('id', emailId)
                .is('opened_at', null); // Only update if not already opened

            if (!emailError) {
                // Increment opened_count in outreach_campaigns
                await supabase.rpc('increment_campaign_open_count', {
                    campaign_id_input: campaignId
                });
            }
        } catch (error) {
            console.error('Error tracking email open:', error);
        }
    }

    // Return a transparent 1x1 GIF
    const transparentGif = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64'
    );

    return new NextResponse(transparentGif, {
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}
