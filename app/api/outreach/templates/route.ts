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

        // Get all email templates for the user
        const { data: templates, error } = await supabase
            .from('email_templates')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching templates:', error);
            return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
        }

        return NextResponse.json({ templates: templates || [] });
    } catch (error) {
        console.error('Templates fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, subject, body, category, isAiGenerated } = await req.json();

        if (!name || !subject || !body) {
            return NextResponse.json({ error: 'Name, subject, and body are required' }, { status: 400 });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const userId = session.user.email;

        // Create the template
        const { data: template, error } = await supabase
            .from('email_templates')
            .insert({
                user_id: userId,
                name,
                subject,
                body,
                category: category || 'general',
                is_ai_generated: isAiGenerated || false
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating template:', error);
            return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
        }

        return NextResponse.json({ template });
    } catch (error) {
        console.error('Template creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
