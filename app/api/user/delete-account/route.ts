import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';

export async function DELETE() {
    const session = await auth();
    if (!session?.user?.email) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = new DatabaseService();
        await db.deleteUserData(session.user.email.toLowerCase());
        
        return Response.json({ success: true });
    } catch (error: any) {
        console.error('Delete account error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
