import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, username, picture } = await req.json();
        const db = new DatabaseService();
        
        const { error } = await db.supabase
            .from('user_profiles')
            .update({ 
                name, 
                username,
                avatar_url: picture,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', session.user.email.toLowerCase());

        if (error) throw error;

        return Response.json({ success: true });
    } catch (error: any) {
        console.error('Update profile error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
