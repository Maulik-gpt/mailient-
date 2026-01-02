import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { calculateContactStrength } from '@/lib/utils';

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const useAI = searchParams.get('ai') === 'true';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit')) || 50;

    const db = new DatabaseService();

    // Fetch all emails for the user (limit to a reasonable number)
    const emails = await db.getUserEmails(session.user.email, 1000, 0);

    // Transform to match the expected format
    const formattedEmails = emails.map(email => ({
      id: email.email_id,
      threadId: email.thread_id,
      subject: email.subject,
      from: email.from_email,
      to: email.to_email,
      date: email.date,
      snippet: email.snippet,
      labels: JSON.parse(email.labels || '[]')
    }));

    let contacts = [];

    // Use basic algorithmic analysis
    console.log('Using basic algorithmic analysis for chats');
    contacts = calculateContactStrength(formattedEmails, session.user.email);

    // Filter by search if provided
    if (search) {
      contacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(search.toLowerCase()) ||
        contact.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Enhance with additional chat-specific data
    contacts = contacts.map(contact => ({
      ...contact,
      lastActivity: new Date().toISOString(), // Mock data
      messageCount: Math.floor(Math.random() * 100) + 1 // Mock data
    }));

    // Sort by relationship score and activity
    contacts.sort((a, b) => {
      if (b.relationship_score !== a.relationship_score) {
        return b.relationship_score - a.relationship_score;
      }
      return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
    });

    return Response.json({
      contacts: contacts.slice(0, limit),
      ai_available: false,
      ai_enabled: false,
      analysis_type: 'algorithmic',
      total_contacts: contacts.length,
      search_applied: search || null
    });

  } catch (error) {
    console.error('Error fetching chats:', error);
    return Response.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

