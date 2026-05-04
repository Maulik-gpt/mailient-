import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { ArcusAIService } from '@/lib/arcus-ai.js';
import { ArcusAgentLoop } from '@/lib/arcus-agent-loop.js';
import { subscriptionService, FEATURE_TYPES } from '@/lib/subscription-service.js';
import { decrypt } from '@/lib/crypto.js';
import { isFeatureEnabled } from '@/lib/feature-flags.js';

export const maxDuration = 90;

/**
 * Arcus Agent Loop — SSE Endpoint
 *
 * This route runs the full agentic loop with real-time streaming.
 * The frontend consumes SSE events to show live thinking/execution steps.
 *
 * Feature-flagged behind `arcusAgentLoopV1`.
 * Falls back to the original chat-arcus route if disabled.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      message,
      conversationId,
      isNewConversation,
      gmailAccessToken,
      selectedEmailId,
      modelId
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    // ── Auth ──────────────────────────────────────────────────────────────
    let session = null;
    try {
      session = await auth();
    } catch (error) {
      console.log('⚠️ Auth not available:', error.message);
    }

    const db = new DatabaseService();
    const userEmail = session?.user?.email;
    const userName = session?.user?.name || 'User';

    // ── Subscription check ────────────────────────────────────────────────
    let currentPlan = 'free';
    if (userEmail) {
      currentPlan = await subscriptionService.getUserPlanType(userEmail);
      const canUse = await subscriptionService.canUseFeature(userEmail, FEATURE_TYPES.ARCUS_AI);
      if (!canUse) {
        const usage = await subscriptionService.getFeatureUsage(userEmail, FEATURE_TYPES.ARCUS_AI);
        return NextResponse.json({
          error: 'limit_reached',
          message: usage.reason === 'no_subscription'
            ? 'You need an active subscription to use Arcus AI.'
            : `You've used all your Arcus AI credits for ${usage.period === 'daily' ? 'today' : 'this month'}.`,
          usage: usage.usage,
          limit: usage.limit,
          upgradeUrl: '/pricing'
        }, { status: 403 });
      }
    }

    // ── Model Tier Enforcement ───────────────────────────────────────────
    let finalModelId = modelId;
    if (modelId && modelId !== 'auto') {
      const { PREMIUM_MODELS } = await import('@/lib/ai-constants.js');
      const modelInfo = PREMIUM_MODELS.find(m => m.id === modelId);
      
      if (modelInfo) {
        const isRestricted = 
          (modelInfo.tier === 'starter' && currentPlan === 'free') ||
          (modelInfo.tier === 'pro' && (currentPlan === 'free' || currentPlan === 'starter'));
          
        if (isRestricted) {
          console.warn(`⚠️ [SECURITY] User ${userEmail} attempted to use restricted model ${modelId} on plan ${currentPlan}. Falling back to default.`);
          finalModelId = null; // Let ArcusAIService use the default free model
        }
      }
    }

    // ── Conversation ID ───────────────────────────────────────────────────
    let currentConversationId = conversationId;
    if (isNewConversation && !conversationId) {
      currentConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ── Privacy mode ──────────────────────────────────────────────────────
    let privacyMode = false;
    let profile = null;
    if (userEmail) {
      try {
        profile = await db.getUserProfile(userEmail);
        if (profile?.preferences?.ai_privacy_mode === 'enabled') {
          privacyMode = true;
        }
      } catch (err) { /* non-fatal */ }
    }

    // ── Integration status ────────────────────────────────────────────────
    let integrations = { gmail: false };
    if (userEmail) {
      try {
        const tokens = await db.getUserTokens(userEmail);
        integrations.gmail = !!tokens?.encrypted_access_token;

        const { data: creds } = await db.supabase
          .from('integration_credentials')
          .select('provider')
          .eq('user_email', userEmail);

        if (creds) {
          creds.forEach(c => {
            if (c.provider === 'google_calendar') integrations.google_calendar = true;
            if (c.provider === 'google_tasks') integrations.google_tasks = true;
            if (c.provider === 'notion') integrations.notion = true;
            if (c.provider === 'cal.com') integrations.cal_com = true;
          });
        }
      } catch { /* non-fatal */ }
    }

    // ── Conversation history ──────────────────────────────────────────────
    let conversationHistory = [];
    if (currentConversationId && userEmail) {
      try {
        const history = await db.getConversationThread(userEmail, currentConversationId);
        if (history) {
          for (const entry of history) {
            if (entry.user_message) conversationHistory.push({ role: 'user', content: entry.user_message });
            if (entry.agent_response) conversationHistory.push({ role: 'assistant', content: entry.agent_response });
          }
        }
      } catch { /* non-fatal */ }
    }

    // ── Supermemory context ───────────────────────────────────────────────
    const arcusAI = new ArcusAIService({ modelId: finalModelId });
    let memoryContext = null;
    try {
      memoryContext = await arcusAI.getSupermemoryContext(userEmail, message);
    } catch { /* non-fatal */ }

    // ── Create the Agent Loop ─────────────────────────────────────────────
    const agentLoop = new ArcusAgentLoop({
      arcusAI,
      db,
      userEmail,
      userName,
      integrations,
      conversationId: currentConversationId,
      conversationHistory,
      gmailAccessToken,
      privacyMode,
      memoryContext,
      selectedEmailId
    });

    // ── Run the loop as an SSE stream ─────────────────────────────────────
    const stream = agentLoop.createStream(message, { modelId: finalModelId });

    // Increment usage (fire-and-forget)
    if (userEmail) {
      subscriptionService.incrementFeatureUsage(userEmail, FEATURE_TYPES.ARCUS_AI).catch(() => {});
    }

    // Save conversation (fire-and-forget after stream completes)
    // The actual message content will be saved by the frontend after
    // receiving the full response, or we can save the last 'message' event.

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
        'Transfer-Encoding': 'chunked',
        'X-Conversation-Id': currentConversationId || ''
      }
    });

  } catch (error) {
    console.error('💥 Arcus Agent Loop error:', error);
    return NextResponse.json({
      message: `Agent loop failed: ${error.message}. Try again or refresh the page.`,
      error: error.message
    }, { status: 500 });
  }
}
