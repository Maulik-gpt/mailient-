import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { logEvent } from "@/lib/logsso";

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
    logEvent({ channel: "failures", event: "❌ API Error", description: String(error) });
        console.error('Delete account error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
