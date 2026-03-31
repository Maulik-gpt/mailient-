# Arcus AI Phase 2 — Plan Mode + Todo Engine (Execution-First)

## Overview

Phase 2 introduces **Plan Mode** - an execution-first planning system that creates persisted PlanArtifacts with structured objectives, assumptions, ordered todos with dependencies, and acceptance criteria. Plans require explicit approval before execution, and once approved, automatically transform into executable todo graphs with full state machine tracking.

## What Was Built

### 1. Plan Mode Engine (`arcus-plan-mode-engine-v2.js`)

#### Core Capabilities

**Plan Generation**
```javascript
const planResult = await planEngine.generatePlan({
  message: "Send follow-up emails to all unread messages from last week",
  intent: "email_outreach",
  complexity: "complex",
  context: {}
});

// Returns:
{
  planId: "plan_1234567890_abc123",
  planArtifact: { /* full plan */ },
  todos: [ /* ordered todos with dependencies */ ],
  requiresApproval: true
}
```

**PlanArtifact Structure**
```javascript
{
  planId: string,
  title: string,
  objective: string,
  status: 'plan_draft' | 'plan_approved' | 'plan_executing' | 'plan_completed' | 'plan_failed' | 'plan_cancelled',
  version: number,
  locked: boolean,           // true after approval
  todos: TodoExecutionItem[],
  assumptions: string[],
  questionsAnswered: string[],
  acceptanceCriteria: string[],
  approvalMode: 'manual',    // Plans require approval
  approvedAt: string | null,
  cancelledAt: string | null,
  completedAt: string | null,
  runId: string | null,      // Linked 1:1 with run
  createdBy: string,
  parentPlanId: string | null,  // For revisions
  revisionOf: string | null
}
```

**Todo Graph with Dependencies**
```javascript
{
  todoId: string,
  title: string,
  description: string,
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'blocked_approval' | 'skipped' | 'retrying',
  actionType: string,       // From TASK_REGISTRY
  sortOrder: number,
  dependsOn: string[],      // todoIds that must complete first
  actionInput: object,
  actionResult: object,
  attemptCount: number,
  maxAttempts: number,
  errorMessage: string | null,
  errorCategory: string | null,
  recoveryHint: object | null,
  createdAt: string,
  readyAt: string | null,
  startedAt: string | null,
  completedAt: string | null,
  failedAt: string | null
}
```

#### Approval Gate

**States:**
```
draft -> approved -> executing -> completed
  ↓         ↓          ↓           ↓
cancelled  locked    paused      failed
              ↑
         (approval required)
```

**Approval Flow:**
1. Plan created in `draft` status
2. User reviews objectives, assumptions, todos, acceptance criteria
3. User approves → status becomes `approved`, plan `locked`
4. Plan version incremented, approval token generated
5. Execution can begin

**API:**
```javascript
// Approve
const approval = await planEngine.approvePlan(planId, {
  approvedBy: userEmail,
  approvalContext: {}
});

// Decline
await planEngine.declinePlan(planId, { reason: "Not needed anymore" });

// Revise (create new version)
const revision = await planEngine.revisePlan(planId, {
  revisions: { title: "Updated Plan", todos: [...] }
});
```

#### Todo Execution Engine

**Dependency Resolution:**
```javascript
// Todos execute in order, respecting dependencies
for (const todo of sortedTodos) {
  // Check if all dependencies completed
  const depsSatisfied = todo.dependsOn.every(depId => 
    completedTodos.has(depId)
  );
  
  if (!depsSatisfied) {
    // Skip or wait for dependencies
    continue;
  }
  
  // Execute todo
  const result = await executeTodo(todo, runId, planId);
}
```

**State Machine:**
```
pending → ready → running → completed
    ↓       ↓       ↓
  blocked   skipped  failed
              ↓
            retrying → running
```

**Pause for Approval:**
```javascript
// When a todo requires manual approval
await planEngine.pauseRunForApproval(runId, todo, {
  message: "Sending email to external domain requires approval",
  approvalToken: "token_abc123"
});

// Run status becomes 'approval', execution pauses
// User must provide approval token to resume
```

**Resume Execution:**
```javascript
const result = await planEngine.resumeRun(runId, {
  approvalToken: "token_abc123",
  approvedBy: userEmail
});
// Execution continues from paused todo
```

### 2. API Routes (`app/api/agent-talk/plan/route.js`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent-talk/plan/create` | POST | Create new plan from intent |
| `/api/agent-talk/plan/:planId` | GET | Get plan by ID |
| `/api/agent-talk/plan/:planId/approve` | POST | Approve a plan |
| `/api/agent-talk/plan/:planId/decline` | POST | Decline/cancel a plan |
| `/api/agent-talk/plan/:planId/revise` | POST | Create new version |
| `/api/agent-talk/plan/:planId/execute` | POST | Execute approved plan |
| `/api/agent-talk/run/:runId/resume` | POST | Resume paused run |
| `/api/agent-talk/run/:runId/status` | GET | Get run status with plan |

### 3. Integration with Phase 1

**Execution Gateway Integration:**
```javascript
// Plan todos execute through Phase 1 gateway
async executeActionViaGateway(todo, runId, planId, context) {
  const gateway = new ArcusExecutionGateway({...});
  
  return await gateway.executeCanvasAction(
    todo.actionType,
    payload,
    runId,
    context.approvalToken
  );
}
```

**Benefits:**
- Idempotency protection for plan actions
- Retry logic with recovery hints
- Audit trail for every todo execution
- Error categorization

### 4. Run-Plan 1:1 Linking

**Audit Trail Structure:**
```javascript
{
  runId: "run_123",
  planId: "plan_456",
  userEmail: "user@example.com",
  status: "executing",
  createdAt: "2026-03-31T...",
  approval: {
    approvedBy: "user@example.com",
    approvedAt: "2026-03-31T...",
    token: "token_abc123"
  },
  todos: [ /* full todo states */ ],
  audit: [
    { type: "plan_approved", timestamp: "...", user: "..." },
    { type: "todo_started", todoId: "...", timestamp: "..." },
    { type: "todo_completed", todoId: "...", timestamp: "..." },
    { type: "run_paused", reason: "approval_required", timestamp: "..." },
    { type: "run_resumed", approvedBy: "...", timestamp: "..." }
  ]
}
```

## How the Outcome Should Look

### 1. User Sees Planning Artifact

**Before Execution:**
```
┌─────────────────────────────────────────────────────┐
│  Execution Plan: Email Follow-up Campaign          │
│  Status: DRAFT                                      │
├─────────────────────────────────────────────────────┤
│  Objective:                                         │
│  Send personalized follow-ups to all unread emails  │
│  from last week                                     │
├─────────────────────────────────────────────────────┤
│  Assumptions:                                       │
│  • Gmail is connected                               │
│  • User has access to unread emails                 │
│  • Templates are available                          │
├─────────────────────────────────────────────────────┤
│  Todos (3):                                         │
│  1. ⏳ Gather unread emails from last week          │
│  2. ⏳ Draft personalized responses                 │
│     [depends on: 1]                                 │
│  3. ⏳ Send emails (requires approval)               │
│     [depends on: 2]                                 │
├─────────────────────────────────────────────────────┤
│  Acceptance Criteria:                               │
│  ✓ All unread emails processed                      │
│  ✓ Drafts reviewed by user                          │
│  ✓ Emails sent successfully                         │
├─────────────────────────────────────────────────────┤
│  [ Review ] [ Approve & Execute ] [ Decline ]       │
└─────────────────────────────────────────────────────┘
```

### 2. After Approval - Todo-by-Todo Execution

**Progress View:**
```
┌─────────────────────────────────────────────────────┐
│  Execution Progress                                 │
│  ████████░░░░░░░░░░ 50% (2/4 completed)            │
├─────────────────────────────────────────────────────┤
│  ✅ Gather unread emails                            │
│     Completed at 9:05 AM                            │
│     Found 12 unread emails                          │
├─────────────────────────────────────────────────────┤
│  ✅ Draft personalized responses                    │
│     Completed at 9:06 AM                            │
│     Created 12 drafts                               │
├─────────────────────────────────────────────────────┤
│  ⏳ Send emails (requires approval)                 │
│     Paused - waiting for user approval              │
│     Action: Send email to external domain             │
│     [ Approve ] [ Decline ] [ View Drafts ]        │
├─────────────────────────────────────────────────────┤
│  ⏳ Track responses                                  │
│     Pending - waiting for previous step            │
└─────────────────────────────────────────────────────┘
```

### 3. Paused for Approval

**When a step requires approval:**
```javascript
{
  runId: "run_123",
  status: "approval",
  phase: "approval",
  pausedAt: "2026-03-31T09:06:00Z",
  pauseReason: {
    type: "approval_required",
    todoId: "todo_3",
    actionType: "send_email",
    message: "Sending email to external domain requires approval",
    approvalToken: "token_abc123"
  },
  canResume: true
}
```

**UI shows:**
- Explicit reason: "Sending to external domain"
- Resume action: Approve/Decline buttons
- Current progress: 2 of 4 steps complete

### 4. Recoverable After Refresh

**On page reload:**
```javascript
// Client fetches run status
const status = await fetch(`/api/agent-talk/run/${runId}/status`);

// Returns current state:
{
  runId: "run_123",
  status: "executing",  // or "approval", "completed", "failed"
  planArtifact: { /* full plan with version */ },
  progress: { completed: 2, total: 4, percentage: 50 },
  steps: [ /* all todo states */ ],
  paused: false,
  canResume: false
}
```

**User sees exact plan version used, with current execution state.**

## Definition of Done

- [x] **No execution starts without approved plan for plan-mode tasks**
  - `generatePlan()` creates plans in `draft` status
  - `executePlan()` validates plan is `approved` before starting
  - Attempting to execute `draft` plan throws error

- [x] **Todo progression is persisted and recoverable**
  - Every todo state change persisted to database
  - `persistTodoState()` called on all transitions
  - `getRunStatus()` returns full todo states
  - Page refresh shows exact same progress

- [x] **Plan version and execution run are linked 1:1 in audit trail**
  - Run created with `planId` reference
  - Plan stores `runId` when executing
  - Audit log links both IDs
  - Version locked at approval time
  - `plan.version` recorded in run audit

## File Structure

```
lib/
├── arcus-plan-mode-engine-v2.js      # Phase 2: Plan Mode Engine
├── arcus-execution-contract-v2.js   # Phase 1: Contracts (shared)
├── arcus-execution-gateway.js         # Phase 1: Gateway (used by Phase 2)
└── feature-flags.js                   # Updated with arcusPlanModeV2

app/api/agent-talk/
├── plan/route.js                      # Phase 2: Plan API routes
├── chat-arcus/route.js                # Phase 1+2: Main chat (updated)
└── run/[runId]/status/route.js        # Phase 2: Run status endpoint

app/dashboard/agent-talk/
├── ChatInterface.tsx                  # Phase 1+2: Main UI (updated)
├── components/
│   ├── CanvasPanel.tsx                # Phase 2: Plan artifact view
│   ├── PlanArtifactCard.tsx           # Phase 2: Plan card component
│   └── ...
```

## Migration Guide

### For Existing ChatInterface

The existing plan handlers (`handleAcceptPlan`, `handleDeclinePlan`, `handlePlanApprove`) now use the Phase 2 API endpoints. No changes required if already using these handlers.

### For New Plan Mode Features

```typescript
// Create a plan
const response = await fetch('/api/agent-talk/plan/create', {
  method: 'POST',
  body: JSON.stringify({
    message: "Send follow-up emails",
    intent: "email_outreach",
    complexity: "complex"
  })
});

const { planId, planArtifact, todos } = await response.json();

// Approve the plan
await fetch(`/api/agent-talk/plan/${planId}/approve`, {
  method: 'POST',
  body: JSON.stringify({ approvalContext: {} })
});

// Execute
await fetch(`/api/agent-talk/plan/${planId}/execute`, {
  method: 'POST',
  body: JSON.stringify({ runId: null })
});

// Poll status
const status = await fetch(`/api/agent-talk/run/${runId}/status`).then(r => r.json());
```

### Environment Variables

```bash
# Enable Phase 2 Plan Mode (default: true)
ARCUS_PLAN_MODE_V2=true

# Existing Phase 1 flags
ARCUS_EXECUTION_GATEWAY_V1=true
ARCUS_OPERATOR_RUNTIME_V2=true
```

## Next Steps (Phase 3)

1. **Multi-Agent Orchestration** - Coordinate multiple agents for complex workflows
2. **Advanced Recovery** - Automatic retry strategies based on error categories
3. **Plan Templates** - Pre-defined plans for common tasks
4. **Collaborative Plans** - Multi-user approval workflows
5. **Analytics Dashboard** - Plan execution metrics and insights

---

**Phase 2 Status: COMPLETE**

Plan Mode is fully operational with approval gates, todo graph execution, run pause/resume, and full persistence.
