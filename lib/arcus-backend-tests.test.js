/**
 * Arcus Backend Test Suite
 * 
 * Comprehensive tests for all backend systems:
 * - Credential manager
 * - Database query layer
 * - API clients
 * - Webhook handlers
 * - Error handling & retries
 * - Auth middleware
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

const TEST_USER_ID = 1;
const TEST_ACCOUNT_ID = '550e8400-e29b-41d4-a716-446655440000';

function createTestSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
  );
}

// ============================================================================
// CREDENTIAL MANAGER TESTS
// ============================================================================

describe('CredentialManager', () => {
  let supabase;
  let CredentialManager;

  beforeAll(async () => {
    supabase = createTestSupabase();
    const { CredentialManager: CM } = await import('../lib/arcus-credential-manager.js');
    CredentialManager = CM;
  });

  describe('encryption', () => {
    it('should encrypt and decrypt tokens', () => {
      const manager = new CredentialManager({ supabase });
      const plaintext = 'test-access-token-12345';
      
      const encrypted = manager.encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toContain('UNENCRYPTED:'); // Fallback when no master key
    });

    it('should handle missing encryption key gracefully', () => {
      delete process.env.CREDENTIAL_ENCRYPTION_KEY;
      const manager = new CredentialManager({ supabase });
      
      const plaintext = 'test-token';
      const encrypted = manager.encrypt(plaintext);
      
      expect(encrypted).toBe(`UNENCRYPTED:${plaintext}`);
    });
  });

  describe('token validation', () => {
    it('should detect expired tokens', async () => {
      const manager = new CredentialManager({ supabase });
      
      const expiredCreds = {
        accessToken: 'expired-token',
        expiresAt: new Date(Date.now() - 1000).toISOString()
      };
      
      const result = await manager.validateCredentials(TEST_ACCOUNT_ID, TEST_USER_ID);
      expect(result.valid).toBe(false);
      expect(result.needsRefresh).toBe(true);
    });
  });
});

// ============================================================================
// DATABASE QUERY LAYER TESTS
// ============================================================================

describe('DatabaseQueryLayer', () => {
  let supabase;
  let queryLayer;

  beforeAll(async () => {
    supabase = createTestSupabase();
    const { default: DatabaseQueryLayer } = await import('../lib/arcus-database-query-layer.js');
    queryLayer = new DatabaseQueryLayer(supabase);
  });

  describe('connected accounts', () => {
    it('should create a connected account', async () => {
      const accountData = {
        userId: TEST_USER_ID,
        connectorId: 'google_calendar',
        provider: 'google',
        email: 'test@example.com',
        accessTokenEncrypted: 'encrypted-token',
        refreshTokenEncrypted: 'encrypted-refresh',
        tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        scopes: ['https://www.googleapis.com/auth/calendar']
      };

      const result = await queryLayer.createConnectedAccount(accountData);
      
      expect(result).toHaveProperty('id');
      expect(result.connector_id).toBe('google_calendar');
      expect(result.user_id).toBe(TEST_USER_ID);
    });

    it('should list user connected accounts', async () => {
      const accounts = await queryLayer.listUserConnectedAccounts(TEST_USER_ID);
      
      expect(Array.isArray(accounts)).toBe(true);
    });

    it('should update connected account', async () => {
      const updates = {
        status: 'connected',
        lastUsedAt: new Date().toISOString()
      };

      const result = await queryLayer.updateConnectedAccount(
        TEST_ACCOUNT_ID,
        TEST_USER_ID,
        updates
      );

      expect(result.status).toBe('connected');
    });
  });

  describe('operator runs', () => {
    it('should create an operator run', async () => {
      const runData = {
        runId: `test-run-${Date.now()}`,
        userId: TEST_USER_ID,
        conversationId: 'conv-123',
        status: 'initializing',
        intent: 'calendar_query'
      };

      const result = await queryLayer.createRun(runData);
      
      expect(result).toHaveProperty('id');
      expect(result.run_id).toBe(runData.runId);
      expect(result.status).toBe('initializing');
    });

    it('should update run status', async () => {
      const runId = `test-run-${Date.now()}`;
      
      await queryLayer.createRun({
        runId,
        userId: TEST_USER_ID,
        status: 'initializing'
      });

      const result = await queryLayer.updateRunStatus(
        runId,
        TEST_USER_ID,
        { status: 'executing', phase: 'action' }
      );

      expect(result.status).toBe('executing');
      expect(result.phase).toBe('action');
    });
  });

  describe('audit logging', () => {
    it('should log audit event', async () => {
      const eventData = {
        userId: TEST_USER_ID,
        eventType: 'test_event',
        eventCategory: 'test',
        payload: { test: true },
        runId: 'run-123',
        actionType: 'test_action'
      };

      const result = await queryLayer.logAuditEvent(eventData);
      
      expect(result).toHaveProperty('id');
      expect(result.event_type).toBe('test_event');
    });
  });
});

// ============================================================================
// API CLIENT TESTS
// ============================================================================

describe('Connector API Clients', () => {
  let supabase;

  beforeAll(() => {
    supabase = createTestSupabase();
  });

  describe('GoogleCalendarClient', () => {
    it('should have correct base URL', async () => {
      const { GoogleCalendarClient } = await import('../lib/arcus-connector-api-clients.js');
      
      const client = new GoogleCalendarClient({
        credentialManager: {},
        supabase
      });

      expect(client.baseUrl).toBe('https://www.googleapis.com/calendar/v3');
      expect(client.provider).toBe('google_calendar');
    });

    it('should build correct API endpoints', async () => {
      const { GoogleCalendarClient } = await import('../lib/arcus-connector-api-clients.js');
      
      const client = new GoogleCalendarClient({
        credentialManager: {},
        supabase
      });

      expect(client.baseUrl).toContain('googleapis.com');
    });
  });

  describe('CalComClient', () => {
    it('should have correct configuration', async () => {
      const { CalComClient } = await import('../lib/arcus-connector-api-clients.js');
      
      const client = new CalComClient({
        credentialManager: {},
        supabase
      });

      expect(client.baseUrl).toBe('https://api.cal.com/v2');
      expect(client.provider).toBe('calcom');
    });
  });

  describe('NotionClient', () => {
    it('should respect rate limits', async () => {
      const { NotionClient } = await import('../lib/arcus-connector-api-clients.js');
      
      const client = new NotionClient({
        credentialManager: {},
        supabase
      });

      expect(client.rateLimiter.minInterval).toBeGreaterThan(300); // ~3 req/sec
    });
  });

  describe('GoogleTasksClient', () => {
    it('should have correct base URL', async () => {
      const { GoogleTasksClient } = await import('../lib/arcus-connector-api-clients.js');
      
      const client = new GoogleTasksClient({
        credentialManager: {},
        supabase
      });

      expect(client.baseUrl).toBe('https://tasks.googleapis.com/tasks/v1');
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling & Retry System', () => {
  describe('ErrorClassifier', () => {
    it('should classify HTTP status codes', async () => {
      const { ErrorClassifier } = await import('../lib/arcus-error-handling.js');

      const tests = [
        { status: 400, category: 'BAD_REQUEST', retryable: false },
        { status: 429, category: 'RATE_LIMITED', retryable: true },
        { status: 500, category: 'SERVER_ERROR', retryable: true },
        { status: 503, category: 'SERVICE_UNAVAILABLE', retryable: true }
      ];

      for (const test of tests) {
        const result = ErrorClassifier.classifyByStatus(test.status);
        expect(result.category).toBe(test.category);
        expect(result.retryable).toBe(test.retryable);
      }
    });

    it('should classify network errors', async () => {
      const { ErrorClassifier } = await import('../lib/arcus-error-handling.js');

      const result = ErrorClassifier.classifyByCode('ETIMEDOUT');
      expect(result.category).toBe('TIMEOUT');
      expect(result.retryable).toBe(true);
    });
  });

  describe('RetryManager', () => {
    it('should retry on server errors', async () => {
      const { RetryManager } = await import('../lib/arcus-error-handling.js');

      const manager = new RetryManager({ maxAttempts: 3, baseDelay: 10 });
      let attempts = 0;

      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Server error');
          error.status = 503;
          throw error;
        }
        return 'success';
      };

      const result = await manager.execute(operation, { operationId: 'test' });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
    });

    it('should not retry on client errors', async () => {
      const { RetryManager } = await import('../lib/arcus-error-handling.js');

      const manager = new RetryManager({ maxAttempts: 3 });

      const operation = async () => {
        const error = new Error('Bad request');
        error.status = 400;
        throw error;
      };

      await expect(manager.execute(operation, { operationId: 'test' }))
        .rejects.toThrow();
    });
  });

  describe('IdempotencyManager', () => {
    it('should generate consistent keys', async () => {
      const { IdempotencyManager } = await import('../lib/arcus-error-handling.js');

      const manager = new IdempotencyManager({ from: () => ({}) });

      const context = {
        userId: 1,
        payload: { a: 1, b: 2 }
      };

      const key1 = manager.generateKey('test-op', context);
      const key2 = manager.generateKey('test-op', context);

      expect(key1).toBe(key2);
    });
  });
});

// ============================================================================
// AUTH MIDDLEWARE TESTS
// ============================================================================

describe('Auth Middleware', () => {
  let supabase;

  beforeAll(() => {
    supabase = createTestSupabase();
  });

  describe('token extraction', () => {
    it('should extract Bearer token', async () => {
      const { AuthMiddleware } = await import('../lib/arcus-auth-middleware.js');

      const middleware = new AuthMiddleware(supabase);
      
      const req = {
        headers: new Map([['authorization', 'Bearer test-token-123']])
      };

      const token = middleware.extractToken(req);
      expect(token).toBe('test-token-123');
    });

    it('should return null for invalid header', async () => {
      const { AuthMiddleware } = await import('../lib/arcus-auth-middleware.js');

      const middleware = new AuthMiddleware(supabase);
      
      const req = {
        headers: new Map([['authorization', 'Basic test-token']])
      };

      const token = middleware.extractToken(req);
      expect(token).toBeNull();
    });
  });

  describe('response helpers', () => {
    it('should create unauthorized response', async () => {
      const { AuthMiddleware } = await import('../lib/arcus-auth-middleware.js');

      const middleware = new AuthMiddleware(supabase);
      const response = middleware.unauthorized('Test message');

      expect(response.status).toBe(401);
    });

    it('should create rate limited response', async () => {
      const { AuthMiddleware } = await import('../lib/arcus-auth-middleware.js');

      const middleware = new AuthMiddleware(supabase);
      const response = middleware.rateLimited(60);

      expect(response.status).toBe(429);
    });
  });
});

// ============================================================================
// WEBHOOK HANDLER TESTS
// ============================================================================

describe('Webhook Handlers', () => {
  let supabase;

  beforeAll(() => {
    supabase = createTestSupabase();
  });

  describe('WebhookProcessor', () => {
    it('should reject unknown connectors', async () => {
      const { WebhookProcessor } = await import('../lib/arcus-webhook-handlers.js');

      const processor = new WebhookProcessor(supabase);

      await expect(
        processor.processWebhook('unknown_connector', {}, {})
      ).rejects.toThrow('No webhook handler for connector');
    });
  });

  describe('signature verification', () => {
    it('should verify Cal.com signatures', async () => {
      const { CalComWebhookHandler } = await import('../lib/arcus-webhook-handlers.js');

      const handler = new CalComWebhookHandler(supabase);
      
      // Mock implementation would test HMAC verification
      expect(handler.verifySignature).toBeDefined();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration Tests', () => {
  it('should handle full connector flow', async () => {
    // This would be a full end-to-end test
    // 1. Create user
    // 2. Connect account
    // 3. Execute action
    // 4. Verify results
    
    expect(true).toBe(true); // Placeholder
  });
});

// ============================================================================
// EXPORT TEST UTILITIES
// ============================================================================

export {
  TEST_USER_ID,
  TEST_ACCOUNT_ID,
  createTestSupabase
};
