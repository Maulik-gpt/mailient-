// @ts-ignore
import { auth as nextAuth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';

// @ts-ignore
const auth: any = nextAuth;

export async function GET() {
    const session = await auth();
    if (!session?.user?.email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = new DatabaseService();
        const { data: profile, error } = await db.supabase
            .from('user_profiles')
            .select('name, username, avatar_url, email, preferences, invite_count, conversion_count')
            .eq('user_id', session.user.email.toLowerCase())
            .maybeSingle();

        if (error) {
            console.error('Error fetching profile:', error);
            // Default to session if table doesn't exist or error
            return Response.json({
                name: session.user.name,
                username: session.user.name?.toLowerCase().replace(/\s/g, '_'),
                picture: session.user.image,
                email: session.user.email,
                preferences: {},
                invite_count: 0,
                conversion_count: 0,
                free_pro_until: null,
            });
        }

        const prefs = profile?.preferences || {};
        return Response.json({
            name: profile?.name || session.user.name,
            username: profile?.username || session.user.name?.toLowerCase().replace(/\s/g, '_'),
            picture: profile?.avatar_url || session.user.image,
            email: session.user.email,
            preferences: prefs,
            // Referral / affiliate stats for the Rewards card
            invite_count: profile?.invite_count || 0,
            conversion_count: profile?.conversion_count || 0,
            free_pro_until: prefs.free_pro_until || null,
        });
    } catch (e) {
        console.error('Unexpected profile fetch error:', e);
        return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
