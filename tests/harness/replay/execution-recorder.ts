/**
 * Execution Recorder
 * Records all execution events for replay and determinism verification
 */

import type { DSGEvent, AnyEvent } from '@/lib/dsg/setup/events';

export interface ExecutionRecording {
  execution_id: string;
  plan_id: string;
  org_id: string;
  started_at: Date;
  completed_at?: Date;
  status: 'recording' | 'completed' | 'failed';
  events: AnyEvent[];
  checkpoints: Array<{
    phase: number;
    timestamp: Date;
    items_completed: number;
  }>;
  recording_hash: string;
}

export class ExecutionRecorder {
  private recordings: Map<string, ExecutionRecording> = new Map();
  private currentExecution?: {
    execution_id: string;
    plan_id: string;
    org_id: string;
    events: AnyEvent[];
    checkpoints: Array<{
      phase: number;
      timestamp: Date;
      items_completed: number;
    }>;
  };

  /**
   * Start recording execution
   */
  startRecording(execution_id: string, plan_id: string, org_id: string): void {
    this.currentExecution = {
      execution_id,
      plan_id,
      org_id,
      events: [],
      checkpoints: [],
    };
  }

  /**
   * Record an event
   */
  recordEvent(event: AnyEvent): void {
    if (!this.currentExecution) {
      throw new Error('No recording in progress');
    }

    this.currentExecution.events.push(event);
  }

  /**
   * Record checkpoint
   */
  recordCheckpoint(phase: number, items_completed: number): void {
    if (!this.currentExecution) {
      throw new Error('No recording in progress');
    }

    this.currentExecution.checkpoints.push({
      phase,
      timestamp: new Date(),
      items_completed,
    });
  }

  /**
   * Stop recording and save
   */
  stopRecording(status: 'completed' | 'failed'): ExecutionRecording {
    if (!this.currentExecution) {
      throw new Error('No recording in progress');
    }

    const recording: ExecutionRecording = {
      execution_id: this.currentExecution.execution_id,
      plan_id: this.currentExecution.plan_id,
      org_id: this.currentExecution.org_id,
      started_at: new Date(),
      completed_at: new Date(),
      status,
      events: this.currentExecution.events,
      checkpoints: this.currentExecution.checkpoints,
      recording_hash: this.computeHash(this.currentExecution.events),
    };

    this.recordings.set(recording.execution_id, recording);
    this.currentExecution = undefined;

    return recording;
  }

  /**
   * Get recording by execution ID
   */
  getRecording(execution_id: string): ExecutionRecording | undefined {
    return this.recordings.get(execution_id);
  }

  /**
   * List all recordings
   */
  listRecordings(): ExecutionRecording[] {
    return Array.from(this.recordings.values());
  }

  /**
   * Get recordings by plan ID
   */
  getRecordingsByPlan(plan_id: string): ExecutionRecording[] {
    return Array.from(this.recordings.values()).filter((r) => r.plan_id === plan_id);
  }

  /**
   * Compute deterministic hash of events (for replay verification)
   */
  private computeHash(events: AnyEvent[]): string {
    const eventSequence = events
      .map((e) => ({
        type: e.type,
        timestamp: e.timestamp.toISOString(),
        execution_id: e.execution_id,
      }))
      .map((e) => JSON.stringify(e))
      .join('|');

    // Deterministic hash
    let hash = 0;
    for (let i = 0; i < eventSequence.length; i++) {
      const char = eventSequence.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Export recording as JSON
   */
  exportRecording(execution_id: string): string | null {
    const recording = this.recordings.get(execution_id);
    if (!recording) return null;

    return JSON.stringify(recording, null, 2);
  }

  /**
   * Import recording from JSON
   */
  importRecording(json: string): ExecutionRecording {
    const recording = JSON.parse(json) as ExecutionRecording;
    this.recordings.set(recording.execution_id, recording);
    return recording;
  }

  /**
   * Clear all recordings
   */
  clearRecordings(): void {
    this.recordings.clear();
    this.currentExecution = undefined;
  }

  /**
   * Get recordings count
   */
  getRecordingsCount(): number {
    return this.recordings.size;
  }
}

export const executionRecorder = new ExecutionRecorder();
