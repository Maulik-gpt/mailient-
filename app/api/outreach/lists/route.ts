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

        // Get all prospect lists for the user
        const { data: lists, error } = await supabase
            .from('prospect_lists')
            .select(`
        *,
        prospects:prospects(count)
      `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching lists:', error);
            return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 });
        }

        return NextResponse.json({ lists: lists || [] });
    } catch (error) {
        console.error('Lists fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description, prospects } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'List name is required' }, { status: 400 });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const userId = session.user.email;

        // Create the list
        const { data: list, error: listError } = await supabase
            .from('prospect_lists')
            .insert({
                user_id: userId,
                name,
                description: description || '',
                prospect_count: prospects?.length || 0
            })
            .select()
            .single();

        if (listError) {
            console.error('Error creating list:', listError);
            return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
        }

        // Add prospects to the list if provided
        if (prospects && prospects.length > 0) {
            const prospectRecords = prospects.map((p: any) => ({
                list_id: list.id,
                user_id: userId,
                name: p.name,
                email: p.email,
                job_title: p.jobTitle,
                company: p.company,
                company_domain: p.companyDomain,
                location: p.location,
                industry: p.industry,
                linkedin_url: p.linkedinUrl,
                verified: p.verified
            }));

            const { error: prospectsError } = await supabase
                .from('prospects')
                .insert(prospectRecords);

            if (prospectsError) {
                console.error('Error adding prospects:', prospectsError);
                // Don't fail the request, list was created successfully
            }
        }

        return NextResponse.json({ list, prospectsAdded: prospects?.length || 0 });
    } catch (error) {
        console.error('List creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
