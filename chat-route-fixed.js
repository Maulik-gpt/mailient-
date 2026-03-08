import { NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth.js';
import { DatabaseService } from '../../../../lib/supabase.js';
import { decrypt, encrypt } from '../../../../lib/crypto.js';
import Bytez from "bytez.js";

/**
 * Main chat handler - simplified and clean with robust AI fallbacks
 */
export async function POST(request) {
  try {
    const { message, conversationId, isNewConversation } = await request.json();

    console.log('🚀 Chat request received:', message.substring(0, 50));

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate conversation ID for new conversations
    let currentConversationId = conversationId;
    if (isNewConversation && !conversationId) {
      currentConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get user session with enhanced error handling
    let session = null;
    try {
      session = await auth();
      console.log('🔐 Auth session:', { 
        hasSession: !!session, 
        hasUser: !!session?.user, 
        hasEmail: !!session?.user?.email,
        hasAccessToken: !!session?.accessToken
      });
    } catch (error) {
      console.log('⚠️ Auth not available, proceeding without user context:', error.message);
    }

    // Enhanced email action execution with comprehensive error handling
    let emailActionResult = null;
    if (session?.user?.email) {
      try {
        console.log('📧 Starting email action execution...');
        emailActionResult = await executeEmailAction(message, session.user.email, session);
        console.log('✅ Email action completed:', { 
          hasResult: !!emailActionResult,
          action: emailActionResult?.action,
          success: emailActionResult?.success
        });
      } catch (error) {
        console.error('💥 Email action failed:', error);
        emailActionResult = { 
          error: `Email action failed: ${error.message}`,
          action: 'email_action',
          success: false 
        };
      }
    } else {
      console.log('ℹ️ No user email available, skipping email actions');
    }

    // Generate AI response with multiple fallback strategies
    const response = await generateAIResponseWithFallbacks(message, session, emailActionResult);
    
    console.log('✅ AI response generated:', response.substring(0, 50));

    // CRITICAL: Ensure we always have a response
    let finalResponse = response;
    if (!finalResponse || finalResponse.trim() === '') {
      console.log('🚨 No response from AI, using emergency fallback');
      finalResponse = generateEmergencyFallback(message, emailActionResult);
    }

    // Save to database if user is authenticated
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
      emailAction: emailActionResult
    });

  } catch (error) {
    console.error('💥 Chat API error:', error);
    return NextResponse.json({
      message: generateEmergencyFallback('error', null),
      timestamp: new Date().toISOString(),
      error: 'Internal server error'
    });
  }
}

/**
 * Generate AI response with comprehensive fallbacks
 */
async function generateAIResponseWithFallbacks(userMessage, session = null, emailActionResult = null) {
  console.log('🤖 AI Generation Started:', userMessage.substring(0, 50));
  
  try {
    // Setup bytez.js with enhanced error handling
    const key = "7bb6ef128a200a796cc6ebf8fc063af9";
    const sdk = new Bytez(key);
    const model = sdk.model("Qwen/Qwen3-4B-Instruct-2507");

    console.log('🤖 AI Service Status:', {
      hasKey: !!key,
      keyLength: key.length,
      hasSDK: !!sdk,
      hasModel: !!model
    });

    // Build intelligent response based on user message
    let response = '';
    
    // Get email context if available and relevant
    let emailContext = '';
    
    // If we have email action results, use them as context
    if (emailActionResult) {
      emailContext = formatEmailActionResult(emailActionResult);
      console.log('📧 Email context prepared:', emailContext.substring(0, 100));
    } else if (session?.user?.email && isEmailRelatedQuery(userMessage)) {
      try {
        emailContext = await getEmailContext(userMessage, session.user.email);
      } catch (error) {
        console.log('Email context unavailable, proceeding without it');
      }
    }

    // Create system prompt
    const systemPrompt = buildIntelligentSystemPrompt(emailContext, session?.user?.email);
    
    // Prepare messages
    const messages = [
      {
        "role": "system", 
        "content": systemPrompt
      },
      {
        "role": "user",
        "content": userMessage
      }
    ];

    console.log('🚀 Calling AI with timeout protection...');
    
    // Try with timeout protection
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout after 15000ms')), 15000)
      );
      
      const modelPromise = model.run(messages);
      const result = await Promise.race([modelPromise, timeoutPromise]);
      
      console.log('📥 Raw result:', JSON.stringify(result).substring(0, 200));
      
      // Handle different response formats
      let output = null;
      let error = null;
      
      if (result && typeof result === 'object') {
        if (result.error) {
          error = result.error;
        } else if (result.output) {
          output = result.output;
        } else if (result.content) {
          output = result.content;
        } else if (result.message) {
          output = result.message;
        } else {
          output = result;
        }
      } else if (typeof result === 'string') {
        output = result;
      }
      
      console.log('📥 Parsed response:', { 
        hasError: !!error, 
        hasOutput: !!output,
        outputType: typeof output
      });
      
      if (error) {
        console.warn('⚠️ AI failed:', error);
        throw new Error(error);
      }
      
      // Extract response
      response = extractAIResponse(output);
      
      if (response && response.trim().length > 10) {
        console.log('✅ AI Response Success:', response.substring(0, 100));
        return response;
      }
      
    } catch (error) {
      console.warn('💥 AI service error:', error.message);
      // Continue to fallback
    }
    
    // If AI completely fails, generate intelligent contextual response
    console.log('🔄 AI failed, using intelligent fallback...');
    return generateIntelligentFallback(userMessage, emailContext, emailActionResult);
    
  } catch (error) {
    console.error('💥 Complete AI failure:', error);
    return generateIntelligentFallback(userMessage, '', emailActionResult);
  }
}

/**
 * Generate emergency fallback response
 */
function generateEmergencyFallback(userMessage, emailActionResult) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Handle specific email actions
  if (emailActionResult && emailActionResult.action === 'read_emails') {
    if (emailActionResult.success && emailActionResult.count === 0) {
      return "📭 Your inbox is looking pretty quiet right now! No emails matching what you were looking for.\n\nThat could be a good thing though — maybe everyone is giving you some peace! 😊\n\nWant me to check something else? Maybe unread emails, or emails from a specific person?";
    }
  }
  
  // General helpful responses
  if (lowerMessage.includes('email') || lowerMessage.includes('inbox')) {
    return "🤖 I'm your email assistant!\n\n**I can help you with:**\n• \"Show me my unread emails\" - Get a clean summary\n• \"What emails do I have from [person]?\" - Find specific senders\n• \"Send email to [address] about [topic]\" - Compose messages\n• \"Search for [keyword]\" - Find specific emails\n\n**What sounds most helpful right now?**";
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hey there! 👋 I'm Arcus, your email assistant. Ready to tackle your inbox?\n\n**Quick start ideas:**\n• \"Show me my unread emails\"\n• \"What's urgent in my inbox?\"\n• \"Help me compose an email\"\n• \"Find emails from [person]\"\n\nWhat would you like to do first?";
  }
  
  return "Hello! I'm here to help you with your emails. What can I assist you with today?";
}

/**
 * Format email action result for AI context
 */
function formatEmailActionResult(result) {
  if (!result) return '';
  
  if (result.error) {
    return `**Email Action Error:** ${result.error}`;
  }
  
  if (result.action === 'read_emails' && result.success) {
    let context = `**EMAIL DATA FOR ANALYSIS:**\n\nYou just fetched ${result.count} emails for the user.`;
    
    if (result.emails && result.emails.length > 0) {
      context += '\n\nEmails:\n';
      result.emails.forEach((email, index) => {
        context += `${index + 1}. From: ${email.from}\n   Subject: ${email.subject}\n   Preview: ${email.snippet}\n\n`;
      });
    }
    
    return context;
  }
  
  return JSON.stringify(result);
}

/**
 * Extract response from AI output
 */
function extractAIResponse(output) {
  if (!output) return '';
  
  // Strategy 1: Direct string response
  if (typeof output === 'string' && output.trim()) {
    return output.trim();
  }
  
  // Strategy 2: Object with content field
  if (output && typeof output === 'object') {
    const fields = ['content', 'message', 'text', 'response', 'answer', 'output', 'result'];
    
    for (const field of fields) {
      if (output[field] && typeof output[field] === 'string' && output[field].trim()) {
        return output[field].trim();
      }
    }
    
    // Try to use the result directly
    if (typeof output === 'string') {
      return output.trim();
    }
  }
  
  return '';
}

/**
 * Generate intelligent contextual fallback responses
 */
function generateIntelligentFallback(userMessage, emailContext, emailActionResult = null) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Handle email action results
  if (emailActionResult) {
    if (emailActionResult.action === 'read_emails' && emailActionResult.success) {
      const emails = emailActionResult.emails;
      const count = emails ? emails.length : 0;
      
      if (count === 0) {
        return "📭 Great news! Your inbox is looking clean based on what you asked for.\n\nNo emails matching that criteria right now. Want me to check something else?";
      }
      
      let response = `📬 Here's what I found (${count} email${count > 1 ? 's' : ''}):\n\n`;
      
      if (emails) {
        emails.forEach((email, index) => {
          const senderName = email.from ? email.from.split('<')[0].trim() : 'Unknown';
          response += `**${index + 1}. ${email.subject || '(No Subject)'}**\n`;
          response += `   From: ${senderName}\n`;
          response += `   ${email.snippet ? email.snippet.substring(0, 80) + '...' : 'No preview'}\n\n`;
        });
      }
      
      response += "What would you like me to help you with next?";
      return response;
    }
  }
  
  // Contextual fallbacks
  if (lowerMessage.includes('email') || lowerMessage.includes('inbox')) {
    return "🤖 I'm your email assistant!\n\n**I can help you with:**\n• \"Show me my unread emails\" - Get a clean summary\n• \"What emails do I have from [person]?\" - Find specific senders\n• \"Send email to [address] about [topic]\" - Compose messages\n• \"Search for [keyword]\" - Find specific emails\n\n**What sounds most helpful right now?**";
  }
  
  return "Hello! I'm here to help you with your emails. What can I assist you with today?";
}

/**
 * Build system prompt for intelligent responses
 */
function buildIntelligentSystemPrompt(emailContext = '', userEmail = null) {
  let prompt = `# ARCUS — Your AI Email Assistant

You are Arcus, an intelligent email assistant that helps users manage their Gmail, analyze emails, and handle email-related tasks efficiently.

## Your Role
- Help users understand and manage their emails
- Provide clear, actionable insights
- Be warm, friendly, and helpful
- Always end responses with engaging questions

## Core Capabilities
1. Email summarization and analysis
2. Email composition and sending
3. Email search and organization
4. Priority detection and recommendations

## Response Guidelines
- Keep responses concise and actionable
- Use bullet points for clarity
- Provide specific, helpful advice
- Ask clarifying questions when needed
- Be warm and engaging, not robotic

`;

  if (emailContext) {
    prompt += `\n## Current Email Context\n${emailContext}\n\nUse this context to provide specific, relevant assistance.`;
  }

  if (userEmail) {
    prompt += `\nNote: User is authenticated as ${userEmail}.`;
  }

  prompt += `\n\nRespond as Arcus - helpful, efficient, and focused on solving email-related challenges.`;

  return prompt;
}

/**
 * Check if query is email-related
 */
function isEmailRelatedQuery(message) {
  const emailKeywords = [
    'email', 'emails', 'inbox', 'gmail', 'message', 'messages',
    'send', 'compose', 'reply', 'forward', 'unread', 'read',
    'from', 'subject', 'attachment', 'urgent', 'important',
    'meeting', 'calendar', 'schedule', 'thread', 'conversation'
  ];
  
  const lowerMessage = message.toLowerCase();
  return emailKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Get email context from Gmail API
 */
async function getEmailContext(userMessage, userEmail) {
  try {
    const db = new DatabaseService();
    const userTokens = await db.getUserTokens(userEmail);
    
    if (!userTokens?.encrypted_access_token) {
      return 'No Gmail access available. Please sign in to access your emails.';
    }

    const accessToken = decrypt(userTokens.encrypted_access_token);
    const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';

    // Use Gmail API to fetch relevant emails
    const { GmailService } = await import('../../../../lib/gmail.ts');
    const gmailService = new GmailService(accessToken, refreshToken);

    // Build search query
    const query = buildGmailSearchQuery(userMessage);
    const emailsResponse = await gmailService.getEmails(5, query, null, 'internalDate desc');
    const messages = emailsResponse.messages || [];

    if (messages.length === 0) {
      return 'No recent emails found matching your query.';
    }

    // Get details for first few emails
    const emailDetails = [];
    for (const message of messages.slice(0, 3)) {
      try {
        const details = await gmailService.getEmailDetails(message.id);
        const parsed = gmailService.parseEmailData(details);
        emailDetails.push({
          subject: parsed.subject || '(No Subject)',
          from: parsed.from || 'Unknown Sender',
          date: parsed.date || 'Unknown Date',
          snippet: parsed.snippet || ''
        });
      } catch (error) {
        console.log('Error fetching email details:', error.message);
      }
    }

    return `Recent relevant emails:\n${emailDetails.map((email, index) =>
      `${index + 1}. From: ${email.from}\n   Subject: ${email.subject}\n   Date: ${email.date}\n   Snippet: ${email.snippet}`
    ).join('\n\n')}`;

  } catch (error) {
    console.log('Error fetching email context:', error.message);
    return 'Unable to fetch email context at the moment.';
  }
}

/**
 * Build Gmail search query from user message
 */
function buildGmailSearchQuery(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  let query = 'newer_than:30d'; // Default to last 30 days

  if (lowerMessage.includes('unread')) {
    query = 'is:unread newer_than:7d';
  } else if (lowerMessage.includes('urgent') || lowerMessage.includes('important')) {
    query = 'is:important newer_than:7d';
  } else if (lowerMessage.includes('recent') || lowerMessage.includes('today') || lowerMessage.includes('yesterday')) {
    query = 'newer_than:7d';
  }

  return query;
}

/**
 * Execute email actions based on user request
 */
async function executeEmailAction(userMessage, userEmail, session) {
  const lowerMessage = userMessage.toLowerCase();
  
  console.log('📧 executeEmailAction called:', { userEmail, hasSession: !!session, hasAccessToken: !!session?.accessToken });
  
  try {
    // First try to get tokens from session (most reliable)
    let accessToken = session?.accessToken;
    let refreshToken = session?.refreshToken;
    
    console.log('🔑 Token check:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
    
    // If not in session, try database as fallback
    if (!accessToken) {
      console.log('⚠️ No access token in session, trying database...');
      try {
        const db = new DatabaseService();
        const userTokens = await db.getUserTokens(userEmail);
        
        console.log('📦 Database tokens:', { found: !!userTokens, hasEncryptedToken: !!userTokens?.encrypted_access_token });
        
        if (userTokens?.encrypted_access_token) {
          accessToken = decrypt(userTokens.encrypted_access_token);
          refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
          console.log('✅ Tokens decrypted from database');
        }
      } catch (dbError) {
        console.log('❌ Database token lookup failed:', dbError.message);
      }
    }
    
    if (!accessToken) {
      console.log('❌ No access token available');
      return { error: 'Gmail not connected. Please sign in with Google to access your emails.' };
    }

    console.log('🔗 Creating GmailService with token length:', accessToken.length);
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

      console.log('📬 Fetching emails with query:', query);

      try {
        const emailsResponse = await gmailService.getEmails(maxResults, query, null, 'internalDate desc');
        console.log('📥 Gmail API response:', { hasMessages: !!emailsResponse?.messages, count: emailsResponse?.messages?.length || 0 });
        
        const messages = emailsResponse?.messages || [];
        
        if (messages.length === 0) {
          console.log('📭 No emails found matching query');
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
            console.log('📖 Fetching details for message:', message.id);
            const details = await gmailService.getEmailDetails(message.id);
            const parsed = gmailService.parseEmailData(details);
            emailDetails.push({
              id: message.id,
              subject: parsed.subject || '(No Subject)',
              from: parsed.from || 'Unknown Sender',
              date: parsed.date || 'Unknown Date',
              snippet: parsed.snippet || '',
              body: parsed.body?.substring(0, 500) || '',
              labels: parsed.labels || []
            });
          } catch (error) {
            console.log('⚠️ Error fetching email details for', message.id, ':', error.message);
          }
        }
        
        console.log('✅ Successfully fetched', emailDetails.length, 'emails');
        return { 
          action: 'read_emails', 
          success: true, 
          emails: emailDetails,
          query: query,
          count: emailDetails.length
        };
      } catch (error) {
        console.error('❌ Gmail API error:', error.message);
        
        // Check if it's a token error
        if (error.message.includes('401') || error.message.includes('token') || error.message.includes('expired')) {
          return { action: 'read_emails', success: false, error: 'Your Gmail session has expired. Please sign out and sign in again to refresh your access.' };
        }
        
        return { action: 'read_emails', success: false, error: error.message };
      }
    }

    console.log('ℹ️ No email action detected for message');
    return null; // No email action detected
    
  } catch (error) {
    console.error('💥 Email action error:', error);
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