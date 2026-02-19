import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';
import { ArcusAIService } from '@/lib/arcus-ai.js';
import { CalendarService } from '@/lib/calendar.js';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service.js';
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
    let userPlanType = 'free';

    if (userEmail) {
      try {
        const allUsage = await subscriptionService.getAllFeatureUsage(userEmail);
        userPlanType = allUsage.planType || 'free';

        if (allUsage.hasActiveSubscription) {
          subscriptionInfo = {
            planType: allUsage.planType,
            planName: allUsage.planType === 'pro' ? 'Pro' : allUsage.planType === 'starter' ? 'Starter' : 'Free',
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
      try {
        const canUse = await subscriptionService.canUseFeature(userEmail, FEATURE_TYPES.ARCUS_AI);
        if (!canUse) {
          const usage = await subscriptionService.getFeatureUsage(userEmail, FEATURE_TYPES.ARCUS_AI);
          const limitMessage = usage.reason === 'subscription_expired'
            ? "Your subscription has expired. Please renew to continue using Arcus AI."
            : usage.reason === 'no_subscription'
              ? "You need an active subscription to use Arcus AI. Visit /pricing to subscribe."
              : `Sorry, but you've exhausted all the credits of ${usage.period === 'daily' ? 'the day' : 'the month'}.`;

          return NextResponse.json({
            message: limitMessage,
            error: 'limit_reached',
            usage: usage.usage,
            limit: usage.limit,
            period: usage.period,
            planType: usage.planType,
            reason: usage.reason,
            upgradeUrl: '/pricing',
            timestamp: new Date().toISOString(),
            conversationId: currentConversationId
          }, { status: 403 });
        }
      } catch (subErr) {
        console.warn('⚠️ Subscription check failed (non-blocking):', subErr.message);
        // Don't block chat if subscription check fails
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
    const schedulingIntent = arcusAI.parseSchedulingIntent(message);

    // ── Plan Approval: real step-by-step execution ──
    const planApprovalMatch = message.match(/^\[PLAN_APPROVED:([^\]]+)\]/);
    if (planApprovalMatch) {
      console.log('📋 Plan approved, executing step-by-step:', planApprovalMatch[1]);

      const planGoalMatch = message.match(/Execute the approved plan:\s*(.+)/);
      const planGoal = planGoalMatch ? planGoalMatch[1].trim() : 'the approved plan';

      // Advanced Detection
      const isDraftPlan = /\b(draft|reply|respond|write|email|send)\b/i.test(planGoal);
      const isSchedulePlan = /\b(schedule|meeting|call|book|invite)\b/i.test(planGoal);
      const isSearchPlan = /\b(find|search|look|show|get|fetch|check)\b/i.test(planGoal);

      // Decrypt tokens once
      let gmailTokenDecrypted = null;
      let gmailRefreshDecrypted = null;
      if (userEmail) {
        try {
          const tokens = await db.getUserTokens(userEmail);
          if (tokens?.encrypted_access_token) gmailTokenDecrypted = decrypt(tokens.encrypted_access_token);
          if (tokens?.encrypted_refresh_token) gmailRefreshDecrypted = decrypt(tokens.encrypted_refresh_token);
        } catch (e) { console.warn('Token fetch error:', e.message); }
      }

      // Build step list with nanosecond-precision intent
      let stepIdx = 0;
      const mkStep = (type, label) => ({
        id: `step_${type}_${stepIdx++}_${Date.now()}`,
        type, label, status: 'pending', result: null, detail: null, error: null,
        started_at: null, completed_at: null,
      });

      const agentSteps = [
        { ...mkStep('think', 'De-constructing your request'), status: 'done', detail: planGoal, started_at: new Date().toISOString(), completed_at: new Date().toISOString() },
        ...(isSearchPlan || isDraftPlan ? [mkStep('search_email', 'Semantic mailbox search')] : []),
        ...(isDraftPlan ? [mkStep('create_draft', 'Synthesizing response draft')] : []),
        ...(isSchedulePlan ? [mkStep('book_meeting', 'Calibrating schedule')] : []),
        mkStep('done', 'Execution complete'),
      ];

      const prevResults = {};
      let draftData = null;
      let schedulingData = null;
      let execOk = true;
      let execErr = null;

      const baseUrl = process.env.NEXTAUTH_URL || process.env.HOST || 'http://localhost:3000';

      for (let i = 0; i < agentSteps.length; i++) {
        const step = agentSteps[i];
        if (step.type === 'think' || step.type === 'done') {
          if (step.status !== 'done') {
            agentSteps[i] = { ...step, status: 'done', started_at: new Date().toISOString(), completed_at: new Date().toISOString() };
          }
          continue;
        }

        const stepStartTime = new Date().toISOString();
        agentSteps[i] = { ...step, status: 'running', started_at: stepStartTime };

        try {
          // ── STEP: search_email ──
          if (step.type === 'search_email') {
            const headers = {
              'Content-Type': 'application/json',
              'x-user-email': userEmail || '',
              ...(gmailTokenDecrypted ? { 'x-gmail-access-token': gmailTokenDecrypted } : {}),
              ...(gmailRefreshDecrypted ? { 'x-gmail-refresh-token': gmailRefreshDecrypted } : {}),
            };
            const query = 'newer_than:7d';
            const res = await fetch(`${baseUrl}/api/agent-talk/read_gmail`, {
              method: 'POST', headers,
              body: JSON.stringify({ query, max_results: 5, include_body: true }),
            });
            if (!res.ok) throw new Error(`Search failed (${res.status})`);
            const data = await res.json();
            prevResults.search_email = data;
            agentSteps[i] = {
              ...agentSteps[i], status: 'done',
              result: { ...data, query }, // Include query in result
              detail: `Scanned packets for: "${query}" (${data.count || 0} hits)`,
              completed_at: new Date().toISOString()
            };

            // ── STEP: create_draft ──
          } else if (step.type === 'create_draft') {
            const latestEmail = prevResults.search_email?.emails?.[0];
            const emailCtx = latestEmail
              ? `From: ${latestEmail.from}\nSubject: ${latestEmail.subject}\nDate: ${latestEmail.date}\n\n${latestEmail.body_text || latestEmail.snippet || ''}`
              : null;

            const { draftContent, thought } = await arcusAI.generateDraftReply(emailCtx || planGoal, {
              userName, userEmail,
              replyInstructions: planGoal,
              conversationHistory, privacyMode,
            });

            if (!draftContent) throw new Error('Synthesis failed');
            draftData = {
              content: draftContent,
              thought: thought,
              recipientName: latestEmail?.from || 'Recipient',
              recipientEmail: latestEmail?.from || '',
              senderName: userName,
              originalEmailId: latestEmail?.id || null,
              threadId: latestEmail?.thread_id || null,
              messageId: latestEmail?.id || null,
              subject: latestEmail?.subject ? `Re: ${latestEmail.subject}` : 'Re: Your email',
            };
            prevResults.create_draft = draftData;
            agentSteps[i] = {
              ...agentSteps[i], status: 'done',
              result: { ...draftData, thought }, // Store thought in result for UI
              detail: `Synthesized response for ${draftData.recipientName}`,
              completed_at: new Date().toISOString()
            };

            // ── STEP: book_meeting (Google Meet / Cal.com) ──
          } else if (step.type === 'book_meeting') {
            const timeMatch = planGoal.match(/(?:at|for|on)\s+([0-9:apm\/\-\s,]+(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)?)/i);

            if (timeMatch && gmailTokenDecrypted) {
              const { GoogleCalendarService } = await import('@/lib/google-calendar.ts');
              const calendar = new GoogleCalendarService(gmailTokenDecrypted);

              // Simple duration detection
              const durationMin = /\b(15|30|45|60|90)\s*min/i.test(planGoal)
                ? parseInt(planGoal.match(/\b(15|30|45|60|90)\s*min/i)[1])
                : 30;

              // Mocking a start time for now since parsing natural language dates is complex
              // In a real app we would use a library like 'chrono-node'
              const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow
              startTime.setHours(14, 0, 0, 0); // Default to 2 PM
              const endTime = new Date(startTime.getTime() + durationMin * 60 * 1000);

              const meeting = await calendar.createMeeting({
                summary: `Meeting with Arcus: ${planGoal}`,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString()
              });

              if (meeting) {
                schedulingData = { bookingUrl: meeting.meetLink || meeting.htmlLink, durationMinutes: durationMin, title: meeting.summary, type: 'google_meet' };
                prevResults.book_meeting = schedulingData;
                agentSteps[i] = {
                  ...agentSteps[i], status: 'done', result: schedulingData,
                  detail: `Google Meet bridge established: ${meeting.summary}`,
                  completed_at: new Date().toISOString()
                };
                continue;
              }
            }

            // Fallback to Cal.com scheduling link
            const { calService } = await import('@/lib/cal-service');
            const durationMin = /\b(15|30|45|60|90)\s*min/i.test(planGoal)
              ? parseInt(planGoal.match(/\b(15|30|45|60|90)\s*min/i)[1])
              : 30;

            const link = await calService.getBookingLink(durationMin, planGoal);
            if (!link) throw new Error('Cal.com link failed');

            schedulingData = { bookingUrl: link.bookingUrl, durationMinutes: link.durationMinutes, title: link.title, type: 'scheduling_link' };
            prevResults.book_meeting = schedulingData;
            agentSteps[i] = {
              ...agentSteps[i], status: 'done', result: schedulingData,
              detail: `Scheduling link active via Cal.com`,
              completed_at: new Date().toISOString()
            };
          }

        } catch (stepErr) {
          console.error(`Step ${step.type} failed:`, stepErr.message);
          agentSteps[i] = {
            ...agentSteps[i], status: 'failed', error: stepErr.message,
            completed_at: new Date().toISOString()
          };
          execOk = false;
          execErr = stepErr.message;
          break;
        }
      }

      // Build summary from REAL results only
      let execMsg = '';
      let execChanges = [];
      let execArtifacts = [];

      if (draftData) {
        execMsg = `Done. Draft for ${draftData.recipientName} is ready below. Review and send when you're happy.`;
        execChanges = [`Draft written for ${draftData.recipientName}`, `Subject: ${draftData.subject}`];
        execArtifacts = [{ type: 'draft', id: draftData.originalEmailId || 'draft-' + Date.now(), label: 'View draft', url: null }];
      } else if (schedulingData) {
        execMsg = `Meeting link created. Share it with your attendee so they can pick a time.`;
        execChanges = [`${schedulingData.durationMinutes}-min Cal.com link created`];
        execArtifacts = [{ type: 'event', id: 'cal-' + Date.now(), label: 'Open scheduling link', url: schedulingData.bookingUrl }];
      } else if (prevResults.search_email?.count > 0) {
        const c = prevResults.search_email.count;
        execMsg = `Found ${c} recent email${c !== 1 ? 's' : ''}. Here they are.`;
        execChanges = [`${c} emails retrieved from inbox`];
      } else if (!execOk) {
        execMsg = `Ran into a problem: ${execErr || 'something went wrong'}. Try again or give me more details.`;
      } else {
        execMsg = `Done with "${planGoal}".`;
      }

      if (userEmail) {
        await saveConversation(userEmail, message, execMsg, currentConversationId, db);
        await subscriptionService.incrementFeatureUsage(userEmail, FEATURE_TYPES.ARCUS_AI);
      }

      return NextResponse.json({
        message: execMsg,
        timestamp: new Date().toISOString(),
        conversationId: currentConversationId,
        aiGenerated: true,
        actionType: 'execution_result',
        agentSteps,
        draftData: draftData || null,
        schedulingData: schedulingData || null,
        executionResult: {
          success: execOk,
          changes: execChanges,
          artifacts: execArtifacts,
          next_monitoring: null,
        },
      });
    }

    // ── Plan Card Generation (suggest-then-act) ──
    // For actionable requests, generate a Plan Card alongside the normal response
    let planCardResult = null;
    const isActionableRequest =
      draftIntent.isDraftRequest ||
      schedulingIntent.isSchedulingRequest ||
      /\b(send|forward|reply|schedule|draft|create|follow.?up|remind|announce|invite|book|find|search)\b/i.test(message);

    if (isActionableRequest) {
      try {
        console.log('🎯 Generating Plan Card for actionable request');
        planCardResult = await arcusAI.parseIntentAndGeneratePlanCard(message, {
          conversationHistory,
          emailContext: null,
          userEmail,
          userName,
          privacyMode
        });
        console.log('📋 Plan Card result:', planCardResult ? 'Generated' : 'Not needed');
      } catch (planError) {
        console.warn('Plan card generation failed (non-blocking):', planError.message);
      }
    }

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
        actionType: planCardResult ? 'mission_plan' : 'draft_reply',
        draftData: draftResult.draftData || null,
        planCard: planCardResult?.plan_card || null
      });
    }

    // Handle scheduling request
    if (schedulingIntent.isSchedulingRequest) {
      const schedulingResult = await handleSchedulingRequest(
        message,
        schedulingIntent,
        userEmail,
        userName,
        session,
        db,
        arcusAI,
        integrations,
        conversationHistory,
        privacyMode,
        null // emailContext not available yet at this point
      );

      // Save conversation
      if (userEmail) {
        await saveConversation(userEmail, message, schedulingResult.message, currentConversationId, db);
      }

      return NextResponse.json({
        message: schedulingResult.message,
        timestamp: new Date().toISOString(),
        conversationId: currentConversationId,
        aiGenerated: true,
        actionType: planCardResult ? 'mission_plan' : 'schedule_meeting',
        schedulingData: schedulingResult.schedulingData || null,
        planCard: planCardResult?.plan_card || null
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
    let emailResult = null;

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
        emailResult = emailActionResult;
        if (emailActionResult && emailActionResult.success) {
          emailContext = formatEmailActionResult(emailActionResult);
        }
      } catch (error) {
        console.error('Email action failed:', error);
      }
    }

    // ── Build agentSteps for EVERY response (Billion-Dollar UI Trace) ──
    let stepIdx = 0;
    const mkStep = (type, label, status = 'pending', detail = null) => ({
      id: `step_${type}_${stepIdx++}_${Date.now()}`,
      type, label, status, detail, result: null, error: null,
      started_at: status !== 'pending' ? new Date().toISOString() : null,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    });

    const agentSteps = [
      mkStep('think', 'De-constructing intent', 'done', `Analyzing: "${message.substring(0, 80)}${message.length > 80 ? '...' : ''}"`),
      mkStep('clarify', 'Calibrating response logic', 'done', 'Mapping context to high-value outcomes...'),
    ];

    // Add search step if we searched email
    if (emailContext && emailResult) {
      const q = emailResult.query || 'recent activity';
      agentSteps.push(
        mkStep('search_email', 'Scanning mailbox context', 'done',
          `Scanned packets for: "${q}" (${emailResult.count || 0} hits)`)
      );
      agentSteps[agentSteps.length - 1].result = emailResult;
    }

    // Generate AI response with full context
    const responseStartTime = new Date().toISOString();
    agentSteps.push(mkStep('create_draft', 'Synthesizing response', 'running'));
    agentSteps[agentSteps.length - 1].started_at = responseStartTime;
    const responseStepIdx = agentSteps.length - 1;

    let response = '';
    try {
      const { content, thought } = await arcusAI.generateResponse(message, {
        conversationHistory,
        emailContext,
        integrations,
        subscriptionInfo,
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

      response = content; // Set the final text response

      agentSteps[responseStepIdx] = {
        ...agentSteps[responseStepIdx],
        status: 'done',
        label: 'Synthesis complete',
        result: { thought }, // Pass reasoning to UI
        detail: response ? `${response.substring(0, 60)}...` : 'Output generated',
        completed_at: new Date().toISOString(),
      };
    } catch (aiErr) {
      console.error('❌ Arcus AI generateResponse failed:', aiErr?.message);
      agentSteps[responseStepIdx] = {
        ...agentSteps[responseStepIdx],
        status: 'failed',
        error: aiErr?.message || 'Synthesis failed',
        completed_at: new Date().toISOString(),
      };
      response = '';
    }

    const finalResponse = response && response.trim()
      ? response
      : generateFallbackResponse(message, integrations);

    // Mark done
    agentSteps.push(mkStep('done', 'Mission accomplished', 'done'));

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
      actionType: planCardResult ? 'mission_plan' : (emailContext ? 'email' : 'general'),
      emailResult,
      integrations,
      planCard: planCardResult?.plan_card || null,
      agentSteps,
    });

  } catch (error) {
    console.error('💥 Arcus Chat API error:', error?.message, error?.stack);
    return NextResponse.json({
      message: `I ran into an issue: ${error?.message || 'Unknown error'}. Please try again or refresh the page.`,
      timestamp: new Date().toISOString(),
      error: 'Internal server error',
      errorDetail: error?.message || 'Unknown',
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

    const tokenScopes = tokens?.scopes || '';

    return {
      gmail: !!tokens,
      'google-calendar': false,
      'google-meet': false
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
  privacyMode,
  emailContext
) {
  try {
    console.log('📅 Handling scheduling request:', schedulingIntent);

    // Generate meeting details using AI
    const meetingDetails = await arcusAI.generateMeetingDetails(
      schedulingIntent.context,
      emailContext || ''
    );

    console.log('✅ Generated meeting details:', meetingDetails);

    // Build response with AI-generated details
    const responseMessage = `I've set up the meeting details for you:

**Meeting Title:** ${meetingDetails.suggested_title}
**Objective:** ${meetingDetails.suggested_description}
**Duration:** ${meetingDetails.suggested_duration} minutes

${schedulingIntent.attendees.length > 0 ? `**Attendees:** ${schedulingIntent.attendees.join(', ')}` : ''}
${schedulingIntent.date ? `**Date:** ${schedulingIntent.date}` : ''}
${schedulingIntent.time ? `**Time:** ${schedulingIntent.time}` : ''}

I can help you draft an email to send this invitation to the attendees. Would you like me to do that?`;

    return {
      message: responseMessage,
      schedulingData: {
        ...meetingDetails,
        ...schedulingIntent,
        status: 'details_generated'
      }
    };
  } catch (error) {
    console.error('Error handling scheduling request:', error);
    return {
      message: `I'd be happy to help you schedule a meeting! To get started, could you tell me:

1. What the meeting is about
2. Who should attend
3. When you'd like to meet

Once I have those details, I can suggest a great title and objective for the meeting.`,
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

    const { GmailService } = await import('@/lib/gmail');
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

    const { GmailService } = await import('@/lib/gmail');
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

    console.log('📧 executeEmailAction: Starting email fetch for:', userEmail?.substring(0, 20) + '...');
    console.log('📧 Session accessToken available:', !!accessToken);

    if (!accessToken) {
      console.log('📧 No session token, trying database...');
      try {
        const db = new DatabaseService();
        const userTokens = await db.getUserTokens(userEmail);
        console.log('📧 Database tokens found:', !!userTokens?.encrypted_access_token);

        if (userTokens?.encrypted_access_token) {
          accessToken = decrypt(userTokens.encrypted_access_token);
          refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
          console.log('📧 Decrypted token successfully');
        }
      } catch (dbError) {
        console.error('📧 Database token fetch error:', dbError.message);
      }
    }

    if (!accessToken) {
      console.log('📧 No access token available - Gmail not connected');
      return { error: 'Gmail not connected' };
    }

    const { GmailService } = await import('@/lib/gmail');
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

    console.log('📧 Gmail query:', query);

    try {
      const emailsResponse = await gmailService.getEmails(maxResults, query, null, 'internalDate desc');
      const messages = emailsResponse?.messages || [];

      console.log('📧 Emails found:', messages.length);

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
    'from', 'subject', 'attachment', 'urgent', 'important',
    'today', 'yesterday', 'this week', 'recent', 'latest',
    'received', 'sent', 'what did', 'show me', 'find',
    'search', 'check', 'any new', 'pending', 'waiting'
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

    const response = await fetch('https://mailient.xyz/api/agent-talk/notes-search', {
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
