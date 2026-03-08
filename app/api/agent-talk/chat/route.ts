import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';
import { DatabaseService } from '../../../../lib/supabase.js';
import { decrypt } from '../../../../lib/crypto.js';
import { AIConfig } from '../../../../lib/ai-config.js';

type ArcusIntent =
  | 'summarize'
  | 'reply'
  | 'compose'
  | 'organize'
  | 'research'
  | 'schedule'
  | 'analyze';

interface GmailEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labels: string[];
  isUnread: boolean;
  isImportant: boolean;
}

interface ArcusAction {
  id: string;
  label: string;
  endpoint: string;
  method: 'POST';
  requiresApproval: boolean;
  payload: Record<string, unknown>;
  confirmationText: string;
  followUpPrompt: string;
}

interface ArcusCanvas {
  type: 'email_draft' | 'summary' | 'workflow' | 'brief';
  title: string;
  subtitle: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
    tone?: 'neutral' | 'success' | 'warning';
  }>;
  action: ArcusAction | null;
}

interface ArcusSession {
  user?: {
    email?: string | null;
    name?: string | null;
  };
}

export async function POST(request: Request) {
  try {
    const { message, conversationId, isNewConversation } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string.' },
        { status: 400 }
      );
    }

    let currentConversationId = conversationId;
    if (isNewConversation && !conversationId) {
      currentConversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }

    let session: ArcusSession | null = null;
    try {
      session = await auth();
    } catch (error) {
      console.warn('Arcus auth unavailable, continuing with limited context:', (error as Error).message);
    }

    const intent = detectIntent(message);
    const gmailContext = session?.user?.email
      ? await getGmailContextForIntent(message, session.user.email, intent)
      : null;

    const aiConfig = new AIConfig();
    const canvas = await buildCanvas({
      aiConfig,
      intent,
      message,
      gmailContext,
      session,
    });

    const plan = buildPlan(intent, gmailContext, canvas);
    const thinking = buildThinking(intent, gmailContext, canvas);
    const messageText = buildAssistantMessage(canvas, gmailContext);

    if (session?.user?.email) {
      try {
        await saveConversation(session.user.email, message, messageText, currentConversationId);
      } catch (error) {
        console.warn('Arcus conversation save skipped:', (error as Error).message);
      }
    }

    const service = aiConfig.getService?.('openrouter');
    const configuredModel = service?.model || process.env.OPENROUTER_MODEL || 'openrouter/free';

    return NextResponse.json({
      message: messageText,
      timestamp: new Date().toISOString(),
      conversationId: currentConversationId,
      aiGenerated: true,
      arcus: {
        intent: {
          primary: intent,
          confidence: gmailContext?.emails?.length ? 0.92 : 0.78,
        },
        model: configuredModel,
        context: gmailContext
          ? {
              connected: true,
              query: gmailContext.query,
              totalEmails: gmailContext.emails.length,
              emails: gmailContext.emails.map((email) => ({
                id: email.id,
                threadId: email.threadId,
                subject: email.subject,
                from: email.from,
                date: email.date,
                snippet: email.snippet,
                isUnread: email.isUnread,
                isImportant: email.isImportant,
              })),
            }
          : {
              connected: !!session?.user?.email,
              query: null,
              totalEmails: 0,
              emails: [],
            },
        thinking,
        plan,
        checklist: plan.map((step, index) => ({
          id: step.id,
          title: step.title,
          status: index === plan.length - 1 && !canvas.action ? 'completed' : 'completed',
        })),
        canvas,
      },
    });
  } catch (error) {
    console.error('Arcus chat error:', error);
    return NextResponse.json(
      {
        message: 'Arcus hit an unexpected issue while preparing the workflow.',
        timestamp: new Date().toISOString(),
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

function detectIntent(message: string): ArcusIntent {
  const lowerMessage = message.toLowerCase();

  if (/(reply|respond|write back|draft a reply)/.test(lowerMessage)) {
    return 'reply';
  }

  if (/(compose|write an email|send an email|draft an email)/.test(lowerMessage)) {
    return 'compose';
  }

  if (/(organize|label|clean up|archive|sort)/.test(lowerMessage)) {
    return 'organize';
  }

  if (/(research|look up|find out|investigate)/.test(lowerMessage)) {
    return 'research';
  }

  if (/(schedule|meeting|calendar|follow-up next week)/.test(lowerMessage)) {
    return 'schedule';
  }

  if (/(summarize|summary|what happened|brief me|recap)/.test(lowerMessage)) {
    return 'summarize';
  }

  return 'analyze';
}

async function getGmailContextForIntent(
  userMessage: string,
  userEmail: string,
  intent: ArcusIntent
) {
  try {
    const db = new DatabaseService();
    const tokens = await db.getUserTokens(userEmail);

    if (!tokens?.encrypted_access_token) {
      return null;
    }

    const accessToken = decrypt(tokens.encrypted_access_token);
    const refreshToken = tokens.encrypted_refresh_token ? decrypt(tokens.encrypted_refresh_token) : '';
    const { GmailService } = await import('../../../../lib/gmail.js');
    const gmailService = new GmailService(accessToken, refreshToken);

    const query = buildGmailSearchQuery(userMessage, intent);
    const maxResults = intent === 'summarize' || intent === 'analyze' ? 6 : 3;
    const response = await gmailService.getEmails(maxResults, query, null, 'internalDate desc');
    const messages = response?.messages || [];

    const emails: GmailEmail[] = [];
    for (const item of messages.slice(0, maxResults)) {
      try {
        const details = await gmailService.getEmailDetails(item.id);
        const parsed = gmailService.parseEmailData(details);
        emails.push({
          id: parsed.id || item.id,
          threadId: parsed.threadId || '',
          subject: parsed.subject || '(No Subject)',
          from: parsed.from || 'Unknown Sender',
          to: parsed.to || '',
          date: parsed.date || '',
          snippet: parsed.snippet || '',
          body: (parsed.body || parsed.snippet || '').slice(0, 4000),
          labels: parsed.labels || [],
          isUnread: parsed.labels?.includes('UNREAD') || false,
          isImportant: parsed.labels?.includes('IMPORTANT') || false,
        });
      } catch (error) {
        console.warn('Arcus skipped one Gmail message:', (error as Error).message);
      }
    }

    return {
      query,
      emails,
    };
  } catch (error) {
    console.warn('Arcus Gmail context unavailable:', (error as Error).message);
    return null;
  }
}

function buildGmailSearchQuery(message: string, intent: ArcusIntent) {
  const lowerMessage = message.toLowerCase();
  let query = 'newer_than:14d';

  if (/(unread|pending)/.test(lowerMessage)) {
    query = 'is:unread newer_than:14d';
  } else if (/(important|urgent|priority)/.test(lowerMessage)) {
    query = 'is:important newer_than:14d';
  } else if (/(today|recent|latest)/.test(lowerMessage)) {
    query = 'newer_than:3d';
  } else if (intent === 'reply') {
    query = 'newer_than:21d';
  }

  const fromMatch = message.match(/from\s+([^\s,]+)/i);
  if (fromMatch) {
    query += ` from:${fromMatch[1]}`;
  }

  const subjectMatch = message.match(/about\s+["']?([^"\n,]+)["']?/i);
  if (subjectMatch) {
    query += ` ${subjectMatch[1]}`;
  }

  return query.trim();
}

async function buildCanvas({
  aiConfig,
  intent,
  message,
  gmailContext,
  session,
}: {
  aiConfig: AIConfig;
  intent: ArcusIntent;
  message: string;
  gmailContext: { query: string; emails: GmailEmail[] } | null;
  session: ArcusSession | null;
}): Promise<ArcusCanvas> {
  switch (intent) {
    case 'reply':
      return buildReplyCanvas(aiConfig, message, gmailContext, session);
    case 'compose':
      return buildComposeCanvas(aiConfig, message);
    case 'organize':
      return buildOrganizeCanvas(aiConfig, message, gmailContext);
    case 'schedule':
      return buildScheduleCanvas(aiConfig, message, gmailContext);
    case 'research':
      return buildResearchCanvas(aiConfig, message, gmailContext);
    case 'summarize':
    case 'analyze':
    default:
      return buildSummaryCanvas(aiConfig, message, gmailContext);
  }
}

async function buildReplyCanvas(
  aiConfig: AIConfig,
  _message: string,
  gmailContext: { query: string; emails: GmailEmail[] } | null,
  session: ArcusSession | null
): Promise<ArcusCanvas> {
  const sourceEmail = gmailContext?.emails?.[0];

  if (!sourceEmail) {
    return {
      type: 'email_draft',
      title: 'Reply workspace',
      subtitle: 'Arcus could not find a matching thread in Gmail yet.',
      sections: [
        {
          id: 'gap',
          title: 'What Arcus Needs',
          content:
            'Ask with a sender, subject, or timeframe so Arcus can anchor the reply to a real Gmail thread before drafting.',
          tone: 'warning',
        },
      ],
      action: null,
    };
  }

  const draft = await aiConfig.generateDraftReply(
    [
      `From: ${sourceEmail.from}`,
      `To: ${sourceEmail.to}`,
      `Subject: ${sourceEmail.subject}`,
      `Date: ${sourceEmail.date}`,
      '',
      sourceEmail.body || sourceEmail.snippet,
    ].join('\n'),
    'reply',
    { name: session?.user?.name || 'Mailient User' }
  );

  const recipient = extractEmailAddress(sourceEmail.from) || sourceEmail.from;
  const subject = sourceEmail.subject?.toLowerCase().startsWith('re:')
    ? sourceEmail.subject
    : `Re: ${sourceEmail.subject}`;

  return {
    type: 'email_draft',
    title: 'Reply ready for review',
    subtitle: 'Arcus prepared a send-ready draft from the live Gmail thread.',
    sections: [
      {
        id: 'context',
        title: 'Source Email',
        content: `${sourceEmail.from}\n${sourceEmail.subject}\n${sourceEmail.snippet || 'No preview available.'}`,
      },
      {
        id: 'draft',
        title: 'Draft Reply',
        content: draft,
        tone: 'success',
      },
    ],
    action: {
      id: 'send-email',
      label: 'Send Email',
      endpoint: '/api/dashboard/agent-talk/send-email',
      method: 'POST',
      requiresApproval: true,
      payload: {
        to: recipient,
        subject,
        content: draft,
        isHtml: false,
      },
      confirmationText: `Your reply to ${recipient} has been sent.`,
      followUpPrompt: 'Would you like Arcus to monitor the thread and prepare a follow-up if they do not respond?',
    },
  };
}

async function buildComposeCanvas(aiConfig: AIConfig, message: string): Promise<ArcusCanvas> {
  const recipient = extractRecipientFromPrompt(message);
  const subject = extractSubjectFromPrompt(message);
  const draftPrompt = `Write a polished, concise email draft for this request:\n${message}\n\nReturn only the email body.`;
  const draft = await aiConfig.generateChatResponse(draftPrompt, null);

  return {
    type: 'email_draft',
    title: 'Draft email workspace',
    subtitle: 'Arcus turned the request into an execution-ready draft.',
    sections: [
      {
        id: 'intent',
        title: 'Intent',
        content: message,
      },
      {
        id: 'draft',
        title: 'Draft Body',
        content: draft,
        tone: 'success',
      },
    ],
    action: recipient
      ? {
          id: 'send-email',
          label: 'Send Email',
          endpoint: '/api/dashboard/agent-talk/send-email',
          method: 'POST',
          requiresApproval: true,
          payload: {
            to: recipient,
            subject: subject || 'Following up',
            content: draft,
            isHtml: false,
          },
          confirmationText: `Your message to ${recipient} has been sent.`,
          followUpPrompt: 'Should Arcus also draft a reminder or track replies from this contact?',
        }
      : null,
  };
}

async function buildSummaryCanvas(
  aiConfig: AIConfig,
  message: string,
  gmailContext: { query: string; emails: GmailEmail[] } | null
): Promise<ArcusCanvas> {
  if (!gmailContext?.emails?.length) {
    return {
      type: 'summary',
      title: 'Inbox briefing',
      subtitle: 'Arcus needs Gmail context to build the briefing.',
      sections: [
        {
          id: 'empty',
          title: 'No matching Gmail context',
          content: 'Try narrowing the request with a sender, timeframe, or email topic.',
          tone: 'warning',
        },
      ],
      action: null,
    };
  }

  const emailDigest = gmailContext.emails
    .map(
      (email, index) =>
        `Email ${index + 1}\nFrom: ${email.from}\nSubject: ${email.subject}\nDate: ${email.date}\nSnippet: ${email.snippet}\nBody: ${email.body}`
    )
    .join('\n\n---\n\n');

  const summary = await aiConfig.generateChatResponse(
    `Summarize these emails for an executive assistant. Focus on priorities, blockers, opportunities, and clear next steps.\n\nUser request: ${message}\n\n${emailDigest}`
  );

  const actionItems = gmailContext.emails
    .slice(0, 4)
    .map((email) => `• ${email.subject} — ${email.isUnread ? 'unread' : 'reviewed'}${email.isImportant ? ', important' : ''}`)
    .join('\n');

  return {
    type: 'summary',
    title: 'Inbox canvas',
    subtitle: 'Arcus compiled a focused briefing from live Gmail data.',
    sections: [
      {
        id: 'summary',
        title: 'Executive Summary',
        content: summary,
      },
      {
        id: 'actions',
        title: 'Priority Threads',
        content: actionItems,
      },
    ],
    action: null,
  };
}

async function buildOrganizeCanvas(
  aiConfig: AIConfig,
  message: string,
  gmailContext: { query: string; emails: GmailEmail[] } | null
): Promise<ArcusCanvas> {
  const source = gmailContext?.emails?.length
    ? gmailContext.emails
        .map((email) => `${email.subject} — ${email.from} — labels: ${email.labels.join(', ') || 'none'}`)
        .join('\n')
    : 'No emails were fetched.';

  const recommendations = await aiConfig.generateChatResponse(
    `You are organizing an inbox workflow. Based on this request and the sampled emails, suggest practical, non-destructive organization steps.\n\nRequest: ${message}\n\nEmails:\n${source}`
  );

  return {
    type: 'workflow',
    title: 'Inbox organization workflow',
    subtitle: 'Arcus prepared a reversible cleanup plan before any action is taken.',
    sections: [
      {
        id: 'recommendations',
        title: 'Recommended Actions',
        content: recommendations,
      },
      {
        id: 'safety',
        title: 'Execution Policy',
        content: 'Arcus will not archive, label, or delete email automatically. Actions stay review-first until you approve a future workflow step.',
        tone: 'warning',
      },
    ],
    action: null,
  };
}

async function buildResearchCanvas(
  aiConfig: AIConfig,
  message: string,
  gmailContext: { query: string; emails: GmailEmail[] } | null
): Promise<ArcusCanvas> {
  const evidence = gmailContext?.emails?.length
    ? gmailContext.emails
        .map((email) => `${email.subject}\n${email.snippet}`)
        .join('\n\n')
    : 'No Gmail evidence available.';

  const brief = await aiConfig.generateChatResponse(
    `Prepare a concise research brief using the Gmail context below. Highlight useful facts, missing info, and what Arcus should do next.\n\nRequest: ${message}\n\nContext:\n${evidence}`
  );

  return {
    type: 'brief',
    title: 'Research canvas',
    subtitle: 'Arcus gathered the available context and framed the next move.',
    sections: [
      {
        id: 'brief',
        title: 'Working Brief',
        content: brief,
      },
    ],
    action: null,
  };
}

async function buildScheduleCanvas(
  aiConfig: AIConfig,
  message: string,
  gmailContext: { query: string; emails: GmailEmail[] } | null
): Promise<ArcusCanvas> {
  const context = gmailContext?.emails?.[0];
  const plan = await aiConfig.generateChatResponse(
    `Create a concise meeting preparation note from this request. If details are missing, explicitly say what still needs confirmation.\n\nRequest: ${message}\n\nEmail context:\n${context ? `${context.subject}\n${context.snippet}\n${context.body}` : 'No matching email found.'}`
  );

  return {
    type: 'workflow',
    title: 'Meeting workflow',
    subtitle: 'Arcus prepared the scheduling context before execution.',
    sections: [
      {
        id: 'plan',
        title: 'Scheduling Notes',
        content: plan,
      },
      {
        id: 'approval',
        title: 'Approval Gate',
        content: 'Arcus can prepare a calendar action only after attendees and timing are confirmed.',
        tone: 'warning',
      },
    ],
    action: null,
  };
}

function buildPlan(
  intent: ArcusIntent,
  gmailContext: { query: string; emails: GmailEmail[] } | null,
  canvas: ArcusCanvas
) {
  const emailStepLabel = gmailContext?.emails?.length ? `Review ${gmailContext.emails.length} Gmail threads` : 'Check Gmail context';

  return [
    {
      id: 'intent',
      title: 'Understand the request',
      status: 'completed',
    },
    {
      id: 'context',
      title: emailStepLabel,
      status: gmailContext?.emails?.length ? 'completed' : 'completed',
    },
    {
      id: 'plan',
      title: `Prepare ${intent === 'reply' || intent === 'compose' ? 'a draft' : 'the workspace'}`,
      status: 'completed',
    },
    {
      id: 'approval',
      title: canvas.action ? 'Wait for approval to execute' : 'Ready for user review',
      status: canvas.action ? 'pending' : 'completed',
    },
  ];
}

function buildThinking(
  intent: ArcusIntent,
  gmailContext: { query: string; emails: GmailEmail[] } | null,
  canvas: ArcusCanvas
) {
  return [
    {
      id: 'understand',
      label: 'Understanding intent',
      detail: `Arcus classified this as ${intent}.`,
      status: 'completed',
    },
    {
      id: 'search',
      label: 'Searching Gmail context',
      detail: gmailContext?.emails?.length
        ? `Matched ${gmailContext.emails.length} emails with query "${gmailContext.query}".`
        : 'No Gmail context was required or available.',
      status: 'completed',
    },
    {
      id: 'plan',
      label: 'Planning the workflow',
      detail: `Prepared a ${canvas.type.replace('_', ' ')} canvas for review.`,
      status: 'completed',
    },
    {
      id: 'ready',
      label: 'Preparing execution',
      detail: canvas.action
        ? `${canvas.action.label} is staged and waiting for approval.`
        : 'Workspace is ready for review.',
      status: canvas.action ? 'pending_approval' : 'completed',
    },
  ];
}

function buildAssistantMessage(canvas: ArcusCanvas, gmailContext: { emails: GmailEmail[] } | null) {
  const emailNote = gmailContext?.emails?.length ? `I used ${gmailContext.emails.length} live Gmail thread${gmailContext.emails.length > 1 ? 's' : ''} as context. ` : '';
  const actionNote = canvas.action
    ? `The ${canvas.action.label.toLowerCase()} action is staged in the canvas and will only run after you approve it.`
    : 'The result is ready in the canvas for review and edits.';

  return `${emailNote}${canvas.subtitle} ${actionNote}`;
}

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  if (match) return match[1];
  return /\S+@\S+\.\S+/.test(value) ? value.trim() : '';
}

function extractRecipientFromPrompt(message: string) {
  const emailMatch = message.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  if (emailMatch) {
    return emailMatch[0];
  }

  const toMatch = message.match(/to\s+([^\s,]+@[^\s,]+)/i);
  return toMatch ? toMatch[1] : '';
}

function extractSubjectFromPrompt(message: string) {
  const subjectMatch = message.match(/subject\s+["']?([^"\n]+)["']?/i);
  if (subjectMatch) {
    return subjectMatch[1].trim();
  }

  const aboutMatch = message.match(/about\s+["']?([^"\n]+)["']?/i);
  return aboutMatch ? aboutMatch[1].trim() : '';
}

async function saveConversation(
  userEmail: string,
  userMessage: string,
  aiResponse: string,
  conversationId: string
) {
  const db = new DatabaseService();
  await db.storeAgentChatMessage(
    userEmail,
    userMessage,
    aiResponse,
    conversationId,
    1,
    true
  );
}
