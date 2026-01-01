import { DatabaseService } from '../../../lib/supabase.js';
import { auth } from '../../../lib/auth.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const maxResults = parseInt(searchParams.get('maxResults')) || 50;
    const page = parseInt(searchParams.get('page')) || 0;

    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const db = new DatabaseService();
    const offset = page * maxResults;
    const emails = await db.getUserEmails(session.user.email, maxResults, offset);

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

    return Response.json({
      emails: formattedEmails,
      totalResults: emails.length, // For now, just return the count
      nextPageToken: emails.length === maxResults ? (page + 1).toString() : null
    });

  } catch (error) {
    console.error('Error fetching emails from DB:', error);
    return Response.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

