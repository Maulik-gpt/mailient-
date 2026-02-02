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

        // Get user ID
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Get business profile
        const { data: profile, error } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching profile:', error);
            return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
        }

        return NextResponse.json({ profile: profile || null });
    } catch (error) {
        console.error('Profile fetch error:', error);
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

        // Upsert business profile
        const { data: profile, error } = await supabase
            .from('business_profiles')
            .upsert({
                user_id: user.id,
                name: body.name,
                url: body.url,
                description: body.description,
                value_proposition: body.valueProposition,
                target_audience: body.targetAudience,
                industry: body.industry,
                tone: body.tone || 'professional',
                ai_analysis: body.aiAnalysis || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving profile:', error);
            return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
        }

        return NextResponse.json({ profile });
    } catch (error) {
        console.error('Profile save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
