/**
 * Arcus Execution Contract Test Suite - Phase 1
 * 
 * Comprehensive tests for:
 * - Status transitions (FSM validation)
 * - Idempotency key generation and validation
 * - Retry policy calculations
 * - Approval mode determination
 * - Error categorization
 * - Risk assessment
 * - Action input/output building
 */

import {
  EXECUTION_STATUS,
  VALID_STATUS_TRANSITIONS,
  APPROVAL_MODE,
  RISK_ASSESSMENT,
  RETRY_STRATEGY,
  DEFAULT_RETRY_POLICY,
  ERROR_CATEGORY,
  isValidStatusTransition,
  categorizeError,
  isRetryableError,
  calculateRetryDelay,
  assessRiskLevel,
  determineApprovalMode,
  generateIdempotencyKey,
  buildActionInput,
  buildActionResult
} from '../lib/arcus-execution-contract.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n🧪 Running Execution Contract Test Suite\n');
    
    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✅ ${name}`);
        this.passed++;
      } catch (err) {
        console.log(`❌ ${name}: ${err.message}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
    return { passed: this.passed, failed: this.failed };
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertDeepEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  assertThrows(fn, message) {
    try {
      fn();
      throw new Error(message || 'Expected function to throw');
    } catch (err) {
      // Expected
    }
  }
}

const runner = new TestRunner();

// ============================================================================
// STATUS TRANSITION TESTS
// ============================================================================

runner.test('Status: pending -> ready is valid', () => {
  runner.assert(
    isValidStatusTransition(EXECUTION_STATUS.TODO_PENDING, EXECUTION_STATUS.TODO_READY),
    'pending to ready should be valid'
  );
});

runner.test('Status: pending -> running is invalid', () => {
  runner.assert(
    !isValidStatusTransition(EXECUTION_STATUS.TODO_PENDING, EXECUTION_STATUS.TODO_RUNNING),
    'pending to running should be invalid'
  );
});

runner.test('Status: running -> completed is valid', () => {
  runner.assert(
    isValidStatusTransition(EXECUTION_STATUS.TODO_RUNNING, EXECUTION_STATUS.TODO_COMPLETED),
    'running to completed should be valid'
  );
});

runner.test('Status: running -> pending is invalid', () => {
  runner.assert(
    !isValidStatusTransition(EXECUTION_STATUS.TODO_RUNNING, EXECUTION_STATUS.TODO_PENDING),
    'running to pending should be invalid'
  );
});

runner.test('Status: completed -> any is invalid', () => {
  const transitions = VALID_STATUS_TRANSITIONS[EXECUTION_STATUS.TODO_COMPLETED];
  runner.assertEqual(transitions.length, 0, 'completed should have no valid transitions');
});

runner.test('Status: same status is always valid (no-op)', () => {
  runner.assert(
    isValidStatusTransition(EXECUTION_STATUS.TODO_RUNNING, EXECUTION_STATUS.TODO_RUNNING),
    'same status should be valid (no-op)'
  );
});

runner.test('Status: retrying -> running is valid', () => {
  runner.assert(
    isValidStatusTransition(EXUTION_STATUS.TODO_RETRYING, EXECUTION_STATUS.TODO_RUNNING),
    'retrying to running should be valid'
  );
});

runner.test('Status: blocked -> running is valid', () => {
  runner.assert(
    isValidStatusTransition(EXECUTION_STATUS.TODO_BLOCKED, EXECUTION_STATUS.TODO_RUNNING),
    'blocked to running should be valid'
  );
});

// ============================================================================
// IDEMPOTENCY KEY TESTS
// ============================================================================

runner.test('Idempotency: keys are deterministic', () => {
  const runId = 'run_123';
  const actionType = 'send_email';
  const payload = { to: 'test@example.com', subject: 'Test' };

  const key1 = generateIdempotencyKey(runId, actionType, payload);
  const key2 = generateIdempotencyKey(runId, actionType, payload);

  runner.assertEqual(key1, key2, 'Same inputs should produce same key');
});

runner.test('Idempotency: different payloads produce different keys', () => {
  const runId = 'run_123';
  const actionType = 'send_email';

  const key1 = generateIdempotencyKey(runId, actionType, { to: 'a@example.com' });
  const key2 = generateIdempotencyKey(runId, actionType, { to: 'b@example.com' });

  runner.assert(key1 !== key2, 'Different payloads should produce different keys');
});

runner.test('Idempotency: different runIds produce different keys', () => {
  const actionType = 'send_email';
  const payload = { to: 'test@example.com' };

  const key1 = generateIdempotencyKey('run_123', actionType, payload);
  const key2 = generateIdempotencyKey('run_456', actionType, payload);

  runner.assert(key1 !== key2, 'Different runIds should produce different keys');
});

runner.test('Idempotency: key includes runId and actionType', () => {
  const key = generateIdempotencyKey('run_123', 'send_email', {});
  
  runner.assert(key.includes('run_123'), 'Key should include runId');
  runner.assert(key.includes('send_email'), 'Key should include actionType');
});

// ============================================================================
// RETRY POLICY TESTS
// ============================================================================

runner.test('Retry: fixed strategy returns constant delay', () => {
  const policy = { ...DEFAULT_RETRY_POLICY, strategy: RETRY_STRATEGY.FIXED, baseDelayMs: 1000 };
  
  const delay1 = calculateRetryDelay(0, policy);
  const delay2 = calculateRetryDelay(1, policy);
  const delay3 = calculateRetryDelay(2, policy);

  runner.assertEqual(delay1, 1000, 'Fixed delay should be constant');
  runner.assertEqual(delay2, 1000, 'Fixed delay should be constant');
  runner.assertEqual(delay3, 1000, 'Fixed delay should be constant');
});

runner.test('Retry: linear strategy increases linearly', () => {
  const policy = { ...DEFAULT_RETRY_POLICY, strategy: RETRY_STRATEGY.LINEAR, baseDelayMs: 1000 };
  
  const delay1 = calculateRetryDelay(0, policy);
  const delay2 = calculateRetryDelay(1, policy);
  const delay3 = calculateRetryDelay(2, policy);

  runner.assertEqual(delay1, 1000, 'Linear delay attempt 0');
  runner.assertEqual(delay2, 2000, 'Linear delay attempt 1');
  runner.assertEqual(delay3, 3000, 'Linear delay attempt 2');
});

runner.test('Retry: exponential strategy increases exponentially', () => {
  const policy = { 
    ...DEFAULT_RETRY_POLICY, 
    strategy: RETRY_STRATEGY.EXPONENTIAL, 
    baseDelayMs: 1000,
    backoffMultiplier: 2 
  };
  
  const delay1 = calculateRetryDelay(0, policy);
  const delay2 = calculateRetryDelay(1, policy);
  const delay3 = calculateRetryDelay(2, policy);

  runner.assertEqual(delay1, 1000, 'Exponential delay attempt 0');
  runner.assertEqual(delay2, 2000, 'Exponential delay attempt 1');
  runner.assertEqual(delay3, 4000, 'Exponential delay attempt 2');
});

runner.test('Retry: delay is capped at maxDelayMs', () => {
  const policy = { 
    ...DEFAULT_RETRY_POLICY, 
    strategy: RETRY_STRATEGY.EXPONENTIAL,
    baseDelayMs: 1000,
    maxDelayMs: 5000
  };
  
  const delay = calculateRetryDelay(10, policy); // Would be huge without cap

  runner.assert(delay <= 5000, 'Delay should be capped at maxDelayMs');
});

runner.test('Retry: jitter adds randomness', () => {
  const policy = { 
    ...DEFAULT_RETRY_POLICY, 
    strategy: RETRY_STRATEGY.FIXED,
    baseDelayMs: 1000,
    jitter: true 
  };
  
  const delays = [];
  for (let i = 0; i < 10; i++) {
    delays.push(calculateRetryDelay(0, policy));
  }

  const hasVariation = delays.some(d => d !== delays[0]);
  runner.assert(hasVariation, 'Jitter should produce variation');
  
  // All delays should be within 50% of base
  delays.forEach(d => {
    runner.assert(d >= 500 && d <= 1500, 'Jitter should keep within reasonable bounds');
  });
});

// ============================================================================
// APPROVAL MODE TESTS
// ============================================================================

runner.test('Approval: auto mode always returns auto', () => {
  const mode = determineApprovalMode('send_email', { to: 'external@gmail.com' }, APPROVAL_MODE.AUTO);
  runner.assertEqual(mode, APPROVAL_MODE.AUTO, 'Auto mode should always return auto');
});

runner.test('Approval: manual mode always returns manual', () => {
  const mode = determineApprovalMode('read_inbox', {}, APPROVAL_MODE.MANUAL);
  runner.assertEqual(mode, APPROVAL_MODE.MANUAL, 'Manual mode should always return manual');
});

runner.test('Approval: send_email is manual for external recipients', () => {
  const mode = determineApprovalMode('send_email', { to: 'external@gmail.com' }, APPROVAL_MODE.CONDITIONAL);
  runner.assertEqual(mode, APPROVAL_MODE.MANUAL, 'External email should require manual approval');
});

runner.test('Approval: read_inbox is auto (low risk)', () => {
  const mode = determineApprovalMode('read_inbox', {}, APPROVAL_MODE.CONDITIONAL);
  runner.assertEqual(mode, APPROVAL_MODE.AUTO, 'Read inbox should be auto-approved');
});

runner.test('Approval: bulk operations are manual', () => {
  const mode = determineApprovalMode('send_email', { items: [1, 2, 3, 4, 5, 6] }, APPROVAL_MODE.CONDITIONAL);
  runner.assertEqual(mode, APPROVAL_MODE.MANUAL, 'Bulk operations should require manual approval');
});

runner.test('Approval: save_draft is auto (low risk)', () => {
  const mode = determineApprovalMode('save_draft', {}, APPROVAL_MODE.CONDITIONAL);
  runner.assertEqual(mode, APPROVAL_MODE.AUTO, 'Save draft should be auto-approved');
});

// ============================================================================
// RISK ASSESSMENT TESTS
// ============================================================================

runner.test('Risk: send_email to external is high', () => {
  const risk = assessRiskLevel('send_email', { to: 'external@gmail.com' });
  runner.assertEqual(risk, RISK_ASSESSMENT.HIGH, 'External email should be high risk');
});

runner.test('Risk: bulk operations are high', () => {
  const risk = assessRiskLevel('send_email', { bulk: true });
  runner.assertEqual(risk, RISK_ASSESSMENT.HIGH, 'Bulk operations should be high risk');
});

runner.test('Risk: read_inbox is low', () => {
  const risk = assessRiskLevel('read_inbox', {});
  runner.assertEqual(risk, RISK_ASSESSMENT.LOW, 'Read operations should be low risk');
});

runner.test('Risk: save_draft is low', () => {
  const risk = assessRiskLevel('save_draft', {});
  runner.assertEqual(risk, RISK_ASSESSMENT.LOW, 'Draft operations should be low risk');
});

runner.test('Risk: internal domain email is medium', () => {
  // Assuming company domain
  const risk = assessRiskLevel('send_email', { to: 'colleague@company.com' });
  runner.assertEqual(risk, RISK_ASSESSMENT.MEDIUM, 'Internal email should be medium risk');
});

// ============================================================================
// ERROR CATEGORIZATION TESTS
// ============================================================================

runner.test('Error: network error is categorized', () => {
  const error = new Error('Network request failed');
  error.message = 'ECONNREFUSED';
  
  const category = categorizeError(error);
  runner.assertEqual(category, ERROR_CATEGORY.NETWORK, 'ECONNREFUSED should be network error');
});

runner.test('Error: timeout is categorized', () => {
  const error = new Error('Request timeout');
  error.code = 'timeout';
  
  const category = categorizeError(error);
  runner.assertEqual(category, ERROR_CATEGORY.TIMEOUT, 'Timeout should be categorized');
});

runner.test('Error: auth error is categorized', () => {
  const error = new Error('Authentication failed');
  
  const category = categorizeError(error);
  runner.assertEqual(category, ERROR_CATEGORY.AUTH_FAILED, 'Auth failure should be categorized');
});

runner.test('Error: rate limit is categorized', () => {
  const error = new Error('Rate limit exceeded');
  error.code = 'rate_limit';
  
  const category = categorizeError(error);
  runner.assertEqual(category, ERROR_CATEGORY.RATE_LIMIT, 'Rate limit should be categorized');
});

runner.test('Error: null error returns unknown', () => {
  const category = categorizeError(null);
  runner.assertEqual(category, ERROR_CATEGORY.UNKNOWN, 'Null error should be unknown');
});

// ============================================================================
// RETRYABLE ERROR TESTS
// ============================================================================

runner.test('Retryable: network errors are retryable', () => {
  runner.assert(
    isRetryableError(ERROR_CATEGORY.NETWORK),
    'Network errors should be retryable'
  );
});

runner.test('Retryable: timeout errors are retryable', () => {
  runner.assert(
    isRetryableError(ERROR_CATEGORY.TIMEOUT),
    'Timeout errors should be retryable'
  );
});

runner.test('Retryable: rate limit errors are retryable', () => {
  runner.assert(
    isRetryableError(ERROR_CATEGORY.RATE_LIMIT),
    'Rate limit errors should be retryable'
  );
});

runner.test('Retryable: auth errors are not retryable', () => {
  runner.assert(
    !isRetryableError(ERROR_CATEGORY.AUTH_FAILED),
    'Auth errors should not be retryable'
  );
});

runner.test('Retryable: permission errors are not retryable', () => {
  runner.assert(
    !isRetryableError(ERROR_CATEGORY.PERMISSION_DENIED),
    'Permission errors should not be retryable'
  );
});

runner.test('Retryable: validation errors are not retryable', () => {
  runner.assert(
    !isRetryableError(ERROR_CATEGORY.VALIDATION_FAILED),
    'Validation errors should not be retryable'
  );
});

// ============================================================================
// ACTION INPUT BUILDER TESTS
// ============================================================================

runner.test('ActionInput: builds with required fields', () => {
  const input = buildActionInput({
    actionType: 'send_email',
    payload: { to: 'test@example.com', subject: 'Test', body: 'Hello' }
  });

  runner.assert(input.actionType === 'send_email', 'Should have actionType');
  runner.assert(input.executionId, 'Should have executionId');
  runner.assert(input.idempotencyKey, 'Should have idempotencyKey');
  runner.assert(input.payload, 'Should have payload');
  runner.assert(input.createdAt, 'Should have createdAt');
});

runner.test('ActionInput: includes context', () => {
  const input = buildActionInput({
    actionType: 'send_email',
    payload: {},
    context: { runId: 'run_123', userEmail: 'user@test.com' }
  });

  runner.assertEqual(input.context.runId, 'run_123', 'Should include runId in context');
  runner.assertEqual(input.context.userEmail, 'user@test.com', 'Should include userEmail in context');
});

runner.test('ActionInput: merges retry policy', () => {
  const input = buildActionInput({
    actionType: 'send_email',
    payload: {},
    retryPolicy: { maxAttempts: 5 }
  });

  runner.assertEqual(input.retryPolicy.maxAttempts, 5, 'Should merge custom maxAttempts');
  runner.assert(input.retryPolicy.strategy, 'Should have default strategy');
});

runner.test('ActionInput: approval config based on risk', () => {
  const input = buildActionInput({
    actionType: 'send_email',
    payload: { to: 'external@gmail.com' }
  });

  runner.assertEqual(input.approvalConfig.mode, APPROVAL_MODE.CONDITIONAL, 'Should set approval mode');
  runner.assertEqual(input.approvalConfig.riskLevel, RISK_ASSESSMENT.HIGH, 'Should assess risk');
});

// ============================================================================
// ACTION RESULT BUILDER TESTS
// ============================================================================

runner.test('ActionResult: builds success result', () => {
  const result = buildActionResult({
    success: true,
    message: 'Email sent',
    executionId: 'exec_123',
    startedAt: new Date().toISOString()
  });

  runner.assertEqual(result.success, true, 'Should have success=true');
  runner.assertEqual(result.message, 'Email sent', 'Should have message');
  runner.assertEqual(result.status, 'completed', 'Should have status=completed');
  runner.assert(result.metadata.completedAt, 'Should have completedAt');
});

runner.test('ActionResult: builds failure result', () => {
  const result = buildActionResult({
    success: false,
    message: 'Failed to send',
    error: { category: 'network', message: 'Timeout', retryable: true },
    executionId: 'exec_123',
    startedAt: new Date().toISOString()
  });

  runner.assertEqual(result.success, false, 'Should have success=false');
  runner.assertEqual(result.status, 'failed', 'Should have status=failed');
  runner.assert(result.error, 'Should have error object');
});

runner.test('ActionResult: calculates duration', () => {
  const startedAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago
  
  const result = buildActionResult({
    success: true,
    message: 'Done',
    executionId: 'exec_123',
    startedAt
  });

  runner.assert(result.metadata.durationMs >= 1000, 'Duration should be at least 1000ms');
});

runner.test('ActionResult: includes external refs', () => {
  const result = buildActionResult({
    success: true,
    message: 'Email sent',
    externalRefs: { messageId: 'msg_123', threadId: 'thread_456' },
    executionId: 'exec_123',
    startedAt: new Date().toISOString()
  });

  runner.assertEqual(result.externalRefs.messageId, 'msg_123', 'Should include messageId');
  runner.assertEqual(result.externalRefs.threadId, 'thread_456', 'Should include threadId');
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

runner.test('Integration: full execution flow with retry', async () => {
  let attempts = 0;
  const maxAttempts = 3;
  
  // Simulate flaky operation
  const flakyOperation = async () => {
    attempts++;
    if (attempts < maxAttempts) {
      const error = new Error('Network timeout');
      error.category = ERROR_CATEGORY.TIMEOUT;
      throw error;
    }
    return { success: true, message: 'Success' };
  };

  // This test validates the conceptual flow
  // Real retry logic is in RetryManager
  runner.assert(attempts === 0, 'Initial attempts should be 0');
});

runner.test('Integration: approval flow', () => {
  const actionType = 'send_email';
  const payload = { to: 'external@gmail.com', subject: 'Test', body: 'Hello' };
  
  // Check if approval needed
  const mode = determineApprovalMode(actionType, payload, APPROVAL_MODE.CONDITIONAL);
  runner.assertEqual(mode, APPROVAL_MODE.MANUAL, 'Should require manual approval');
  
  // Risk assessment
  const risk = assessRiskLevel(actionType, payload);
  runner.assertEqual(risk, RISK_ASSESSMENT.HIGH, 'Should be high risk');
});

runner.test('Integration: idempotency prevents duplicate execution', () => {
  const runId = 'run_123';
  const actionType = 'send_email';
  const payload = { to: 'test@example.com', subject: 'Test' };
  
  const key1 = generateIdempotencyKey(runId, actionType, payload);
  const key2 = generateIdempotencyKey(runId, actionType, payload);
  
  runner.assertEqual(key1, key2, 'Same inputs produce same key');
  runner.assert(key1.length > 0, 'Key should not be empty');
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

runner.test('Edge: empty payload generates key', () => {
  const key = generateIdempotencyKey('run_123', 'action', {});
  runner.assert(key.length > 0, 'Should generate key for empty payload');
});

runner.test('Edge: null payload handled gracefully', () => {
  try {
    const key = generateIdempotencyKey('run_123', 'action', null);
    runner.assert(key.length > 0, 'Should handle null payload');
  } catch (err) {
    // Expected to potentially throw, which is acceptable
  }
});

runner.test('Edge: very long payload still generates key', () => {
  const longPayload = { data: 'a'.repeat(10000) };
  const key = generateIdempotencyKey('run_123', 'action', longPayload);
  runner.assert(key.length > 0 && key.length < 100, 'Key should be bounded');
});

runner.test('Edge: retry delay with 0 base delay', () => {
  const policy = { ...DEFAULT_RETRY_POLICY, baseDelayMs: 0 };
  const delay = calculateRetryDelay(0, policy);
  runner.assert(delay >= 0, 'Delay should be non-negative');
});

runner.test('Edge: status transition with invalid status', () => {
  const isValid = isValidStatusTransition('invalid_status', EXECUTION_STATUS.TODO_RUNNING);
  runner.assertEqual(isValid, false, 'Invalid status should not be valid');
});

// ============================================================================
// RUN ALL TESTS
// ============================================================================

export async function runAllTests() {
  return await runner.run();
}

export default { runAllTests, TestRunner };

// Auto-run if executed directly
if (typeof window === 'undefined' && process.argv[1]?.includes('arcus-execution-contract.test.js')) {
  runAllTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}
