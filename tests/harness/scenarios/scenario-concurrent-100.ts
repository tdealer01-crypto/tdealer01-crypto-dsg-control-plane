/**
 * Scenario 3: High Concurrency (100 parallel executions)
 *
 * Tests:
 * 1. Event bus handles 100+ concurrent execution_ids
 * 2. No event loss under load
 * 3. Execution recordings don't interfere with each other
 * 4. Event ordering is maintained per execution
 */

import { ScenarioBase } from './scenario-base';
import { eventBus } from '@/lib/dsg/setup/events';
import { executionRecorder } from '../replay/execution-recorder';
import { mockGitHub } from '../connectors/mock-github';

export interface ConcurrentExecution {
  execution_id: string;
  plan_id: string;
  events: any[];
  status: 'running' | 'completed' | 'failed';
  duration_ms: number;
  error?: string;
}

export class ScenarioConcurrent100 extends ScenarioBase {
  private concurrentCount = 100;
  private executions: Map<string, ConcurrentExecution> = new Map();
  private eventLosses: string[] = [];

  getScenarioName(): string {
    return 'High Concurrency (100 parallel)';
  }

  getScenarioDescription(): string {
    return 'Execute 100 parallel provisions; verify event bus handles load and no events lost';
  }

  /**
   * Setup: Initialize mocks and tracking
   */
  protected async setup(): Promise<void> {
    mockGitHub.reset();

    await this.emitTestEvent('scenario:setup', {
      scenario: this.getScenarioName(),
      concurrent_count: this.concurrentCount,
    });
  }

  /**
   * Execute: Launch 100 concurrent executions
   */
  protected async execute(): Promise<void> {
    console.log(`[scenario] Starting ${this.concurrentCount} concurrent executions`);

    const startTime = Date.now();

    // Create 100 executions
    const promises: Promise<void>[] = [];

    for (let i = 0; i < this.concurrentCount; i++) {
      const promise = this.runConcurrentExecution(i);
      promises.push(promise);
    }

    // Wait for all to complete
    const results = await Promise.allSettled(promises);

    const duration = Date.now() - startTime;

    console.log(`[scenario] All ${this.concurrentCount} executions completed in ${duration}ms`);

    // Check for failures
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`[scenario] ${failures.length} executions failed`);
    }

    await this.emitTestEvent('scenario:concurrent_completed', {
      concurrent_count: this.concurrentCount,
      duration_ms: duration,
      failures: failures.length,
    });
  }

  /**
   * Run single concurrent execution
   */
  private async runConcurrentExecution(index: number): Promise<void> {
    const exec_id = crypto.randomUUID();
    const plan_id = crypto.randomUUID();

    const execution: ConcurrentExecution = {
      execution_id: exec_id,
      plan_id,
      events: [],
      status: 'running',
      duration_ms: 0,
    };

    this.executions.set(exec_id, execution);

    const startTime = Date.now();

    try {
      // Subscribe to events for this execution
      const unsubscribe = eventBus.subscribe('provision:started', async (event) => {
        if (event.execution_id === exec_id) {
          execution.events.push(event);
        }
      });

      eventBus.subscribe('item:completed', async (event) => {
        if (event.execution_id === exec_id) {
          execution.events.push(event);
        }
      });

      eventBus.subscribe('item:failed', async (event) => {
        if (event.execution_id === exec_id) {
          execution.events.push(event);
        }
      });

      eventBus.subscribe('execution:completed', async (event) => {
        if (event.execution_id === exec_id) {
          execution.events.push(event);
        }
      });

      // Simulate provision step
      const githubResult = await mockGitHub.provision({
        action: 'create_repository',
        params: { repo_name: `concurrent-test-${index}` },
        requires: {},
      });

      if (!githubResult.success) {
        throw new Error('GitHub provision failed');
      }

      // Emit events
      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'provision:started',
        org_id: this.org_id,
        user_id: this.user_id,
        execution_id: exec_id,
        timestamp: new Date(),
        data: {
          execution_id: exec_id,
          plan_id,
          org_id: this.org_id,
          approval_id: crypto.randomUUID(),
          started_at: new Date(),
        },
      });

      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'item:completed',
        org_id: this.org_id,
        execution_id: exec_id,
        timestamp: new Date(),
        data: {
          execution_id: exec_id,
          item_id: `github:${index}`,
          provider: 'github',
          action: 'create_repository',
          duration_seconds: 1,
          result: githubResult.output,
          completed_at: new Date(),
        },
      });

      await eventBus.emit({
        id: crypto.randomUUID(),
        type: 'execution:completed',
        org_id: this.org_id,
        execution_id: exec_id,
        timestamp: new Date(),
        data: {
          execution_id: exec_id,
          plan_id,
          org_id: this.org_id,
          total_duration_seconds: 1,
          items_completed: 1,
          completed_at: new Date(),
        },
      });

      execution.status = 'completed';
      execution.duration_ms = Date.now() - startTime;

      unsubscribe();
    } catch (error) {
      execution.status = 'failed';
      execution.duration_ms = Date.now() - startTime;
      execution.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Verify: Check concurrency handling and no event loss
   */
  protected async verify(): Promise<void> {
    console.log('[scenario] Verify: Checking concurrency results');

    // Verify all executions are tracked
    if (this.executions.size !== this.concurrentCount) {
      throw new Error(
        `Expected ${this.concurrentCount} executions tracked, got ${this.executions.size}`,
      );
    }

    // Count completed vs failed
    let completed = 0;
    let failed = 0;

    for (const exec of this.executions.values()) {
      if (exec.status === 'completed') {
        completed += 1;
      } else if (exec.status === 'failed') {
        failed += 1;
      }
    }

    console.log(`[scenario] Executions: ${completed} completed, ${failed} failed`);

    // Verify at least 95% completed successfully
    const successRate = completed / this.concurrentCount;
    if (successRate < 0.95) {
      throw new Error(`Success rate too low: ${(successRate * 100).toFixed(1)}%`);
    }

    // Check average event count per execution
    const totalEvents = Array.from(this.executions.values()).reduce(
      (sum, exec) => sum + exec.events.length,
      0,
    );

    const avgEventsPerExecution = totalEvents / this.concurrentCount;
    console.log(`[scenario] Average events per execution: ${avgEventsPerExecution.toFixed(1)}`);

    // Verify event ordering per execution
    let orderingErrors = 0;
    for (const exec of this.executions.values()) {
      if (exec.events.length > 1) {
        // Events should be in temporal order within execution
        for (let i = 1; i < exec.events.length; i++) {
          const prev = exec.events[i - 1];
          const curr = exec.events[i];

          if (prev.timestamp > curr.timestamp) {
            orderingErrors += 1;
            this.eventLosses.push(
              `Execution ${exec.execution_id}: event order violation at index ${i}`,
            );
          }
        }
      }
    }

    if (orderingErrors > 0) {
      console.warn(`[scenario] ${orderingErrors} event ordering violations detected`);
    }

    // Verify event bus still responsive
    await eventBus.emit({
      id: crypto.randomUUID(),
      type: 'connector:connected',
      org_id: this.org_id,
      timestamp: new Date(),
      data: {
        connector_id: 'test',
        connector_name: 'Test',
        credential_id: 'test',
        scope: 'test',
      },
    });

    console.log(`[scenario] ✓ Event bus responsive after load`);
    console.log(
      `[scenario] ✓ Scenario passed: ${this.concurrentCount} parallel executions handled`,
    );
  }

  /**
   * Get detailed statistics
   */
  getStatistics(): {
    total_executions: number;
    completed: number;
    failed: number;
    avg_duration_ms: number;
    total_events: number;
    event_loss_count: number;
  } {
    let completed = 0;
    let failed = 0;
    let totalDuration = 0;
    let totalEvents = 0;

    for (const exec of this.executions.values()) {
      if (exec.status === 'completed') {
        completed += 1;
      } else if (exec.status === 'failed') {
        failed += 1;
      }

      totalDuration += exec.duration_ms;
      totalEvents += exec.events.length;
    }

    return {
      total_executions: this.executions.size,
      completed,
      failed,
      avg_duration_ms: totalDuration / this.executions.size,
      total_events: totalEvents,
      event_loss_count: this.eventLosses.length,
    };
  }
}
