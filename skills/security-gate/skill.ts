import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';

export interface GateCheckInput {
  actionId: string;
  agentType: string;
  workspaceId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  evidenceExists: boolean;
  mockState: boolean;
  requiresApproval: boolean;
}

export interface GateCheckResult {
  ok: boolean;
  decision: 'ALLOW' | 'BLOCK';
  actionId: string;
  z3ProofHash: string;
  reason?: string;
}

export async function runSecurityGate(input: GateCheckInput): Promise<GateCheckResult> {
  // Hard block: critical action, requires approval, no evidence
  if (input.riskLevel === 'critical' && input.requiresApproval && !input.evidenceExists) {
    return {
      ok: false,
      decision: 'BLOCK',
      actionId: input.actionId,
      z3ProofHash: 'sha256:none',
      reason: 'CRITICAL_ACTION_REQUIRES_APPROVAL_AND_EVIDENCE',
    };
  }

  const gateAllow = input.riskLevel !== 'critical' || (input.evidenceExists && !input.mockState);

  const z3Result = await runZ3AgentGate({
    agentType: 'security-gate',
    jobId: input.actionId,
    workspaceId: input.workspaceId,
    goalLocked: true,
    gateAllow,
    evidenceExists: input.evidenceExists,
    mockState: input.mockState,
  });

  if (z3Result.pass) {
    return { ok: true, decision: 'ALLOW', actionId: input.actionId, z3ProofHash: z3Result.z3ProofHash };
  }

  return {
    ok: false,
    decision: 'BLOCK',
    actionId: input.actionId,
    z3ProofHash: z3Result.z3ProofHash,
    reason: z3Result.violations.map((v) => v.code).join(';'),
  };
}
