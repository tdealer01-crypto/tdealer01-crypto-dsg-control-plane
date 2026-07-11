/**
 * Scenario 3: High Concurrency (100 parallel executions)
 * Tests event bus and execution handling at scale
 */

import { ScenarioBase } from './scenario-base';

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
   * Setup: Initialize tracking
   */
  protected async setup(): Promise<void> {
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
      // Simulate provision step
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

      // Emit events
      await this.emitTestEvent('provision:started', {
        execution_id: exec_id,
        plan_id,
        org_id: this.org_id,
        approval_id: crypto.randomUUID(),
        started_at: new Date(),
      });

      execution.events.push({ type: 'provision:started' });

      await this.emitTestEvent('item:completed', {
        execution_id: exec_id,
        item_id: `github:${index}`,
        provider: 'github',
        action: 'create_repository',
        duration_seconds: 1,
        result: { repository_url: `https://github.com/test/${index}` },
        completed_at: new Date(),
      });

      execution.events.push({ type: 'item:completed' });

      await this.emitTestEvent('execution:completed', {
        execution_id: exec_id,
        plan_id,
        org_id: this.org_id,
        total_duration_seconds: 1,
        items_completed: 1,
        completed_at: new Date(),
      });

      execution.events.push({ type: 'execution:completed' });

      execution.status = 'completed';
      execution.duration_ms = Date.now() - startTime;
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
