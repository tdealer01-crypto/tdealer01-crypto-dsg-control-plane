/**
 * Scenario Base
 * Foundation for all E2E scenarios
 */

import { eventBus } from '@/lib/dsg/setup/events';
import { executionRecorder } from '../replay/execution-recorder';
import type { DSGEvent, AnyEvent } from '@/lib/dsg/setup/events';
import type { Connector } from '@/lib/dsg/setup/connectors/interface';

export abstract class ScenarioBase {
  protected scenario_id = crypto.randomUUID();
  protected execution_id = crypto.randomUUID();
  protected plan_id = crypto.randomUUID();
  protected org_id = 'test-org';
  protected user_id = 'test-user@example.com';

  protected recordedEvents: AnyEvent[] = [];
  protected startTime = 0;
  protected endTime = 0;

  /**
   * Run the scenario
   */
  async run(): Promise<{
    success: boolean;
    duration_ms: number;
    events_count: number;
    error?: string;
  }> {
    this.startTime = Date.now();
    executionRecorder.startRecording(this.execution_id, this.plan_id, this.org_id);

    // Subscribe to events
    const unsubscribe = eventBus.subscribeAll(async (event: DSGEvent) => {
      this.recordedEvents.push(event as AnyEvent);
      executionRecorder.recordEvent(event as AnyEvent);
    });

    try {
      await this.setup();
      await this.execute();
      await this.verify();

      this.endTime = Date.now();
      const recording = executionRecorder.stopRecording('completed');

      unsubscribe();

      return {
        success: true,
        duration_ms: this.endTime - this.startTime,
        events_count: this.recordedEvents.length,
      };
    } catch (error) {
      this.endTime = Date.now();
      const errorMsg = error instanceof Error ? error.message : String(error);

      try {
        executionRecorder.stopRecording('failed');
      } catch {
        // Ignore recording errors
      }

      unsubscribe();

      return {
        success: false,
        duration_ms: this.endTime - this.startTime,
        events_count: this.recordedEvents.length,
        error: errorMsg,
      };
    }
  }

  /**
   * Setup phase (to be overridden)
   */
  protected abstract setup(): Promise<void>;

  /**
   * Execute phase (to be overridden)
   */
  protected abstract execute(): Promise<void>;

  /**
   * Verify phase (to be overridden)
   */
  protected abstract verify(): Promise<void>;

  /**
   * Helper: assert event exists
   */
  protected assertEventExists(eventType: string, predicate?: (event: AnyEvent) => boolean): void {
    const event = this.recordedEvents.find(
      (e) => e.type === eventType && (!predicate || predicate(e)),
    );

    if (!event) {
      throw new Error(`Event not found: ${eventType}`);
    }
  }

  /**
   * Helper: assert event sequence
   */
  protected assertEventSequence(expectedTypes: string[]): void {
    const actualTypes = this.recordedEvents.map((e) => e.type);

    for (let i = 0; i < expectedTypes.length; i++) {
      if (actualTypes[i] !== expectedTypes[i]) {
        throw new Error(
          `Event sequence mismatch at position ${i}: expected ${expectedTypes[i]}, got ${actualTypes[i]}`,
        );
      }
    }
  }

  /**
   * Helper: get events by type
   */
  protected getEventsByType(eventType: string): AnyEvent[] {
    return this.recordedEvents.filter((e) => e.type === eventType);
  }

  /**
   * Helper: count events by type
   */
  protected countEventsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const event of this.recordedEvents) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Helper: emit test event
   */
  protected async emitTestEvent(type: string, data: Record<string, unknown>): Promise<void> {
    await eventBus.emit({
      id: crypto.randomUUID(),
      type: type as any,
      org_id: this.org_id,
      user_id: this.user_id,
      execution_id: this.execution_id,
      timestamp: new Date(),
      data,
    });
  }

  /**
   * Get scenario name
   */
  abstract getScenarioName(): string;

  /**
   * Get scenario description
   */
  abstract getScenarioDescription(): string;
}
