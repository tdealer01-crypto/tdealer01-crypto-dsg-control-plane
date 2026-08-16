import { seedData } from '@/lib/dsg/seed/seed-engine';
import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';

export interface CodeEvolutionInput {
  jobId: string;
  workspaceId: string;
  goal: string;
  planApproved: boolean;
  isDestructiveWrite?: boolean;
  destructionProof?: boolean;
}

export interface CodeEvolutionResult {
  ok: boolean;
  jobId: string;
  codebaseStateHash: string;
  z3ProofHash: string;
  blockedReasons: string[];
  readyToWrite: boolean;
}

export async function runCodeEvolution(input: CodeEvolutionInput): Promise<CodeEvolutionResult> {
  const seedResult = await seedData({
    dataType: 'codebase_state',
    query: input.goal,
    requiredEvidence: true,
    context: JSON.stringify({ jobId: input.jobId, goal: input.goal }),
  });

  const z3Result = await runZ3AgentGate({
    agentType: 'code-evolution',
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    goalLocked: true,
    gateAllow: input.planApproved && seedResult.ok,
    evidenceExists: seedResult.ok,
    mockState: false,
    planApproved: input.planApproved,
    writesCode: input.planApproved && seedResult.ok,
    isDestructiveWrite: input.isDestructiveWrite ?? false,
    destructionProof: input.destructionProof ?? false,
    dataNeeded: true,
    dataUnknown: !seedResult.ok,
    searchAttempted: seedResult.searchAttempted,
  });

  const blockedReasons = [
    ...z3Result.violations.map((violation) => violation.code),
    ...(seedResult.ok ? [] : [seedResult.blockReason ?? 'CODEBASE_EVIDENCE_UNAVAILABLE']),
  ];
  const readyToWrite = z3Result.pass && input.planApproved && seedResult.ok;

  return {
    ok: readyToWrite,
    jobId: input.jobId,
    codebaseStateHash: seedResult.evidenceHash,
    z3ProofHash: z3Result.z3ProofHash,
    blockedReasons,
    readyToWrite,
  };
}
