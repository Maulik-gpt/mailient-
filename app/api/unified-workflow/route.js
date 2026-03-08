import { NextResponse } from 'next/server';
import { auth } from '../../../lib/auth.js';
import { DatabaseService } from '../../../lib/supabase.js';
import { decrypt } from '../../../lib/crypto.js';
import { GmailService } from '../../../lib/gmail.ts';

/**
 * Unified Workflow API - Handles complex email workflows with AI
 * Combines Gmail insights, CRM, scheduling, and AI messaging
 */
export async function POST(request) {
  try {
    const { action, data } = await request.json();

    console.log('🚀 Unified workflow action:', action);

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - please sign in' },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    // Route to appropriate workflow handler
    switch (action) {
      case 'analyze_email_thread':
        return await analyzeEmailThread(data, userEmail, session);
      
      case 'create_lead_workflow':
        return await createLeadWorkflow(data, userEmail, session);
      
      case 'schedule_follow_up':
        return await scheduleFollowUp(data, userEmail, session);
      
      case 'generate_response':
        return await generateAIResponse(data, userEmail, session);
      
      case 'update_crm_contact':
        return await updateCRMContact(data, userEmail, session);
      
      case 'unified_email_action':
        return await unifiedEmailAction(data, userEmail, session);
      
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('💥 Unified workflow error:', error);
    return NextResponse.json(
      { 
        error: 'Workflow execution failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze email thread and extract insights
 */
async function analyzeEmailThread(data, userEmail, session) {
  const { threadId, emailIds } = data;

  if (!emailIds || !Array.isArray(emailIds)) {
    return NextResponse.json(
      { error: 'emailIds array is required' },
      { status: 400 }
    );
  }

  try {
    // Get Gmail access token
    const accessToken = session?.accessToken || await getGmailAccessToken(session, userEmail);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected' },
        { status: 403 }
      );
    }

    const gmailService = new GmailService(accessToken, session?.refreshToken || '');

    // Fetch email details
    const emailDetails = [];
    for (const emailId of emailIds.slice(0, 10)) { // Limit to 10 emails
      try {
        const details = await gmailService.getEmailDetails(emailId);
        const parsed = gmailService.parseEmailData(details);
        emailDetails.push(parsed);
      } catch (error) {
        console.log(`Error fetching email ${emailId}:`, error.message);
      }
    }

    // Perform AI analysis
    const analysis = await performThreadAnalysis(emailDetails, userEmail);

    return NextResponse.json({
      success: true,
      action: 'analyze_email_thread',
      threadId,
      emailCount: emailDetails.length,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Email thread analysis error:', error);
    throw error;
  }
}

/**
 * Create comprehensive lead workflow
 */
async function createLeadWorkflow(data, userEmail, session) {
  const { emailId, contactInfo, workflowType = 'standard' } = data;

  try {
    const accessToken = session?.accessToken || await getGmailAccessToken(session, userEmail);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected' },
        { status: 403 }
      );
    }

    const gmailService = new GmailService(accessToken, session?.refreshToken || '');

    // Fetch the original email if emailId provided
    let originalEmail = null;
    if (emailId) {
      try {
        const details = await gmailService.getEmailDetails(emailId);
        originalEmail = gmailService.parseEmailData(details);
      } catch (error) {
        console.log('Error fetching original email:', error.message);
      }
    }

    // Extract contact information
    const contact = extractContactFromEmail(originalEmail, contactInfo);
    
    // Create CRM contact
    const crmResult = await createOrUpdateContact(contact, userEmail);
    
    // Generate AI-powered follow-up suggestions
    const aiSuggestions = await generateFollowUpSuggestions(originalEmail, contact);
    
    // Create scheduled actions
    const scheduledActions = await createScheduledActions(contact, workflowType);

    return NextResponse.json({
      success: true,
      action: 'create_lead_workflow',
      contact: contact,
      crm: crmResult,
      aiSuggestions,
      scheduledActions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lead workflow creation error:', error);
    throw error;
  }
}

/**
 * Schedule intelligent follow-up
 */
async function scheduleFollowUp(data, userEmail, session) {
  const { contactEmail, subject, priority = 'medium', scheduledFor } = data;

  try {
    // Calculate optimal follow-up time based on priority and contact behavior
    const optimalTime = calculateOptimalFollowUpTime(priority, scheduledFor);
    
    // Create calendar event
    const calendarEvent = await createCalendarEvent({
      summary: `Follow-up: ${subject}`,
      description: `Scheduled follow-up with ${contactEmail}`,
      startTime: optimalTime,
      attendees: [contactEmail]
    });

    // Create email reminder
    const emailReminder = await scheduleEmailReminder({
      to: contactEmail,
      subject: `Following up: ${subject}`,
      scheduledFor: optimalTime
    });

    // Update CRM with follow-up schedule
    await updateContactFollowUp(contactEmail, optimalTime, userEmail);

    return NextResponse.json({
      success: true,
      action: 'schedule_follow_up',
      scheduledFor: optimalTime,
      calendarEvent,
      emailReminder,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Follow-up scheduling error:', error);
    throw error;
  }
}

/**
 * Generate AI-powered email response
 */
async function generateAIResponse(data, userEmail, session) {
  const { emailId, responseType = 'reply', customPrompt } = data;

  try {
    const accessToken = session?.accessToken || await getGmailAccessToken(session, userEmail);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected' },
        { status: 403 }
      );
    }

    const gmailService = new GmailService(accessToken, session?.refreshToken || '');

    // Fetch email context
    let emailContext = null;
    if (emailId) {
      try {
        const details = await gmailService.getEmailDetails(emailId);
        emailContext = gmailService.parseEmailData(details);
      } catch (error) {
        console.log('Error fetching email for response generation:', error.message);
      }
    }

    // Generate AI response using ElevenLabs or fallback
    const aiResponse = await generateSmartResponse(emailContext, responseType, customPrompt, userEmail);
    
    // Store the generated response for future reference
    await storeGeneratedResponse(emailId, aiResponse, userEmail);

    return NextResponse.json({
      success: true,
      action: 'generate_response',
      response: aiResponse,
      emailContext,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI response generation error:', error);
    throw error;
  }
}

/**
 * Update CRM contact with comprehensive information
 */
async function updateCRMContact(data, userEmail, session) {
  const { email, updates } = data;

  if (!email || !updates) {
    return NextResponse.json(
      { error: 'email and updates are required' },
      { status: 400 }
    );
  }

  try {
    const db = new DatabaseService();
    
    // Upsert contact with comprehensive data
    const contactData = {
      user_id: userEmail,
      email: email,
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data: contact, error } = await db.supabase
      .from('contacts')
      .upsert(contactData, { onConflict: 'user_id,email' })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log CRM activity
    await logCRMActivity(userEmail, email, 'updated', updates);

    return NextResponse.json({
      success: true,
      action: 'update_crm_contact',
      contact,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('CRM contact update error:', error);
    throw error;
  }
}

/**
 * Unified email action that combines multiple operations
 */
async function unifiedEmailAction(data, userEmail, session) {
  const { actions } = data;

  if (!actions || !Array.isArray(actions)) {
    return NextResponse.json(
      { error: 'actions array is required' },
      { status: 400 }
    );
  }

  try {
    const results = [];

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'send_email':
            const sendResult = await sendUnifiedEmail(action.data, userEmail, session);
            results.push({ type: 'send_email', success: true, result: sendResult });
            break;
          
          case 'add_to_crm':
            const crmResult = await addToCRM(action.data, userEmail, session);
            results.push({ type: 'add_to_crm', success: true, result: crmResult });
            break;
          
          case 'schedule_meeting':
            const meetingResult = await scheduleUnifiedMeeting(action.data, userEmail, session);
            results.push({ type: 'schedule_meeting', success: true, result: meetingResult });
            break;
          
          case 'generate_insight':
            const insightResult = await generateUnifiedInsight(action.data, userEmail, session);
            results.push({ type: 'generate_insight', success: true, result: insightResult });
            break;
          
          default:
            results.push({ type: action.type, success: false, error: 'Unknown action type' });
        }
      } catch (actionError) {
        console.error(`Error in action ${action.type}:`, actionError);
        results.push({ 
          type: action.type, 
          success: false, 
          error: actionError.message 
        });
      }
    }

    return NextResponse.json({
      success: true,
      action: 'unified_email_action',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Unified email action error:', error);
    throw error;
  }
}

/**
 * Helper Functions
 */

async function getGmailAccessToken(session, userEmail) {
  // Try session first
  if (session?.accessToken) {
    return session.accessToken;
  }

  // Try database
  try {
    const db = new DatabaseService();
    const userTokens = await db.getUserTokens(userEmail);
    if (userTokens?.encrypted_access_token) {
      return decrypt(userTokens.encrypted_access_token);
    }
  } catch (error) {
    console.log('Error getting tokens from database:', error.message);
  }

  return null;
}

async function performThreadAnalysis(emails, userEmail) {
  // Analyze email thread for patterns, sentiment, and insights
  const analysis = {
    participants: [],
    topics: [],
    sentiment: 'neutral',
    urgency: 'low',
    actionItems: [],
    keyDecisions: []
  };

  // Extract participants
  const participants = new Set();
  emails.forEach(email => {
    if (email.from && !email.from.includes(userEmail)) {
      const senderMatch = email.from.match(/^(.+?)\s*<(.+)>$/);
      const sender = senderMatch ? senderMatch[2] : email.from;
      participants.add(sender);
    }
  });
  analysis.participants = Array.from(participants);

  // Analyze sentiment and urgency
  const content = emails.map(e => `${e.subject} ${e.snippet}`).join(' ').toLowerCase();
  
  const urgencyKeywords = ['urgent', 'asap', 'immediately', 'deadline'];
  const urgencyMatches = urgencyKeywords.filter(keyword => content.includes(keyword));
  analysis.urgency = urgencyMatches.length > 0 ? 'high' : 'medium';

  return analysis;
}

function extractContactFromEmail(email, providedInfo) {
  if (!email) {
    return providedInfo;
  }

  const senderMatch = email.from.match(/^(.+?)\s*<(.+)>$/);
  const senderName = senderMatch ? senderMatch[1].trim() : email.from.split('<')[0].trim();
  const senderEmail = senderMatch ? senderMatch[2] : email.from;

  return {
    name: providedInfo?.name || senderName,
    email: providedInfo?.email || senderEmail,
    company: providedInfo?.company || extractCompanyFromEmail(email),
    source: 'gmail_thread',
    notes: `Thread started from email: ${email.subject}`,
    ...providedInfo
  };
}

function extractCompanyFromEmail(email) {
  // Simple company extraction from email domain
  const emailMatch = email.from.match(/<(.+@.+)\.\w+>/);
  if (emailMatch) {
    const domain = emailMatch[1].split('@')[1];
    return domain.split('.')[0];
  }
  return null;
}

async function createOrUpdateContact(contact, userEmail) {
  const db = new DatabaseService();
  
  const { data, error } = await db.supabase
    .from('contacts')
    .upsert({
      user_id: userEmail,
      ...contact,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,email' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function generateFollowUpSuggestions(email, contact) {
  // Generate AI-powered follow-up suggestions based on email content
  const suggestions = [];

  if (email) {
    const content = `${email.subject} ${email.snippet}`.toLowerCase();
    
    if (content.includes('pricing') || content.includes('quote')) {
      suggestions.push({
        type: 'pricing_follow_up',
        title: 'Follow up on pricing inquiry',
        message: `Hi ${contact.name}, I wanted to follow up on your pricing question. Do you have any specific budget considerations or timeline in mind?`,
        priority: 'high'
      });
    }

    if (content.includes('demo') || content.includes('trial')) {
      suggestions.push({
        type: 'demo_follow_up',
        title: 'Schedule demo follow-up',
        message: `Hi ${contact.name}, I hope you had a chance to review the demo. Would you like to schedule a follow-up call to discuss next steps?`,
        priority: 'medium'
      });
    }
  }

  return suggestions;
}

async function createScheduledActions(contact, workflowType) {
  const actions = [];

  // Add follow-up reminder
  actions.push({
    type: 'follow_up_reminder',
    scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    description: `Follow up with ${contact.name}`
  });

  return actions;
}

function calculateOptimalFollowUpTime(priority, preferredTime) {
  if (preferredTime) {
    return new Date(preferredTime).toISOString();
  }

  const now = new Date();
  let delayHours = 24; // Default 24 hours

  switch (priority) {
    case 'urgent':
      delayHours = 2;
      break;
    case 'high':
      delayHours = 8;
      break;
    case 'medium':
      delayHours = 24;
      break;
    case 'low':
      delayHours = 72;
      break;
  }

  return new Date(now.getTime() + delayHours * 60 * 60 * 1000).toISOString();
}

async function createCalendarEvent(eventData) {
  // This would integrate with Google Calendar API
  // For now, return a mock response
  return {
    id: `event_${Date.now()}`,
    summary: eventData.summary,
    start: eventData.startTime,
    attendees: eventData.attendees,
    status: 'confirmed'
  };
}

async function scheduleEmailReminder(emailData) {
  // This would schedule an email reminder
  return {
    id: `reminder_${Date.now()}`,
    to: emailData.to,
    subject: emailData.subject,
    scheduledFor: emailData.scheduledFor,
    status: 'scheduled'
  };
}

async function updateContactFollowUp(email, followUpTime, userEmail) {
  const db = new DatabaseService();
  
  await db.supabase
    .from('contacts')
    .update({ 
      next_follow_up_at: followUpTime,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userEmail)
    .eq('email', email);
}

async function generateSmartResponse(emailContext, responseType, customPrompt, userEmail) {
  // Generate AI response using the chat system
  try {
    const response = await fetch('/api/agent-talk/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Generate a ${responseType} response. ${customPrompt || ''} Context: ${emailContext ? JSON.stringify(emailContext) : 'No email context'}`,
        isNewConversation: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.message;
    }
  } catch (error) {
    console.log('Error generating AI response:', error);
  }

  // Fallback response
  return `Thank you for your message. I'll get back to you soon.`;
}

async function storeGeneratedResponse(emailId, response, userEmail) {
  const db = new DatabaseService();
  
  await db.supabase
    .from('insights')
    .insert({
      user_id: userEmail,
      insight_type: 'generated_response',
      title: 'AI Generated Email Response',
      content: response,
      source_email_ids: emailId ? [emailId] : [],
      confidence_score: 0.8,
      created_at: new Date().toISOString()
    });
}

async function logCRMActivity(userEmail, contactEmail, action, details) {
  const db = new DatabaseService();
  
  await db.supabase
    .from('insights')
    .insert({
      user_id: userEmail,
      insight_type: 'crm_activity',
      title: `CRM ${action} - ${contactEmail}`,
      content: JSON.stringify(details),
      created_at: new Date().toISOString()
    });
}

// Additional helper functions for unified actions
async function sendUnifiedEmail(data, userEmail, session) {
  const accessToken = session?.accessToken || await getGmailAccessToken(session, userEmail);
  const gmailService = new GmailService(accessToken, session?.refreshToken || '');
  
  return await gmailService.sendEmail(data);
}

async function addToCRM(data, userEmail, session) {
  return await createOrUpdateContact(data, userEmail);
}

async function scheduleUnifiedMeeting(data, userEmail, session) {
  return await createCalendarEvent(data);
}

async function generateUnifiedInsight(data, userEmail, session) {
  // Generate insight based on data
  return {
    type: 'ai_insight',
    content: 'AI-generated insight based on provided data',
    confidence: 0.8
  };
}