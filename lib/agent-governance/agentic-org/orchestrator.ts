export type LaneStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'BLOCKED'
  | 'FAILED'
  | 'READY_TO_JOIN'
  | 'JOINED'
  | 'COMPLETED';

export interface LaneCheckpoint {
  laneId: string;
  status: LaneStatus;
  repository: string;
  branch: string;
  commitSha?: string;
  evidenceRefs: string[];
  blockers: string[];
}

export interface WaveJoinResult {
  status: 'READY' | 'BLOCKED';
  blockingLanes: string[];
  reasons: string[];
}

const JOINABLE: ReadonlySet<LaneStatus> = new Set(['READY_TO_JOIN', 'JOINED', 'COMPLETED']);

export function evaluateWaveJoin(lanes: LaneCheckpoint[]): WaveJoinResult {
  const blockingLanes: string[] = [];
  const reasons: string[] = [];

  if (lanes.length === 0) {
    return { status: 'BLOCKED', blockingLanes: [], reasons: ['NO_LANES_DEFINED'] };
  }

  for (const lane of lanes) {
    if (!JOINABLE.has(lane.status)) {
      blockingLanes.push(lane.laneId);
      reasons.push(`${lane.laneId}:STATUS_${lane.status}`);
    }
    if (!lane.commitSha) {
      if (!blockingLanes.includes(lane.laneId)) blockingLanes.push(lane.laneId);
      reasons.push(`${lane.laneId}:COMMIT_SHA_MISSING`);
    }
    if (lane.evidenceRefs.length === 0) {
      if (!blockingLanes.includes(lane.laneId)) blockingLanes.push(lane.laneId);
      reasons.push(`${lane.laneId}:EVIDENCE_MISSING`);
    }
    if (lane.blockers.length > 0) {
      if (!blockingLanes.includes(lane.laneId)) blockingLanes.push(lane.laneId);
      reasons.push(`${lane.laneId}:BLOCKERS_PRESENT`);
    }
  }

  return {
    status: blockingLanes.length === 0 ? 'READY' : 'BLOCKED',
    blockingLanes,
    reasons,
  };
}

export function nextLaneStatus(current: LaneStatus, event: 'START' | 'BLOCK' | 'FAIL' | 'VERIFY' | 'JOIN' | 'COMPLETE'): LaneStatus {
  const transitions: Record<LaneStatus, Partial<Record<typeof event, LaneStatus>>> = {
    QUEUED: { START: 'RUNNING', BLOCK: 'BLOCKED', FAIL: 'FAILED' },
    RUNNING: { BLOCK: 'BLOCKED', FAIL: 'FAILED', VERIFY: 'READY_TO_JOIN' },
    BLOCKED: { START: 'RUNNING', FAIL: 'FAILED' },
    FAILED: { START: 'RUNNING' },
    READY_TO_JOIN: { JOIN: 'JOINED', BLOCK: 'BLOCKED', FAIL: 'FAILED' },
    JOINED: { COMPLETE: 'COMPLETED', BLOCK: 'BLOCKED', FAIL: 'FAILED' },
    COMPLETED: {},
  };
  const next = transitions[current][event];
  if (!next) throw new Error(`INVALID_LANE_TRANSITION:${current}->${event}`);
  return next;
}
