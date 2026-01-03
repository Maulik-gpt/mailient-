import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';

// Create a calendar event for Arcus-driven scheduling
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      summary,
      description = '',
      start,
      end,
      attendees = [],
      reminders,
      includeMeet = false,
      timeZone = 'UTC',
    } = body || {};

    if (!summary || !start || !end) {
      return NextResponse.json(
        { error: 'Missing required fields: summary, start, end' },
        { status: 400 }
      );
    }

    const db = new DatabaseService();
    const profile = await db.getUserProfile(session.user.email);
    if (profile?.integrations?.['google-calendar'] === false) {
      return NextResponse.json(
        { error: 'Google Calendar integration is disabled' },
        { status: 403 }
      );
    }

    const tokens = await db.getUserTokens(session.user.email);
    if (!tokens?.encrypted_access_token) {
      return NextResponse.json(
        { error: 'Google Calendar not connected. Please sign in with Google.' },
        { status: 400 }
      );
    }

    const hasCalendarScope = tokens.scopes?.includes('https://www.googleapis.com/auth/calendar');
    if (!hasCalendarScope) {
      return NextResponse.json(
        { error: 'Calendar scope not granted. Reconnect Google with calendar permissions.' },
        { status: 403 }
      );
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: decrypt(tokens.encrypted_access_token),
      refresh_token: decrypt(tokens.encrypted_refresh_token),
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const event = {
      summary,
      description,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
      attendees,
      reminders:
        reminders ||
        {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 10 },
            { method: 'popup', minutes: 0 },
          ],
        },
    };

    if (includeMeet) {
      event.conferenceData = {
        createRequest: {
          requestId: Math.random().toString(36).substring(7),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: includeMeet ? 1 : 0,
    });

    return NextResponse.json({
      success: true,
      event: response.data,
    });
  } catch (error) {
    console.error('Schedule meeting endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to schedule meeting', details: error.message },
      { status: 500 }
    );
  }
}

