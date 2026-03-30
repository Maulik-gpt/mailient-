/**
 * Arcus Plan Mode Engine
 * Generates AI-driven plans with objectives, assumptions, todos with dependencies
 * Integrates with ArcusPlanEngine for persistence
 */

import { ArcusPlanEngine } from './arcus-plan-engine.js';

export class PlanModeEngine {
  constructor({ arcusAI, db, userEmail }) {
    this.arcusAI = arcusAI;
    this.db = db;
    this.userEmail = userEmail;
    this.planEngine = new ArcusPlanEngine({ db, userEmail });
  }

  /**
   * Generate a comprehensive Plan Artifact using AI
   * This creates objectives, assumptions, todos with dependencies, acceptance criteria
   */
  async generatePlan({
    message,
    runId,
    conversationId,
    context = {},
    intent = 'general',
    complexity = 'simple'
  }) {
    // Build the system prompt for plan generation
    const systemPrompt = this._buildPlanGenerationPrompt(context);

    try {
      // Call AI to generate structured plan
      const response = await this.arcusAI.callOpenRouter([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create an execution plan for: ${message}` }
      ], {
        maxTokens: 2000,
        temperature: 0.3,
        taskType: 'planning'
      });

      const content = this._extractResponse(response);
      const planData = this._parsePlanJSON(content);

      // Enrich plan with execution metadata
      const enrichedPlan = this._enrichPlanWithMetadata(planData, message, intent, complexity);

      // Persist the plan artifact
      const { planId, plan } = await this.planEngine.createPlan({
        runId,
        conversationId,
        title: enrichedPlan.title,
        objective: enrichedPlan.objective,
        assumptions: enrichedPlan.assumptions,
        questionsAnswered: enrichedPlan.questionsAnswered,
        acceptanceCriteria: enrichedPlan.acceptanceCriteria,
        todos: enrichedPlan.todos,
        sourceMessage: message,
        intent,
        complexity,
        canvasType: this._inferCanvasType(intent, enrichedPlan.todos)
      });

      return {
        planId,
        plan,
        todos: enrichedPlan.todos,
        thinkingBlocks: this._generateThinkingBlocks(enrichedPlan)
      };
    } catch (error) {
      console.error('Plan generation failed:', error);
      // Fallback to simple plan
      return this._generateFallbackPlan({ message, runId, conversationId, intent, complexity });
    }
  }

  /**
   * Build the AI prompt for plan generation
   */
  _buildPlanGenerationPrompt(context) {
    return `You are ARCUS Plan Engine. Generate structured execution plans.

OUTPUT FORMAT - Strict JSON:
{
  "title": "Clear, actionable plan title (5-10 words)",
  "objective": "Single sentence describing the mission goal",
  "assumptions": [
    "Assumption 1 about context/availability",
    "Assumption 2 about user intent",
    "Assumption 3 about external systems"
  ],
  "questionsAnswered": [
    "Implicit question 1 that this plan addresses",
    "Implicit question 2 that this plan addresses"
  ],
  "acceptanceCriteria": [
    "Specific, measurable criterion 1",
    "Specific, measurable criterion 2",
    "Specific, measurable criterion 3"
  ],
  "todos": [
    {
      "title": "Clear action description",
      "description": "Detailed context for this step",
      "actionType": "one of: search_email, read_thread, draft_reply, send_email, schedule_meeting, notion_create_page, tasks_add_tasks, analyze_data, generic_task",
      "dependsOn": [],
      "approvalMode": "auto or manual (use manual for mutating actions like send_email)",
      "estimatedDuration": "e.g., 2m, 5m, 1h"
    }
  ],
  "riskLevel": "low|medium|high",
  "requiresApproval": true|false
}

PLANNING PRINCIPLES:
1. Order todos by dependency - independent tasks first
2. Use "dependsOn" array to reference todo indices (0-based)
3. Set approvalMode to "manual" for: send_email, schedule_meeting, notion_create_page
4. Include 3-7 todos for typical plans, up to 12 for complex workflows
5. Each todo must have clear completion criteria
6. Risk level reflects potential for external side effects

EXAMPLE TODOS:
- search_email: "Search Gmail for recent invoices from Vendor X"
- read_thread: "Read thread abc123 to understand context"
- draft_reply: "Draft response to John's proposal"
- send_email: "Send approved reply to john@example.com" (manual approval)
- notion_create_page: "Create Notion page: Project Summary Q1" (manual approval)
- tasks_add_tasks: "Add 3 follow-up tasks to Google Tasks"
- analyze_data: "Analyze email patterns for last 30 days"

Return ONLY valid JSON. No markdown, no explanation.`;
  }

  /**
   * Extract response content from API
   */
  _extractResponse(data) {
    return data?.choices?.[0]?.message?.content || '';
  }

  /**
   * Parse and validate plan JSON
   */
  _parsePlanJSON(content) {
    try {
      // Clean markdown indicators
      let cleanContent = content.trim();
      if (cleanContent.includes('```json')) {
        cleanContent = cleanContent.split('```json')[1].split('```')[0];
      } else if (cleanContent.includes('```')) {
        cleanContent = cleanContent.split('```')[1].split('```')[0];
      }

      const parsed = JSON.parse(cleanContent.trim());

      // Validate required fields
      if (!parsed.title || !parsed.objective || !Array.isArray(parsed.todos)) {
        throw new Error('Invalid plan structure: missing required fields');
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse plan JSON:', error);
      throw error;
    }
  }

  /**
   * Enrich plan with execution metadata
   */
  _enrichPlanWithMetadata(planData, sourceMessage, intent, complexity) {
    const todos = planData.todos.map((todo, index) => ({
      ...todo,
      order: index,
      // Convert dependsOn indices to todo IDs (will be set after creation)
      dependsOn: (todo.dependsOn || []).map(depIndex => `todo_step_${depIndex}`),
      // Infer mutating status for approval mode
      approvalMode: todo.approvalMode || this._inferApprovalMode(todo.actionType),
      // Add retry policy
      retryPolicy: {
        max_attempts: todo.approvalMode === 'manual' ? 1 : 3,
        backoff_ms: 1000
      },
      // Add input schema based on action type
      inputSchema: this._getInputSchemaForAction(todo.actionType)
    }));

    return {
      title: planData.title,
      objective: planData.objective,
      assumptions: planData.assumptions || [],
      questionsAnswered: planData.questionsAnswered || [],
      acceptanceCriteria: planData.acceptanceCriteria || [],
      todos,
      riskLevel: planData.riskLevel || 'medium',
      requiresApproval: planData.requiresApproval !== false // default true
    };
  }

  /**
   * Infer approval mode based on action type
   */
  _inferApprovalMode(actionType) {
    const manualActions = [
      'send_email',
      'arcus_outreach',
      'arcus_auto_pilot',
      'schedule_meeting',
      'notion_create_page',
      'notion_append',
      'tasks_complete',
      'execute_plan'
    ];
    return manualActions.includes(actionType) ? 'manual' : 'auto';
  }

  /**
   * Get input schema for action type
   */
  _getInputSchemaForAction(actionType) {
    const schemas = {
      search_email: {
        query: { type: 'string', required: true },
        limit: { type: 'number', default: 10 },
        dateRange: { type: 'string', optional: true }
      },
      read_thread: {
        threadId: { type: 'string', required: true }
      },
      draft_reply: {
        threadId: { type: 'string', required: true },
        tone: { type: 'string', default: 'professional' },
        keyPoints: { type: 'array', optional: true }
      },
      send_email: {
        to: { type: 'string', required: true },
        subject: { type: 'string', required: true },
        body: { type: 'string', required: true },
        cc: { type: 'array', optional: true }
      },
      schedule_meeting: {
        attendees: { type: 'array', required: true },
        date: { type: 'string', required: true },
        time: { type: 'string', required: true },
        duration: { type: 'number', default: 30 },
        agenda: { type: 'string', optional: true }
      },
      notion_create_page: {
        title: { type: 'string', required: true },
        content: { type: 'string', optional: true },
        databaseId: { type: 'string', optional: true },
        parentPageId: { type: 'string', optional: true },
        tags: { type: 'array', optional: true }
      },
      tasks_add_tasks: {
        tasks: { type: 'array', required: true },
        taskListId: { type: 'string', optional: true },
        taskListTitle: { type: 'string', optional: true }
      },
      analyze_data: {
        metricType: { type: 'string', required: true },
        dateRange: { type: 'string', required: true }
      },
      generic_task: {
        taskName: { type: 'string', required: true },
        params: { type: 'object', default: {} }
      }
    };

    return schemas[actionType] || schemas.generic_task;
  }

  /**
   * Infer canvas type from intent and todos
   */
  _inferCanvasType(intent, todos) {
    const actionTypes = todos.map(t => t.actionType);

    if (actionTypes.includes('send_email') || actionTypes.includes('draft_reply')) {
      return 'email_draft';
    }
    if (actionTypes.includes('schedule_meeting')) {
      return 'meeting_schedule';
    }
    if (actionTypes.includes('analyze_data')) {
      return 'analytics';
    }
    if (intent === 'multi_step' || intent === 'execute_plan') {
      return 'action_plan';
    }

    return 'summary';
  }

  /**
   * Generate thinking blocks for UI display
   */
  _generateThinkingBlocks(plan) {
    return [{
      id: `plan-${Date.now()}`,
      title: plan.title,
      status: 'active',
      initialContext: `Planning execution for: ${plan.objective}`,
      steps: plan.todos.map((todo, i) => ({
        id: `step-${i}`,
        label: todo.title,
        status: 'pending',
        type: this._mapActionTypeToStepType(todo.actionType)
      })),
      interimConclusion: `Created ${plan.todos.length} step execution plan with ${plan.todos.filter(t => t.approvalMode === 'manual').length} requiring approval`,
      nextActionContext: 'Waiting for user approval to begin execution'
    }];
  }

  /**
   * Map action type to step type for UI
   */
  _mapActionTypeToStepType(actionType) {
    const mapping = {
      search_email: 'search',
      read_thread: 'read',
      draft_reply: 'draft',
      send_email: 'execute',
      schedule_meeting: 'execute',
      notion_create_page: 'execute',
      notion_append: 'execute',
      tasks_add_tasks: 'execute',
      analyze_data: 'analyze',
      generic_task: 'think'
    };
    return mapping[actionType] || 'think';
  }

  /**
   * Fallback plan generation when AI fails
   */
  async _generateFallbackPlan({ message, runId, conversationId, intent, complexity }) {
    const fallbackTodos = [
      {
        title: 'Analyze request and gather context',
        description: 'Understand user intent and required inputs',
        actionType: 'generic_task',
        order: 0,
        dependsOn: [],
        approvalMode: 'auto'
      },
      {
        title: 'Execute primary action',
        description: 'Perform the main task requested by user',
        actionType: 'generic_task',
        order: 1,
        dependsOn: ['todo_step_0'],
        approvalMode: 'manual'
      },
      {
        title: 'Verify and report results',
        description: 'Confirm completion and present outcomes',
        actionType: 'generic_task',
        order: 2,
        dependsOn: ['todo_step_1'],
        approvalMode: 'auto'
      }
    ];

    const { planId, plan } = await this.planEngine.createPlan({
      runId,
      conversationId,
      title: `Plan: ${intent}`,
      objective: message,
      todos: fallbackTodos,
      intent,
      complexity,
      canvasType: 'action_plan'
    });

    return {
      planId,
      plan,
      todos: fallbackTodos,
      thinkingBlocks: this._generateThinkingBlocks({
        title: `Plan: ${intent}`,
        objective: message,
        todos: fallbackTodos
      })
    };
  }

  /**
   * Convert an approved plan to executable todo graph and begin execution
   */
  async beginExecution(planId, operatorSteps = []) {
    return this.planEngine.convertPlanToTodoGraph(planId, operatorSteps);
  }

  /**
   * Get next ready todo for execution
   */
  async getNextExecutableTodo(planId) {
    return this.planEngine.getNextReadyTodo(planId);
  }

  /**
   * Transition a todo to a new status
   */
  async transitionTodo(todoId, targetStatus, resultPayload = null, errorMessage = null) {
    return this.planEngine.transitionTodo(todoId, targetStatus, resultPayload, errorMessage);
  }

  /**
   * Get full plan with all todos
   */
  async getFullPlan(planId) {
    const [plan, todos] = await Promise.all([
      this.planEngine.getPlan(planId),
      this.planEngine.getTodos(planId)
    ]);

    if (!plan) return null;

    return {
      ...plan,
      todos
    };
  }
}

export default PlanModeEngine;
