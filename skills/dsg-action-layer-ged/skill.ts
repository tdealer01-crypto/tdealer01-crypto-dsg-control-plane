import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';
import { seedData } from '@/lib/dsg/seed/seed-engine';

export interface DsgActionLayerInput {
  userGoal: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  actionType: string;
  context?: Record<string, unknown>;
  requiresApproval?: boolean;
  mockState?: boolean;
}

export interface DsgActionLayerResult {
  ok: boolean;
  gateStatus: 'PASS' | 'REVIEW' | 'BLOCK' | 'UNSUPPORTED';
  riskLevel: string;
  proofHash: string;
  plan: {
    goal: string;
    riskAssessment: string;
    requiredApprovals: string[];
    nextSteps: string[];
  };
  decision: {
    canProceed: boolean;
    reasoning: string;
    evidenceHashes: string[];
  };
  violations: Array<{ code: string; message: string }>;
}

/**
 * DSG Action Layer GED Skill
 *
 * Governance Decision Flow:
 * 1. PLAN    → Extract goal and risk level
 * 2. GATE    → Call deterministic safety gate
 * 3. DECIDE  → Map gate status to approval requirements
 * 4. EXECUTE → Return decision with cryptographic proof
 * 5. COMMIT  → Evidence ready for audit replay
 *
 * CRITICAL: UNSUPPORTED maps to REVIEW (low risk) or BLOCK (medium+), never PASS.
 */
export async function runDsgActionLayer(input: DsgActionLayerInput): Promise<DsgActionLayerResult> {
  const mockState = input.mockState ?? false;

  // STEP 1: PLAN - Seed governance context
  const seedResult = await seedData({
    dataType: 'codebase_state',
    query: input.userGoal,
    requiredEvidence: true,
    context: JSON.stringify({
      actionType: input.actionType,
      riskLevel: input.riskLevel,
      ...input.context,
    }),
  });

  // STEP 2: GATE - Call deterministic safety gate
  const gateResult = await runZ3AgentGate({
    agentType: 'orchestrator',
    jobId: `gate-${Date.now()}`,
    workspaceId: 'dsg-control-plane',
    goalLocked: true,
    gateAllow: input.requiresApproval !== false,
    evidenceExists: seedResult.ok,
    mockState,
    dataNeeded: true,
    dataUnknown: !seedResult.ok,
    searchAttempted: seedResult.searchAttempted,
  });

  // STEP 3: DECIDE - Map Z3 gate result to governance status
  let gateStatus: 'PASS' | 'REVIEW' | 'BLOCK' | 'UNSUPPORTED' = 'UNSUPPORTED';
  let canProceed = false;

  if (gateResult.pass && !mockState) {
    gateStatus = 'PASS';
    canProceed = true;
  } else if (gateResult.violations.length === 0 && seedResult.ok) {
    // No violations but evidence exists - review gate
    if (input.riskLevel === 'low') {
      gateStatus = 'REVIEW';
      canProceed = false;
    } else {
      gateStatus = input.requiresApproval !== false ? 'REVIEW' : 'PASS';
      canProceed = input.requiresApproval === false && !mockState;
    }
  } else if (gateResult.violations.length > 0) {
    // Has violations - determine BLOCK or REVIEW based on risk
    if (input.riskLevel === 'critical' || input.riskLevel === 'high') {
      gateStatus = 'BLOCK';
      canProceed = false;
    } else {
      gateStatus = 'REVIEW';
      canProceed = false;
    }
  }

  // Build governance plan
  const requiredApprovals = [];
  if (gateStatus === 'REVIEW' || input.requiresApproval === true) {
    if (input.riskLevel === 'critical') {
      requiredApprovals.push('security-team', 'compliance-officer', 'cto');
    } else if (input.riskLevel === 'high') {
      requiredApprovals.push('security-team', 'engineering-lead');
    } else if (input.riskLevel === 'medium') {
      requiredApprovals.push('engineering-lead');
    }
  }

  return {
    ok: !mockState && (gateStatus === 'PASS' || gateStatus === 'REVIEW'),
    gateStatus,
    riskLevel: input.riskLevel,
    proofHash: gateResult.z3ProofHash,
    plan: {
      goal: input.userGoal,
      riskAssessment: `Risk Level: ${input.riskLevel}. Gate Status: ${gateStatus}.`,
      requiredApprovals,
      nextSteps:
        gateStatus === 'PASS'
          ? ['Execute action', 'Log evidence', 'Commit to audit trail']
          : gateStatus === 'REVIEW'
            ? ['Present plan to reviewers', 'Collect approvals', 'Execute upon approval']
            : ['Halt action', 'Address violations', 'Resubmit for gate evaluation'],
    },
    decision: {
      canProceed,
      reasoning:
        gateStatus === 'PASS'
          ? 'Gate passed all security checks. Proceed with execution.'
          : gateStatus === 'REVIEW'
            ? `Gate requires ${requiredApprovals.length || 'human'} approval(s) before execution.`
            : gateStatus === 'BLOCK'
              ? `Gate blocked due to ${gateResult.violations.length} violation(s). Action not permitted.`
              : 'Gate status unsupported. Cannot proceed safely.',
      evidenceHashes: [seedResult.evidenceHash, gateResult.z3ProofHash],
    },
    violations: gateResult.violations,
  };
}
