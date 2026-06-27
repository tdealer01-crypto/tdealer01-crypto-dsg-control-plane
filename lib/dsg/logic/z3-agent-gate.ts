import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export type AgentType =
  | 'orchestrator'
  | 'code-evolution'
  | 'test-coverage'
  | 'deploy-monitor'
  | 'browser-research'
  | 'security-gate';

export interface AgentPlanInput {
  agentType: AgentType;
  jobId: string;
  workspaceId: string;
  goalLocked: boolean;
  gateAllow: boolean;
  evidenceExists: boolean;
  mockState: boolean;
  // Code Evolution
  planApproved?: boolean;
  writesCode?: boolean;
  isDestructiveWrite?: boolean;
  destructionProof?: boolean;
  // Test Coverage
  testRunComplete?: boolean;
  newCoverageGtePrev?: boolean;
  // Browser Research
  usesBrowserResult?: boolean;
  browserEvidenceHashSet?: boolean;
  // Seed Engine
  dataNeeded?: boolean;
  dataUnknown?: boolean;
  searchAttempted?: boolean;
}

export interface Z3AgentGateResult {
  status: 'PASS' | 'BLOCK' | 'REVIEW';
  pass: boolean;
  z3Check: string;
  z3ProofHash: string;
  violations: Array<{ code: string; message: string }>;
  agentType: AgentType;
  jobId: string;
}

function buildPythonArgs(input: AgentPlanInput): Record<string, unknown> {
  return {
    agent_type: input.agentType,
    job_id: input.jobId,
    workspace_id: input.workspaceId,
    goal_locked: input.goalLocked,
    gate_allow: input.gateAllow,
    evidence_exists: input.evidenceExists,
    mock_state: input.mockState,
    plan_approved: input.planApproved ?? false,
    writes_code: input.writesCode ?? false,
    is_destructive_write: input.isDestructiveWrite ?? false,
    destruction_proof: input.destructionProof ?? false,
    test_run_complete: input.testRunComplete ?? false,
    new_coverage_gte_prev: input.newCoverageGtePrev ?? true,
    uses_browser_result: input.usesBrowserResult ?? false,
    browser_evidence_hash_set: input.browserEvidenceHashSet ?? false,
    data_needed: input.dataNeeded ?? false,
    data_unknown: input.dataUnknown ?? false,
    search_attempted: input.searchAttempted ?? false,
  };
}

const OBSERVER_PATH = path.join(process.cwd(), 'lib/dsg/logic/z3_plan_observer.py');

const RUNNER_SCRIPT = `
import sys, json
sys.path.insert(0, '.')
from lib.dsg.logic.z3_plan_observer import (
    AgentType, AgentPlanSnapshot, verify_agent_invariants, agent_result_to_dict
)

args = json.loads(sys.argv[1])
snapshot = AgentPlanSnapshot(
    agent_type=AgentType(args['agent_type']),
    job_id=args['job_id'],
    workspace_id=args['workspace_id'],
    goal_locked=args['goal_locked'],
    gate_allow=args['gate_allow'],
    evidence_exists=args['evidence_exists'],
    mock_state=args['mock_state'],
    plan_approved=args['plan_approved'],
    writes_code=args['writes_code'],
    is_destructive_write=args['is_destructive_write'],
    destruction_proof=args['destruction_proof'],
    test_run_complete=args['test_run_complete'],
    new_coverage_gte_prev=args['new_coverage_gte_prev'],
    uses_browser_result=args['uses_browser_result'],
    browser_evidence_hash_set=args['browser_evidence_hash_set'],
    data_needed=args['data_needed'],
    data_unknown=args['data_unknown'],
    search_attempted=args['search_attempted'],
)
result = verify_agent_invariants(snapshot)
print(json.dumps(agent_result_to_dict(result)))
`;

export async function runZ3AgentGate(input: AgentPlanInput): Promise<Z3AgentGateResult> {
  const args = buildPythonArgs(input);
  const argsJson = JSON.stringify(args);

  try {
    const { stdout } = await execFileAsync('python3', ['-c', RUNNER_SCRIPT, argsJson], {
      cwd: process.cwd(),
      timeout: 10_000,
    });

    const raw = JSON.parse(stdout.trim()) as {
      status: string;
      pass: boolean;
      z3_check: string;
      z3_proof_hash: string;
      violations: Array<{ code: string; message: string }>;
      agent_type: string;
      job_id: string;
    };

    return {
      status: raw.status as 'PASS' | 'BLOCK' | 'REVIEW',
      pass: raw.pass,
      z3Check: raw.z3_check,
      z3ProofHash: raw.z3_proof_hash,
      violations: raw.violations,
      agentType: raw.agent_type as AgentType,
      jobId: raw.job_id,
    };
  } catch (err) {
    // If Z3/Python unavailable, fail closed (BLOCK) with evidence
    return {
      status: 'BLOCK',
      pass: false,
      z3Check: 'unavailable',
      z3ProofHash: 'sha256:unavailable',
      violations: [{ code: 'Z3_RUNNER_UNAVAILABLE', message: String(err) }],
      agentType: input.agentType,
      jobId: input.jobId,
    };
  }
}

export function isZ3Pass(result: Z3AgentGateResult): boolean {
  return result.status === 'PASS' && result.pass;
}
