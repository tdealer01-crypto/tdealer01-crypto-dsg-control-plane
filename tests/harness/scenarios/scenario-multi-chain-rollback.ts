/**
 * Scenario 2: Multi-Chain with Rollback
 * GitHub → Vercel → Stripe (fail on Stripe) → Rollback all
 *
 * This is the critical scenario that verifies:
 * 1. Dependency chaining works (Vercel needs GitHub repo URL)
 * 2. Rollback reverses in correct order (Vercel first, then GitHub)
 * 3. Event stream is deterministic even with failures
 */

import { ScenarioBase } from './scenario-base';
import { mockGitHub } from '../connectors/mock-github';
import { mockVercel } from '../connectors/mock-vercel';
import { mockStripe } from '../connectors/mock-stripe';

export class ScenarioMultiChainRollback extends ScenarioBase {
  private completedItems: string[] = [];
  private shouldFailStripe = true;

  getScenarioName(): string {
    return 'Multi-Chain with Rollback';
  }

  getScenarioDescription(): string {
    return 'GitHub → Vercel → Stripe; Stripe fails; verify rollback reverses Vercel → GitHub';
  }

  /**
   * Setup: Configure failure mode
   */
  protected async setup(): Promise<void> {
    // Reset all mocks
    mockGitHub.reset();
    mockVercel.reset();
    mockStripe.reset();

    // Configure Stripe to fail after 1 attempt
    const stripeConfig = {
      failureMode: 'internal_error' as const,
      failureAfterAttempts: 1,
    };

    await this.emitTestEvent('scenario:setup', {
      scenario: this.getScenarioName(),
      org_id: this.org_id,
      failure_mode: 'stripe_will_fail',
    });
  }

  /**
   * Execute: Run the chain
   */
  protected async execute(): Promise<void> {
    try {
      // Phase 1: GitHub (create repository)
      console.log('[scenario] Phase 1: GitHub - Create Repository');
      const githubResult = await mockGitHub.provision({
        action: 'create_repository',
        params: { repo_name: 'test-app' },
        requires: {},
      });

      if (!githubResult.success) {
        throw new Error('GitHub provision failed');
      }

      this.completedItems.push('github:create_repository');

      await this.emitTestEvent('item:completed', {
        execution_id: this.execution_id,
        item_id: 'github:create_repository',
        provider: 'github',
        action: 'create_repository',
        duration_seconds: 1,
        result: githubResult.output,
        completed_at: new Date(),
      });

      // Phase 2: Vercel (import GitHub, create project)
      console.log('[scenario] Phase 2: Vercel - Import Repository');
      const vercelResult = await mockVercel.provision({
        action: 'import_github_repository',
        params: { repo_url: githubResult.output?.repository_url },
        requires: { github_repository: githubResult.output?.repository_url },
      });

      if (!vercelResult.success) {
        throw new Error('Vercel provision failed');
      }

      this.completedItems.push('vercel:import_github_repository');

      await this.emitTestEvent('item:completed', {
        execution_id: this.execution_id,
        item_id: 'vercel:import_github_repository',
        provider: 'vercel',
        action: 'import_github_repository',
        duration_seconds: 2,
        result: vercelResult.output,
        completed_at: new Date(),
      });

      // Phase 3: Stripe (setup webhook) - THIS WILL FAIL
      console.log('[scenario] Phase 3: Stripe - Setup Webhook (WILL FAIL)');
      const stripeResult = await mockStripe.provision({
        action: 'setup_webhook',
        params: {
          webhook_url: vercelResult.output?.deployment_url,
        },
        requires: { deployment_url: vercelResult.output?.deployment_url },
      });

      if (!stripeResult.success) {
        throw new Error('Stripe provision failed');
      }

      this.completedItems.push('stripe:setup_webhook');

      await this.emitTestEvent('item:completed', {
        execution_id: this.execution_id,
        item_id: 'stripe:setup_webhook',
        provider: 'stripe',
        action: 'setup_webhook',
        duration_seconds: 1,
        result: stripeResult.output,
        completed_at: new Date(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.emitTestEvent('item:failed', {
        execution_id: this.execution_id,
        item_id: 'stripe:setup_webhook',
        provider: 'stripe',
        action: 'setup_webhook',
        error: errorMsg,
        failed_at: new Date(),
      });

      // ROLLBACK: Reverse order of completed items
      await this.rollbackItems();

      throw error;
    }
  }

  /**
   * Rollback: Reverse completed items in order
   */
  private async rollbackItems(): Promise<void> {
    console.log('[scenario] ROLLBACK initiated');

    await this.emitTestEvent('execution:paused', {
      execution_id: this.execution_id,
      reason: 'Rollback initiated due to Stripe failure',
    });

    // Reverse order: Vercel first, then GitHub
    const reverseItems = [...this.completedItems].reverse();

    for (const itemId of reverseItems) {
      const [provider] = itemId.split(':');

      console.log(`[scenario] Rolling back ${itemId}`);

      // Call connector rollback
      if (provider === 'vercel') {
        await mockVercel.rollback(this.execution_id);
      } else if (provider === 'github') {
        await mockGitHub.rollback(this.execution_id);
      }

      await this.emitTestEvent('item:rolledback', {
        execution_id: this.execution_id,
        item_id: itemId,
        provider,
        rolled_back_at: new Date(),
      });
    }

    console.log('[scenario] Rollback complete');

    await this.emitTestEvent('execution:rolledback', {
      execution_id: this.execution_id,
      items_rolled_back: reverseItems.length,
      rolled_back_at: new Date(),
    });
  }

  /**
   * Verify: Check rollback happened correctly
   */
  protected async verify(): Promise<void> {
    console.log('[scenario] Verify: Checking rollback sequence');

    // Verify items were completed in order
    if (this.completedItems.length !== 2) {
      throw new Error(
        `Expected 2 completed items before failure, got ${this.completedItems.length}`,
      );
    }

    const expected = ['github:create_repository', 'vercel:import_github_repository'];
    for (let i = 0; i < expected.length; i++) {
      if (this.completedItems[i] !== expected[i]) {
        throw new Error(`Item ${i} mismatch: expected ${expected[i]}, got ${this.completedItems[i]}`);
      }
    }

    // Verify item:failed event exists
    this.assertEventExists('item:failed');

    // Verify rollback events exist
    const rollbackEvents = this.getEventsByType('item:rolledback');
    if (rollbackEvents.length !== 2) {
      throw new Error(`Expected 2 rollback events, got ${rollbackEvents.length}`);
    }

    // Verify rollback order is REVERSE of completion order
    const rollbackItems = rollbackEvents.map((e) => (e.data as any).item_id);
    const expectedRollbackOrder = ['vercel:import_github_repository', 'github:create_repository'];

    for (let i = 0; i < expectedRollbackOrder.length; i++) {
      if (rollbackItems[i] !== expectedRollbackOrder[i]) {
        throw new Error(
          `Rollback order ${i} mismatch: expected ${expectedRollbackOrder[i]}, got ${rollbackItems[i]}`,
        );
      }
    }

    // Verify execution:rolledback event
    this.assertEventExists('execution:rolledback');

    // Verify event sequence contains critical markers
    const eventTypes = this.recordedEvents.map((e) => e.type);
    const completionIndex = eventTypes.lastIndexOf('item:completed');
    const failureIndex = eventTypes.indexOf('item:failed');
    const rollbackIndex = eventTypes.indexOf('item:rolledback');

    if (completionIndex >= failureIndex) {
      throw new Error(
        'Event order violation: completed items should come before failure',
      );
    }

    if (failureIndex >= rollbackIndex) {
      throw new Error(
        'Event order violation: failure should come before rollback',
      );
    }

    console.log(`[scenario] ✓ Rollback sequence verified: completion → failure → rollback`);
    console.log(`[scenario] ✓ Rollback order correct: ${expectedRollbackOrder.join(' ← ')}`);
    console.log(`[scenario] ✓ Scenario passed: ${this.getScenarioName()}`);
  }
}
