/**
 * Phase 9A Test Harness — Infrastructure verification
 *
 * Tests core functionality:
 * - Execution context management
 * - Event tracking and ordering
 * - Checkpoint creation and rollback
 * - Ledger recording and verification
 * - Connector simulation
 * - OAuth flow simulation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TestHarness,
  ConnectorSimulator,
  OAuthSimulator,
  type ExecutionContext,
} from './index';

describe('Phase 9A — Test Harness Infrastructure', () => {
  let harness: TestHarness;
  let connectorSim: ConnectorSimulator;
  let oauthSim: OAuthSimulator;
  let context: ExecutionContext;

  beforeEach(() => {
    harness = new TestHarness();
    connectorSim = new ConnectorSimulator(harness);
    oauthSim = new OAuthSimulator(harness);
    context = harness.startExecution('org_test', 'user_test');
  });

  afterEach(() => {
    harness.reset();
    oauthSim.reset();
  });

  describe('TestHarness — Execution Context', () => {
    it('should create an execution context', () => {
      expect(context).toBeDefined();
      expect(context.executionId).toBeDefined();
      expect(context.orgId).toBe('org_test');
      expect(context.status).toBe('running');
    });

    it('should track events in order', () => {
      harness.recordEvent('test_event_1', 'test', { data: 1 });
      harness.recordEvent('test_event_2', 'test', { data: 2 });
      harness.recordEvent('test_event_3', 'test', { data: 3 });

      expect(context.events.length).toBe(3);
      expect(context.events[0].sequence).toBe(0);
      expect(context.events[1].sequence).toBe(1);
      expect(context.events[2].sequence).toBe(2);
    });

    it('should create checkpoints for rollback', () => {
      const state1 = { value: 100 };
      const checkpoint1 = harness.createCheckpoint('after_step_1', state1);

      const state2 = { value: 200 };
      const checkpoint2 = harness.createCheckpoint('after_step_2', state2);

      expect(context.checkpoints.length).toBe(2);
      expect(checkpoint1.state.value).toBe(100);
      expect(checkpoint2.state.value).toBe(200);
    });

    it('should record ledger entries', () => {
      harness.recordLedgerEntry('create', 'agent_1', 'execution', { planId: 'plan_1' });
      harness.recordLedgerEntry('approve', 'user_1', 'execution', { planId: 'plan_1' });
      harness.recordLedgerEntry('execute', 'agent_1', 'execution', { planId: 'plan_1' });

      expect(context.ledgerEntries.length).toBe(3);
      expect(context.ledgerEntries[0].action).toBe('create');
      expect(context.ledgerEntries[1].action).toBe('approve');
      expect(context.ledgerEntries[2].action).toBe('execute');
    });
  });

  describe('TestHarness — Verification', () => {
    it('should verify event bus integrity', () => {
      harness.recordEvent('event_1', 'test', {});
      harness.recordEvent('event_2', 'test', {});
      harness.recordEvent('event_3', 'test', {});

      const result = harness.verifyEventBus(context);

      expect(result.ok).toBe(true);
      expect(result.eventCount).toBe(3);
      expect(result.lostCount).toBe(0);
      expect(result.issues.length).toBe(0);
    });

    it('should detect event ordering violations', () => {
      // Manually create ordering violation for testing
      const event1 = harness.recordEvent('event_1', 'test', {});
      const event2 = harness.recordEvent('event_2', 'test', {});

      // Swap timestamps to create violation
      event2.timestamp = new Date(event1.timestamp.getTime() - 1000);

      const result = harness.verifyEventBus(context);

      expect(result.ok).toBe(false);
      expect(result.issues.some((i) => i.includes('Timestamp ordering'))).toBe(true);
    });

    it('should verify ledger completeness', () => {
      harness.recordLedgerEntry('action_1', 'actor_1', 'resource_1', { state: 'v1' });
      harness.recordLedgerEntry('action_2', 'actor_2', 'resource_2', { state: 'v2' });

      const result = harness.verifyLedger(context);

      expect(result.ok).toBe(true);
      expect(result.entryCount).toBe(2);
      expect(result.issues.length).toBe(0);
    });

    it('should verify rollback checkpoint integrity', () => {
      harness.createCheckpoint('checkpoint_1', { state: 'v1' });
      harness.createCheckpoint('checkpoint_2', { state: 'v2' });

      const result = harness.verifyRollback(context);

      expect(result.ok).toBe(true);
      expect(result.checkpointCount).toBe(2);
    });
  });

  describe('TestHarness — Execution Completion', () => {
    it('should complete execution successfully', () => {
      harness.recordEvent('step_1', 'test', {});
      harness.recordLedgerEntry('action_1', 'actor_1', 'resource_1', {});

      const result = harness.completeExecution('success');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.metrics.eventCount).toBe(1);
      expect(result.metrics.ledgerEntryCount).toBe(1);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should complete execution with error', () => {
      const testError = new Error('Test failure');
      const result = harness.completeExecution('failure', testError);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Test failure');
    });
  });

  describe('ConnectorSimulator — GitHub', () => {
    it('should simulate successful GitHub call', async () => {
      const config = { type: 'github' as const, orgId: 'org_test' };
      const response = await connectorSim.callGitHub(config, 'create_workflow_dispatch', {
        repo: 'test/repo',
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data?.workflow_run_id).toBeDefined();

      const githubEvent = context.events.find((e) => e.type === 'connector_success');
      expect(githubEvent).toBeDefined();
    });

    it('should inject timeout fault', async () => {
      const config = {
        type: 'github' as const,
        orgId: 'org_test',
        faultType: 'timeout' as const,
      };
      const response = await connectorSim.callGitHub(config, 'create_workflow_dispatch', {});

      expect(response.ok).toBe(false);
      expect(response.status).toBe(408);
      expect(response.error).toContain('timeout');
    });

    it('should inject rate limit fault', async () => {
      const config = {
        type: 'github' as const,
        orgId: 'org_test',
        faultType: 'rate_limit' as const,
      };
      const response = await connectorSim.callGitHub(config, 'create_workflow_dispatch', {});

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
      expect(response.data?.retryAfter).toBeDefined();
    });
  });

  describe('OAuthSimulator — Authorization Flow', () => {
    it('should start authorization flow', () => {
      const session = oauthSim.startAuthorizationFlow({
        provider: 'github',
        clientId: 'client_test',
        clientSecret: 'secret_test',
        redirectUri: 'http://localhost/callback',
        scopes: ['repo', 'gist'],
        scenario: 'success',
      });

      expect(session.sessionId).toBeDefined();
      expect(session.state).toBeDefined();
      expect(session.status).toBe('pending');

      const oauthEvent = context.events.find((e) => e.type === 'oauth_start');
      expect(oauthEvent).toBeDefined();
    });

    it('should complete authorization callback successfully', async () => {
      const session = oauthSim.startAuthorizationFlow({
        provider: 'github',
        clientId: 'client_test',
        clientSecret: 'secret_test',
        redirectUri: 'http://localhost/callback',
        scopes: ['repo'],
        scenario: 'success',
      });

      const result = await oauthSim.handleAuthorizationCallback(
        session.sessionId,
        {
          provider: 'github',
          clientId: 'client_test',
          clientSecret: 'secret_test',
          redirectUri: 'http://localhost/callback',
          scopes: ['repo'],
          scenario: 'success',
        },
        session.state
      );

      expect(result.ok).toBe(true);
      expect(result.authorizationCode).toBeDefined();

      const updatedSession = oauthSim.getSession(session.sessionId);
      expect(updatedSession?.status).toBe('authorized');
    });

    it('should handle authorization cancellation', async () => {
      const session = oauthSim.startAuthorizationFlow({
        provider: 'github',
        clientId: 'client_test',
        clientSecret: 'secret_test',
        redirectUri: 'http://localhost/callback',
        scopes: ['repo'],
        scenario: 'cancel',
      });

      const result = await oauthSim.handleAuthorizationCallback(
        session.sessionId,
        {
          provider: 'github',
          clientId: 'client_test',
          clientSecret: 'secret_test',
          redirectUri: 'http://localhost/callback',
          scopes: ['repo'],
          scenario: 'cancel',
        },
        session.state
      );

      expect(result.ok).toBe(false);
      expect(result.error).toContain('cancelled');
    });

    it('should exchange code for token', async () => {
      const session = oauthSim.startAuthorizationFlow({
        provider: 'github',
        clientId: 'client_test',
        clientSecret: 'secret_test',
        redirectUri: 'http://localhost/callback',
        scopes: ['repo'],
        scenario: 'success',
      });

      const authResult = await oauthSim.handleAuthorizationCallback(
        session.sessionId,
        {
          provider: 'github',
          clientId: 'client_test',
          clientSecret: 'secret_test',
          redirectUri: 'http://localhost/callback',
          scopes: ['repo'],
          scenario: 'success',
        },
        session.state
      );

      const tokenResult = await oauthSim.exchangeCodeForToken(
        session.sessionId,
        {
          provider: 'github',
          clientId: 'client_test',
          clientSecret: 'secret_test',
          redirectUri: 'http://localhost/callback',
          scopes: ['repo'],
          scenario: 'success',
        },
        authResult.authorizationCode!
      );

      expect(tokenResult.ok).toBe(true);
      expect(tokenResult.accessToken).toBeDefined();
      expect(tokenResult.refreshToken).toBeDefined();
      expect(tokenResult.expiresIn).toBe(3600);
    });
  });

  describe('Integration — OAuth → Connector', () => {
    it('should complete flow: OAuth → GitHub API call', async () => {
      // 1. OAuth authorization
      const session = oauthSim.startAuthorizationFlow({
        provider: 'github',
        clientId: 'client_test',
        clientSecret: 'secret_test',
        redirectUri: 'http://localhost/callback',
        scopes: ['repo'],
        scenario: 'success',
      });

      const authResult = await oauthSim.handleAuthorizationCallback(
        session.sessionId,
        {
          provider: 'github',
          clientId: 'client_test',
          clientSecret: 'secret_test',
          redirectUri: 'http://localhost/callback',
          scopes: ['repo'],
          scenario: 'success',
        },
        session.state
      );

      const tokenResult = await oauthSim.exchangeCodeForToken(
        session.sessionId,
        {
          provider: 'github',
          clientId: 'client_test',
          clientSecret: 'secret_test',
          redirectUri: 'http://localhost/callback',
          scopes: ['repo'],
          scenario: 'success',
        },
        authResult.authorizationCode!
      );

      expect(tokenResult.ok).toBe(true);

      // 2. Use token with GitHub API
      harness.recordLedgerEntry('oauth_token_obtained', 'oauth_service', 'session', {
        accessToken: tokenResult.accessToken,
      });

      const response = await connectorSim.callGitHub(
        { type: 'github', orgId: 'org_test' },
        'create_workflow_dispatch',
        { repo: 'test/repo' }
      );

      expect(response.ok).toBe(true);

      // 3. Verify flow completeness
      const eventBusResult = harness.verifyEventBus(context);
      const ledgerResult = harness.verifyLedger(context);

      expect(eventBusResult.ok).toBe(true);
      expect(ledgerResult.ok).toBe(true);
      expect(context.events.length).toBeGreaterThan(0);
      expect(context.ledgerEntries.length).toBeGreaterThan(0);
    });
  });
});
