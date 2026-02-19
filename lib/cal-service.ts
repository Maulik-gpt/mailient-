/**
 * Cal.com Service
 * Creates booking links and scheduled events using Cal.com API v2
 */

const CAL_API_URL = process.env.CAL_API_URL || 'https://api.cal.com/v2';
const CAL_API_KEY = process.env.CAL_API_KEY || '';

interface CalEventType {
    id: number;
    slug: string;
    title: string;
    length: number; // minutes
    description?: string;
}

interface CalBookingLink {
    eventTypeId: number;
    slug: string;
    bookingUrl: string;
    title: string;
    durationMinutes: number;
}

interface CalBookingRequest {
    eventTypeId: number;
    start: string; // ISO 8601
    attendee: {
        name: string;
        email: string;
        timeZone?: string;
    };
    metadata?: Record<string, string>;
}

interface CalBooking {
    id: number;
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
    attendees: Array<{ name: string; email: string }>;
    meetingUrl?: string;
    status: string;
}

async function calRequest(path: string, options: RequestInit = {}) {
    const url = `${CAL_API_URL}${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${CAL_API_KEY}`,
            'Content-Type': 'application/json',
            'cal-api-version': '2024-08-13',
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Cal.com API error ${res.status}: ${text}`);
    }

    return res.json();
}

export class CalService {
    /**
     * Get all event types on the account
     */
    async getEventTypes(): Promise<CalEventType[]> {
        try {
            const data = await calRequest('/event-types');
            // v2 returns { status, data: { eventTypeGroups: [...] } }
            const groups = data?.data?.eventTypeGroups || data?.data || [];
            const types: CalEventType[] = [];
            for (const group of groups) {
                for (const et of group.eventTypes || []) {
                    types.push({
                        id: et.id,
                        slug: et.slug,
                        title: et.title,
                        length: et.length,
                        description: et.description,
                    });
                }
            }
            return types;
        } catch (err) {
            console.error('CalService.getEventTypes error:', err);
            return [];
        }
    }

    /**
     * Get the best event type for a given duration (in minutes)
     * Falls back to first available or creates concept link
     */
    async getBestEventType(durationMinutes: number): Promise<CalEventType | null> {
        const types = await this.getEventTypes();
        if (!types.length) return null;
        // Try exact match first, then closest
        const exact = types.find(t => t.length === durationMinutes);
        if (exact) return exact;
        return types.sort((a, b) => Math.abs(a.length - durationMinutes) - Math.abs(b.length - durationMinutes))[0];
    }

    /**
     * Get the Cal.com username for building booking URLs
     */
    async getUsername(): Promise<string> {
        try {
            const data = await calRequest('/me');
            return data?.data?.username || data?.username || 'me';
        } catch {
            return 'me';
        }
    }

    /**
     * Generate a booking page link for a given event type
     * Returns the public URL the attendee can use to book
     */
    async getBookingLink(durationMinutes: number, title?: string): Promise<CalBookingLink | null> {
        try {
            const [eventType, username] = await Promise.all([
                this.getBestEventType(durationMinutes),
                this.getUsername(),
            ]);

            if (!eventType) {
                // No event types set up — return a generic Cal.com profile link
                return {
                    eventTypeId: 0,
                    slug: '',
                    bookingUrl: `https://cal.com/${username}`,
                    title: title || 'Meeting',
                    durationMinutes,
                };
            }

            return {
                eventTypeId: eventType.id,
                slug: eventType.slug,
                bookingUrl: `https://cal.com/${username}/${eventType.slug}`,
                title: title || eventType.title,
                durationMinutes: eventType.length,
            };
        } catch (err) {
            console.error('CalService.getBookingLink error:', err);
            return null;
        }
    }

    /**
     * Create an instant booking (when we know exact attendee + time)
     */
    async createBooking(req: CalBookingRequest): Promise<CalBooking | null> {
        try {
            const data = await calRequest('/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    eventTypeId: req.eventTypeId,
                    start: req.start,
                    attendee: {
                        name: req.attendee.name,
                        email: req.attendee.email,
                        timeZone: req.attendee.timeZone || 'UTC',
                        language: 'en',
                    },
                    metadata: req.metadata || {},
                }),
            });
            return data?.data || data || null;
        } catch (err) {
            console.error('CalService.createBooking error:', err);
            return null;
        }
    }

    /**
     * List upcoming bookings
     */
    async getUpcomingBookings(limit = 5): Promise<CalBooking[]> {
        try {
            const data = await calRequest(`/bookings?status=upcoming&take=${limit}`);
            return data?.data?.bookings || data?.data || [];
        } catch {
            return [];
        }
    }
}

export const calService = new CalService();
