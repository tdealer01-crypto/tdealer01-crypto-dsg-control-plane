import { controlHash, defaultControlSignals, evaluateControl, type ControlClaim, type ControlResult } from './control-kernel';

export type LaneId = 'goal' | 'context' | 'plan' | 'sandbox' | 'build' | 'preview' | 'verify' | 'ui' | 'report';
export type LaneState = 'READY' | 'WAITING' | 'DONE' | 'BLOCKED';

export type LaneInput = {
  goalLocked?: boolean;
  contextReady?: boolean;
  planReady?: boolean;
  approvalRecorded?: boolean;
  sandboxReady?: boolean;
  branchOrPrCreated?: boolean;
  typecheckPassed?: boolean;
  buildPassed?: boolean;
  previewLoaded?: boolean;
  rbacChecked?: boolean;
  protectedValueScanPassed?: boolean;
  flowProofPassed?: boolean;
  uiReady?: boolean;
};

export type LaneNode = {
  id: LaneId;
  label: string;
  state: LaneState;
  dependsOn: LaneId[];
  evidenceKeys: string[];
  nextAction: string;
};

export type LaneOrchestration = {
  ok: boolean;
  mode: 'deterministic_lane_orchestration';
  jobId: string;
  goal: string;
  requestedClaim: ControlClaim;
  lanes: LaneNode[];
  runnableNow: LaneId[];
  waiting: LaneId[];
  done: LaneId[];
  blocked: LaneId[];
  control: ControlResult;
  orchestrationHash: string;
};

function lane(id: LaneId, label: string, state: LaneState, dependsOn: LaneId[], evidenceKeys: string[], nextAction: string): LaneNode {
  return { id, label, state, dependsOn, evidenceKeys, nextAction };
}

function requestedClaim(input: LaneInput): ControlClaim {
  if (input.flowProofPassed && input.previewLoaded && input.buildPassed && input.typecheckPassed && input.rbacChecked) return 'READY_VERIFIED';
  if (input.previewLoaded && input.buildPassed && input.typecheckPassed) return 'DEPLOYABLE_VERIFIED';
  if (input.branchOrPrCreated || input.sandboxReady) return 'IMPLEMENTED_UNVERIFIED';
  return 'PLANNED_ONLY';
}

export function createLaneOrchestration(input: { jobId: string; goal: string; state: LaneInput }): LaneOrchestration {
  const state = input.state;
  const goalDone = Boolean(state.goalLocked);
  const contextDone = Boolean(state.contextReady && state.rbacChecked);
  const planDone = Boolean(state.planReady);
  const approvalDone = Boolean(state.approvalRecorded);
  const sandboxDone = Boolean(state.sandboxReady && state.protectedValueScanPassed);
  const buildDone = Boolean(state.typecheckPassed && state.buildPassed);
  const previewDone = Boolean(state.previewLoaded);
  const verifyDone = Boolean(state.flowProofPassed);
  const uiDone = Boolean(state.uiReady);

  const lanes: LaneNode[] = [
    lane('goal', 'Goal Lock', goalDone ? 'DONE' : 'READY', [], goalDone ? ['goal_locked'] : [], goalDone ? 'Keep the user goal frozen for this run.' : 'Lock the user goal before planning.'),
    lane('context', 'Verified Context', contextDone ? 'DONE' : goalDone ? 'READY' : 'WAITING', ['goal'], contextDone ? ['rbac_checked'] : [], contextDone ? 'Use verified context for every route.' : 'Resolve actor and workspace context.'),
    lane('plan', 'PRD and Plan', planDone ? 'DONE' : goalDone ? 'READY' : 'WAITING', ['goal'], planDone ? ['plan_visible'] : [], planDone ? 'Keep plan visible and hashable.' : 'Create PRD, plan, observer result, and approval boundary.'),
    lane('sandbox', 'Sandbox Contract', sandboxDone ? 'DONE' : contextDone && planDone && approvalDone ? 'READY' : 'WAITING', ['context', 'plan'], sandboxDone ? ['protected_value_scan_passed'] : [], sandboxDone ? 'Keep execution branch-scoped.' : 'Create file, command, and artifact gates.'),
    lane('build', 'Local Build', buildDone ? 'DONE' : sandboxDone ? 'READY' : 'WAITING', ['sandbox'], buildDone ? ['typecheck_passed', 'build_passed'] : [], buildDone ? 'Attach local build output.' : 'Run local lint, typecheck, smoke, and build.'),
    lane('preview', 'Preview Proof', previewDone ? 'DONE' : buildDone ? 'READY' : 'WAITING', ['build'], previewDone ? ['preview_loaded'] : [], previewDone ? 'Keep preview proof attached.' : 'Load the resulting URL once quota is intentionally spent.'),
    lane('verify', 'Proof Verify', verifyDone ? 'DONE' : buildDone ? 'READY' : 'WAITING', ['build'], verifyDone ? ['flow_proof_passed'] : [], verifyDone ? 'Allow claim evaluation.' : 'Run deterministic proof checks.'),
    lane('ui', 'Evidence UI', uiDone ? 'DONE' : planDone ? 'READY' : 'WAITING', ['plan'], uiDone ? ['ui_ready'] : [], uiDone ? 'Show proof, blockers, and next actions.' : 'Render evidence state for users.'),
    lane('report', 'Report', verifyDone && uiDone ? 'READY' : 'WAITING', ['verify', 'ui'], [], 'Report what passed, what remains blocked, and exact test commands.'),
  ];

  const claim = requestedClaim(state);
  const control = evaluateControl({
    jobId: input.jobId,
    goal: input.goal,
    phase: verifyDone ? 'ready' : previewDone ? 'preview' : buildDone ? 'build' : sandboxDone ? 'sandbox' : planDone ? 'plan' : 'prd',
    requestedClaim: claim,
    signals: defaultControlSignals({
      goal_locked: goalDone,
      plan_visible: planDone,
      approval_recorded: approvalDone,
      branch_or_pr_created: Boolean(state.branchOrPrCreated),
      typecheck_passed: Boolean(state.typecheckPassed),
      build_passed: Boolean(state.buildPassed),
      preview_loaded: previewDone,
      rbac_checked: Boolean(state.rbacChecked),
      protected_value_scan_passed: Boolean(state.protectedValueScanPassed),
      flow_proof_passed: verifyDone,
    }),
  });

  const runnableNow = lanes.filter((item) => item.state === 'READY').map((item) => item.id);
  const waiting = lanes.filter((item) => item.state === 'WAITING').map((item) => item.id);
  const done = lanes.filter((item) => item.state === 'DONE').map((item) => item.id);
  const blocked = lanes.filter((item) => item.state === 'BLOCKED').map((item) => item.id);
  const basis = { input, claim, lanes, runnableNow, waiting, done, blocked, controlHash: control.proofHash };

  return {
    ok: control.ok && blocked.length === 0,
    mode: 'deterministic_lane_orchestration',
    jobId: input.jobId,
    goal: input.goal,
    requestedClaim: claim,
    lanes,
    runnableNow,
    waiting,
    done,
    blocked,
    control,
    orchestrationHash: controlHash(basis),
  };
}
