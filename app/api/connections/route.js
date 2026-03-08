import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const db = new DatabaseService();
    const connections = await db.getUserConnections(session.user.email);

    return Response.json({
      connections: connections || [],
      hasConnections: (connections || []).length > 0,
      totalConnections: (connections || []).length
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return Response.json({ 
      connections: [],
      hasConnections: false,
      totalConnections: 0
    }, { status: 200 }); // Return empty array instead of error for better UX
  }
}

