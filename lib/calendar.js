import { google } from 'googleapis';
import { ZoomService } from './zoom';

/**
 * Calendar Service for interacting with Google Calendar API and Zoom
 * Handles event creation, availability checks, and Google Meet/Zoom integration
 */
export class CalendarService {
    constructor(accessToken, refreshToken, provider = 'google') {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken || '';
        this.provider = provider;
    }

    getAuth() {
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials({
            access_token: this.accessToken,
            refresh_token: this.refreshToken,
        });
        return auth;
    }

    /**
     * Create a meeting (Google Meet or Zoom based on provider)
     */
    async createMeeting({
        summary,
        description,
        startTime,
        endTime,
        attendees = [],
        provider,
    }) {
        const selectedProvider = provider || this.provider;

        if (selectedProvider === 'zoom') {
            return this.createZoomMeeting({
                summary,
                description,
                startTime,
                endTime,
                attendees,
            });
        } else {
            return this.createGoogleMeeting({
                summary,
                description,
                startTime,
                endTime,
                attendees,
            });
        }
    }

    /**
     * Create a Google Meet event
     */
    async createGoogleMeeting({
        summary,
        description,
        startTime,
        endTime,
        attendees = [],
    }) {
        const calendar = google.calendar({ version: 'v3', auth: this.getAuth() });

        const event = {
            summary,
            description,
            start: {
                dateTime: startTime,
                timeZone: 'UTC',
            },
            end: {
                dateTime: endTime,
                timeZone: 'UTC',
            },
            attendees: attendees.map(email => ({ email })),
            conferenceData: {
                createRequest: {
                    requestId: `meet-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' },
                },
            },
        };

        try {
            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event,
                conferenceDataVersion: 1,
            });

            return response.data;
        } catch (error) {
            console.error('❌ Error creating Google Meet event:', error);
            throw error;
        }
    }

    /**
     * Create a Zoom meeting
     */
    async createZoomMeeting({
        summary,
        description,
        startTime,
        endTime,
    }) {
        try {
            const zoomService = new ZoomService(this.accessToken);
            const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

            const zoomMeeting = await zoomService.createMeeting({
                topic: summary,
                agenda: description,
                startTime: startTime,
                duration: duration,
            });

            // Also create a calendar event to track it
            const calendar = google.calendar({ version: 'v3', auth: this.getAuth() });
            const calendarEvent = {
                summary,
                description: `${description}\n\nJoin Zoom Meeting: ${zoomMeeting.zoomLink}\nMeeting ID: ${zoomMeeting.meetingId}\nPassword: ${zoomMeeting.password || 'N/A'}`,
                start: {
                    dateTime: startTime,
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: endTime,
                    timeZone: 'UTC',
                },
                location: zoomMeeting.zoomLink,
            };

            const calendarResponse = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: calendarEvent,
            });

            // Return combined data
            return {
                ...calendarResponse.data,
                zoomLink: zoomMeeting.zoomLink,
                meetingId: zoomMeeting.meetingId,
                password: zoomMeeting.password,
            };
        } catch (error) {
            console.error('❌ Error creating Zoom meeting:', error);
            throw error;
        }
    }

    /**
     * Get busy slots for the primary calendar
     */
    async getBusySlots(timeMin, timeMax) {
        const calendar = google.calendar({ version: 'v3', auth: this.getAuth() });

        try {
            const response = await calendar.freebusy.query({
                requestBody: {
                    timeMin,
                    timeMax,
                    items: [{ id: 'primary' }],
                },
            });

            return response.data.calendars?.primary?.busy || [];
        } catch (error) {
            console.error('❌ Error fetching busy slots:', error);
            throw error;
        }
    }
}
