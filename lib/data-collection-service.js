/**
 * Data Collection Service
 * Collects and processes email, calendar, and social signal data for relationship analysis
 */

import { JSDOM } from 'jsdom';

export class DataCollectionService {
  constructor(gmailService, dbService) {
    this.gmail = gmailService;
    this.db = dbService;
  }

  /**
   * Main data collection function
   */
  async collectAndProcessData(userId, options = {}) {
    const {
      collectEmails = true,
      collectCalendarEvents = false, // Limited by Gmail API scope
      analyzeExistingEmails = true,
      maxEmails = 500
    } = options;

    try {
      console.log('Starting data collection for user:', userId);

      // Collect new emails if requested
      if (collectEmails) {
        await this.collectEmails(userId, maxEmails);
      }

      // Analyze existing emails if requested
      if (analyzeExistingEmails) {
        await this.analyzeExistingEmails(userId);
      }

      // Collect calendar events if requested (requires calendar scope)
      if (collectCalendarEvents) {
        await this.collectCalendarEvents(userId);
      }

      console.log('Data collection completed for user:', userId);
      return { success: true };

    } catch (error) {
      console.error('Error in data collection:', error);
      throw error;
    }
  }

  /**
   * Collect emails from Gmail API and store in database
   */
  async collectEmails(userId, maxEmails = 500) {
    try {
      console.log('Collecting emails for user:', userId);

      // Get existing emails to avoid duplicates
      const existingEmails = await this.db.getUserEmails(userId, 10000, 0);
      const existingIds = new Set(existingEmails.map(email => email.email_id));

      // Fetch emails from Gmail API
      const gmailResponse = await this.gmail.getEmails(maxEmails, '', null, 'internalDate desc');
      const messages = gmailResponse.messages || [];

      console.log(`Found ${messages.length} messages from Gmail API`);

      // Process and store new emails
      let newEmailsCount = 0;
      for (const message of messages) {
        if (existingIds.has(message.id)) {
          continue; // Skip already processed emails
        }

        try {
          const details = await this.gmail.getEmailDetails(message.id);
          const parsedEmail = this.parseEmailForStorage(details, userId);

          await this.db.insertUserEmail(parsedEmail);
          newEmailsCount++;

          // Also create email analysis record
          await this.createEmailAnalysisRecord(details, userId);

        } catch (error) {
          console.error(`Error processing email ${message.id}:`, error);
          // Continue with other emails
        }
      }

      console.log(`Stored ${newEmailsCount} new emails`);
      return { newEmailsCount };

    } catch (error) {
      console.error('Error collecting emails:', error);
      throw error;
    }
  }

  /**
   * Analyze existing emails for relationship insights
   */
  async analyzeExistingEmails(userId) {
    try {
      console.log('Analyzing existing emails for user:', userId);

      // Get all emails for the user
      const emails = await this.db.getUserEmails(userId, 5000, 0);

      // Group emails by contact
      const contactEmails = new Map();

      emails.forEach(email => {
        const contacts = this.extractContactsFromEmail(email, userId);
        contacts.forEach(contact => {
          if (!contactEmails.has(contact)) {
            contactEmails.set(contact, []);
          }
          contactEmails.get(contact).push(email);
        });
      });

      // Analyze each contact's emails
      let analyzedContacts = 0;
      for (const [contactEmail, contactEmailList] of contactEmails) {
        try {
          await this.analyzeContactEmails(userId, contactEmail, contactEmailList);
          analyzedContacts++;
        } catch (error) {
          console.error(`Error analyzing emails for contact ${contactEmail}:`, error);
        }
      }

      console.log(`Analyzed emails for ${analyzedContacts} contacts`);
      return { analyzedContacts };

    } catch (error) {
      console.error('Error analyzing existing emails:', error);
      throw error;
    }
  }

  /**
   * Parse email data for database storage
   */
  parseEmailForStorage(emailData, userId) {
    const headers = emailData.payload?.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

    // Parse date safely
    let date = new Date().toISOString();
    const dateHeader = getHeader('date');
    if (dateHeader) {
      try {
        const parsedDate = new Date(dateHeader);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toISOString();
        }
      } catch (error) {
        console.warn('Invalid date format in email headers:', dateHeader);
      }
    }

    return {
      user_id: userId,
      email_id: emailData.id,
      thread_id: emailData.threadId,
      subject: getHeader('subject') || 'No Subject',
      from_email: this.extractEmailFromHeader(getHeader('from')),
      to_email: this.extractEmailsFromHeader(getHeader('to')).join(', '),
      date: date,
      snippet: emailData.snippet || '',
      labels: JSON.stringify(emailData.labelIds || [])
    };
  }

  /**
   * Create detailed email analysis record
   */
  async createEmailAnalysisRecord(emailData, userId) {
    try {
      const headers = emailData.payload?.headers || [];
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;

      const fromEmail = this.extractEmailFromHeader(getHeader('from'));
      const toEmails = this.extractEmailsFromHeader(getHeader('to'));

      // Analyze each recipient
      for (const toEmail of toEmails) {
        if (toEmail === userId) continue; // Skip user's own email

        const analysis = await this.analyzeEmailContent(emailData, fromEmail, toEmail);

        await this.db.insertEmailAnalysis({
          user_id: userId,
          email_id: emailData.id,
          contact_email: toEmail,
          thread_id: emailData.threadId,
          subject: getHeader('subject') || 'No Subject',
          sent_date: new Date(getHeader('date') || Date.now()).toISOString(),
          is_inbound: fromEmail !== userId,
          ...analysis
        });
      }

    } catch (error) {
      console.error('Error creating email analysis record:', error);
      throw error;
    }
  }

  /**
   * Analyze email content for engagement metrics
   */
  async analyzeEmailContent(emailData, fromEmail, toEmail) {
    const analysis = {
      word_count: 0,
      character_count: 0,
      sentiment_score: 50, // Neutral baseline
      sentiment_magnitude: 0,
      topic_categories: [],
      urgency_score: 0,
      importance_score: 0,
      has_attachments: false,
      has_links: false,
      has_questions: false,
      response_time_hours: null,
      thread_position: 1,
      thread_length: 1
    };

    try {
      // Extract email body
      const body = this.extractEmailBody(emailData.payload);
      const fullContent = `${emailData.snippet || ''} ${body}`.trim();

      if (fullContent) {
        analysis.word_count = fullContent.split(/\s+/).length;
        analysis.character_count = fullContent.length;

        // Simple sentiment analysis (can be enhanced with proper NLP)
        analysis.sentiment_score = this.calculateSimpleSentiment(fullContent);
        analysis.sentiment_magnitude = Math.abs(analysis.sentiment_score - 50) / 50 * 100;

        // Topic extraction
        analysis.topic_categories = this.extractTopics(fullContent);

        // Detect urgency and importance
        analysis.urgency_score = this.detectUrgency(fullContent);
        analysis.importance_score = this.detectImportance(fullContent);

        // Detect engagement indicators
        analysis.has_attachments = this.hasAttachments(emailData.payload);
        analysis.has_links = this.hasLinks(fullContent);
        analysis.has_questions = this.hasQuestions(fullContent);
      }

      // Calculate thread metrics if thread_id exists
      if (emailData.threadId) {
        try {
          const threadDetails = await this.gmail.getThreadDetails(emailData.threadId);
          analysis.thread_length = threadDetails.messages?.length || 1;

          // Find position in thread
          const messages = threadDetails.messages || [];
          const messageIndex = messages.findIndex(msg => msg.id === emailData.id);
          analysis.thread_position = messageIndex >= 0 ? messageIndex + 1 : 1;

          // Calculate response time if this is not the first message
          if (analysis.thread_position > 1 && messages.length > 1) {
            const prevMessage = messages[messageIndex - 1];
            const currentDate = new Date(emailData.internalDate || Date.now());
            const prevDate = new Date(prevMessage.internalDate || Date.now());
            analysis.response_time_hours = (currentDate - prevDate) / (1000 * 60 * 60);
          }
        } catch (error) {
          console.warn('Error getting thread details:', error);
        }
      }

    } catch (error) {
      console.error('Error analyzing email content:', error);
    }

    return analysis;
  }

  /**
   * Extract email body from payload
   */
  extractEmailBody(payload) {
    if (!payload) return '';

    // Handle different payload structures
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      // Find text/plain or text/html part
      const textPart = payload.parts.find(part =>
        part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );

      if (textPart?.body?.data) {
        return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }

      // Recursively search in nested parts
      for (const part of payload.parts) {
        const body = this.extractEmailBody(part);
        if (body) return body;
      }
    }

    return '';
  }

  /**
   * Simple sentiment analysis (can be replaced with proper NLP service)
   */
  calculateSimpleSentiment(text) {
    if (!text) return 50;

    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased', 'thank', 'thanks', 'appreciate', 'perfect', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'angry', 'sad', 'disappointed', 'sorry', 'apologize', 'problem', 'issue', 'error', 'fail', 'wrong'];

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) return 50;

    // Calculate sentiment score (0-100, 50 is neutral)
    const sentimentRatio = positiveCount / totalSentimentWords;
    return Math.round(40 + (sentimentRatio * 20)); // Scale to 40-60 range, then normalize
  }

  /**
   * Extract topics from email content
   */
  extractTopics(text) {
    if (!text) return ['general'];

    const topics = [];
    const lowerText = text.toLowerCase();

    const topicPatterns = {
      'business': ['business', 'company', 'corporate', 'enterprise', 'industry', 'market', 'revenue', 'profit', 'sales'],
      'technical': ['technical', 'development', 'code', 'software', 'api', 'system', 'server', 'database', 'programming'],
      'personal': ['personal', 'family', 'weekend', 'vacation', 'holiday', 'birthday', 'celebration', 'weekend'],
      'project': ['project', 'deadline', 'milestone', 'deliverable', 'timeline', 'schedule', 'task', 'work'],
      'meeting': ['meeting', 'call', 'conference', 'discussion', 'sync', 'catch up', 'touch base'],
      'support': ['support', 'help', 'issue', 'problem', 'troubleshoot', 'bug', 'error', 'question'],
      'social': ['linkedin', 'twitter', 'facebook', 'social media', 'networking', 'connection']
    };

    Object.entries(topicPatterns).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics.length > 0 ? topics : ['general'];
  }

  /**
   * Detect urgency in email content
   */
  detectUrgency(text) {
    if (!text) return 0;

    const urgencyKeywords = ['urgent', 'asap', 'immediately', 'deadline', 'critical', 'important', 'rush', 'quickly', 'soon', 'emergency'];
    const lowerText = text.toLowerCase();

    let urgencyScore = 0;
    urgencyKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        urgencyScore += 20;
      }
    });

    // Check for exclamation marks (can indicate urgency)
    const exclamationCount = (text.match(/!/g) || []).length;
    urgencyScore += Math.min(exclamationCount * 5, 30);

    return Math.min(urgencyScore, 100);
  }

  /**
   * Detect importance in email content
   */
  detectImportance(text) {
    if (!text) return 0;

    const importanceKeywords = ['important', 'priority', 'crucial', 'essential', 'key', 'critical', 'significant', 'major'];
    const lowerText = text.toLowerCase();

    let importanceScore = 0;
    importanceKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        importanceScore += 15;
      }
    });

    // Check for numbers (can indicate priorities, dates, metrics)
    const numberCount = (text.match(/\d+/g) || []).length;
    importanceScore += Math.min(numberCount * 2, 20);

    return Math.min(importanceScore, 100);
  }

  /**
   * Check if email has attachments
   */
  hasAttachments(payload) {
    if (!payload) return false;

    // Check payload parts for attachments
    if (payload.parts) {
      return payload.parts.some(part =>
        part.filename &&
        part.body &&
        part.body.attachmentId
      );
    }

    return false;
  }

  /**
   * Check if email content has links
   */
  hasLinks(text) {
    if (!text) return false;
    const urlRegex = /https?:\/\/[^\s]+/gi;
    return urlRegex.test(text);
  }

  /**
   * Check if email content has questions
   */
  hasQuestions(text) {
    if (!text) return false;
    const questionRegex = /\?+/g;
    return questionRegex.test(text);
  }

  /**
   * Extract email addresses from header
   */
  extractEmailFromHeader(headerValue) {
    if (!headerValue) return '';

    const emailMatch = headerValue.match(/<([^>]+)>/) || headerValue.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return emailMatch ? emailMatch[1].toLowerCase() : headerValue.trim().toLowerCase();
  }

  /**
   * Extract multiple email addresses from header
   */
  extractEmailsFromHeader(headerValue) {
    if (!headerValue) return [];

    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = headerValue.match(emailRegex) || [];
    return matches.map(email => email.toLowerCase());
  }

  /**
   * Extract contacts from email
   */
  extractContactsFromEmail(email, userEmail) {
    const contacts = [];

    if (email.from_email && email.from_email !== userEmail) {
      contacts.push(email.from_email);
    }

    if (email.to_email) {
      const toEmails = email.to_email.split(',').map(e => e.trim());
      toEmails.forEach(toEmail => {
        if (toEmail && toEmail !== userEmail && toEmail.includes('@')) {
          contacts.push(toEmail);
        }
      });
    }

    return [...new Set(contacts)]; // Remove duplicates
  }

  /**
   * Analyze emails for a specific contact
   */
  async analyzeContactEmails(userId, contactEmail, emails) {
    try {
      // Update contact record with basic info
      const contactInfo = {
        user_id: userId,
        email: contactEmail,
        first_contact_date: null,
        last_contact_date: null,
        total_emails: emails.length
      };

      // Calculate date range
      const dates = emails.map(email => new Date(email.date)).sort((a, b) => a - b);
      if (dates.length > 0) {
        contactInfo.first_contact_date = dates[0].toISOString();
        contactInfo.last_contact_date = dates[dates.length - 1].toISOString();
      }

      await this.db.upsertContact(contactInfo);

      // Create detailed email analysis records for missing ones
      for (const email of emails) {
        const existingAnalysis = await this.db.getEmailAnalysis(userId, email.email_id, contactEmail);
        if (!existingAnalysis) {
          try {
            const details = await this.gmail.getEmailDetails(email.email_id);
            await this.createEmailAnalysisRecord(details, userId);
          } catch (error) {
            console.error(`Error creating analysis for email ${email.email_id}:`, error);
          }
        }
      }

    } catch (error) {
      console.error(`Error analyzing contact ${contactEmail}:`, error);
      throw error;
    }
  }

  /**
   * Collect calendar events (requires calendar scope)
   */
  async collectCalendarEvents(userId) {
    try {
      console.log('Collecting calendar events for user:', userId);

      // Note: This would require Google Calendar API scope
      // For now, we'll log that this feature needs calendar scope
      console.log('Calendar collection requires additional Google Calendar API scope');

      return { message: 'Calendar scope required' };

    } catch (error) {
      console.error('Error collecting calendar events:', error);
      throw error;
    }
  }
}