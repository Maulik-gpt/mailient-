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

export const maxDuration = 60; // Allow enough time for Deep Thinking/Arcus logic

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
      actionRequestId,
      attachments,
      isDeepThinking,
      isCanvas
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

    // Parallelize data fetching for speed
    const [integrations, conversationHistoryResult] = await Promise.all([
      getIntegrationStatus(userEmail, db),
      (currentConversationId && userEmail) ? getConversationHistory(userEmail, currentConversationId, db) : Promise.resolve([])
    ]);
    
    const conversationHistory = conversationHistoryResult || [];
    const effectiveGmailConnected = Boolean(gmailAccessToken || integrations?.gmail);
    console.log('Arcus Integration status:', integrations);
    console.log('📝 Loaded conversation history:', conversationHistory.length, 'messages');

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
        canvasType: intentAnalysis?.canvasType || 'none',
        runId: runId || null
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
    else if ((userEmail || gmailAccessToken) && detectedIsEmailQuery && !emailContext) {
      try {
        const emailActionResult = await executeEmailAction(message, userEmail, session, gmailAccessToken, intentAnalysis);
        emailResult = emailActionResult;
        
        if (emailActionResult && emailActionResult.success) {
          emailContext = formatEmailActionResult(emailActionResult);
          rawEmailData = emailActionResult.emails || [];
          actionType = 'email';
          console.log(`✅ Arcus context enriched with ${rawEmailData.length} emails`);
        }
        
        if (emailActionResult?.error) {
          console.warn('Arcus email action warning:', emailActionResult.error);
        }
      } catch (err) {
        console.error('Error in Arcus email action:', err);
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
          detail: 'Intent classified and operator plan generated'
        });
        step0.status = 'completed';
      }

      const step1 = normalizedPlan[1];
      if (step1) {
        await operatorRuntime.transitionStep({
          runId: operatorRun.runId,
          stepId: step1.id,
          status: 'active',
          phase: 'searching',
          detail: buildStepMicroEvent('searching', emailResult, notesResult),
          evidence: emailResult || notesResult || null
        });

        await operatorRuntime.transitionStep({
          runId: operatorRun.runId,
          stepId: step1.id,
          status: 'completed',
          phase: 'searching',
          detail: buildStepMicroEvent('completed_search', emailResult, notesResult),
          evidence: emailResult || notesResult || null
        });
        step1.status = 'completed';
      }

      const step2 = normalizedPlan[2];
      if (step2 && !step2.detail) {
        step2.detail = 'Drafting execution-ready output in canvas';
      }
    }

    // --- CANVAS GENERATION (for complex tasks) ---
        let canvasData = null;
    let executionPolicy = null;
    const messageLower = (message || '').toLowerCase();
    const effectiveCanvasType = intentAnalysis?.canvasType || 'email_draft';
    const shouldGenerateCanvas = Boolean(isCanvas);

    // --- PARALLEL GENERATION: Generate canvas and response at the same time ---
    let canvasDataResult = null;
    let responseResult = null;

    try {
      console.log('⚡ Starting parallel generation for ' + (shouldGenerateCanvas ? 'Canvas + Response' : 'Response only'));
      const generations = [];
      
      // Always generate response
      const responsePromise = arcusAI.generateResponse(message, {
        conversationHistory,
        emailContext,
        integrations: {
          gmail: effectiveGmailConnected,
          calendar: effectiveGmailConnected,
          'cal.com': !!profile?.integrations?.['cal.com'],
          'cal.com_link': profile?.integrations?.['cal.com_link']
        },
        subscriptionInfo: subscriptionService.getPlanInfo(profile?.plan_type || 'none', profile?.subscription_end_date),
        userEmail,
        userName,
        privacyMode,
        attachments,
        isDeepThinking
      });
      generations.push(responsePromise);

      // Optionally generate canvas content
      let canvasPromise = null;
      if (shouldGenerateCanvas) {
        canvasPromise = arcusAI.generateCanvasContent(
          message,
          effectiveCanvasType,
          emailContext || '',
          { userName, userEmail, privacyMode, attachments, isDeepThinking }
        );
        generations.push(canvasPromise);
      }

      // Wait for all generations to finish
      const results = await Promise.all(generations);
      responseResult = results[0];
      if (shouldGenerateCanvas) {
        canvasDataResult = results[1];
      }
      
      console.log('✅ Parallel generation completed');
    } catch (err) {
      console.error('💥 Parallel generation failed:', err.message);
      // If parallel fails, we might still have partial results or need to re-try or fall back
      if (!responseResult) throw err;
    }

    const response = responseResult;
    canvasData = canvasDataResult;

    if (shouldGenerateCanvas && canvasData) {
      try {
        if (operatorRuntime && operatorRun) {
          executionPolicy = operatorRuntime.buildExecutionPolicy(
            effectiveCanvasType,
            requiresApproval,
            operatorRun.runId
          );
          await operatorRuntime.saveExecutionPolicy(operatorRun.runId, executionPolicy);
        }

        canvasData = enrichCanvasData({
          canvasData,
          message,
          canvasType: effectiveCanvasType,
          requiresApproval,
          runId: operatorRun?.runId || runId || null,
          executionPolicy,
          emailResult,
          notesResult
        });

        const step2 = normalizedPlan[2];
        if (operatorRuntime && operatorRun && step2) {
          const approvalRequired = Boolean(canvasData?.approval?.required);
          await operatorRuntime.transitionStep({
            runId: operatorRun.runId,
            stepId: step2.id,
            status: approvalRequired ? 'blocked_approval' : 'completed',
            phase: approvalRequired ? 'approval' : 'synthesizing',
            detail: approvalRequired
              ? 'Drafted output and waiting for your confirmation'
              : 'Drafted output and prepared execution actions'
          });
          step2.status = approvalRequired ? 'blocked_approval' : 'completed';
        }
      } catch (err) {
        console.error('Canvas post-processing failed:', err.message);
      }
    }

    const finalResponse = response && response.trim()
      ? response
      : generateFallbackResponse(message, integrations);

    let runStatus = 'completed';
    let runPhase = 'post_execution';
    if (operatorRuntime && operatorRun && normalizedPlan.length > 0) {
      const approvalRequired = Boolean(canvasData?.approval?.required);
      runStatus = approvalRequired ? 'blocked_approval' : 'completed';
      runPhase = approvalRequired ? 'approval' : 'post_execution';

      await operatorRuntime.updateRunState(operatorRun.runId, {
        status: runStatus,
        phase: runPhase,
        memory: {
          ...(operatorRun.memory || {}),
          lastExecution: {
            actionType,
            at: new Date().toISOString()
          },
          suggestions: approvalRequired
            ? ['approve_or_revise', 'save_draft']
            : ['track_response', 'prepare_follow_up']
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
          detail: s.detail || '',
          evidence: buildEvidenceForStep(s, emailResult, notesResult)
        }))
        : intentAnalysis?.plan || [],
      run: operatorRun ? {
        runId: operatorRun.runId,
        status: runStatus,
        phase: runPhase,
        intent: operatorRun.intent,
        complexity: operatorRun.complexity
      } : null,
      evidence: {
        context: actionType,
        byStep: normalizedPlan.map((s) => ({
          stepId: s.id,
          kind: s.kind,
          label: s.label,
          items: buildEvidenceForStep(s, emailResult, notesResult)
        })),
        emailResult: emailResult || null,
        notesResult: notesResult || null
      },
      execution: executionPolicy || {
        actions: [],
        requiresApproval: false,
        approvalTokens: {}
      },
      postExecutionSuggestion: runPhase === 'approval'
        ? 'Your draft is ready in canvas. Approve, revise, or save it as draft.'
        : "Your task is complete. Want me to track replies or prepare a follow-up draft?"
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

function buildStepMicroEvent(phase, emailResult, notesResult) {
  if (emailResult?.success) {
    const count = Array.isArray(emailResult.emails) ? emailResult.emails.length : (emailResult.count || 0);
    const query = emailResult.query || 'recent activity';
    if (phase === 'searching') return `Deep Search: "${query}" across your inbox...`;
    return `Context Optimized: Analyzed ${count} high-priority thread${count === 1 ? '' : 's'} with full history.`;
  }
  if (notesResult?.success) {
    const count = Array.isArray(notesResult.notes) ? notesResult.notes.length : 0;
    if (phase === 'searching') return `Recalling context from your saved notes: "${notesResult.query || 'general'}"`;
    return `Knowledge Integrated: Found ${count} relevant note${count === 1 ? '' : 's'} for this mission.`;
  }
  return phase === 'searching'
    ? 'Gathering multi-dimensional context for the mission...'
    : 'Mission context synthesis complete. Finalizing output...';
}

function buildEvidenceForStep(step, emailResult, notesResult) {
  const kind = step?.kind || '';
  const items = [];

  if ((kind === 'search' || kind === 'read' || kind === 'analyze') && emailResult?.success) {
    (emailResult.emails || []).slice(0, 5).forEach((email) => {
      items.push({
        threadId: email.threadId || null,
        messageId: email.id || null,
        sender: email.from || 'Unknown Sender',
        timestamp: email.date || null,
        subject: email.subject || '(No Subject)'
      });
    });
  }

  if ((kind === 'search' || kind === 'read' || kind === 'analyze') && notesResult?.success) {
    (notesResult.notes || []).slice(0, 5).forEach((note) => {
      items.push({
        threadId: null,
        messageId: note.id || null,
        sender: 'Notes',
        timestamp: note.created_at || null,
        subject: note.subject || '(Untitled Note)'
      });
    });
  }

  return items;
}

function enrichCanvasData({ canvasData, message, canvasType, requiresApproval, runId, executionPolicy, emailResult, notesResult }) {
  const fallbackContentByType = {
    email_draft: {
      subject: 'Draft reply ready',
      to: '',
      body: 'Arcus prepared a draft. Please review and approve before sending.',
      tone: 'professional'
    },
    summary: {
      title: 'Inbox Summary',
      keyPoints: ['Summary prepared from available context'],
      actionItems: ['Review in canvas and choose the next action'],
      urgency: 'medium'
    },
    research: {
      title: 'Inbox Research',
      findings: [],
      recommendations: ['Review findings and approve next action']
    },
    action_plan: {
      title: 'Action Plan',
      steps: [{ order: 1, task: 'Review and approve the workflow', status: 'pending' }],
      timeline: 'Immediate'
    }
  };

  const safeCanvas = {
    ...(canvasData || {}),
    type: canvasType,
    content: canvasData?.content || fallbackContentByType[canvasType] || fallbackContentByType.summary,
    raw: canvasData?.raw || ''
  };

  const actions = executionPolicy?.actions || [];
  const approvalRequired = Boolean(requiresApproval || actions.some((a) => a.requiresApproval));
  const primaryAction = actions.find((a) => a.actionType === 'send_email')
    || actions.find((a) => a.actionType === 'execute_plan')
    || actions[0]
    || null;

  const evidencePreview = buildEvidenceForStep({ kind: 'search' }, emailResult, notesResult).slice(0, 5);

  return {
    ...safeCanvas,
    actions,
    approvalTokens: executionPolicy?.approvalTokens || {},
    goal: message,
    decisionSummary: approvalRequired
      ? 'Arcus prepared an execution-ready draft and is waiting for your explicit confirmation.'
      : 'Arcus prepared an execution-ready result that can be applied now.',
    riskFlags: approvalRequired
      ? ['Critical action requires explicit approval before execution']
      : ['No critical action pending approval'],
    sources: evidencePreview,
    recommendedAction: primaryAction?.actionType || null,
    alternatives: actions.filter((a) => a.actionType !== primaryAction?.actionType).map((a) => a.actionType),
    actionPayload: safeCanvas.content,
    approval: {
      required: approvalRequired,
      token: primaryAction ? (executionPolicy?.approvalTokens?.[primaryAction.actionType] || null) : null,
      expiresAt: new Date(Date.now() + (15 * 60 * 1000)).toISOString(),
      reason: approvalRequired ? 'This action changes Gmail data and needs your confirmation.' : null
    }
  };
}
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
async function executeEmailAction(userMessage, userEmail, session, providedAccessToken = null, intentAnalysis = null) {
  const lowerMessage = userMessage.toLowerCase();

  try {
    let accessToken = providedAccessToken || session?.accessToken;
    let refreshToken = session?.refreshToken;

    if (!accessToken && userEmail) {
      try {
        const db = new DatabaseService();
        const userTokens = await db.getUserTokens(userEmail);
        if (userTokens?.encrypted_access_token) {
          accessToken = decrypt(userTokens.encrypted_access_token);
          refreshToken = userTokens.encrypted_refresh_token ? decrypt(userTokens.encrypted_refresh_token) : '';
        }
      } catch (dbError) {
        console.error('Arcus database token fetch error:', dbError.message);
      }
    }

    if (!accessToken) {
      return { error: 'Gmail not connected', reconnectRequired: true, success: false };
    }

    const { GmailService } = await import('@/lib/gmail');
    const gmailService = new GmailService(accessToken, refreshToken || '');

    // 🎯 SMART SEARCH: Use AI-generated query if available
    let query = 'newer_than:15d';
    let maxResults = 10;
    
    const aiSearchStep = intentAnalysis?.plan?.find(s => s.type === 'search' || s.action?.toLowerCase().includes('search'));
    if (aiSearchStep?.description && aiSearchStep.description.length > 5) {
      query = aiSearchStep.description;
      if (!query.includes('newer_than') && !query.includes('after:')) {
        query += ' newer_than:15d';
      }
    } else {
      if (lowerMessage.includes('unread')) {
        query = 'is:unread newer_than:15d';
      } else if (lowerMessage.includes('important') || lowerMessage.includes('urgent')) {
        query = 'is:important newer_than:15d';
      } else if (lowerMessage.includes('starred')) {
        query = 'is:starred newer_than:30d';
      } else if (lowerMessage.includes('sent')) {
        query = 'in:sent newer_than:15d';
      } else if (lowerMessage.includes('today')) {
        query = 'newer_than:1d';
      } else if (lowerMessage.includes('analytics') || lowerMessage.includes('insights')) {
        query = 'newer_than:30d';
        maxResults = 25;
      }

      const fromMatch = userMessage.match(/from\s+([^\s,]+)/i);
      if (fromMatch) {
        query += ` from:${fromMatch[1]}`;
      }
    }

    try {
      let emailsResponse = await gmailService.getEmails(maxResults, query, null, 'internalDate desc');
      let messages = emailsResponse?.messages || [];

      // Fallback: If no unread/specific results, try a broader recent search
      if (messages.length === 0 && (query.includes('is:unread') || query.includes('from:'))) {
        console.log('🔄 Arcus: No results for specific query, falling back to broader search');
        const fallbackQuery = 'newer_than:15d';
        emailsResponse = await gmailService.getEmails(maxResults, fallbackQuery, null, 'internalDate desc');
        messages = emailsResponse?.messages || [];
        query = fallbackQuery; // Update query so UI shows fallback
      }

      console.log('📧 Emails found:', messages.length);

      if (messages.length === 0) {
        return { action: 'read_emails', success: true, emails: [], query, count: 0 };
      }

      const emailDetails = [];
      // Take up to 8 threads to provide a deep context
      for (const message of messages.slice(0, 8)) {
        try {
          // Deep Retrieval: Fetch the whole thread to see the sequence and history
          const thread = await gmailService.getThreadDetails(message.threadId);
          const threadMessages = thread.messages || [];
          
          // Map thread messages to a concise history
          const history = threadMessages.map(m => {
            const parsed = gmailService.parseEmailData(m);
            return {
              from: parsed.from,
              date: parsed.date,
              snippet: parsed.snippet,
              isMe: parsed.from?.includes(userEmail) || parsed.from?.includes('me')
            };
          });

          // Focus on the current message details for the main content
          const currentMsgDetails = await gmailService.getEmailDetails(message.id);
          const parsed = gmailService.parseEmailData(currentMsgDetails);
          const fullBody = parsed.body || parsed.snippet || '';
          const bodyContent = fullBody.length > 4000 ? fullBody.substring(0, 4000) + '...' : fullBody;

          // Smart Categorization (Business vs Personal)
          const labels = parsed.labels || [];
          let category = 'Business'; // Default to Business for professional efficiency
          const personalKeywords = ['family', 'friend', 'social', 'entertainment', 'netflix', 'spotify', 'amazon', 'order', 'shipping'];
          const fromLower = (parsed.from || '').toLowerCase();
          const subLower = (parsed.subject || '').toLowerCase();
          
          if (labels.includes('CATEGORY_SOCIAL') || labels.includes('CATEGORY_PROMOTIONS')) {
            category = 'Personal/Social';
          } else if (personalKeywords.some(k => fromLower.includes(k) || subLower.includes(k))) {
            category = 'Personal';
          }

          emailDetails.push({
            id: message.id,
            subject: parsed.subject || '(No Subject)',
            from: parsed.from || 'Unknown Sender',
            to: parsed.to || '',
            date: parsed.date || 'Unknown Date',
            snippet: parsed.snippet || '',
            body: bodyContent,
            labels: labels,
            threadId: parsed.threadId || '',
            isUnread: labels.includes('UNREAD'),
            isImportant: labels.includes('IMPORTANT'),
            folder: labels.includes('SENT') ? 'Sent' : (labels.includes('TRASH') ? 'Trash' : 'Inbox'),
            category: category,
            threadHistory: history.slice(-5) // Last 5 messages in thread for context
          });
        } catch (error) {
          console.log('Error processing email thread:', error.message);
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

    if (result.emails?.length > 0) {
      result.emails.forEach((email, index) => {
        context += `[Email ${index + 1}]
  Subject: ${email.subject}
  From: ${email.from}
  To: ${email.to}
  Date: ${email.date}
  Status: ${email.isUnread ? 'UNREAD' : 'READ'}${email.isImportant ? ', IMPORTANT' : ''}
  Folder: ${email.folder}
  Category: ${email.category}
  ThreadID: ${email.threadId}
  
  -- THREAD HISTORY (last 5) --
${email.threadHistory.map(h => `  * ${h.isMe ? '[ME]' : '[THEM]'} (${h.date}): ${h.snippet}`).join('\n')}
  
  -- CONTENT --
  ${email.body}
`;
        context += '\n---\n';
      });
    } else {
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

    const db = new DatabaseService();
    // Use direct database search for faster and more reliable notes access
    // Table name corrected to 'notes' as per schema
    const { data: notes, error: notesError } = await db.supabase
      .from('notes')
      .select('id, subject, content, created_at, tags')
      .eq('user_id', userEmail)
      .or(`content.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (notesError) throw notesError;

    return {
      action: 'notes_search',
      success: true,
      notes: notes || [],
      query: searchTerm,
      count: notes?.length || 0
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







