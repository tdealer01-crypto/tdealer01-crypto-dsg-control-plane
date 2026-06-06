import { controlHash } from './control-kernel';
import { createLaneOrchestration, type LaneInput } from './lane-orchestrator';
import { createSandboxContract } from './sandbox-contract';
import { localCheckEvents, runWorkflow } from './workflow-state';

export type EvidenceReportInput = {
  jobId: string;
  goal: string;
  branchName: string;
  filePaths: string[];
  laneState: LaneInput;
};

export type EvidenceReport = {
  ok: boolean;
  jobId: string;
  goal: string;
  claim: string;
  orchestrationHash: string;
  sandboxHash: string;
  workflowHash: string;
  reportHash: string;
  nextActions: string[];
};

export function createEvidenceReport(input: EvidenceReportInput): EvidenceReport {
  const orchestration = createLaneOrchestration({ jobId: input.jobId, goal: input.goal, state: input.laneState });
  const sandbox = createSandboxContract({ jobId: input.jobId, branchName: input.branchName, filePaths: input.filePaths });
  const workflow = runWorkflow({
    events: localCheckEvents(),
    evidence: {
      rbac_checked: Boolean(input.laneState.rbacChecked),
      plan_visible: Boolean(input.laneState.planReady),
      approval_recorded: Boolean(input.laneState.approvalRecorded),
      protected_value_scan_passed: Boolean(input.laneState.protectedValueScanPassed),
      branch_or_pr_created: Boolean(input.laneState.branchOrPrCreated),
      typecheck_passed: Boolean(input.laneState.typecheckPassed),
      build_passed: Boolean(input.laneState.buildPassed),
    },
  });

  const nextActions = [
    ...(orchestration.control.nextAction ? [orchestration.control.nextAction] : []),
    sandbox.nextAction,
    workflow.ok ? 'Local checked stage passed. Attach preview proof before deployable claim.' : 'Workflow stopped before local checked stage.',
  ];
  const basis = {
    jobId: input.jobId,
    goal: input.goal,
    claim: orchestration.control.allowedClaim,
    orchestrationHash: orchestration.orchestrationHash,
    sandboxHash: sandbox.contractHash,
    workflowHash: workflow.runHash,
    nextActions,
  };

  return {
    ok: orchestration.ok && sandbox.status === 'PASS' && workflow.ok,
    jobId: input.jobId,
    goal: input.goal,
    claim: orchestration.control.allowedClaim,
    orchestrationHash: orchestration.orchestrationHash,
    sandboxHash: sandbox.contractHash,
    workflowHash: workflow.runHash,
    reportHash: controlHash(basis),
    nextActions,
  };
}
