import { controlHash } from './control-kernel';

export type WorkflowState = 'GOAL' | 'CTX' | 'PLAN' | 'OK_PLAN' | 'BOX' | 'BRANCH' | 'CHECKED' | 'PREVIEW' | 'PROOF' | 'REPORT' | 'STOP';
export type WorkflowEvent = 'ctx' | 'plan' | 'ok_plan' | 'box' | 'branch' | 'checked' | 'preview' | 'proof' | 'report' | 'stop';

export type WorkflowEdge = {
  from: WorkflowState;
  event: WorkflowEvent;
  to: WorkflowState;
  needs: string[];
};

export type WorkflowRun = {
  ok: boolean;
  start: WorkflowState;
  finish: WorkflowState;
  applied: WorkflowEdge[];
  blocked: string[];
  runHash: string;
};

const edges: WorkflowEdge[] = [
  { from: 'GOAL', event: 'ctx', to: 'CTX', needs: ['rbac_checked'] },
  { from: 'CTX', event: 'plan', to: 'PLAN', needs: ['plan_visible'] },
  { from: 'PLAN', event: 'ok_plan', to: 'OK_PLAN', needs: ['approval_recorded'] },
  { from: 'OK_PLAN', event: 'box', to: 'BOX', needs: ['protected_value_scan_passed'] },
  { from: 'BOX', event: 'branch', to: 'BRANCH', needs: ['branch_or_pr_created'] },
  { from: 'BRANCH', event: 'checked', to: 'CHECKED', needs: ['typecheck_passed', 'build_passed'] },
  { from: 'CHECKED', event: 'preview', to: 'PREVIEW', needs: ['preview_loaded'] },
  { from: 'PREVIEW', event: 'proof', to: 'PROOF', needs: ['flow_proof_passed'] },
  { from: 'PROOF', event: 'report', to: 'REPORT', needs: ['report_ready'] },
];

function edgeFor(from: WorkflowState, event: WorkflowEvent): WorkflowEdge | undefined {
  return edges.find((item) => item.from === from && item.event === event);
}

export function runWorkflow(input: { events: WorkflowEvent[]; evidence: Record<string, boolean>; start?: WorkflowState }): WorkflowRun {
  const start = input.start ?? 'GOAL';
  let current: WorkflowState = start;
  const applied: WorkflowEdge[] = [];
  const blocked: string[] = [];

  for (const event of input.events) {
    if (event === 'stop') {
      current = 'STOP';
      blocked.push('STOP_EVENT');
      break;
    }
    const edge = edgeFor(current, event);
    if (!edge) {
      blocked.push(`NO_EDGE:${current}:${event}`);
      current = 'STOP';
      break;
    }
    const missing = edge.needs.filter((key) => !input.evidence[key]);
    if (missing.length) {
      blocked.push(...missing.map((key) => `MISSING:${key}`));
      current = 'STOP';
      break;
    }
    applied.push(edge);
    current = edge.to;
  }

  const basis = { start, finish: current, events: input.events, evidence: input.evidence, applied, blocked };
  return { ok: blocked.length === 0 && current !== 'STOP', start, finish: current, applied, blocked, runHash: controlHash(basis) };
}

export function localCheckEvents(): WorkflowEvent[] {
  return ['ctx', 'plan', 'ok_plan', 'box', 'branch', 'checked'];
}
