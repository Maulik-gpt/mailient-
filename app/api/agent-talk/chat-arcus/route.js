import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { decrypt } from '@/lib/crypto.js';
import { ArcusAIService } from '@/lib/arcus-ai.js';
import { CalendarService } from '@/lib/calendar.js';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service.js';
import { addDays, setHours, setMinutes, startOfDay, format, parse, isWeekend, nextMonday } from 'date-fns';
import { ArcusMissionService } from '@/lib/arcus-mission.js';
import { ArcusOperatorRuntime } from '@/lib/arcus-operator-runtime.js';
import { isFeatureEnabled } from '@/lib/feature-flags.js';
import crypto from 'crypto';

/**
 * Main chat handler with Arcus AI + Gmail context + Memory + Integration awareness
 */
export async function POST(request) {
  try {
    const {
      message,
      conversationId,
      runId,
      isNewConversation,
      gmailAccessToken,
      isNotesQuery,
      notesSearchQuery,
      selectedEmailId,
      draftReplyRequest,
      activeMission,
      approvalPayload,
      executeCanvasAction,
      canvasActionData,
      actionType: executionActionType,
      actionPayload,
      approvalToken,
      actionRequestId
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
    }

    // Get user's profile and privacy mode preference
    let profile = null;
    let privacyMode = false;
    if (userEmail) {
      try {
        profile = await db.getUserProfile(userEmail);
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

    // Initialize Arcus AI and Mission Service
    const arcusAI = new ArcusAIService();
    const missionService = userEmail ? new ArcusMissionService(userEmail) : null;
    const operatorRuntimeEnabled = isFeatureEnabled('arcusOperatorRuntimeV2');
    const canvasActionsV2Enabled = isFeatureEnabled('arcusCanvasActionsV2');
    const operatorRuntime = operatorRuntimeEnabled ? new ArcusOperatorRuntime({
      db,
      arcusAI,
      userEmail,
      userName,
      conversationId: currentConversationId
    }) : null;

    // Operator Runtime V2: unified canvas execution contract with approval + idempotency
    const requestedAction = executeCanvasAction || executionActionType;
    const requestedPayload = canvasActionData || actionPayload;
    if (requestedAction && requestedPayload && canvasActionsV2Enabled) {
      const criticalAction = requestedAction === 'send_email' || requestedAction === 'execute_plan';
      const effectiveRunId = runId || null;
      const effectiveActionRequestId = actionRequestId || crypto
        .createHash('sha256')
        .update(`${effectiveRunId || 'na'}:${requestedAction}:${JSON.stringify(requestedPayload)}`)
        .digest('hex')
        .slice(0, 32);

      if (operatorRuntime && criticalAction && effectiveRunId) {
        const idempotent = await operatorRuntime.getIdempotentResult(effectiveRunId, effectiveActionRequestId);
        if (idempotent) {
          return NextResponse.json({
            message: idempotent.message || 'Action already completed',
            resultStatus: 'completed',
            executionResult: idempotent,
            externalRefs: idempotent.externalRefs || {},
            nextRecommendedActions: idempotent.nextRecommendedActions || [],
            conversationId: currentConversationId,
            run: { runId: effectiveRunId, status: 'completed', phase: 'post_execution' },
            timestamp: new Date().toISOString()
          });
        }

        const approvalValidation = await operatorRuntime.validateApprovalToken(
          effectiveRunId,
          requestedAction,
          approvalToken
        );
        if (!approvalValidation.ok) {
          return NextResponse.json({
            error: 'approval_required',
            message: `Approval token invalid: ${approvalValidation.reason}`,
            resultStatus: 'blocked_approval',
            conversationId: currentConversationId,
            run: { runId: effectiveRunId, status: 'blocked_approval', phase: 'approval' },
            timestamp: new Date().toISOString()
          }, { status: 403 });
        }
      }
    }

    // --- HANDLE CANVAS EXECUTION ACTIONS ---
    if (requestedAction && requestedPayload) {
      console.log('🎯 Canvas action requested:', requestedAction);
      let executionResult = { success: false, message: '' };

      if (requestedAction === 'send_email' && requestedPayload.to && requestedPayload.body) {
        try {
          const db2 = new DatabaseService();
          const userTokens = await db2.getUserTokens(userEmail);
          if (userTokens?.encrypted_access_token) {
            const accessToken = decrypt(userTokens.encrypted_access_token);
            const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
            const { GmailService } = await import('@/lib/gmail');
            const gmailService = new GmailService(accessToken, refreshToken);
            const result = await gmailService.sendEmail({
              to: requestedPayload.to,
              subject: requestedPayload.subject || '',
              body: requestedPayload.body,
              isHtml: false
            });
            executionResult = {
              success: true,
              message: `Email sent to ${requestedPayload.to}`,
              result,
              externalRefs: {
                gmailMessageId: result?.id || result?.messageId || null,
                threadId: result?.threadId || requestedPayload.threadId || null
              },
              nextRecommendedActions: ['track_response', 'prepare_follow_up']
            };
          } else {
            executionResult = { success: false, message: 'Gmail is not connected for this account' };
          }
        } catch (err) {
          executionResult = { success: false, message: `Failed to send: ${err.message}` };
        }
      } else if (requestedAction === 'save_draft' && requestedPayload.body) {
        try {
          const db2 = new DatabaseService();
          const userTokens = await db2.getUserTokens(userEmail);
          if (userTokens?.encrypted_access_token) {
            const accessToken = decrypt(userTokens.encrypted_access_token);
            const refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
            const { GmailService } = await import('@/lib/gmail');
            const gmailService = new GmailService(accessToken, refreshToken);
            const result = await gmailService.createDraft({
              to: requestedPayload.to || '',
              subject: requestedPayload.subject || '',
              body: requestedPayload.body,
              isHtml: false
            });
            executionResult = {
              success: true,
              message: 'Draft saved to your Gmail Drafts folder',
              result,
              externalRefs: {
                gmailDraftId: result?.id || result?.draftId || null,
                threadId: result?.threadId || requestedPayload.threadId || null
              },
              nextRecommendedActions: ['send_email', 'refine_draft']
            };
          } else {
            executionResult = { success: false, message: 'Gmail is not connected for this account' };
          }
        } catch (err) {
          executionResult = { success: false, message: `Failed to save draft: ${err.message}` };
        }
      } else if (requestedAction === 'execute_plan') {
        executionResult = {
          success: true,
          message: 'Workflow execution started',
          externalRefs: {},
          nextRecommendedActions: ['review_results']
        };
        if (operatorRuntime && runId) {
          await operatorRuntime.enqueueJob(runId, 'execute_plan', {
            action: requestedAction,
            payload: requestedPayload
          });
        }
      } else {
        executionResult = { success: true, message: 'Action completed' };
      }

      if (operatorRuntime && (requestedAction === 'send_email' || requestedAction === 'execute_plan') && runId && executionResult.success) {
        await operatorRuntime.consumeApprovalToken(runId, requestedAction, approvalToken);
        const effectiveActionRequestId = actionRequestId || crypto
          .createHash('sha256')
          .update(`${runId}:${requestedAction}:${JSON.stringify(requestedPayload)}`)
          .digest('hex')
          .slice(0, 32);
        await operatorRuntime.checkAndStoreIdempotentResult(runId, effectiveActionRequestId, executionResult);
      }

      return NextResponse.json({
        message: executionResult.message,
        resultStatus: executionResult.success ? 'completed' : 'error',
        executionResult,
        externalRefs: executionResult.externalRefs || {},
        nextRecommendedActions: executionResult.nextRecommendedActions || [],
        conversationId: currentConversationId,
        run: runId ? { runId, status: executionResult.success ? 'completed' : 'error', phase: 'post_execution' } : null,
        timestamp: new Date().toISOString()
      }, { status: executionResult.success ? 200 : 500 });
    }

    // --- INTENT ANALYSIS: Understand what the user wants ---
    let intentAnalysis = null;
    try {
      intentAnalysis = await arcusAI.analyzeIntentAndPlan(message, { userEmail, userName });
      console.log('🧠 Intent analysis:', intentAnalysis?.intent, '| Canvas:', intentAnalysis?.needsCanvas);
    } catch (err) {
      console.warn('Intent analysis failed, proceeding with direct chat:', err.message);
    }

    let operatorRun = null;
    let normalizedPlan = [];
    let requiresApproval = false;
    if (operatorRuntimeEnabled && operatorRuntime) {
      const runInit = await operatorRuntime.initializeRun({
        message,
        intentAnalysis,
        canvasType: intentAnalysis?.canvasType || 'none'
      });
      operatorRun = runInit?.run || null;
      normalizedPlan = runInit?.plan || [];
      requiresApproval = !!runInit?.requiresApproval;
    }

    // --- CONTEXT SEARCH ---
    const detectedIsNotesQuery = isNotesQuery !== undefined ? isNotesQuery : isNotesRelatedQuery(message);
    const detectedIsEmailQuery = isEmailRelatedQuery(message) || (intentAnalysis?.gmailActions?.length > 0);

    let emailContext = null;
    let emailResult = null;
    let notesResult = null;
    let actionType = 'general';

    // Handle notes context
    if (detectedIsNotesQuery && userEmail && !emailContext) {
      try {
        notesResult = await executeNotesAction(message, userEmail, notesSearchQuery);
        emailContext = formatNotesActionResult(notesResult);
        actionType = 'notes';
      } catch (error) {
        console.error('Notes action failed:', error);
      }
    }

    // IF a specific email is selected
    if (selectedEmailId && userEmail && !emailContext) {
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
          actionType = 'email';
        }
      } catch (error) {
        console.error('Error fetching selected email context:', error);
      }
    }
    // Otherwise, handle general email queries by searching
    else if (userEmail && detectedIsEmailQuery && !emailContext) {
      try {
        const emailActionResult = await executeEmailAction(message, userEmail, session);
        emailResult = emailActionResult;
        if (emailActionResult && emailActionResult.success) {
          emailContext = formatEmailActionResult(emailActionResult);
          actionType = 'email';
        }
      } catch (error) {
        console.error('Email action failed:', error);
      }
    }

    // --- STEP STATE TRANSITIONS ---
    if (operatorRuntime && operatorRun && normalizedPlan.length > 0) {
      const step0 = normalizedPlan[0];
      if (step0) {
        await operatorRuntime.transitionStep({
          runId: operatorRun.runId,
          stepId: step0.id,
          status: 'completed',
          phase: 'thinking',
          detail: 'Intent and plan established'
        });
      }
      const step1 = normalizedPlan[1];
      if (step1) {
        await operatorRuntime.transitionStep({
          runId: operatorRun.runId,
          stepId: step1.id,
          status: 'active',
          phase: 'searching',
          evidence: emailResult || notesResult || null
        });
        await operatorRuntime.transitionStep({
          runId: operatorRun.runId,
          stepId: step1.id,
          status: 'completed',
          phase: 'searching',
          evidence: emailResult || notesResult || null
        });
      }
    }

    // --- CANVAS GENERATION (for complex tasks) ---
    let canvasData = null;
    let executionPolicy = null;
    const messageLower = (message || '').toLowerCase();
    const forceCanvasByMessage =
      messageLower.includes('canvas') ||
      (messageLower.includes('draft') && (messageLower.includes('reply') || messageLower.includes('email')));

    const effectiveCanvasType =
      intentAnalysis?.canvasType && intentAnalysis.canvasType !== 'none'
        ? intentAnalysis.canvasType
        : messageLower.includes('summary')
          ? 'summary'
          : messageLower.includes('research')
            ? 'research'
            : messageLower.includes('plan')
              ? 'action_plan'
              : 'email_draft';

    const shouldGenerateCanvas = Boolean(intentAnalysis?.needsCanvas || forceCanvasByMessage);

    if (shouldGenerateCanvas) {
      try {
        canvasData = await arcusAI.generateCanvasContent(
          message,
          effectiveCanvasType,
          emailContext || '',
          { userName, userEmail, privacyMode }
        );
        console.log('Canvas generated:', effectiveCanvasType);
        if (operatorRuntime && operatorRun) {
          executionPolicy = operatorRuntime.buildExecutionPolicy(
            effectiveCanvasType,
            requiresApproval,
            operatorRun.runId
          );
          await operatorRuntime.saveExecutionPolicy(operatorRun.runId, executionPolicy);
          if (canvasData && executionPolicy?.actions) {
            canvasData.actions = executionPolicy.actions;
            canvasData.approvalTokens = executionPolicy.approvalTokens;
          }
        }
      } catch (err) {
        console.error('Canvas generation failed:', err.message);
      }
    }

    // --- GENERATE AI RESPONSE ---
    const response = await arcusAI.generateResponse(message, {
      conversationHistory,
      emailContext,
      integrations: {
        gmail: !!gmailAccessToken,
        calendar: !!gmailAccessToken,
        'cal.com': !!profile?.integrations?.['cal.com'],
        'cal.com_link': profile?.integrations?.['cal.com_link']
      },
      subscriptionInfo: subscriptionService.getPlanInfo(profile?.plan_type || 'none', profile?.subscription_end_date),
      userEmail,
      userName,
      privacyMode
    });

    const finalResponse = response && response.trim()
      ? response
      : generateFallbackResponse(message, integrations);

    if (operatorRuntime && operatorRun && normalizedPlan.length > 0) {
      const step2 = normalizedPlan[2];
      if (step2) {
        await operatorRuntime.transitionStep({
          runId: operatorRun.runId,
          stepId: step2.id,
          status: 'active',
          phase: 'executing',
          detail: 'Preparing final output'
        });
        await operatorRuntime.transitionStep({
          runId: operatorRun.runId,
          stepId: step2.id,
          status: 'completed',
          phase: 'executing'
        });
      }

      await operatorRuntime.updateRunState(operatorRun.runId, {
        status: 'completed',
        phase: 'post_execution',
        memory: {
          ...(operatorRun.memory || {}),
          lastExecution: {
            actionType,
            at: new Date().toISOString()
          },
          suggestions: ['track_response', 'prepare_follow_up']
        }
      });
    }

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
      assistantMessage: finalResponse,
      timestamp: new Date().toISOString(),
      conversationId: currentConversationId,
      aiGenerated: true,
      actionType: actionType,
      emailResult,
      notesResult,
      integrations,
      intentAnalysis,
      canvasData,
      thinkingSteps: normalizedPlan.length > 0
        ? normalizedPlan.map((s, i) => ({
          step: i + 1,
          id: s.id,
          kind: s.kind,
          status: s.status,
          description: s.label,
          action: s.label,
          type: s.kind,
          detail: s.detail || ''
        }))
        : intentAnalysis?.plan || [],
      run: operatorRun ? {
        runId: operatorRun.runId,
        status: 'completed',
        phase: 'post_execution',
        intent: operatorRun.intent,
        complexity: operatorRun.complexity
      } : null,
      evidence: {
        context: actionType,
        emailResult: emailResult || null,
        notesResult: notesResult || null
      },
      execution: executionPolicy || {
        actions: [],
        requiresApproval: false,
        approvalTokens: {}
      },
      postExecutionSuggestion: "Your task is complete. Want me to track replies or prepare a follow-up draft?"
    });

  } catch (error) {
    console.error('💥 Arcus Chat API error:', error);
    return NextResponse.json({
      message: `I ran into a temporary issue (${error.message}). Could you try that again? If the problem persists, it might be worth refreshing the page.`,
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
}

/**
 * Get integration status for current user
 */
async function getIntegrationStatus(userEmail, db) {
  const defaultStatus = {
    gmail: false
  };

  if (!userEmail) return defaultStatus;

  try {
    const tokens = await db.getUserTokens(userEmail);
    const profile = await db.getUserProfile(userEmail);

    const tokenScopes = tokens?.scopes || '';

    return {
      gmail: !!tokens
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
    } else if (lowerMessage.includes('analytics') || lowerMessage.includes('insights')) {
      query = 'newer_than:30d';
      maxResults = 20;
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

  // Handle Arcus Mission Results
  if (result.type === 'reply_proposal') {
    return `=== ARCUS REPLY PROPOSAL ===
Recipient: ${result.recipientName} <${result.recipientEmail}>
Subject: ${result.subject}
Content: ${result.content}

Action: I have successfully drafted the reply above. I am now showing it to the user for final approval before sending. If the user clicks 'Send' in the UI, I will execute the delivery.`;
  }

  if (result.type === 'clarification_required') {
    return `=== ARCUS CLARIFICATION NEEDED ===
I need the user to clarify the following before I can proceed:
${(result.questions || []).map(q => `- ${q}`).join('\n')}

Safety/Alert Flags:
${(result.flags || []).map(f => `- ${f}`).join('\n')}

Action: I am stopping execution to ask the user these specific questions.`;
  }

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

  if (result.messages) {
    // Thread result
    return `=== THREAD CONTENT ===\n${result.messages.map(m => `[${m.from}] (${m.date}): ${m.body}`).join('\n---\n')}`;
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

