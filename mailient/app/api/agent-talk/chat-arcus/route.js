import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';
import { DatabaseService } from '../../../../lib/supabase.js';
import { decrypt } from '../../../../lib/crypto.js';
import { ArcusAIService } from '../../../../lib/arcus-ai.js';
import { CalendarService } from '../../../../lib/calendar.js';
import { subscriptionService, FEATURE_TYPES } from '../../../../lib/subscription-service.js';
import { addDays, setHours, setMinutes, startOfDay, format, parse, isWeekend, nextMonday } from 'date-fns';

/**
 * Main chat handler with Arcus AI + Gmail context + Memory + Integration awareness
 */
export async function POST(request) {
  try {
    const {
      message,
      conversationId,
      isNewConversation,
      gmailAccessToken,
      isNotesQuery,
      notesSearchQuery,
      selectedEmailId,
      draftReplyRequest
    } = await request.json();

    console.log('🚀 Arcus Chat request received:', message?.substring?.(0, 80));

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

    // Get user session
    let session = null;
    try {
      session = await auth();
      console.log('🔐 Auth session:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasEmail: !!session?.user?.email,
      });
    } catch (error) {
      console.log('⚠️ Auth not available:', error.message);
    }

    const db = new DatabaseService();
    const userEmail = session?.user?.email;
    const userName = session?.user?.name || 'User';

    // Fetch subscription info for Arcus context
    let subscriptionInfo = null;
    let userPlanType = 'none';

    if (userEmail) {
      try {
        const allUsage = await subscriptionService.getAllFeatureUsage(userEmail);
        userPlanType = allUsage.planType || 'none';

        if (allUsage.hasActiveSubscription) {
          subscriptionInfo = {
            planType: allUsage.planType,
            planName: allUsage.planType === 'pro' ? 'Pro' : 'Starter',
            daysRemaining: allUsage.daysRemaining,
            features: allUsage.features,
            isUnlimited: allUsage.planType === 'pro'
          };
          console.log(`📋 User subscription: ${userPlanType} plan`);
        }
      } catch (err) {
        console.warn('Error fetching subscription info:', err);
      }
    }

    // Check subscription and feature usage for Arcus AI
    // Pro users have unlimited access, Starter users have 10/day limit
    if (userEmail) {
      const canUse = await subscriptionService.canUseFeature(userEmail, FEATURE_TYPES.ARCUS_AI);
      if (!canUse) {
        const usage = await subscriptionService.getFeatureUsage(userEmail, FEATURE_TYPES.ARCUS_AI);
        const limitMessage = usage.reason === 'subscription_expired'
          ? "Your subscription has expired. Please renew to continue using Arcus AI."
          : usage.reason === 'no_subscription'
            ? "You need an active subscription to use Arcus AI. Visit /pricing to subscribe."
            : "You have used all 10 Arcus AI credits for today. Credits reset at midnight. Upgrade to Pro for unlimited access!";

        return NextResponse.json({
          message: limitMessage,
          error: 'limit_reached',
          usage: usage.usage,
          limit: usage.limit,
          reason: usage.reason,
          upgradeUrl: '/pricing',
          timestamp: new Date().toISOString(),
          conversationId: currentConversationId
        }, { status: 403 });
      }
    }

    // Get user's privacy mode preference
    let privacyMode = false;
    if (userEmail) {
      try {
        const profile = await db.getUserProfile(userEmail);
        if (profile?.preferences?.ai_privacy_mode === 'enabled') {
          privacyMode = true;
          console.log('🛡️ Arcus: AI Privacy Mode enabled');
        }
      } catch (err) {
        console.warn('Error fetching profile:', err);
      }
    }

    // Get integration status
    const integrations = await getIntegrationStatus(userEmail, db);
    console.log('🔗 Integration status:', integrations);

    // Get conversation history for memory
    let conversationHistory = [];
    if (currentConversationId && userEmail) {
      try {
        conversationHistory = await getConversationHistory(userEmail, currentConversationId, db);
        console.log('📝 Loaded conversation history:', conversationHistory.length, 'messages');
      } catch (err) {
        console.warn('Error loading conversation history:', err);
      }
    }

    // Initialize Arcus AI
    const arcusAI = new ArcusAIService();

    // Parse user intent
    const draftIntent = arcusAI.parseDraftIntent(message);

    // Handle drafting request
    if (draftIntent.isDraftRequest || draftReplyRequest) {
      const draftResult = await handleDraftRequest(
        message,
        draftIntent,
        selectedEmailId,
        userEmail,
        userName,
        session,
        db,
        arcusAI,
        integrations,
        conversationHistory,
        privacyMode
      );

      // Save conversation
      if (userEmail) {
        await saveConversation(userEmail, message, draftResult.message, currentConversationId, db);
      }

      return NextResponse.json({
        message: draftResult.message,
        timestamp: new Date().toISOString(),
        conversationId: currentConversationId,
        aiGenerated: true,
        actionType: 'draft_reply',
        draftData: draftResult.draftData || null
      });
    }

    // Handle notes query
    const detectedIsNotesQuery = isNotesQuery !== undefined ? isNotesQuery : isNotesRelatedQuery(message);
    if (detectedIsNotesQuery && userEmail) {
      try {
        const notesResult = await executeNotesAction(message, userEmail, notesSearchQuery);
        const notesContext = formatNotesActionResult(notesResult);

        const response = await arcusAI.generateResponse(message, {
          conversationHistory,
          emailContext: notesContext,
          integrations,
          userEmail,
          userName,
          privacyMode
        });

        if (userEmail) {
          await saveConversation(userEmail, message, response, currentConversationId, db);
        }

        return NextResponse.json({
          message: response,
          timestamp: new Date().toISOString(),
          conversationId: currentConversationId,
          aiGenerated: true,
          actionType: 'notes',
          notesResult
        });
      } catch (error) {
        console.error('Notes action failed:', error);
      }
    }

    // Handle email context
    let emailContext = null;

    // IF a specific email is selected (from the Traditional View "Ask AI" button)
    if (selectedEmailId && userEmail) {
      try {
        console.log('📧 Arcus: Fetching specific email context for:', selectedEmailId);
        const emailData = await getEmailById(selectedEmailId, userEmail, session);
        if (emailData) {
          emailContext = `=== SELECTED EMAIL CONTEXT ===
This is the specific email the user is currently looking at and asking about:
From: ${emailData.from}
Subject: ${emailData.subject}
Date: ${emailData.date}
Body: ${emailData.body || emailData.snippet}
============================`;
        }
      } catch (error) {
        console.error('Error fetching selected email context:', error);
      }
    }
    // Otherwise, handle general email queries by searching
    else if (userEmail && isEmailRelatedQuery(message)) {
      try {
        const emailActionResult = await executeEmailAction(message, userEmail, session);
        if (emailActionResult && emailActionResult.success) {
          emailContext = formatEmailActionResult(emailActionResult);
        }
      } catch (error) {
        console.error('Email action failed:', error);
      }
    }

    // Generate AI response with full context
    const response = await arcusAI.generateResponse(message, {
      conversationHistory,
      emailContext,
      integrations,
      subscriptionInfo, // Pass subscription info so Arcus knows user's plan
      additionalContext: `
- Understand and act upon **URGENCY, PRIORITY, and REVENUE IMPACT**
- Remember past conversations and build on previous context

## Current User Context

- **User Email**: ${userEmail || 'Not signed in'}
- **User Name**: ${userName}
- **Gmail Access**: ${integrations.gmail ? '✅ Connected' : '❌ Not connected'}

## 🧨 Hard Restrictions - Do Not Cross`,
      userEmail,
      userName,
      privacyMode
    });

    const finalResponse = response && response.trim()
      ? response
      : generateFallbackResponse(message, integrations);

    // Save conversation
    if (userEmail) {
      try {
        await saveConversation(userEmail, message, finalResponse, currentConversationId, db);
      } catch (error) {
        console.log('⚠️ Failed to save conversation:', error.message);
      }

      // Increment usage after successful chat
      await subscriptionService.incrementFeatureUsage(userEmail, FEATURE_TYPES.ARCUS_AI);
    }

    return NextResponse.json({
      message: finalResponse,
      timestamp: new Date().toISOString(),
      conversationId: currentConversationId,
      aiGenerated: true,
      actionType: emailContext ? 'email' : 'general',
      integrations // Include integration status in response
    });

  } catch (error) {
    console.error('💥 Arcus Chat API error:', error);
    return NextResponse.json({
      message: "I ran into a temporary issue. Could you try that again? If the problem persists, it might be worth refreshing the page.",
      timestamp: new Date().toISOString(),
      error: 'Internal server error',
    });
  }
}

/**
 * Get integration status for current user
 */
async function getIntegrationStatus(userEmail, db) {
  const defaultStatus = {
    gmail: false,
    'google-calendar': false,
    'google-meet': false
  };

  if (!userEmail) return defaultStatus;

  try {
    const tokens = await db.getUserTokens(userEmail);
    const profile = await db.getUserProfile(userEmail);

    const hasCalendarScope = tokens?.scopes?.includes('https://www.googleapis.com/auth/calendar');

    return {
      gmail: !!tokens,
      'google-calendar': (profile?.integrations?.['google-calendar'] !== false) && !!tokens && hasCalendarScope,
      'google-meet': (profile?.integrations?.['google-meet'] !== false) && !!tokens && hasCalendarScope
    };
  } catch (error) {
    console.error('Error getting integration status:', error);
    return defaultStatus;
  }
}

/**
 * Get conversation history for memory
 */
async function getConversationHistory(userEmail, conversationId, db) {
  try {
    const history = await db.getConversationThread(userEmail, conversationId);

    if (!history || history.length === 0) return [];

    // Convert to message format for AI context
    const messages = [];
    for (const entry of history) {
      if (entry.user_message) {
        messages.push({
          role: 'user',
          content: entry.user_message
        });
      }
      if (entry.agent_response) {
        messages.push({
          role: 'assistant',
          content: entry.agent_response
        });
      }
    }

    return messages;
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    return [];
  }
}

/**
 * Handle draft reply request
 */
async function handleDraftRequest(
  message,
  draftIntent,
  selectedEmailId,
  userEmail,
  userName,
  session,
  db,
  arcusAI,
  integrations,
  conversationHistory,
  privacyMode
) {
  try {
    // Get email content to reply to
    let emailContent = null;
    let emailData = null;

    if (selectedEmailId) {
      emailData = await getEmailById(selectedEmailId, userEmail, session);
      if (emailData) {
        emailContent = formatEmailForDraft(emailData);
      }
    } else if (draftIntent.replyTo) {
      // Search for email by sender name
      emailData = await searchEmailBySender(draftIntent.replyTo, userEmail, session);
      if (emailData) {
        emailContent = formatEmailForDraft(emailData);
      }
    }

    if (!emailContent) {
      // Ask for clarification
      return {
        message: `I'd be happy to help you draft a reply! Could you tell me which email you'd like me to respond to? You can either:

1. Select an email from your inbox using the email selector
2. Tell me the sender's name (e.g., "draft a reply to John's email")
3. Describe what the email was about

Which would you prefer?`,
        draftData: null
      };
    }

    // Generate draft reply
    const draftResult = await arcusAI.generateDraftReply(emailContent, {
      userName,
      userEmail,
      replyInstructions: draftIntent.instructions || message,
      conversationHistory,
      privacyMode
    });

    const responseMessage = `I've drafted a reply for you. Here's what I came up with:

---

${draftResult.draftContent}

---

Feel free to edit this before sending. When you're ready, you can click "Send Reply" to deliver it to ${draftResult.recipientName}.`;

    return {
      message: responseMessage,
      draftData: {
        content: draftResult.draftContent,
        recipientName: draftResult.recipientName,
        recipientEmail: draftResult.recipientEmail,
        senderName: draftResult.senderName,
        originalEmailId: selectedEmailId || emailData?.id,
        threadId: emailData?.threadId,
        messageId: emailData?.messageId || emailData?.id,
        subject: emailData?.subject ? `Re: ${emailData.subject.replace(/^Re:\s*/i, '')}` : 'Re: Your email'
      }
    };
  } catch (error) {
    console.error('Error handling draft request:', error);
    return {
      message: `I had trouble drafting that reply. Could you provide a bit more context about what you'd like to say? That will help me create a better draft for you.`,
      draftData: null
    };
  }
}

/**
 * Handle scheduling request
 */
async function handleSchedulingRequest(
  message,
  schedulingIntent,
  userEmail,
  userName,
  session,
  db,
  arcusAI,
  integrations,
  conversationHistory,
  privacyMode
) {
  try {
    // Check if we have all required information
    const missingInfo = [];

    if (schedulingIntent.attendees.length === 0) {
      missingInfo.push('who should attend the meeting');
    }
    if (!schedulingIntent.time) {
      missingInfo.push('what time the meeting should be');
    }
    if (!schedulingIntent.date) {
      missingInfo.push('what day the meeting should be on');
    }

    // Ask clarifying questions if info is missing
    if (missingInfo.length > 0) {
      const clarificationMessage = `I'd be happy to help schedule that meeting! I just need a bit more information:

${missingInfo.map((info, i) => `${i + 1}. ${info.charAt(0).toUpperCase() + info.slice(1)}`).join('\n')}

Could you provide these details?`;

      return {
        message: clarificationMessage,
        schedulingData: null
      };
    }

    // We have all the info, proceed with scheduling
    const confirmationMessage = `Great! I'll set up the meeting for you:

Meeting with: ${schedulingIntent.attendees.join(', ')}
When: ${schedulingIntent.date} at ${schedulingIntent.time}
${schedulingIntent.notify ? 'Notifications: Will be sent to all attendees' : ''}
${schedulingIntent.saveToCalendar ? 'Calendar: Will be saved to your Google Calendar' : ''}

I'm preparing to create this event now. Is this correct? Just say "yes" to confirm or let me know if you'd like to change anything.`;

    return {
      message: confirmationMessage,
      schedulingData: {
        attendees: schedulingIntent.attendees,
        time: schedulingIntent.time,
        date: schedulingIntent.date,
        notify: schedulingIntent.notify,
        saveToCalendar: schedulingIntent.saveToCalendar,
        status: 'pending_confirmation'
      }
    };
  } catch (error) {
    console.error('Error handling scheduling request:', error);
    return {
      message: `I had some trouble setting that up. Could you tell me the details again? I need to know who to invite, what day, and what time.`,
      schedulingData: null
    };
  }
}

/**
 * Get email by ID
 */
async function getEmailById(emailId, userEmail, session) {
  try {
    const db = new DatabaseService();
    const userTokens = await db.getUserTokens(userEmail);

    if (!userTokens?.encrypted_access_token) return null;

    const accessToken = decrypt(userTokens.encrypted_access_token);
    const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';

    const { GmailService } = await import('../../../../lib/gmail');
    const gmailService = new GmailService(accessToken, refreshToken);

    const details = await gmailService.getEmailDetails(emailId);
    return gmailService.parseEmailData(details);
  } catch (error) {
    console.error('Error getting email by ID:', error);
    return null;
  }
}

/**
 * Search for email by sender name
 */
async function searchEmailBySender(senderName, userEmail, session) {
  try {
    const db = new DatabaseService();
    const userTokens = await db.getUserTokens(userEmail);

    if (!userTokens?.encrypted_access_token) return null;

    const accessToken = decrypt(userTokens.encrypted_access_token);
    const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';

    const { GmailService } = await import('../../../../lib/gmail');
    const gmailService = new GmailService(accessToken, refreshToken);

    // Search for emails from this sender
    const query = `from:${senderName} newer_than:30d`;
    const emailsResponse = await gmailService.getEmails(1, query, null, 'internalDate desc');
    const messages = emailsResponse?.messages || [];

    if (messages.length === 0) return null;

    const details = await gmailService.getEmailDetails(messages[0].id);
    return gmailService.parseEmailData(details);
  } catch (error) {
    console.error('Error searching email by sender:', error);
    return null;
  }
}

/**
 * Format email for draft context
 */
function formatEmailForDraft(emailData) {
  return `From: ${emailData.from || 'Unknown'}
To: ${emailData.to || 'Unknown'}
Subject: ${emailData.subject || '(No Subject)'}
Date: ${emailData.date || 'Unknown'}

${emailData.body || emailData.snippet || ''}`;
}

/**
 * Generate fallback response
 */
function generateFallbackResponse(message, integrations) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('email') || lowerMessage.includes('inbox')) {
    return `I'm connected to your Gmail and ready to help! I can:

1. Show you your recent or unread emails
2. Search for emails from specific people or about certain topics  
3. Draft replies to any email
4. Summarize what needs your attention

What would you like to do first?`;
  }

  if (lowerMessage.includes('meeting') || lowerMessage.includes('schedule')) {
    const calendarEnabled = integrations['google-calendar'];
    if (!calendarEnabled) {
      return `I can help with scheduling, but Google Calendar isn't enabled yet. Head to the Integrations settings (plug icon) to turn it on, then I can create meetings and manage your calendar for you.`;
    }
    return `I can help you schedule a meeting! Just tell me:

1. Who should attend
2. What day and time works
3. Whether you want to send invites

For example: "Schedule a meeting with John tomorrow at 2pm and send him an invite"`;
  }

  return `Hello! I'm Arcus, your intelligent email assistant. I'm here to help you manage your inbox, draft replies, and stay on top of your communications.

What would you like help with today?`;
}

/**
 * Execute email actions
 */
async function executeEmailAction(userMessage, userEmail, session) {
  const lowerMessage = userMessage.toLowerCase();

  try {
    let accessToken = session?.accessToken;
    let refreshToken = session?.refreshToken;

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
      return { error: 'Gmail not connected' };
    }

    const { GmailService } = await import('../../../../lib/gmail');
    const gmailService = new GmailService(accessToken, refreshToken || '');

    // Build query based on user message
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

    const fromMatch = userMessage.match(/from\s+([^\s,]+)/i);
    if (fromMatch) {
      query += ` from:${fromMatch[1]}`;
    }

    try {
      const emailsResponse = await gmailService.getEmails(maxResults, query, null, 'internalDate desc');
      const messages = emailsResponse?.messages || [];

      if (messages.length === 0) {
        return { action: 'read_emails', success: true, emails: [], query, count: 0 };
      }

      const emailDetails = [];
      for (const message of messages.slice(0, 5)) {
        try {
          const details = await gmailService.getEmailDetails(message.id);
          const parsed = gmailService.parseEmailData(details);

          const fullBody = parsed.body || parsed.snippet || '';
          const bodyContent = fullBody.length > 2000 ? fullBody.substring(0, 2000) + '...' : fullBody;

          emailDetails.push({
            id: message.id,
            subject: parsed.subject || '(No Subject)',
            from: parsed.from || 'Unknown Sender',
            to: parsed.to || '',
            date: parsed.date || 'Unknown Date',
            snippet: parsed.snippet || '',
            body: bodyContent,
            labels: parsed.labels || [],
            threadId: parsed.threadId || ''
          });
        } catch (error) {
          console.log('Error processing email:', error.message);
        }
      }

      return { action: 'read_emails', success: true, emails: emailDetails, query, count: emailDetails.length };
    } catch (error) {
      return { action: 'read_emails', success: false, error: error.message };
    }
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Format email action result for AI context
 */
function formatEmailActionResult(result) {
  if (!result) return '';
  if (result.error) return `Email action issue: ${result.error}`;

  if (result.action === 'read_emails' && result.success) {
    let context = `=== EMAIL CONTEXT (${result.count} emails) ===\n\n`;

    if (result.emails?.length) {
      result.emails.forEach((email, index) => {
        context += `Email ${index + 1}:\n`;
        context += `  From: ${email.from}\n`;
        context += `  Subject: ${email.subject}\n`;
        context += `  Date: ${email.date}\n`;
        context += `  Preview: ${email.snippet}\n`;
        if (email.body) {
          context += `  Content: ${email.body}\n`;
        }
        context += '\n';
      });
    } else {
      context += 'No emails found matching the query.';
    }
    return context;
  }

  return JSON.stringify(result);
}

/**
 * Check if query is email-related
 */
function isEmailRelatedQuery(message) {
  const emailKeywords = [
    'email', 'emails', 'inbox', 'gmail', 'message', 'messages',
    'send', 'compose', 'reply', 'forward', 'unread', 'read',
    'from', 'subject', 'attachment', 'urgent', 'important'
  ];
  const lowerMessage = message.toLowerCase();
  return emailKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Check if query is notes-related
 */
function isNotesRelatedQuery(message) {
  const notesKeywords = [
    'note', 'notes', 'my notes', 'find note', 'search note',
    'remember', 'reminder', 'todo', 'task', 'ideas', 'memo'
  ];
  const lowerMessage = message.toLowerCase();
  return notesKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Execute notes action
 */
async function executeNotesAction(userMessage, userEmail, providedSearchQuery = null) {
  try {
    const searchTerm = providedSearchQuery || extractSearchTerm(userMessage);

    if (!searchTerm) {
      return { action: 'notes_search', success: true, notes: [], query: '', count: 0 };
    }

    const response = await fetch('http://localhost:3000/api/agent-talk/notes-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchTerm, searchType: 'all' }),
    });

    if (!response.ok) {
      throw new Error(`Notes search failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      action: 'notes_search',
      success: true,
      notes: data.results || [],
      query: data.query,
      count: data.totalFound || 0
    };
  } catch (error) {
    console.error('Error executing notes action:', error);
    return { action: 'notes_search', success: false, error: error.message };
  }
}

/**
 * Extract search term from message
 */
function extractSearchTerm(message) {
  const patterns = [
    /find\s+(?:my\s+)?notes?\s+(?:about|on|regarding)?\s*(.+)/i,
    /search\s+(?:for\s+)?notes?\s+(?:about|on|regarding)?\s*(.+)/i,
    /notes\s+about\s+(.+)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return message.trim();
}

/**
 * Format notes action result
 */
function formatNotesActionResult(result) {
  if (!result) return '';
  if (result.error) return `Notes issue: ${result.error}`;

  if (result.action === 'notes_search' && result.success) {
    let context = `=== NOTES CONTEXT (${result.count} notes) ===\n\n`;

    if (result.notes?.length) {
      result.notes.forEach((note, index) => {
        context += `Note ${index + 1}:\n`;
        context += `  Subject: ${note.subject || '(No Subject)'}\n`;
        context += `  Content: ${note.content || '(No Content)'}\n`;
        context += `  Created: ${note.created_at || 'Unknown'}\n\n`;
      });
    } else {
      context += 'No notes found matching the query.';
    }
    return context;
  }

  return JSON.stringify(result);
}

async function saveConversation(userEmail, userMessage, aiResponse, conversationId, db) {
  try {
    // Get current message count for this conversation to determine order
    const messageCount = await db.getConversationMessageCount(userEmail, conversationId);
    const nextOrder = (messageCount || 0) + 1;
    const isInitial = nextOrder === 1;

    await db.storeAgentChatMessage(
      userEmail,
      userMessage,
      aiResponse,
      conversationId,
      nextOrder,
      isInitial
    );
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}
