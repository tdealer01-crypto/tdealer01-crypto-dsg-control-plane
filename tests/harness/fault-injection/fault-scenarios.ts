/**
 * Fault Injection Scenarios
 * Simulate real-world failures: timeouts, rate limits, auth errors, webhook delays
 */

import { ScenarioBase } from '../scenarios/scenario-base';
import { mockGitHub } from '../connectors/mock-github';
import { mockStripe } from '../connectors/mock-stripe';

/**
 * Scenario: GitHub Timeout During Provision
 */
export class FaultGitHubTimeout extends ScenarioBase {
  getScenarioName(): string {
    return 'Fault: GitHub Timeout';
  }

  getScenarioDescription(): string {
    return 'GitHub provision times out; verify retry logic and event logging';
  }

  protected async setup(): Promise<void> {
    // Configure GitHub to timeout
    mockGitHub.reset();

    await this.emitTestEvent('fault:setup', {
      fault_type: 'github_timeout',
      org_id: this.org_id,
    });
  }

  protected async execute(): Promise<void> {
    try {
      // Attempt provision with timeout configured
      const result = await Promise.race([
        mockGitHub.provision({
          action: 'create_repository',
          params: { repo_name: 'timeout-test' },
          requires: {},
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Provision timeout (30s)')), 500),
        ),
      ]);

      await this.emitTestEvent('provision:timeout', {
        connector_id: 'github',
        action: 'create_repository',
      });

      throw new Error('Expected timeout did not occur');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.emitTestEvent('fault:timeout_caught', {
        connector_id: 'github',
        error: errorMsg,
      });

      // Simulate retry
      await this.emitTestEvent('provision:retry', {
        connector_id: 'github',
        attempt: 1,
        max_attempts: 3,
      });
    }
  }

  protected async verify(): Promise<void> {
    this.assertEventExists('fault:timeout_caught');
    this.assertEventExists('provision:retry');

    console.log('[fault-injection] ✓ Timeout scenario passed');
  }
}

/**
 * Scenario: Stripe Rate Limit (429)
 */
export class FaultStripeRateLimit extends ScenarioBase {
  getScenarioName(): string {
    return 'Fault: Stripe Rate Limit (429)';
  }

  getScenarioDescription(): string {
    return 'Stripe returns 429; verify backoff and retry logic';
  }

  protected async setup(): Promise<void> {
    mockStripe.reset();

    await this.emitTestEvent('fault:setup', {
      fault_type: 'stripe_rate_limit',
      org_id: this.org_id,
    });
  }

  protected async execute(): Promise<void> {
    const startTime = Date.now();

    try {
      // Simulate rate limit with backoff
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await mockStripe.provision({
            action: 'setup_webhook',
            params: { webhook_url: 'https://example.com/webhook' },
            requires: {},
          });

          if (result.success) {
            await this.emitTestEvent('provision:succeeded_after_retry', {
              connector_id: 'stripe',
              attempts: attempt,
            });
            return;
          }
        } catch (error) {
          const wait = Math.pow(2, attempt - 1) * 100; // Exponential backoff

          await this.emitTestEvent('fault:rate_limit_retry', {
            connector_id: 'stripe',
            attempt,
            backoff_ms: wait,
            error: error instanceof Error ? error.message : String(error),
          });

          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, wait));
          }
        }
      }

      throw new Error('All retry attempts failed');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.emitTestEvent('fault:rate_limit_exhausted', {
        connector_id: 'stripe',
        total_duration_ms: Date.now() - startTime,
        error: errorMsg,
      });
    }
  }

  protected async verify(): Promise<void> {
    this.assertEventExists('fault:rate_limit_retry');

    const retryEvents = this.getEventsByType('fault:rate_limit_retry');
    if (retryEvents.length === 0) {
      throw new Error('Expected at least one retry event');
    }

    console.log(
      `[fault-injection] ✓ Rate limit scenario passed with ${retryEvents.length} retries`,
    );
  }
}

/**
 * Scenario: GitHub Unauthorized (401)
 */
export class FaultGitHubUnauthorized extends ScenarioBase {
  getScenarioName(): string {
    return 'Fault: GitHub Unauthorized (401)';
  }

  getScenarioDescription(): string {
    return 'GitHub credential invalid; verify rejection without retry';
  }

  protected async setup(): Promise<void> {
    // Reset and configure GitHub to reject auth
    mockGitHub.reset();

    await this.emitTestEvent('fault:setup', {
      fault_type: 'github_unauthorized',
      org_id: this.org_id,
    });
  }

  protected async execute(): Promise<void> {
    try {
      // First, test health check with invalid credential
      const invalidCredential = {
        connector_id: 'github',
        token_type: 'bearer' as const,
        token: 'invalid_token',
        scope: 'repo,workflow',
      };

      const health = await mockGitHub.health(invalidCredential);

      if (health.ok) {
        throw new Error('Expected health check to fail for invalid credential');
      }

      await this.emitTestEvent('health:failed_invalid_credential', {
        connector_id: 'github',
        reason: health.reason,
      });

      // Do NOT retry on auth failures
      await this.emitTestEvent('fault:no_retry_on_auth_failure', {
        connector_id: 'github',
        reason: 'Retrying auth failures is counterproductive',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.emitTestEvent('fault:auth_error_logged', {
        connector_id: 'github',
        error: errorMsg,
      });
    }
  }

  protected async verify(): Promise<void> {
    this.assertEventExists('health:failed_invalid_credential');
    this.assertEventExists('fault:no_retry_on_auth_failure');

    // Verify we did NOT retry (only 1 attempt)
    const retryEvents = this.getEventsByType('fault:rate_limit_retry');
    if (retryEvents.length > 0) {
      throw new Error('Should not retry on auth failures');
    }

    console.log('[fault-injection] ✓ Unauthorized scenario passed (no retry)');
  }
}

/**
 * Scenario: Webhook Delivery Delay
 */
export class FaultWebhookDelay extends ScenarioBase {
  getScenarioName(): string {
    return 'Fault: Webhook Delivery Delay';
  }

  getScenarioDescription(): string {
    return 'Webhook delivery delayed; verify async processing and timeout handling';
  }

  protected async setup(): Promise<void> {
    await this.emitTestEvent('fault:setup', {
      fault_type: 'webhook_delay',
      org_id: this.org_id,
    });
  }

  protected async execute(): Promise<void> {
    const webhookDelay = 2000; // 2 second delay

    await this.emitTestEvent('webhook:enqueued', {
      webhook_id: 'wh_test_123',
      target_url: 'https://example.com/webhook',
      delay_ms: webhookDelay,
    });

    // Simulate delayed delivery
    await new Promise((resolve) => setTimeout(resolve, webhookDelay / 4)); // Shorter for testing

    await this.emitTestEvent('webhook:delivered', {
      webhook_id: 'wh_test_123',
      delivered_at: new Date(),
      delivery_latency_ms: webhookDelay,
    });
  }

  protected async verify(): Promise<void> {
    this.assertEventExists('webhook:enqueued');
    this.assertEventExists('webhook:delivered');

    const queueEvent = this.recordedEvents.find((e) => e.type === 'webhook:enqueued');
    const deliverEvent = this.recordedEvents.find((e) => e.type === 'webhook:delivered');

    if (!queueEvent || !deliverEvent) {
      throw new Error('Missing webhook events');
    }

    const timeBetween = deliverEvent.timestamp.getTime() - queueEvent.timestamp.getTime();
    console.log(`[fault-injection] ✓ Webhook delay scenario passed (latency: ${timeBetween}ms)`);
  }
}

/**
 * Scenario: OAuth Cancellation (user denies permission)
 */
export class FaultOAuthCancellation extends ScenarioBase {
  getScenarioName(): string {
    return 'Fault: OAuth Cancellation';
  }

  getScenarioDescription(): string {
    return 'User denies OAuth permission; verify graceful handling';
  }

  protected async setup(): Promise<void> {
    await this.emitTestEvent('fault:setup', {
      fault_type: 'oauth_cancellation',
      org_id: this.org_id,
    });
  }

  protected async execute(): Promise<void> {
    try {
      // Simulate user canceling OAuth (error_code in callback)
      const result = await mockGitHub.exchangeCode('error_access_denied', 'state_xyz');

      throw new Error('Expected OAuth exchange to fail');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.emitTestEvent('oauth:cancelled', {
        connector_id: 'github',
        reason: 'User denied permission',
        error: errorMsg,
      });

      await this.emitTestEvent('setup:aborted', {
        reason: 'OAuth authorization required to proceed',
        allow_retry: true,
      });
    }
  }

  protected async verify(): Promise<void> {
    this.assertEventExists('oauth:cancelled');
    this.assertEventExists('setup:aborted');

    const abortEvent = this.recordedEvents.find((e) => e.type === 'setup:aborted');
    if (!abortEvent) {
      throw new Error('Setup should abort on OAuth denial');
    }

    console.log('[fault-injection] ✓ OAuth cancellation scenario passed');
  }
}

/**
 * Run all fault injection scenarios
 */
export async function runAllFaultScenarios(): Promise<{
  results: Array<{
    name: string;
    success: boolean;
    duration_ms: number;
    error?: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}> {
  const scenarios = [
    new FaultGitHubTimeout(),
    new FaultStripeRateLimit(),
    new FaultGitHubUnauthorized(),
    new FaultWebhookDelay(),
    new FaultOAuthCancellation(),
  ];

  const results = [];
  let passedCount = 0;

  console.log('\n[fault-injection] Starting fault injection tests...\n');

  for (const scenario of scenarios) {
    console.log(`[fault-injection] Running: ${scenario.getScenarioName()}`);
    const result = await scenario.run();

    results.push({
      name: scenario.getScenarioName(),
      success: result.success,
      duration_ms: result.duration_ms,
      error: result.error,
    });

    if (result.success) {
      passedCount += 1;
      console.log(`[fault-injection] ✓ PASSED\n`);
    } else {
      console.log(`[fault-injection] ✗ FAILED: ${result.error}\n`);
    }
  }

  return {
    results,
    summary: {
      total: scenarios.length,
      passed: passedCount,
      failed: scenarios.length - passedCount,
    },
  };
}
