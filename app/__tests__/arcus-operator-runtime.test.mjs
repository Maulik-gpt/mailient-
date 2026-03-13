import { test, describe, it } from 'node:test';
import assert from "node:assert/strict";
import { ArcusOperatorRuntime } from "../../lib/arcus-operator-runtime.js";

class MockDb {
  constructor(run) {
    this.run = run;
    this.step = {
      step_id: "step1",
      step_order: 1,
      kind: "think",
      status: "pending",
      label: "Understanding request",
      detail: ""
    };
    this.updatedRun = null;
    this.updatedStep = null;
    this.events = [];
  }

  async getOperatorRunById(_userId, runId) {
    if (!this.run || this.run.run_id !== runId) return null;
    return this.run;
  }

  async getOperatorRunStepById(_userId, runId, stepId) {
    return this.run?.run_id === runId && this.step.step_id === stepId ? this.step : null;
  }

  async updateOperatorRun(_userId, _runId, patch) {
    this.updatedRun = patch;
    return patch;
  }

  async updateOperatorRunStepStatus(_userId, _runId, _stepId, status, detail = null, evidence = null) {
    this.updatedStep = { status, detail, evidence };
    this.step.status = status;
    this.step.detail = detail || "";
    this.step.evidence = evidence || null;
    return this.step;
  }

  async appendOperatorRunEvent(_userId, _runId, event) {
    this.events.push(event);
    return event;
  }
}

const baseRun = (memoryOverrides = {}) => ({
  run_id: "run-test-1",
  status: "running",
  phase: "thinking",
  memory: {
    executionPolicy: {
      actions: [],
      approvalTokens: {},
      requiresApproval: false
    },
    approvalTokens: {},
    consumedApprovalTokens: {},
    ...memoryOverrides
  }
});

describe("ArcusOperatorRuntime approval token validation", () => {
  it("returns missing when action requires approval but token absent", async () => {
    const run = baseRun({
      executionPolicy: {
        actions: [{ actionType: "send_email", requiresApproval: true }],
        approvalTokens: {},
        requiresApproval: true
      }
    });
    const db = new MockDb(run);
    const runtime = new ArcusOperatorRuntime({ db, arcusAI: null, userEmail: "user@test.com" });

    const res = await runtime.validateApprovalToken("run-test-1", "send_email", null);
    assert.equal(res.ok, false);
    assert.equal(res.reason, "approval_token_missing");
  });

  it("skips validation when action does not require approval", async () => {
    const run = baseRun({
      executionPolicy: {
        actions: [{ actionType: "apply_changes", requiresApproval: false }],
        approvalTokens: {},
        requiresApproval: false
      }
    });
    const db = new MockDb(run);
    const runtime = new ArcusOperatorRuntime({ db, arcusAI: null, userEmail: "user@test.com" });

    const res = await runtime.validateApprovalToken("run-test-1", "apply_changes", null);
    assert.equal(res.ok, true);
    assert.equal(res.reason, "approval_not_required");
  });
});

describe("ArcusOperatorRuntime step transitions", () => {
  it("advances step from pending to active and records event", async () => {
    const run = baseRun();
    const db = new MockDb(run);
    const runtime = new ArcusOperatorRuntime({ db, arcusAI: null, userEmail: "user@test.com" });

    await runtime.transitionStep({
      runId: "run-test-1",
      stepId: "step1",
      status: "active"
    });

    assert.deepEqual(db.updatedStep, { status: "active", detail: null, evidence: null });
    assert.equal(db.updatedRun.phase, "executing");
    assert.ok(db.events.some((e) => e.type === "step_transition" && e.payload.status === "active"));
  });
});

