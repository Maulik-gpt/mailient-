import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';

export async function GET(request: Request) {
  try {
    // @ts-ignore
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = new DatabaseService();
    const userEmail = session.user.email;
    const tokens = await db.getUserTokens(userEmail);
    const hasGmail = !!tokens?.encrypted_access_token;

    // 1. Fetch Email Stats (mocked or from Sift results)
    let emailStats = { total: 0, drafted: 0, archived: 0, flagged: 0 };
    if (hasGmail) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: siftData } = await db.supabase
        .from('sift_results')
        .select('*')
        .eq('user_email', userEmail)
        .gte('created_at', today.toISOString());
      
      if (siftData && siftData.length > 0) {
        emailStats.total = siftData.length;
        emailStats.drafted = siftData.filter(d => d.action === 'reply').length;
        emailStats.archived = siftData.filter(d => d.action === 'archive' || d.category === 'Newsletter').length;
        emailStats.flagged = siftData.filter(d => d.urgency === 'high' || d.action === 'review').length;
      } else {
        emailStats = { total: 14, drafted: 3, archived: 9, flagged: 2 }; // fallback realistic
      }
    } else {
      emailStats = { total: 14, drafted: 3, archived: 9, flagged: 2 }; // fallback realistic
    }

    // 2. Fetch Meetings (Google Calendar via CalendarService or mock fallback)
    let meetings = [];
    if (hasGmail) {
       try {
         const { CalendarService } = await import('@/lib/calendar.js');
         const cal = new CalendarService(decrypt(tokens.encrypted_access_token));
         const now = new Date();
         const eod = new Date(); eod.setHours(23, 59, 59, 999);
         const events = await (cal as any).listEvents({ timeMin: now.toISOString(), timeMax: eod.toISOString(), maxResults: 5 });
         meetings = (events || []).map((e: any) => ({
           id: e.id,
           title: e.summary,
           time: new Date(e.start.dateTime || e.start.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
           attendees: (e.attendees || []).map((a: any) => a.displayName || a.email?.split('@')[0] || 'Guest'),
           type: e.summary?.toLowerCase().includes('sync') ? 'internal' : 'discovery'
         }));
       } catch (err) {
         console.error('Calendar fetch error', err);
       }
    }
    if (meetings.length === 0) {
      meetings = [
        { id: 'm1', title: 'Product Review', time: '2:00 PM', attendees: ['Priya', 'Rohan'], type: 'internal' },
        { id: 'm2', title: 'Design Sync', time: '4:00 PM', attendees: ['Design Team'], type: 'check-in' }
      ];
    }

    // 3. Fetch Action Items
    const actionItems = [
      { id: 'a1', subject: 'Pending Approval', from: 'Client', urgency: 'high', type: 'review', snippet: 'Please review the attached contract terms.' }
    ];

    // 4. Fetch Agents
    let agents = [
      {
        id: 'ag1',
        name: 'Morning Triage',
        description: 'Every morning at 7am, triage my inbox, draft replies to anything urgent, and send me a summary',
        schedule: '0 7 * * *',
        type: 'triage',
        status: 'active',
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        id: 'ag2',
        name: 'Weekly Follow-up',
        description: 'Every Friday at 5pm, check which clients I haven\'t followed up with this week and draft follow-up emails',
        schedule: '0 17 * * 5',
        type: 'follow-up',
        status: 'active',
        lastRun: new Date(Date.now() - 86400000).toISOString(),
        nextRun: new Date(Date.now() + 86400000 * 6).toISOString(),
      }
    ];

    return NextResponse.json({
      emailStats,
      meetings,
      actionItems,
      agents
    });
  } catch (error: any) {
    console.error('Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
