/**
 * Arcus Plan Mode API Routes - Phase 2
 * 
 * Endpoints:
 * - POST /api/agent-talk/plan/create - Create new plan from intent
 * - POST /api/agent-talk/plan/:planId/approve - Approve a plan
 * - POST /api/agent-talk/plan/:planId/decline - Decline a plan
 * - POST /api/agent-talk/plan/:planId/revise - Create new version
 * - POST /api/agent-talk/plan/:planId/execute - Execute approved plan
 * - POST /api/agent-talk/run/:runId/resume - Resume paused run
 * - GET /api/agent-talk/run/:runId/status - Get run status with plan context
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { DatabaseService } from '@/lib/supabase.js';
import { ArcusAIService } from '@/lib/arcus-ai.js';
import { ArcusPlanModeEngine } from '@/lib/arcus-plan-mode-engine-v2.js';
import { isFeatureEnabled } from '@/lib/feature-flags.js';

// ============================================================================
// POST /api/agent-talk/plan/create
// Create a new plan from user intent
// ============================================================================

export async function createPlan(request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { message, intent, complexity = 'complex', context = {} } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check feature flag
    if (!isFeatureEnabled('arcusPlanModeV2')) {
      return NextResponse.json({ error: 'Plan mode not enabled' }, { status: 403 });
    }

    const db = new DatabaseService();
    const arcusAI = new ArcusAIService();
    
    const planEngine = new ArcusPlanModeEngine({
      db,
      arcusAI,
      userEmail,
      userName: session.user.name || 'User'
    });

    // Generate plan
    const planResult = await planEngine.generatePlan({
      message,
      intent,
      complexity,
      context
    });

    return NextResponse.json({
      success: true,
      planId: planResult.planId,
      planArtifact: planResult.planArtifact,
      todos: planResult.todos,
      requiresApproval: true,
      message: `Plan created with ${planResult.todos.length} tasks. Review and approve to execute.`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plan API] Create plan error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create plan'
    }, { status: 500 });
  }
}

// ============================================================================
// POST /api/agent-talk/plan/:planId/approve
// Approve a plan (draft -> approved)
// ============================================================================

export async function approvePlan(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { planId } = params;
    const { approvalContext = {} } = await request.json();

    const db = new DatabaseService();
    const arcusAI = new ArcusAIService();
    
    const planEngine = new ArcusPlanModeEngine({
      db,
      arcusAI,
      userEmail,
      userName: session.user.name || 'User'
    });

    // Approve the plan
    const approvalResult = await planEngine.approvePlan(planId, {
      approvedBy: userEmail,
      approvalContext
    });

    return NextResponse.json({
      success: true,
      planId: approvalResult.planId,
      planArtifact: approvalResult.planArtifact,
      approvalToken: approvalResult.approvalToken,
      approvedAt: approvalResult.approvedAt,
      todos: approvalResult.todos,
      message: `Plan approved and locked (v${approvalResult.planArtifact.version}). Ready for execution.`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plan API] Approve plan error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to approve plan'
    }, { status: 500 });
  }
}

// ============================================================================
// POST /api/agent-talk/plan/:planId/decline
// Decline/cancel a plan
// ============================================================================

export async function declinePlan(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { planId } = params;
    const { reason = '' } = await request.json();

    const db = new DatabaseService();
    const arcusAI = new ArcusAIService();
    
    const planEngine = new ArcusPlanModeEngine({
      db,
      arcusAI,
      userEmail,
      userName: session.user.name || 'User'
    });

    const declineResult = await planEngine.declinePlan(planId, {
      reason,
      declinedBy: userEmail
    });

    return NextResponse.json({
      success: true,
      planId: declineResult.planId,
      planArtifact: declineResult.planArtifact,
      message: `Plan declined${reason ? `: ${reason}` : ''}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plan API] Decline plan error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to decline plan'
    }, { status: 500 });
  }
}

// ============================================================================
// POST /api/agent-talk/plan/:planId/revise
// Create new version from existing plan
// ============================================================================

export async function revisePlan(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { planId } = params;
    const { revisions = {} } = await request.json();

    const db = new DatabaseService();
    const arcusAI = new ArcusAIService();
    
    const planEngine = new ArcusPlanModeEngine({
      db,
      arcusAI,
      userEmail,
      userName: session.user.name || 'User'
    });

    const reviseResult = await planEngine.revisePlan(planId, {
      revisions,
      revisedBy: userEmail
    });

    return NextResponse.json({
      success: true,
      newPlanId: reviseResult.planId,
      planArtifact: reviseResult.planArtifact,
      parentPlanId: reviseResult.parentPlanId,
      message: `New plan version created from ${planId}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plan API] Revise plan error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to revise plan'
    }, { status: 500 });
  }
}

// ============================================================================
// POST /api/agent-talk/plan/:planId/execute
// Execute an approved plan
// ============================================================================

export async function executePlan(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { planId } = params;
    const { runId = null, context = {} } = await request.json();

    const db = new DatabaseService();
    const arcusAI = new ArcusAIService();
    
    const planEngine = new ArcusPlanModeEngine({
      db,
      arcusAI,
      userEmail,
      userName: session.user.name || 'User'
    });

    // Execute the plan
    const executionResult = await planEngine.executePlan(planId, {
      runId,
      executionContext: context
    });

    return NextResponse.json({
      success: true,
      runId: executionResult.runId,
      planId: executionResult.planId,
      planArtifact: executionResult.planArtifact,
      executionResult: executionResult.executionResult,
      message: 'Plan execution started',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plan API] Execute plan error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to execute plan'
    }, { status: 500 });
  }
}

// ============================================================================
// POST /api/agent-talk/run/:runId/resume
// Resume a paused run with approval
// ============================================================================

export async function resumeRun(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { runId } = params;
    const { approvalToken } = await request.json();

    if (!approvalToken) {
      return NextResponse.json({ error: 'Approval token is required' }, { status: 400 });
    }

    const db = new DatabaseService();
    const arcusAI = new ArcusAIService();
    
    const planEngine = new ArcusPlanModeEngine({
      db,
      arcusAI,
      userEmail,
      userName: session.user.name || 'User'
    });

    // Resume the run
    const resumeResult = await planEngine.resumeRun(runId, {
      approvalToken,
      approvedBy: userEmail
    });

    return NextResponse.json({
      success: true,
      runId: resumeResult.runId,
      planId: resumeResult.planId,
      executionResult: resumeResult.executionResult,
      message: 'Run resumed and execution continued',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plan API] Resume run error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to resume run'
    }, { status: 500 });
  }
}

// ============================================================================
// GET /api/agent-talk/run/:runId/status
// Get run status with full plan context
// ============================================================================

export async function getRunStatus(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { runId } = params;

    const db = new DatabaseService();
    const arcusAI = new ArcusAIService();
    
    const planEngine = new ArcusPlanModeEngine({
      db,
      arcusAI,
      userEmail,
      userName: session.user.name || 'User'
    });

    const status = await planEngine.getRunStatus(runId);

    if (!status) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plan API] Get run status error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to get run status'
    }, { status: 500 });
  }
}

// ============================================================================
// GET /api/agent-talk/plan/:planId
// Get plan by ID
// ============================================================================

export async function getPlan(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { planId } = params;

    const db = new DatabaseService();
    const arcusAI = new ArcusAIService();
    
    const planEngine = new ArcusPlanModeEngine({
      db,
      arcusAI,
      userEmail,
      userName: session.user.name || 'User'
    });

    const plan = await planEngine.getPlan(planId);

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      planId,
      planArtifact: plan,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plan API] Get plan error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to get plan'
    }, { status: 500 });
  }
}
