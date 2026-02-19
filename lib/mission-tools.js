import { DatabaseService } from './supabase';
import { decrypt } from './crypto';

/**
 * Mission tools adapter
 * All high-risk operations are sandboxed and never send emails or create real meetings.
 */

const SANDBOX_MODE = process.env.ARCUS_AGENT_SANDBOX !== 'false';

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

  /**
   * search_email(query, filters) -> threads[]
   */
  async searchEmail(query, filters = {}) {
    const gmail = await this._getGmailService();
    if (!gmail) {
      return { threads: [], query, filters, count: 0 };
    }

    const qParts = [query || ''];
    if (filters.from) qParts.push(`from:${filters.from}`);
    if (filters.to) qParts.push(`to:${filters.to}`);
    if (filters.domain) qParts.push(`{from:${filters.domain} to:${filters.domain}}`);
    if (filters.hasAttachment) qParts.push('has:attachment');
    if (filters.newerThanDays) qParts.push(`newer_than:${filters.newerThanDays}d`);

    const q = qParts.filter(Boolean).join(' ');
    const emailsResponse = await gmail.getEmails(10, q, null, 'internalDate desc');
    const messages = emailsResponse?.messages || [];

    if (messages.length === 0) {
      return { threads: [], query: q, filters, count: 0 };
    }

    const threads = [];
    for (const message of messages) {
      const details = await gmail.getEmailDetails(message.id);
      const parsed = gmail.parseEmailData(details);
      threads.push({
        thread_id: parsed.threadId || message.threadId || message.id,
        subject: parsed.subject || '(No subject)',
        participants: [parsed.from, parsed.to].filter(Boolean),
        last_message_at: parsed.date || null,
        snippet: parsed.snippet || '',
      });
    }

    return { threads, query: q, filters, count: threads.length };
  }

  /**
   * get_thread(thread_id) -> messages[]
   */
  async getThread(threadId) {
    const gmail = await this._getGmailService();
    if (!gmail || !threadId) {
      return { thread_id: threadId, messages: [] };
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
   * create_draft(thread_id, to, cc, subject, body) -> draft_id
   * Sandbox: store a virtual draft only; do not call Gmail drafts API.
   */
  async createDraft({ threadId, to, cc = [], subject, body }) {
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const db = this.db;

    try {
      await db.createMissionDraft?.(this.userEmail, {
        id: draftId,
        threadId,
        to,
        cc,
        subject,
        body,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('MissionTools.createDraft: draft persistence not available, continuing in-memory only');
    }

    return {
      draft_id: draftId,
      thread_id: threadId,
      to,
      cc,
      subject,
      body,
    };
  }

  /**
   * send_email(draft_id | raw_payload) -> message_id
   * Sandbox: never actually send; just echo a simulated message id.
   */
  async sendEmail(payload, safetyFlags = []) {
    if (!SANDBOX_MODE) {
      // In the future this could call a real send, but for now we always sandbox.
      console.warn('MissionTools.sendEmail: SANDBOX_MODE disabled path is not implemented; falling back to sandbox');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const threadId = payload.threadId || payload.thread_id || null;

    return {
      message_id: messageId,
      thread_id: threadId,
      final_recipients: payload.to || payload.sendTo || [],
      cc: payload.cc || [],
      safety_flags: safetyFlags,
      sandbox: true,
    };
  }

  /**
   * get_availability(attendees, window, duration, timezone) -> slots[]
   * Sandbox: compute simple, deterministic slots without calling external calendars.
   */
  async getAvailability({ attendees = [], window, duration = 30, timezone = 'UTC' }) {
    const now = new Date();
    const start = window?.start ? new Date(window.start) : now;
    const baseHour = start.getHours() < 9 ? 9 : start.getHours();

    const slots = [];
    for (let i = 0; i < 3; i++) {
      const slotStart = new Date(start);
      slotStart.setHours(baseHour + i * 2, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);

      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        timezone,
        attendees,
      });
    }

    return { slots };
  }

  /**
   * create_meeting(title, attendees, slot, location, notes) -> event_id + meet_link
   * Sandbox: returns a fake event id and meet link, no external calls.
   */
  async createMeeting({ title, attendees = [], slot, location = 'google_meet', notes }) {
    const eventId = `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const meetLink = `https://meet.google.com/${Math.random().toString(36).slice(2, 5)}-${Math.random()
      .toString(36)
      .slice(2, 5)}-${Math.random().toString(36).slice(2, 5)}`;

    return {
      event_id: eventId,
      meet_link: location === 'google_meet' ? meetLink : null,
      title,
      attendees,
      slot,
      location,
      notes,
      sandbox: true,
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

