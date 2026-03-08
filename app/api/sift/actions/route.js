import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { SIFT_CONFIG } from '@/lib/sift-config.js';

/**
 * Sift AI Actions API - Background AI for entrepreneurial productivity actions
 */
export async function POST(request) {
  try {
    const { action, emailId, emailData, additionalData } = await request.json();

    console.log('🔧 Sift AI action request:', { action, emailId });

    let session = null;
    try {
      session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized - please sign in' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.log('⚠️ Auth not available:', error.message);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await executeSiftAction(action, emailId, emailData, additionalData, session);

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('💥 Sift AI action error:', error);
    return NextResponse.json(
      {
        error: `Failed to execute action: ${error.message}`,
        action,
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * Execute Sift AI action based on type
 */
async function executeSiftAction(action, emailId, emailData, additionalData, session) {
  const userEmail = session.user.email;

  switch (action) {
    case 'reply':
      return await handleReplyAction(emailId, emailData, userEmail);

    case 'schedule_call':
    case 'schedule_meeting':
      return await handleScheduleAction(action, emailId, emailData, additionalData, userEmail);

    case 'add_to_crm':
      return await handleCRMAction(emailId, emailData, userEmail);

    case 'send_materials':
      return await handleMaterialsAction(emailId, emailData, additionalData, userEmail);

    case 'follow_up':
      return await handleFollowUpAction(emailId, emailData, userEmail);

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Handle reply action - draft email response
 */
async function handleReplyAction(emailId, emailData, userEmail) {
  // Use Sift AI to generate a professional reply
  const systemPrompt = `${SIFT_CONFIG.systemPrompt}

You are drafting a professional reply to this email. Consider the context, tone, and content of the original email. Create a concise, professional response that addresses the key points.`;

  const userPrompt = `Original email from ${emailData.fromName} (${emailData.from}):
Subject: ${emailData.subject}
Content: ${emailData.snippet}

Please draft a professional reply.`;

  // For now, return a mock response. In production, this would call an AI service
  const draftReply = `Dear ${emailData.fromName},

Thank you for your email regarding ${emailData.subject.toLowerCase().includes('proposal') ? 'the proposal' : 'this matter'}.

I appreciate you reaching out. I'll review the details and get back to you shortly.

Best regards,
[Your Name]`;

  return {
    action: 'reply',
    draft: draftReply,
    emailId,
    suggestedSubject: `Re: ${emailData.subject}`,
    confidence: 0.85
  };
}

/**
 * Handle scheduling action
 */
async function handleScheduleAction(action, emailId, emailData, additionalData, userEmail) {
  const isMeeting = action === 'schedule_meeting';

  // Mock scheduling logic - in production would integrate with calendar APIs
  const suggestedTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
  suggestedTime.setHours(10, 0, 0, 0); // 10 AM

  return {
    action: action,
    eventType: isMeeting ? 'meeting' : 'call',
    suggestedTime: suggestedTime.toISOString(),
    duration: isMeeting ? 60 : 30, // minutes
    participants: [emailData.from],
    title: `${isMeeting ? 'Meeting' : 'Call'} with ${emailData.fromName}`,
    description: `Follow-up ${isMeeting ? 'meeting' : 'call'} regarding: ${emailData.subject}`,
    calendarIntegration: 'pending' // Would integrate with Google Calendar
  };
}

/**
 * Handle CRM action - add/update contact
 */
async function handleCRMAction(emailId, emailData, userEmail) {
  // Mock CRM integration - would add to actual CRM system
  return {
    action: 'add_to_crm',
    contact: {
      name: emailData.fromName,
      email: emailData.from,
      source: 'email',
      lastContact: new Date().toISOString(),
      notes: `Contact added from email: ${emailData.subject}`,
      tags: ['prospect', 'email']
    },
    crmId: `crm_${Date.now()}`,
    status: 'added'
  };
}

/**
 * Handle send materials action
 */
async function handleMaterialsAction(emailId, emailData, additionalData, userEmail) {
  // Mock materials sending - would prepare and send materials
  const materials = additionalData?.materials || ['proposal.pdf', 'pricing.pdf'];

  return {
    action: 'send_materials',
    materials: materials,
    recipient: emailData.from,
    subject: `Materials: ${emailData.subject}`,
    status: 'prepared', // Would actually send in production
    emailDraft: `Dear ${emailData.fromName},

As discussed, please find attached the requested materials.

Let me know if you have any questions.

Best regards,
[Your Name]`
  };
}

/**
 * Handle follow-up action
 */
async function handleFollowUpAction(emailId, emailData, userEmail) {
  // Mock follow-up scheduling
  const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now

  return {
    action: 'follow_up',
    followUpDate: followUpDate.toISOString(),
    reminder: `Follow up with ${emailData.fromName} regarding ${emailData.subject}`,
    priority: 'medium',
    status: 'scheduled'
  };
}
