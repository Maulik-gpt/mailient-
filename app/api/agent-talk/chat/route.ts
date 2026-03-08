import { NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/supabase.js';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service.js';

// Type for the auth function
type AuthFunction = () => Promise<{ user?: { email?: string }, accessToken?: string, refreshToken?: string } | null>;

// Explicitly type the auth variable
const typedAuth: AuthFunction = require('@/lib/auth').auth;
import { decrypt } from '@/lib/crypto.js';
import { AIConfig } from '@/lib/ai-config.js';

/**
 * Main chat handler with OpenRouter AI + Gmail context
 * Replaces ElevenLabs/Arcus with Sift AI intelligence engine
 */
export async function POST(request: Request) {
  try {
    const { message, conversationId, isNewConversation, gmailAccessToken } = await request.json();

    console.log('🚀 Chat request received:', message?.substring?.(0, 80));

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    let currentConversationId = conversationId;
    if (isNewConversation && !conversationId) {
      currentConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    let session: any = null;
    try {
      session = await typedAuth();
      console.log('🔐 Auth session:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasEmail: !!session?.user?.email,
        hasAccessToken: !!session?.accessToken,
      });
    } catch (error) {
      console.log('⚠️ Auth not available, continuing without user context:', (error as Error).message);
    }

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const canUse = await subscriptionService.canUseFeature(userId, FEATURE_TYPES.ARCUS_AI);
    if (!canUse) {
      const usage = await subscriptionService.getFeatureUsage(userId, FEATURE_TYPES.ARCUS_AI);
      return NextResponse.json({
        error: 'limit_reached',
        message: usage.reason === 'subscription_expired'
          ? 'Your subscription has expired. Please renew to continue.'
          : usage.reason === 'no_subscription'
            ? 'You need an active subscription to use this feature.'
            : `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`,
        usage: usage.usage,
        limit: usage.limit,
        remaining: usage.remaining,
        period: usage.period,
        planType: usage.planType,
        upgradeUrl: '/pricing'
      }, { status: 403 });
    }

    let emailActionResult = null;
    if (session?.user?.email) {
      try {
        emailActionResult = await executeEmailAction(message, session.user.email, session);
      } catch (error) {
        console.error('💥 Email action failed:', error);
        emailActionResult = {
          error: `Email action failed: ${(error as Error).message}`,
          action: 'email_action',
          success: false,
        };
      }
    }

    const aiResult = await generateAIResponseWithFallbacks(
      message,
      session,
      emailActionResult,
      gmailAccessToken
    );
    const finalResponse = aiResult.text && aiResult.text.trim()
      ? aiResult.text
      : generateEmergencyFallback(message, emailActionResult);

    if (session?.user?.email) {
      try {
        await saveConversation(session.user.email, message, finalResponse, currentConversationId);
      } catch (error) {
        console.log('⚠️ Failed to save conversation:', (error as Error).message);
      }
    }

    if (aiResult.usedAI) {
      await subscriptionService.incrementFeatureUsage(userId, FEATURE_TYPES.ARCUS_AI);
    }

    return NextResponse.json({
      message: finalResponse,
      timestamp: new Date().toISOString(),
      conversationId: currentConversationId,
      aiGenerated: true,
      emailAction: emailActionResult,
    });
  } catch (error) {
    console.error('💥 Chat API error:', error);
    return NextResponse.json({
      message: generateEmergencyFallback('error', null),
      timestamp: new Date().toISOString(),
      error: 'Internal server error',
    });
  }
}

/**
 * Generate AI response with OpenRouter (Sift AI) and Gmail personalization
 */
async function generateAIResponseWithFallbacks(
  userMessage: string,
  session: any = null,
  emailActionResult: any = null,
  gmailAccessToken: string | null = null
) {
  console.log('🤖 Sift AI Generation Started:', userMessage.substring(0, 80));

  try {
    // Initialize AI Config
    const aiConfig = new AIConfig();

    if (!aiConfig.hasAIConfigured()) {
      console.warn('⚠️ OpenRouter AI not configured, using fallback');
      return { text: generateIntelligentFallback(userMessage, '', emailActionResult), usedAI: false };
    }

    let emailContext = '';
    if (emailActionResult) {
      emailContext = formatEmailActionResult(emailActionResult);
      console.log('📧 Email action result formatted, context length:', emailContext.length);
    }

    // Always try to get email context if user query is email-related
    if (!emailContext && session?.user?.email && isEmailRelatedQuery(userMessage)) {
      try {
        emailContext = await getEmailContext(userMessage, session.user.email);
        console.log('📧 Email context retrieved, length:', emailContext.length);
      } catch (error) {
        console.log('⚠️ Email context unavailable, proceeding without it:', (error as Error).message);
      }
    }

    // Use OpenRouter AI to generate response
    const response = await (aiConfig as any).generateChatResponse(userMessage, emailContext, session);

    if (response && response.trim()) {
      console.log('✅ OpenRouter AI response received');
      return { text: cleanAIResponse(response.trim()), usedAI: true };
    }

    console.warn('⚠️ OpenRouter AI returned empty response, using fallback');
    return { text: generateIntelligentFallback(userMessage, emailContext, emailActionResult), usedAI: false };
  } catch (error) {
    console.error('💥 AI service error:', (error as Error).message, (error as Error).stack);
    const shouldHideError = (error as Error).message.includes('timeout') || (error as Error).message.includes('Timeout');
    return { text: generateIntelligentFallback(userMessage, '', emailActionResult, shouldHideError ? '' : (error as Error).message), usedAI: false };
  }
}

function generateEmergencyFallback(userMessage: string, emailActionResult: any) {
  const lowerMessage = userMessage.toLowerCase();

  if (emailActionResult && emailActionResult.action === 'read_emails') {
    if (emailActionResult.success && emailActionResult.count === 0) {
      return '📭 Your inbox is looking pretty quiet right now! No emails matching what you were looking for.\n\nWant me to check something else? Maybe unread emails, or emails from a specific person?';
    }
  }

  if (lowerMessage.includes('email') || lowerMessage.includes('inbox') || lowerMessage.includes('gmail')) {
    return '🤖 I\'m Sift AI, your email intelligence assistant.\n\n• "Show me my unread emails"\n• "What emails do I have from [person]?"\n• "Summarize what\'s urgent right now"\n• "Draft an email to [recipient] about [topic]"\n• "Analyze my inbox for opportunities"\n\nWhat should we tackle first?';
  }

  return 'Hello! I\'m Sift AI, your email intelligence engine. I help you extract insights, opportunities, and action items from your Gmail. What can I help you with?';
}

/**
 * Clean AI responses by removing HTML entities, invisible characters, and improving formatting
 */
function cleanAIResponse(response: string): string {
  if (!response || typeof response !== 'string') {
    return response;
  }

  // Step 1: Remove HTML entities
  let cleaned = response
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&nbsp;/g, ' ');

  // Step 2: Remove invisible characters and control characters
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF\u00A0\u2060\u2061\u2062\u2063]/g, '');
  cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

  // Step 3: Remove markdown formatting symbols (bold, italic)
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove **bold**
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Remove *italic*
  cleaned = cleaned.replace(/__(.*?)__/g, '$1'); // Remove __bold__
  cleaned = cleaned.replace(/_(.*?)_/g, '$1'); // Remove _italic_

  // Step 4: Clean up multiple spaces and line breaks
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/\n\s+/g, '\n');

  // Step 5: Ensure proper paragraph spacing (blank line after each paragraph)
  cleaned = cleaned.replace(/\n\n+/g, '\n\n');
  cleaned = cleaned.replace(/\n([^\n])/g, '\n\n$1');

  // Step 6: Format lists with proper line breaks and gaps
  cleaned = cleaned.replace(/\d+\./g, (match) => `\n${match} `);
  cleaned = cleaned.replace(/\n\*\s+/g, '\n\n* ');
  cleaned = cleaned.replace(/\n-\s+/g, '\n\n- ');

  // Step 7: Improve email summary formatting
  cleaned = cleaned.replace(/— from/g, '— from');
  cleaned = cleaned.replace(/\|/g, '|');

  // Step 8: Remove strange Unicode characters
  cleaned = cleaned.replace(/[^\x00-\x7F]/g, '');

  // Step 9: Clean up ellipsis
  cleaned = cleaned.replace(/\.{3,}/g, '...');

  // Step 10: Ensure proper sentence spacing
  cleaned = cleaned.replace(/\.([A-Z])/g, '. $1');

  return cleaned;
}

function formatEmailActionResult(result: any) {
  if (!result) return '';
  if (result.error) return `Email action issue: ${result.error}`;

  if (result.action === 'read_emails' && result.success) {
    let context = `=== EMAIL ACTION RESULT ===\nYou successfully fetched ${result.count} emails for the user.\nQuery used: ${result.query || 'default'}\n\n`;
    if (result.emails?.length) {
      context += `=== DETAILED EMAIL ANALYSIS (${result.emails.length} emails) ===\n\n`;
      result.emails.forEach((email: any, index: number) => {
        const fromMatch = email.from ? email.from.match(/^(.+?)\s*<(.+)>$/) : null;
        const senderName = fromMatch ? fromMatch[1].trim() : (email.from ? email.from.split('<')[0].trim() : 'Unknown');
        const senderEmail = fromMatch ? fromMatch[2] : (email.from ? email.from : '');

        context += `Email ${index + 1}:\n`;
        context += `  ID: ${email.id || 'N/A'}\n`;
        context += `  From: ${senderName}${senderEmail ? ` <${senderEmail}>` : ''}\n`;
        context += `  Subject: ${email.subject || '(No Subject)'}\n`;
        context += `  Date: ${email.date || 'Unknown'}\n`;
        if (email.labels && email.labels.length > 0) {
          context += `  Labels: ${email.labels.join(', ')}\n`;
          context += `  Status: ${email.labels.includes('UNREAD') ? 'UNREAD' : 'READ'}${email.labels.includes('IMPORTANT') ? ' | IMPORTANT' : ''}\n`;
        }
        context += `  Preview: ${email.snippet || 'N/A'}\n`;
        if (email.body && email.body.trim()) {
          // Include full body content for deep understanding (up to 1500 chars)
          const bodyContent = email.body.length > 1500 ? email.body.substring(0, 1500) + '...' : email.body;
          context += `  Full Content:\n${bodyContent}\n`;
        }
        context += '\n';
      });
      context += `=== END EMAIL ANALYSIS ===\n\n`;
      context += `INSTRUCTIONS: Analyze each email deeply. Identify buying signals, opportunities, action items, follow-ups, risks, and patterns. Provide intelligence that helps entrepreneurs make decisions.`;
    } else {
      context += 'No emails found matching the query.';
    }
    return context;
  }

  return JSON.stringify(result);
}

function generateIntelligentFallback(userMessage: string, emailContext: string, emailActionResult: any = null, systemNote: string = '') {
  const lowerMessage = userMessage.toLowerCase();

  if (emailActionResult?.action === 'read_emails' && emailActionResult.success) {
    const emails = emailActionResult.emails || [];
    if (!emails.length) {
      return cleanAIResponse('📭 Clean inbox for that request. Want me to check unread, important, or a specific sender instead?');
    }

    const summary = emails
      .slice(0, 5)
      .map((email: any, index: number) => {
        const senderName = email.from ? email.from.split('<')[0].trim() : 'Unknown';
        return `${index + 1}. ${email.subject || '(No Subject)'} — from ${senderName}${email.snippet ? ` | ${email.snippet.substring(0, 80)}...` : ''}`;
      })
      .join('\n');

    return cleanAIResponse(`📬 Here is what I pulled:\n${summary}\n\nWant me to analyze these for opportunities, action items, or follow-ups?`);
  }

  if (lowerMessage.includes('email') || lowerMessage.includes('inbox') || lowerMessage.includes('gmail')) {
    return cleanAIResponse('I\'m your Sift AI email intelligence assistant.\n\n• Check unread or important mail\n• Search by sender/topic/date\n• Analyze for opportunities and leads\n• Extract action items and follow-ups\n• Identify risks and urgent items\n\nTell me what to focus on.');
  }

  // Never show timeout errors to users
  const shouldShowError = systemNote && !systemNote.toLowerCase().includes('timeout');
  const errorNote = shouldShowError ? `\n\n(Heads-up: ${systemNote})` : '';
  return cleanAIResponse(`I'm here to help extract intelligence from your Gmail inbox.${errorNote}\nWhat should we analyze right now?`);
}

async function getGmailAccessTokenFromSession(session: any) {
  if (session?.accessToken) {
    return session.accessToken;
  }

  if (!session?.user?.email) {
    return null;
  }

  try {
    const db = new DatabaseService();
    const userTokens = await db.getUserTokens(session.user.email);
    if (userTokens?.encrypted_access_token) {
      return decrypt(userTokens.encrypted_access_token);
    }
  } catch (error) {
    console.log('⚠️ Unable to derive Gmail token from session/db:', (error as Error).message);
  }

  return null;
}

function isEmailRelatedQuery(message: string) {
  const emailKeywords = [
    'email', 'emails', 'inbox', 'gmail', 'message', 'messages',
    'send', 'compose', 'reply', 'forward', 'unread', 'read',
    'from', 'subject', 'attachment', 'urgent', 'important',
    'meeting', 'calendar', 'schedule', 'thread', 'conversation',
    'lead', 'opportunity', 'investor', 'deal', 'follow-up'
  ];
  const lowerMessage = message.toLowerCase();
  return emailKeywords.some((keyword) => lowerMessage.includes(keyword));
}

async function getEmailContext(userMessage: string, userEmail: string) {
  try {
    const db = new DatabaseService();
    const userTokens = await db.getUserTokens(userEmail);

    if (!userTokens?.encrypted_access_token) {
      return 'No Gmail access available. Please sign in to access your emails.';
    }

    const accessToken = decrypt(userTokens.encrypted_access_token);
    const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';

    const { GmailService } = await import('@/lib/gmail');
    const gmailService = new GmailService(accessToken, refreshToken);

    const query = buildGmailSearchQuery(userMessage);
    // Fetch more emails for better context (increased from 5 to 10)
    const emailsResponse = await gmailService.getEmails(10, query, null, 'internalDate desc');
    const messages = emailsResponse.messages || [];

    if (!messages.length) {
      return 'No recent emails found matching the request.';
    }

    const emailDetails: any[] = [];
    // Process up to 5 emails with full content for deep understanding
    for (const message of messages.slice(0, 5)) {
      try {
        const details = await gmailService.getEmailDetails(message.id);
        const parsed = gmailService.parseEmailData(details);

        // Get full email body (up to 2000 chars for deep understanding)
        const fullBody = parsed.body || parsed.snippet || '';
        const bodyPreview = fullBody.length > 2000 ? fullBody.substring(0, 2000) + '...' : fullBody;

        // Extract sender name and email separately
        const fromMatch = parsed.from ? parsed.from.match(/^(.+?)\s*<(.+)>$/) : null;
        const senderName = fromMatch ? fromMatch[1].trim() : (parsed.from ? parsed.from.split('<')[0].trim() : 'Unknown');
        const senderEmail = fromMatch ? fromMatch[2] : (parsed.from ? parsed.from : '');

        emailDetails.push({
          id: message.id,
          subject: parsed.subject || '(No Subject)',
          from: parsed.from || 'Unknown Sender',
          senderName: senderName,
          senderEmail: senderEmail,
          to: parsed.to || '',
          date: parsed.date || 'Unknown Date',
          snippet: parsed.snippet || '',
          body: bodyPreview,
          labels: parsed.labels || [],
          threadId: parsed.threadId || '',
          isImportant: parsed.labels?.includes('IMPORTANT') || false,
          isUnread: parsed.labels?.includes('UNREAD') || false,
        });
      } catch (error) {
        console.log('Error fetching email details:', (error as Error).message);
      }
    }

    // Format comprehensive email context for Sift AI intelligence extraction
    const contextLines = emailDetails.map((email, index) => {
      let emailInfo = `Email ${index + 1}:\n`;
      emailInfo += `  ID: ${email.id}\n`;
      emailInfo += `  From: ${email.senderName}${email.senderEmail ? ` <${email.senderEmail}>` : ''}\n`;
      emailInfo += `  To: ${email.to || 'N/A'}\n`;
      emailInfo += `  Subject: ${email.subject}\n`;
      emailInfo += `  Date: ${email.date}\n`;
      emailInfo += `  Status: ${email.isUnread ? 'UNREAD' : 'READ'}${email.isImportant ? ' | IMPORTANT' : ''}\n`;
      if (email.labels.length > 0) {
        emailInfo += `  Labels: ${email.labels.join(', ')}\n`;
      }
      emailInfo += `  Preview: ${email.snippet}\n`;
      emailInfo += `  Full Content:\n${email.body}\n`;
      return emailInfo;
    });

    return `=== GMAIL CONTEXT (${emailDetails.length} emails) ===\n\n${contextLines.join('\n---\n\n')}\n\n=== END GMAIL CONTEXT ===\n\nAnalyze these emails for: buying signals, investor interest, potential deals, urgent follow-ups, risk signals, action items, and patterns. Extract high-value intelligence for entrepreneurs.`;
  } catch (error) {
    console.log('Error fetching email context:', (error as Error).message);
    return 'Unable to fetch email context right now.';
  }
}

function buildGmailSearchQuery(userMessage: string) {
  const lowerMessage = userMessage.toLowerCase();
  let query = 'newer_than:30d';

  if (lowerMessage.includes('unread')) {
    query = 'is:unread newer_than:7d';
  } else if (lowerMessage.includes('urgent') || lowerMessage.includes('important')) {
    query = 'is:important newer_than:7d';
  } else if (lowerMessage.includes('today') || lowerMessage.includes('recent') || lowerMessage.includes('yesterday')) {
    query = 'newer_than:7d';
  }

  const fromMatch = userMessage.match(/from\s+([^\s,]+)/i);
  if (fromMatch) {
    query += ` from:${fromMatch[1]}`;
  }

  return query;
}

/**
 * Execute email actions based on user request
 */
async function executeEmailAction(userMessage: string, userEmail: string, session: any) {
  const lowerMessage = userMessage.toLowerCase();

  try {
    // First try to get tokens from session (most reliable)
    let accessToken = session?.accessToken;
    let refreshToken = session?.refreshToken;

    // If not in session, try database as fallback
    if (!accessToken) {
      try {
        const db = new DatabaseService();
        const userTokens = await db.getUserTokens(userEmail);

        if (userTokens?.encrypted_access_token) {
          accessToken = decrypt(userTokens.encrypted_access_token);
          refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
        }
      } catch (dbError) {
        // Continue without tokens
      }
    }

    if (!accessToken) {
      return { error: 'Gmail not connected. Please sign in with Google to access your emails.' };
    }

    const { GmailService } = await import('@/lib/gmail');
    const gmailService = new GmailService(accessToken, refreshToken || '');

    // Detect and execute email actions

    // 1. READ EMAILS action
    if (lowerMessage.includes('read') || lowerMessage.includes('show') ||
      lowerMessage.includes('get') || lowerMessage.includes('fetch') ||
      lowerMessage.includes('check') || lowerMessage.includes('what') ||
      lowerMessage.includes('email') || lowerMessage.includes('inbox')) {

      let query = 'newer_than:7d';
      let maxResults = 5;

      if (lowerMessage.includes('unread')) {
        query = 'is:unread newer_than:7d';
      } else if (lowerMessage.includes('important') || lowerMessage.includes('urgent')) {
        query = 'is:important newer_than:7d';
      } else if (lowerMessage.includes('starred')) {
        query = 'is:starred';
      } else if (lowerMessage.includes('sent')) {
        query = 'in:sent newer_than:7d';
      } else if (lowerMessage.includes('today')) {
        query = 'newer_than:1d';
      }

      // Extract sender name if mentioned
      const fromMatch = userMessage.match(/from\s+([^\s,]+)/i);
      if (fromMatch) {
        query += ` from:${fromMatch[1]}`;
      }

      try {
        const emailsResponse = await gmailService.getEmails(maxResults, query, null, 'internalDate desc');
        const messages = emailsResponse?.messages || [];

        if (messages.length === 0) {
          return {
            action: 'read_emails',
            success: true,
            emails: [],
            query: query,
            count: 0
          };
        }

        const emailDetails: any[] = [];
        for (const message of messages.slice(0, 5)) {
          try {
            const details = await gmailService.getEmailDetails(message.id);
            const parsed = gmailService.parseEmailData(details);

            // Get full email body for deep understanding (up to 2000 chars)
            const fullBody = parsed.body || parsed.snippet || '';
            const bodyContent = fullBody.length > 2000 ? fullBody.substring(0, 2000) + '...' : fullBody;

            // Extract sender details
            const fromMatch = parsed.from ? parsed.from.match(/^(.+?)\s*<(.+)>$/) : null;
            const senderName = fromMatch ? fromMatch[1].trim() : (parsed.from ? parsed.from.split('<')[0].trim() : 'Unknown');
            const senderEmail = fromMatch ? fromMatch[2] : (parsed.from ? parsed.from : '');

            emailDetails.push({
              id: message.id,
              subject: parsed.subject || '(No Subject)',
              from: parsed.from || 'Unknown Sender',
              senderName: senderName,
              senderEmail: senderEmail,
              to: parsed.to || '',
              date: parsed.date || 'Unknown Date',
              snippet: parsed.snippet || '',
              body: bodyContent,
              labels: parsed.labels || [],
              threadId: parsed.threadId || '',
              isImportant: parsed.labels?.includes('IMPORTANT') || false,
              isUnread: parsed.labels?.includes('UNREAD') || false,
            });
          } catch (error) {
            // Continue with other emails
            console.log('Error processing email:', (error as Error).message);
          }
        }

        return {
          action: 'read_emails',
          success: true,
          emails: emailDetails,
          query: query,
          count: emailDetails.length
        };
      } catch (error) {
        // Check if it's a token error
        if ((error as Error).message.includes('401') || (error as Error).message.includes('token') || (error as Error).message.includes('expired')) {
          return { action: 'read_emails', success: false, error: 'Your Gmail session has expired. Please sign out and sign in again to refresh your access.' };
        }

        return { action: 'read_emails', success: false, error: (error as Error).message };
      }
    }

    return null; // No email action detected

  } catch (error) {
    return { error: (error as Error).message };
  }
}

/**
 * Save conversation to database
 */
async function saveConversation(userEmail: string, userMessage: string, aiResponse: string, conversationId: string) {
  const db = new DatabaseService();

  await db.storeAgentChatMessage(
    userEmail,
    userMessage,
    aiResponse,
    conversationId,
    1, // message order
    true // is initial message
  );
}
