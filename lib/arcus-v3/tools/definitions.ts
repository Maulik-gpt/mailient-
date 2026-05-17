/**
 * Arcus V3 — Tool definitions for Claude's tool_use format.
 *
 * These are sent to the LLM on every request so it can decide
 * which tools to call. Executor maps these names to real API calls.
 */

export const ARCUS_TOOLS = [
  {
    name: 'search_gmail',
    description:
      'Search the user\'s Gmail inbox. Accepts any Gmail search operator: from:, to:, subject:, is:unread, is:starred, has:attachment, after:YYYY/MM/DD, before:YYYY/MM/DD, etc. Returns email summaries with IDs you can pass to read_email.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Gmail search query string',
        },
        maxResults: {
          type: 'number',
          description: 'Max emails to return (default 10, max 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_email',
    description:
      'Read the full content of a specific email including body, sender, recipients, and date. Pass the messageId from search_gmail results.',
    input_schema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'string',
          description: 'Gmail message ID',
        },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'draft_reply',
    description:
      'Create a Gmail draft reply to an email. The draft is saved and displayed to the user for review before sending. Use this when the user asks you to write, compose, or draft an email response.',
    input_schema: {
      type: 'object',
      properties: {
        threadId: {
          type: 'string',
          description: 'Gmail thread ID (threadId field from search_gmail or read_email results)',
        },
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject (typically "Re: <original subject>")',
        },
        body: {
          type: 'string',
          description: 'Email body in plain text. Write in a professional but conversational tone.',
        },
        inReplyToMessageId: {
          type: 'string',
          description: 'The Message-ID header of the email being replied to (for proper threading)',
        },
      },
      required: ['threadId', 'to', 'body'],
    },
  },
  {
    name: 'read_notion',
    description:
      "Search and read the user's Notion workspace. Returns page titles and content summaries.",
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for Notion pages, databases, or specific content',
        },
        maxResults: {
          type: 'number',
          description: 'Max pages to return (default 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'open_canvas',
    description:
      'Open the canvas panel on the right side of the screen with formatted markdown content. Use this for long-form output like email drafts for review, reports, summaries, action plans, or any content that benefits from more space.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Canvas panel title shown in the header',
        },
        type: {
          type: 'string',
          enum: ['document', 'report', 'sequence', 'summary'],
          description: 'Content type',
        },
        markdown: {
          type: 'string',
          description: 'Full markdown content to display. Use headers, bullets, tables as appropriate.',
        },
      },
      required: ['title', 'markdown'],
    },
  },
  {
    name: 'schedule_meeting',
    description:
      'Create a Google Calendar event with an optional Google Meet conference link. Requires Google Calendar to be connected.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Meeting title/summary',
        },
        startTime: {
          type: 'string',
          description: 'Start time in ISO 8601 format with timezone (e.g. "2024-01-15T14:00:00-05:00")',
        },
        endTime: {
          type: 'string',
          description: 'End time in ISO 8601 format with timezone',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Attendee email addresses',
        },
        description: {
          type: 'string',
          description: 'Meeting description or agenda',
        },
        createMeetLink: {
          type: 'boolean',
          description: 'Whether to create a Google Meet conference link (default: true)',
        },
      },
      required: ['title', 'startTime', 'endTime'],
    },
  },
];
