import { evaluateAutomationController } from '../../../lib/dsg/controller/automation-controller';
import type { DsgAutomationControllerRequest } from '../../../lib/dsg/controller/types';

function baseRequest(overrides: Partial<DsgAutomationControllerRequest> = {}): DsgAutomationControllerRequest {
  return {
    actionId: 'act-test-001',
    actionType: 'agent_action',
    actor: {
      userId: 'user-test-001',
      role: 'operator',
      workspaceId: 'org-test-001',
    },
    resource: {
      type: 'workflow',
      id: 'wf-test-001',
      classification: 'internal',
    },
    evidence: [
      {
        id: 'ev-test-001',
        title: 'Repository-stated control evidence',
        state: 'REPO_STATED',
        source: 'repo',
      },
    ],
    context: {
      requirement_clear: true,
      tool_available: true,
      permission_granted: true,
      secret_bound: true,
      dependency_resolved: true,
      testable: true,
      audit_hook_available: true,
    },
    nonce: 'nonce-test-001',
    idempotencyKey: 'idem-test-001',
    ...overrides,
  };
}

describe('DSG automation controller', () => {
  it('passes a fully evidenced low-risk agent action through the real deterministic gate scaffold', () => {
    const result = evaluateAutomationController(
      baseRequest({
        resource: {
          type: 'workflow',
          id: 'wf-public-001',
          classification: 'public',
        },
      })
    );

    expect(result.type).toBe('dsg-automation-controller-decision');
    expect(result.ok).toBe(true);
    expect(result.decision).toBe('PASS');
    expect(result.gate.proof.proofHash).toBeTruthy();
    expect(result.evidenceBoundary.externalSolverInvoked).toBe(false);
    expect(result.evidenceBoundary.productionReadyClaim).toBe(false);
  });

  it('does not pass high-risk action when required approval is missing', () => {
    const result = evaluateAutomationController(
      baseRequest({
        actionType: 'deployment_action',
        resource: {
          type: 'deployment',
          id: 'deploy-test-001',
          classification: 'secret',
        },
        context: {
          requirement_clear: true,
          tool_available: true,
          permission_granted: true,
          secret_bound: true,
          dependency_resolved: true,
          testable: true,
          deploy_target_ready: true,
          audit_hook_available: true,
          approval_available: false,
        },
      })
    );

    expect(result.ok).toBe(false);
    expect(result.requiredApproval).toBe(true);
    expect(result.decision).not.toBe('PASS');
    expect(result.policy.failureReasons).toContain('required_approval_not_available');
    expect(result.remediation).toContain('attach_human_approval_before_execution');
  });

  it('blocks unsupported evidence from becoming a passing consumer-facing decision', () => {
    const result = evaluateAutomationController(
      baseRequest({
        evidence: [
          {
            id: 'ev-unsupported-001',
            title: 'Unsupported customer claim',
            state: 'UNSUPPORTED',
            source: 'unverified-copy',
          },
        ],
      })
    );

    expect(result.ok).toBe(false);
    expect(result.decision).not.toBe('PASS');
    expect(result.policy.failureReasons).toContain('blocked_or_unsupported_evidence_present');
    expect(result.remediation).toContain('attach_verified_or_repo_stated_evidence');
  });
});
