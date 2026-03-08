import { google } from 'googleapis';

/**
 * Calendar Service for interacting with Google Calendar API
 * Handles event creation, availability checks, and Google Meet integration
 */
export class CalendarService {
    private accessToken: string;
    private refreshToken: string;

    constructor(accessToken: string, refreshToken?: string) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken || '';
    }

    private getAuth() {
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
     * Create a Google Meet event
     */
    async createMeeting({
        summary,
        description,
        startTime,
        endTime,
        attendees = [],
    }: {
        summary: string;
        description: string;
        startTime: string;
        endTime: string;
        attendees?: string[];
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
     * Get busy slots for the primary calendar
     */
    async getBusySlots(timeMin: string, timeMax: string) {
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
