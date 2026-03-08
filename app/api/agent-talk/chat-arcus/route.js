import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';
import { DatabaseService } from '../../../../lib/supabase.js';
import { decrypt } from '../../../../lib/crypto.js';

/**
 * Main chat handler with AI + Gmail context
 */
export async function POST(request) {
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

    let session = null;
    try {
      session = await auth();
      console.log('🔐 Auth session:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasEmail: !!session?.user?.email,
        hasAccessToken: !!session?.accessToken,
      });
    } catch (error) {
      console.log('⚠️ Auth not available, continuing without user context:', error.message);
    }

    let emailActionResult = null;
    if (session?.user?.email) {
      try {
        emailActionResult = await executeEmailAction(message, session.user.email, session);
      } catch (error) {
        console.error('💥 Email action failed:', error);
        emailActionResult = { 
          error: `Email action failed: ${error.message}`,
          action: 'email_action',
          success: false,
        };
      }
    }

    const response = await generateAIResponseWithFallbacks(
      message,
      session,
      emailActionResult,
      gmailAccessToken
    );
    const finalResponse = response && response.trim()
      ? response
      : generateEmergencyFallback(message, emailActionResult);

    if (session?.user?.email) {
      try {
        await saveConversation(session.user.email, message, finalResponse, currentConversationId);
      } catch (error) {
        console.log('⚠️ Failed to save conversation:', error.message);
      }
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
 * Generate AI response with ElevenLabs (or fallback) and Gmail personalization
 */
async function generateAIResponseWithFallbacks(
  userMessage,
  session = null,
  emailActionResult = null,
  gmailAccessToken = null
) {
  console.log('🤖 AI Generation Started:', userMessage.substring(0, 80));

  try {
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
        console.log('⚠️ Email context unavailable, proceeding without it:', error.message);
      }
    }

    const systemPrompt = buildIntelligentSystemPrompt(emailContext, session?.user?.email);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    // Build dynamic variables for ElevenLabs tools
    const dynamicVariables = {};
    const derivedToken = gmailAccessToken || await getGmailAccessTokenFromSession(session);
    if (derivedToken) {
      dynamicVariables.gmail_access_token = derivedToken;
    }
    if (session?.user?.email) {
      dynamicVariables.user_email = session.user.email;
    }

    const elevenLabsResponse = await callElevenLabsAgent(messages, dynamicVariables);
    if (elevenLabsResponse && elevenLabsResponse.trim()) {
      console.log('✅ ElevenLabs response received');
      return elevenLabsResponse.trim();
    }

    console.warn('⚠️ ElevenLabs unavailable or empty response, using fallback');
    return generateIntelligentFallback(userMessage, emailContext, emailActionResult);
  } catch (error) {
    console.error('💥 AI service error:', error.message, error.stack);
    const shouldHideError = error.message.includes('timeout') || error.message.includes('Timeout');
    return generateIntelligentFallback(userMessage, '', emailActionResult, shouldHideError ? '' : error.message);
  }
}

function generateEmergencyFallback(userMessage, emailActionResult) {
  const lowerMessage = userMessage.toLowerCase();
  
  if (emailActionResult && emailActionResult.action === 'read_emails') {
    if (emailActionResult.success && emailActionResult.count === 0) {
      return '📭 Your inbox is looking pretty quiet right now! No emails matching what you were looking for.\n\nWant me to check something else? Maybe unread emails, or emails from a specific person?';
    }
  }

  if (lowerMessage.includes('email') || lowerMessage.includes('inbox') || lowerMessage.includes('gmail')) {
    return '🤖 I’m your email assistant.\n\n• "Show me my unread emails"\n• "What emails do I have from [person]?"\n• "Summarize what’s urgent right now"\n• "Draft an email to [recipient] about [topic]"\n\nWhat should we tackle first?';
  }

  return 'Hello! I’m here to help with your Gmail—search, summarize, or draft emails. What do you need?';
}

function formatEmailActionResult(result) {
  if (!result) return '';
  if (result.error) return `Email action issue: ${result.error}`;

  if (result.action === 'read_emails' && result.success) {
    let context = `=== EMAIL ACTION RESULT ===\nYou successfully fetched ${result.count} emails for the user.\nQuery used: ${result.query || 'default'}\n\n`;
    if (result.emails?.length) {
      context += `=== DETAILED EMAIL ANALYSIS (${result.emails.length} emails) ===\n\n`;
      result.emails.forEach((email, index) => {
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
      context += `INSTRUCTIONS: Analyze each email deeply. Understand the content, context, relationships, urgency indicators, and provide comprehensive insights. Consider the full email body content, not just snippets.`;
    } else {
      context += 'No emails found matching the query.';
    }
    return context;
  }

  return JSON.stringify(result);
}

function extractAIResponse(output) {
  if (!output) return '';
  if (typeof output === 'string' && output.trim()) return output.trim();

  if (output && typeof output === 'object') {
    const fields = ['content', 'message', 'text', 'response', 'answer', 'output', 'result'];
    for (const field of fields) {
      if (output[field] && typeof output[field] === 'string' && output[field].trim()) {
        return output[field].trim();
      }
    }
  }
  return '';
}

function generateIntelligentFallback(userMessage, emailContext, emailActionResult = null, systemNote = '') {
  const lowerMessage = userMessage.toLowerCase();

  if (emailActionResult?.action === 'read_emails' && emailActionResult.success) {
    const emails = emailActionResult.emails || [];
    if (!emails.length) {
      return '📭 Clean inbox for that request. Want me to check unread, important, or a specific sender instead?';
    }

    const summary = emails
      .slice(0, 5)
      .map((email, index) => {
        const senderName = email.from ? email.from.split('<')[0].trim() : 'Unknown';
        return `${index + 1}. ${email.subject || '(No Subject)'} — from ${senderName}${email.snippet ? ` | ${email.snippet.substring(0, 80)}...` : ''}`;
      })
      .join('\n');

    return `📬 Here is what I pulled:\n${summary}\n\nWant me to expand any, mark as read, or draft a reply?`;
  }

  if (lowerMessage.includes('email') || lowerMessage.includes('inbox') || lowerMessage.includes('gmail')) {
    return 'I am synced for Gmail tasks.\n\n• Check unread or important mail\n• Search by sender/topic/date\n• Summarize what matters now\n• Draft or polish replies\n\nTell me what to focus on.';
  }

  // Never show timeout errors to users
  const shouldShowError = systemNote && !systemNote.toLowerCase().includes('timeout');
  const errorNote = shouldShowError ? `\n\n(Heads-up: ${systemNote})` : '';
  return `I'm here to help manage your Gmail with smart, personalized actions.${errorNote}\nWhat should we handle right now?`;
}

function buildIntelligentSystemPrompt(emailContext = '', userEmail = null) {
  let prompt = `System Role:
You are ARCUS (Adaptive Response & Communication Understanding System) — the conversational intelligence of Mailient.
You exist to understand, summarize, and reason about the user's Gmail inbox, providing contextually aware insights and natural dialogue based on the user's entire communication history.
ARCUS is private, ethical, and adaptive. You never send or modify emails yourself — you only analyze, interpret, and communicate insights conversationally.

Mission

Your mission is to act as a trusted communication brain.
You help the user see through their inbox — identifying priorities, surfacing urgency, and recalling past threads or commitments when relevant.
You always maintain a calm, professional, and precise tone — as if you are the user's intelligent Chief of Staff for communication.

Core Intelligence Directives

Persistent Context Awareness:
You have long-term, structured memory of the user's entire Gmail inbox.
This includes:

All emails (summarized + embedded).

Thread metadata: sender, subject, time, urgency, labels, tone.

Historical summaries and sentiment patterns per contact.

Learned tone preferences and reply style.

Any past discussions with the user about specific people, topics, or projects.

Context Engineering Workflow:
Before forming your reply, always follow this reasoning sequence:

Step 1: Parse the user's query → detect intent (summary, urgency, reply suggestion, recall, etc.)
Step 2: Search internal memory for all relevant emails, summaries, senders, and previous decisions.
Step 3: Rank matches by recency, relevance, and urgency signals (keywords like "urgent," "asap," "immediately," "deadline," etc.)
Step 4: Compress findings into a contextual summary (never raw dump unless requested).
Step 5: Formulate a direct, natural, and actionable response that feels intelligent, concise, and confident.
Step 6: If action is implied (e.g. "schedule," "reply"), generate a suggested plan but clearly state ARCUS cannot execute it yet.

Each answer must appear as if you've deeply understood the entire email ecosystem.

Positive Interpretation Rule:
When asked a query like "Anything urgent?" — interpret it optimistically and contextually.
Example behavior:

If there are high-priority or unread threads → summarize them clearly.

If nothing is pressing → reassure confidently, e.g.,

"Everything looks stable — no urgent emails. John's last message was just a reminder for Monday's meeting."

Always phrase replies in a human, conversational tone, never robotic or uncertain.

Clarity over Volume:
Deliver the essence, not the entire inbox.
Users want actionable clarity — not email data dumps.
Use phrases like:

"Here's what matters most…"
"Only one message stands out as urgent…"
"All ongoing threads are under control."

Privacy & Security:

Never reveal private email content verbatim unless the user explicitly requests "show exact email."

Never mention specific addresses or sensitive details unless necessary.

Do not speculate or infer beyond the data available.

Never expose any user email to external entities.

Default to minimal disclosure and maximum utility.

Self-Awareness & Ethical Behavior:
ARCUS knows it is a conversational assistant, not an executor.
Always state clearly when an action cannot be performed yet.
Example:

"I've drafted what I'd send to John, but since ARCUS can't send emails yet, here's the suggested text…"

Interaction Principles

Speak like a human strategist, not an assistant.

Every reply should make the user feel clarity and control.

If something is unclear, ask exactly one clarifying question — no assumptions.

If a query can't be answered from context, respond gracefully:

"I don't have that data in memory yet, but I can help summarize what's available."

ARCUS Tone

Confident. Intelligent. Minimalist.
Every line should sound like a professional who's already done the thinking.
No filler, no fluff — just pure contextual clarity.

Remember:
ARCUS is the conversation core of Mailient — it doesn't "do," it understands.
Your excellence lies not in execution, but in awareness and reasoning.
`;

  if (userEmail) {
    prompt += `\n\nUser: ${userEmail}`;
  }

  if (emailContext) {
    prompt += `\n\n=== CRITICAL: EMAIL CONTEXT PROVIDED ===\n${emailContext}\n\n=== EMAIL ANALYSIS REQUIREMENTS ===\n
When email context is provided, you MUST:
1. Read and understand the FULL email content (not just snippets) - analyze the complete body text
2. Identify key information: dates, deadlines, action items, requests, commitments
3. Understand relationships: who is communicating, what threads exist, conversation flow
4. Assess urgency: look for urgency indicators, deadlines, time-sensitive requests
5. Extract sentiment and tone: professional, urgent, casual, formal, etc.
6. Identify patterns: recurring topics, ongoing conversations, project references
7. Provide deep insights: don't just summarize - analyze, interpret, and provide actionable intelligence
8. Reference specific emails when relevant: "In the email from [sender] about [subject]..."
9. Connect related emails: if multiple emails discuss the same topic, connect them
10. Be specific: use actual content from emails, not generic statements

The email context includes full email bodies (up to 2000 characters), so you have access to complete content. Use this to provide deep, intelligent analysis.

CRITICAL: You have access to the user's Gmail. When email context is provided, analyze it deeply and provide comprehensive insights based on the actual email content.`;
  } else {
    prompt += '\n\nNo email context provided yet. If needed, suggest a focused Gmail check to ground your answer. When email context becomes available, analyze it deeply using the full email content.';
  }

  prompt += '\n\n=== TOOLING & SAFETY ===\n'
  + 'If the user asks about email content or inbox state, you MUST call the `read_gmail` webhook before responding. '
  + 'If the user asks to send or reply, you MUST call the `send_email` webhook and confirm recipients and subject. '
  + 'If the user asks to schedule or move a meeting, you MUST call the `schedule_meeting` webhook and confirm time zone, start, end, and attendees. '
  + 'Never hallucinate email content—always base answers on webhook JSON results.\n'
  + 'If required inputs are missing, ask a single concise clarifying question.\n'
  + 'Always keep responses brief and voice-friendly.';

  prompt += '\n\n=== FINAL INSTRUCTIONS ===\nFollow these system instructions strictly in every reply. Always respond as Arcus. When you have email context, use it to provide deep, intelligent analysis based on the complete email content. Never make generic statements when you have specific email data available.';
  return prompt;
}

async function getGmailAccessTokenFromSession(session) {
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
    console.log('⚠️ Unable to derive Gmail token from session/db:', error.message);
  }

  return null;
}

async function callElevenLabsAgent(messages, dynamicVariables = {}) {
  const apiKey =
    process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVENLABS_API_KEY_SERVER ||
    process.env.ELEVENLABS_XI_API_KEY;
  const agentId =
    process.env.ELEVENLABS_AGENT_ID ||
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    console.warn('⚠️ ElevenLabs configuration missing (api key or agent id)');
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/convai/chat', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        agent_id: agentId,
        messages,
        dynamic_variables: dynamicVariables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs API error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    const candidate =
      result?.output?.text ||
      result?.output ||
      result?.message ||
      result?.response ||
      '';

    if (typeof candidate === 'string') {
      return candidate;
    }

    return JSON.stringify(candidate);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('⏱️ ElevenLabs request timed out');
    } else {
      console.error('💥 ElevenLabs call failed:', error.message);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isEmailRelatedQuery(message) {
  const emailKeywords = [
    'email', 'emails', 'inbox', 'gmail', 'message', 'messages',
    'send', 'compose', 'reply', 'forward', 'unread', 'read',
    'from', 'subject', 'attachment', 'urgent', 'important',
    'meeting', 'calendar', 'schedule', 'thread', 'conversation',
  ];
  const lowerMessage = message.toLowerCase();
  return emailKeywords.some((keyword) => lowerMessage.includes(keyword));
}

async function getEmailContext(userMessage, userEmail) {
  try {
    const db = new DatabaseService();
    const userTokens = await db.getUserTokens(userEmail);

    if (!userTokens?.encrypted_access_token) {
      return 'No Gmail access available. Please sign in to access your emails.';
    }

    const accessToken = decrypt(userTokens.encrypted_access_token);
    const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';

    const { GmailService } = await import('../../../../lib/gmail.ts');
    const gmailService = new GmailService(accessToken, refreshToken);

    const query = buildGmailSearchQuery(userMessage);
    // Fetch more emails for better context (increased from 5 to 10)
    const emailsResponse = await gmailService.getEmails(10, query, null, 'internalDate desc');
    const messages = emailsResponse.messages || [];

    if (!messages.length) {
      return 'No recent emails found matching the request.';
    }

    const emailDetails = [];
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
        console.log('Error fetching email details:', error.message);
      }
    }

    // Format comprehensive email context for deep AI understanding
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

    return `=== GMAIL CONTEXT (${emailDetails.length} emails) ===\n\n${contextLines.join('\n---\n\n')}\n\n=== END GMAIL CONTEXT ===\n\nAnalyze these emails deeply. Understand the content, context, relationships between emails, urgency, and provide intelligent insights based on the full email content.`;
  } catch (error) {
    console.log('Error fetching email context:', error.message);
    return 'Unable to fetch email context right now.';
  }
}

function buildGmailSearchQuery(userMessage) {
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
async function executeEmailAction(userMessage, userEmail, session) {
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

    const { GmailService } = await import('../../../../lib/gmail.ts');
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
        
        const emailDetails = [];
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
            console.log('Error processing email:', error.message);
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
        if (error.message.includes('401') || error.message.includes('token') || error.message.includes('expired')) {
          return { action: 'read_emails', success: false, error: 'Your Gmail session has expired. Please sign out and sign in again to refresh your access.' };
        }
        
        return { action: 'read_emails', success: false, error: error.message };
      }
    }

    return null; // No email action detected
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Save conversation to database
 */
async function saveConversation(userEmail, userMessage, aiResponse, conversationId) {
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
