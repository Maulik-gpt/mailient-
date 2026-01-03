import { google } from 'googleapis';
import { DatabaseService } from '@/lib/supabase.js';
import { auth } from '@/lib/auth.js';
import { decrypt } from '@/lib/crypto.js';

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const db = new DatabaseService();
    const profile = await db.getUserProfile(session.user.email);
    if (profile?.integrations?.['google-calendar'] === false) {
      return Response.json({ error: 'Google Calendar integration is disabled' }, { status: 403 });
    }

    const tokens = await db.getUserTokens(session.user.email);
    if (!tokens) {
      return Response.json({ error: 'No tokens found' }, { status: 404 });
    }

    const hasCalendarScope = tokens.scopes?.includes('https://www.googleapis.com/auth/calendar');
    if (!hasCalendarScope) {
      return Response.json({ error: 'Calendar scope not granted' }, { status: 403 });
    }

    const body = await request.json();
    const { summary, description, start, end, attendees, reminders, includeMeet } = body;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: decrypt(tokens.encrypted_access_token),
      refresh_token: decrypt(tokens.encrypted_refresh_token),
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create event
    const event = {
      summary,
      description,
      start: {
        dateTime: start,
        timeZone: 'UTC',
      },
      end: {
        dateTime: end,
        timeZone: 'UTC',
      },
      attendees,
      reminders: reminders || {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 10 },
          { method: 'popup', minutes: 0 }
        ]
      },
    };

    // Add conference data if includeMeet is true
    if (includeMeet) {
      event.conferenceData = {
        createRequest: {
          requestId: Math.random().toString(36).substring(7),
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      };
    }

    const res = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
    });

    return Response.json({ event: res.data });

  } catch (error) {
    console.error('Error creating calendar event:', error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return Response.json({ error: 'No session' }, { status: 401 });
    }

    const db = new DatabaseService();
    const profile = await db.getUserProfile(session.user.email);
    if (profile?.integrations?.['google-calendar'] === false) {
      return Response.json({ error: 'Google Calendar integration is disabled' }, { status: 403 });
    }

    const tokens = await db.getUserTokens(session.user.email);
    if (!tokens) {
      return Response.json({ error: 'No tokens found' }, { status: 404 });
    }

    const hasCalendarScope = tokens.scopes?.includes('https://www.googleapis.com/auth/calendar');
    if (!hasCalendarScope) {
      return Response.json({ error: 'Calendar scope not granted' }, { status: 403 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: decrypt(tokens.encrypted_access_token),
      refresh_token: decrypt(tokens.encrypted_refresh_token),
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch upcoming events
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items;

    return Response.json({ events });

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

