import { NextResponse } from 'next/server';
import { google } from 'googleapis';

function getAccessTokenFromHeaders(request) {
  const bearer = request.headers.get('authorization');
  if (bearer?.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }
  return request.headers.get('x-gmail-access-token') || null;
}

// Public webhook: schedule meetings for ElevenLabs tool calls
export async function POST(request) {
  try {
    const accessToken = getAccessTokenFromHeaders(request);
    const refreshToken = request.headers.get('x-gmail-refresh-token') || '';
    const userEmail = request.headers.get('x-user-email') || undefined;

    const { subscriptionService, FEATURE_TYPES } = await import('@/lib/subscription-service.js');

    // Check subscription if user email is provided
    if (userEmail) {
      const canUse = await subscriptionService.canUseFeature(userEmail, FEATURE_TYPES.SCHEDULE_CALL);
      if (!canUse) {
        const usage = await subscriptionService.getFeatureUsage(userEmail, FEATURE_TYPES.SCHEDULE_CALL);
        return NextResponse.json({
          error: {
            code: 'limit_reached',
            message: `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
            upgradeUrl: '/pricing'
          }
        }, { status: 403 });
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: { code: 'missing_token', message: 'x-gmail-access-token header is required' } },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      title,
      summary,
      description = '',
      start,
      end,
      attendees = [],
      location = '',
      time_zone = 'UTC',
      include_meet = false,
    } = body || {};

    const eventTitle = summary || title;

    if (!eventTitle || !start || !end) {
      return NextResponse.json(
        { error: { code: 'invalid_input', message: 'title/summary, start, and end are required' } },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken || undefined,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const event = {
      summary: eventTitle,
      description,
      location,
      start: { dateTime: start, timeZone: time_zone },
      end: { dateTime: end, timeZone: time_zone },
      attendees: Array.isArray(attendees)
        ? attendees
          .filter(Boolean)
          .map((email) => (typeof email === 'string' ? { email } : email))
        : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 10 },
          { method: 'popup', minutes: 0 },
        ],
      },
    };

    if (include_meet) {
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
      conferenceDataVersion: include_meet ? 1 : 0,
    });

    if (userEmail) {
      await subscriptionService.incrementFeatureUsage(userEmail, FEATURE_TYPES.SCHEDULE_CALL);
    }

    return NextResponse.json({
      success: true,
      status: 'scheduled',
      user_email: userEmail || null,
      event_id: response.data.id,
      html_link: response.data.htmlLink,
      start,
      end,
      attendees: event.attendees,
    });
  } catch (error) {
    console.error('schedule_meeting webhook error:', error);
    return NextResponse.json(
      { error: { code: 'server_error', message: 'Failed to schedule meeting', detail: error.message } },
      { status: 500 }
    );
  }
}

