import { DatabaseService } from './supabase';
import { decrypt } from './crypto';

/**
 * Mission tools adapter
 * Performs real-world actions like sending emails and creating meetings.
 * Use ARCUS_AGENT_SANDBOX=true to enable simulation mode.
 */

const SANDBOX_MODE = process.env.ARCUS_AGENT_SANDBOX === 'true';

export class MissionTools {
  constructor(userEmail) {
    this.userEmail = userEmail;
    this.db = new DatabaseService();
  }

  async _getGmailService() {
    const userTokens = await this.db.getUserTokens(this.userEmail);
    if (!userTokens?.encrypted_access_token) {
      return null;
    }

    const accessToken = decrypt(userTokens.encrypted_access_token);
    const refreshToken = userTokens.encrypted_refresh_token
      ? decrypt(userTokens.encrypted_refresh_token)
      : '';

    const { GmailService } = await import('./gmail');
    const gmailService = new GmailService(accessToken, refreshToken);
    gmailService.setUserEmail?.(this.userEmail);
    return gmailService;
  }

  async _getCalendarService() {
    const userTokens = await this.db.getUserTokens(this.userEmail);
    if (!userTokens?.encrypted_access_token) {
      return null;
    }

    const accessToken = decrypt(userTokens.encrypted_access_token);
    const refreshToken = userTokens.encrypted_refresh_token
      ? decrypt(userTokens.encrypted_refresh_token)
      : '';

    const { CalendarService } = await import('./calendar');
    return new CalendarService(accessToken, refreshToken);
  }

  /**
   * search_email(query, filters) -> threads[]
   */
  async searchEmail(query, filters = {}) {
    const gmail = await this._getGmailService();
    if (!gmail) {
      return { threads: [], query, filters, count: 0, error: 'Gmail not connected. User needs to connect their Gmail account in settings.' };
    }

    const qParts = [query || ''];
    if (filters.from) qParts.push(`from:${filters.from}`);
    if (filters.to) qParts.push(`to:${filters.to}`);
    if (filters.domain) qParts.push(`{from:${filters.domain} to:${filters.domain}}`);
    if (filters.hasAttachment) qParts.push('has:attachment');
    if (filters.newerThanDays) qParts.push(`newer_than:${filters.newerThanDays}d`);

    const q = qParts.filter(Boolean).join(' ');

    try {
      const emailsResponse = await gmail.getEmails(10, q, null, 'internalDate desc');
      const messages = emailsResponse?.messages || [];

      if (messages.length === 0) {
        return { threads: [], query: q, filters, count: 0 };
      }

      const threads = [];
      for (const message of messages) {
        try {
          const details = await gmail.getEmailDetails(message.id);
          const parsed = gmail.parseEmailData(details);
          threads.push({
            thread_id: parsed.threadId || message.threadId || message.id,
            subject: parsed.subject || '(No subject)',
            participants: [parsed.from, parsed.to].filter(Boolean),
            last_message_at: parsed.date || null,
            snippet: parsed.snippet || '',
          });
        } catch (e) { console.warn('Search details failed:', e.message); }
      }

      return { threads, query: q, filters, count: threads.length };
    } catch (e) {
      console.error('Gmail search failed:', e);
      // Map API errors to user-friendly messages per spec
      const msg = e.message || '';
      if (msg.includes('401') || msg.includes('expired')) {
        return { threads: [], query: q, filters, count: 0, error: 'Gmail access token expired. You may need to reconnect Gmail in settings.' };
      } else if (msg.includes('403')) {
        return { threads: [], query: q, filters, count: 0, error: 'Gmail permission denied. You need to grant email access in settings.' };
      } else if (msg.includes('Circuit breaker')) {
        return { threads: [], query: q, filters, count: 0, error: 'Too many Gmail requests. Please wait a moment and try again.' };
      }
      return { threads: [], query: q, filters, count: 0, error: `Gmail error: ${msg}` };
    }
  }

  /**
   * get_thread(thread_id) -> messages[]
   */
  async getThread(threadId) {
    const gmail = await this._getGmailService();
    if (!gmail) {
      return { thread_id: threadId, messages: [], error: 'Gmail not connected' };
    }
    if (!threadId) {
      return { thread_id: threadId, messages: [], error: 'No thread ID provided' };
    }

    const thread = await gmail.getThreadDetails(threadId);
    const messages = (thread.messages || []).slice(-3).map((m) => {
      const parsed = gmail.parseEmailData(m);
      return {
        id: parsed.id,
        from: parsed.from,
        to: parsed.to,
        date: parsed.date,
        subject: parsed.subject,
        body: parsed.body || parsed.snippet || '',
      };
    });

    return { thread_id: threadId, messages };
  }

  /**
   * send_email(payload) -> message_id
   */
  async sendEmail(payload, safetyFlags = []) {
    const to = Array.isArray(payload.to) ? payload.to[0] : payload.to;

    if (SANDBOX_MODE) {
      console.log('--- SANDBOX SEND ---', { to, subject: payload.subject });
      return {
        message_id: `sim_${Date.now()}`,
        thread_id: payload.threadId,
        final_recipients: [to],
        sandbox: true
      };
    }

    const gmail = await this._getGmailService();
    if (!gmail) throw new Error('Gmail not connected');

    const result = await gmail.sendEmail({
      to,
      subject: payload.subject,
      body: payload.body,
      threadId: payload.threadId,
    });

    return {
      message_id: result.id,
      thread_id: result.threadId,
      final_recipients: [to],
      api_result: result,
      safety_flags: safetyFlags,
      sandbox: false,
    };
  }

  /**
   * create_draft(payload) -> draft_id
   */
  async createDraft(payload) {
    const to = Array.isArray(payload.to) ? payload.to[0] : payload.to;

    if (SANDBOX_MODE) {
      console.log('--- SANDBOX DRAFT ---', { to, subject: payload.subject });
      return {
        draft_id: `sim_draft_${Date.now()}`,
        thread_id: payload.threadId,
        final_recipients: [to],
        sandbox: true
      };
    }

    const gmail = await this._getGmailService();
    if (!gmail) throw new Error('Gmail not connected');

    const result = await gmail.createDraft({
      to,
      subject: payload.subject,
      body: payload.body,
      threadId: payload.threadId,
    });

    return {
      draft_id: result.id,
      message_id: result.message?.id,
      thread_id: result.message?.threadId,
      final_recipients: [to],
      api_result: result,
      sandbox: false,
    };
  }

  /**
   * get_availability(attendees, window, duration, timezone) -> slots[]
   */
  async getAvailability({ attendees = [], window, duration = 30, timezone = 'UTC' }) {
    const calendar = await this._getCalendarService();
    if (!calendar) {
      return { slots: [], error: 'Calendar not connected' };
    }

    // Default window: next 3 days
    const now = new Date();
    const timeMin = window?.start || now.toISOString();
    const timeMax = window?.end || new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const busySlots = await calendar.getBusySlots(timeMin, timeMax);

      // Basic slot generation: find 9-5 slots that are not busy
      // For this spec, we'll return 3 suggested slots based on free gaps
      const suggestedSlots = [];
      let current = new Date(timeMin);
      current.setMinutes(0, 0, 0);
      if (current < now) current = new Date(now.getTime() + 60 * 60000); // Start 1h from now if window is past

      while (suggestedSlots.length < 3 && current < new Date(timeMax)) {
        // Skip non-business hours 9-17 for simplicity
        const hour = current.getHours();
        if (hour < 9 || hour >= 17) {
          current.setDate(current.getDate() + 1);
          current.setHours(9, 0, 0, 0);
          continue;
        }

        const slotEnd = new Date(current.getTime() + duration * 60000);
        const isBusy = busySlots.some(busy => {
          const bStart = new Date(busy.start);
          const bEnd = new Date(busy.end);
          return (current < bEnd && slotEnd > bStart);
        });

        if (!isBusy) {
          suggestedSlots.push({
            start: current.toISOString(),
            end: slotEnd.toISOString(),
            timezone
          });
          current = new Date(current.getTime() + 120 * 60000); // Gap between suggestions
        } else {
          current = new Date(current.getTime() + 30 * 60000);
        }
      }

      // Check for Cal.com integration in user profile
      const profile = await this.db.getUserProfile(this.userEmail);
      const calLink = profile?.integrations?.['cal.com'] ? `https://cal.com/${profile.username || 'user'}` : null;

      return {
        slots: suggestedSlots,
        cal_link: calLink,
        provider: 'google_calendar'
      };
    } catch (e) {
      console.error('Availability error:', e);
      return { slots: [], error: e.message };
    }
  }

  /**
   * create_meeting(payload) -> event_id + meet_link
   */
  async createMeeting({ title, attendees = [], slot, notes, location = 'google_meet' }) {
    if (SANDBOX_MODE) {
      return {
        event_id: `sim_event_${Date.now()}`,
        meet_link: 'https://meet.google.com/simulated-link',
        title,
        attendees,
        sandbox: true
      };
    }

    const calendar = await this._getCalendarService();
    if (!calendar) throw new Error('Calendar not connected');

    const startTime = slot?.start || new Date().toISOString();
    const endTime = slot?.end || new Date(new Date(startTime).getTime() + 30 * 60000).toISOString();

    const result = await calendar.createMeeting({
      summary: title,
      description: notes,
      startTime,
      endTime,
      attendees: Array.isArray(attendees) ? attendees : [attendees],
      provider: location === 'zoom' ? 'zoom' : 'google'
    });

    return {
      event_id: result.id,
      meet_link: result.hangoutLink || result.htmlLink || result.zoomLink,
      title,
      attendees,
      location,
      api_result: result,
      sandbox: false,
    };
  }

  /**
   * schedule_check(mission_id, check_at) -> job_id
   * Sandbox: just returns a deterministic job id; real scheduling can be wired later.
   */
  async scheduleCheck(missionId, checkAt) {
    const jobId = `check_${missionId}_${new Date(checkAt).getTime()}`;
    return {
      job_id: jobId,
      mission_id: missionId,
      check_at: new Date(checkAt).toISOString(),
      sandbox: true,
    };
  }
}

