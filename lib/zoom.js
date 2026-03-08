/**
 * Zoom Service for creating Zoom meetings
 * Handles meeting creation and management via Zoom API
 */
export class ZoomService {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://api.zoom.us/v2';
    }

    /**
     * Create a Zoom meeting
     */
    async createMeeting({
        topic,
        agenda,
        startTime,
        duration,
        timezone = 'UTC',
    }) {
        try {
            const response = await fetch(`${this.baseUrl}/users/me/meetings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: topic || 'Meeting',
                    type: 2, // Scheduled meeting
                    start_time: startTime,
                    duration: Math.ceil(duration / 60), // Convert milliseconds to minutes
                    timezone: timezone,
                    agenda: agenda || '',
                    settings: {
                        host_video: true,
                        participant_video: true,
                        join_before_host: false,
                        mute_upon_entry: false,
                        waiting_room: false,
                        audio: 'both',
                        auto_recording: 'none',
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Zoom API error: ${response.status}`);
            }

            const data = await response.json();

            // Return in a format similar to Google Calendar events for consistency
            return {
                id: data.id,
                summary: data.topic,
                description: data.agenda,
                start: {
                    dateTime: data.start_time,
                    timeZone: data.timezone,
                },
                end: {
                    dateTime: new Date(new Date(data.start_time).getTime() + data.duration * 60000).toISOString(),
                    timeZone: data.timezone,
                },
                zoomLink: data.join_url,
                hostZoomLink: data.start_url,
                meetingId: data.id,
                password: data.password,
                attendees: [],
            };
        } catch (error) {
            console.error('❌ Error creating Zoom meeting:', error);
            throw error;
        }
    }

    /**
     * Get Zoom user profile
     */
    async getUserProfile() {
        try {
            const response = await fetch(`${this.baseUrl}/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to get Zoom user profile: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching Zoom user profile:', error);
            throw error;
        }
    }
}
