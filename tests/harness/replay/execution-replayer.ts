/**
 * Execution Replayer
 * Replays saved executions for determinism verification
 */

import type { ExecutionRecording } from './execution-recorder';
import { executionRecorder } from './execution-recorder';

export interface ReplayResult {
  original_execution_id: string;
  replay_execution_id: string;
  original_hash: string;
  replay_hash: string;
  deterministic: boolean;
  events_matched: number;
  events_diverged: number;
  first_divergence_at?: number;
  duration_ms: number;
}

export class ExecutionReplayer {
  /**
   * Replay execution from recording
   */
  async replayExecution(
    original_recording: ExecutionRecording,
    runReplay: (events: ExecutionRecording['events']) => Promise<ExecutionRecording>,
  ): Promise<ReplayResult> {
    const start_time = Date.now();

    // Run replay with same event sequence
    const replay_recording = await runReplay(original_recording.events);

    const duration_ms = Date.now() - start_time;

    // Compare recordings
    return this.compareRecordings(original_recording, replay_recording, duration_ms);
  }

  /**
   * Verify determinism: multiple runs of same execution should produce same hash
   */
  async verifyDeterminism(
    execution_id: string,
    runCount: number = 3,
    runExecution: () => Promise<ExecutionRecording>,
  ): Promise<{
    deterministic: boolean;
    hashes: string[];
    runs: ReplayResult[];
  }> {
    const recordings: ExecutionRecording[] = [];

    // Run execution multiple times
    for (let i = 0; i < runCount; i++) {
      const recording = await runExecution();
      recordings.push(recording);
    }

    // Compare all to first
    const baseRecording = recordings[0];
    const runs: ReplayResult[] = [];

    for (let i = 1; i < recordings.length; i++) {
      const result = this.compareRecordings(baseRecording, recordings[i], 0);
      runs.push(result);
    }

    // All runs must be deterministic
    const deterministic = runs.every((r) => r.deterministic);
    const hashes = recordings.map((r) => r.recording_hash);

    return {
      deterministic,
      hashes,
      runs,
    };
  }

  /**
   * Compare two recordings
   */
  private compareRecordings(
    original: ExecutionRecording,
    replay: ExecutionRecording,
    duration_ms: number,
  ): ReplayResult {
    let matched = 0;
    let diverged = 0;
    let firstDivergence: number | undefined;

    // Compare events
    for (let i = 0; i < Math.max(original.events.length, replay.events.length); i++) {
      const orig_event = original.events[i];
      const replay_event = replay.events[i];

      if (!orig_event || !replay_event) {
        diverged += 1;
        if (!firstDivergence) firstDivergence = i;
        continue;
      }

      // Compare event types and order (timestamps may differ slightly)
      if (
        orig_event.type === replay_event.type &&
        orig_event.id === replay_event.id
      ) {
        matched += 1;
      } else {
        diverged += 1;
        if (!firstDivergence) firstDivergence = i;
      }
    }

    return {
      original_execution_id: original.execution_id,
      replay_execution_id: replay.execution_id,
      original_hash: original.recording_hash,
      replay_hash: replay.recording_hash,
      deterministic: original.recording_hash === replay.recording_hash && diverged === 0,
      events_matched: matched,
      events_diverged: diverged,
      first_divergence_at: firstDivergence,
      duration_ms,
    };
  }

  /**
   * Analyze event sequence for patterns
   */
  analyzeEventSequence(recording: ExecutionRecording): {
    total_events: number;
    event_types: Record<string, number>;
    event_rate_per_second: number;
    total_duration_ms: number;
  } {
    if (recording.events.length === 0) {
      return {
        total_events: 0,
        event_types: {},
        event_rate_per_second: 0,
        total_duration_ms: 0,
      };
    }

    const event_types: Record<string, number> = {};
    for (const event of recording.events) {
      event_types[event.type] = (event_types[event.type] || 0) + 1;
    }

    const firstEvent = recording.events[0];
    const lastEvent = recording.events[recording.events.length - 1];
    const total_duration_ms = lastEvent.timestamp.getTime() - firstEvent.timestamp.getTime();
    const event_rate_per_second = (recording.events.length / total_duration_ms) * 1000;

    return {
      total_events: recording.events.length,
      event_types,
      event_rate_per_second: Math.round(event_rate_per_second),
      total_duration_ms,
    };
  }

  /**
   * Get event sequence as string (for visual inspection)
   */
  getEventSequence(recording: ExecutionRecording): string {
    return recording.events
      .map((e, i) => `${i + 1}. ${e.type} (${e.timestamp.toISOString()})`)
      .join('\n');
  }

  /**
   * Compare two event sequences
   */
  compareEventSequences(
    seq1: ExecutionRecording,
    seq2: ExecutionRecording,
  ): {
    match: boolean;
    differences: string[];
  } {
    const differences: string[] = [];

    if (seq1.events.length !== seq2.events.length) {
      differences.push(`Event count mismatch: ${seq1.events.length} vs ${seq2.events.length}`);
    }

    for (let i = 0; i < Math.min(seq1.events.length, seq2.events.length); i++) {
      const e1 = seq1.events[i];
      const e2 = seq2.events[i];

      if (e1.type !== e2.type) {
        differences.push(`Event ${i} type mismatch: ${e1.type} vs ${e2.type}`);
      }
    }

    return {
      match: differences.length === 0,
      differences,
    };
  }
}

export const executionReplayer = new ExecutionReplayer();
