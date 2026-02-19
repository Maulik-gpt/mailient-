/**
 * Google Calendar Service
 * Handles meeting creation and Google Meet link generation
 */

export interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    start: string;
    end: string;
    meetLink?: string;
    htmlLink?: string;
}

export class GoogleCalendarService {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    /**
     * Create a calendar event with Google Meet link
     */
    async createMeeting(params: {
        summary: string;
        description?: string;
        startTime: string; // ISO string
        endTime: string;   // ISO string
        attendees?: string[];
    }): Promise<CalendarEvent | null> {
        try {
            const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';

            const body = {
                summary: params.summary,
                description: params.description,
                start: { dateTime: params.startTime },
                end: { dateTime: params.endTime },
                attendees: params.attendees?.map(email => ({ email })),
                conferenceData: {
                    createRequest: {
                        requestId: `meet-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.text();
                console.error('❌ Google Calendar API error:', error);
                return null;
            }

            const data = await response.json();

            return {
                id: data.id,
                summary: data.summary,
                description: data.description,
                start: data.start.dateTime,
                end: data.end.dateTime,
                meetLink: data.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri,
                htmlLink: data.htmlLink
            };
        } catch (error) {
            console.error('❌ Google Calendar Service error:', error);
            return null;
        }
    }

    /**
     * List upcoming events
     */
    async listUpcomingEvents(maxResults = 5): Promise<CalendarEvent[]> {
        try {
            const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (!response.ok) return [];

            const data = await response.json();
            return (data.items || []).map((item: any) => ({
                id: item.id,
                summary: item.summary,
                description: item.description,
                start: item.start.dateTime || item.start.date,
                end: item.end.dateTime || item.end.date,
                meetLink: item.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri,
                htmlLink: item.htmlLink
            }));
        } catch (error) {
            return [];
        }
    }
}
