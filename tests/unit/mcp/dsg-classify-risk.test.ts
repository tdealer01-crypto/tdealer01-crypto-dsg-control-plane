import { describe, it, expect } from 'vitest';
import { callDsgTool } from '@/lib/mcp/dsg-tools';

describe('dsg.classifyRisk', () => {
  it('rejects a missing actionDescription', async () => {
    const result = await callDsgTool('dsg.classifyRisk', {});
    expect(result.ok).toBe(false);
  });

  it('classifies a plain action with no flags as low risk', async () => {
    const result = await callDsgTool('dsg.classifyRisk', {
      actionDescription: 'read a dashboard widget',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const output = result.result as { riskLevel: string; requiresApproval: boolean };
      expect(output.riskLevel).toBe('low');
      expect(output.requiresApproval).toBe(false);
    }
  });

  it('classifies money movement as critical', async () => {
    const result = await callDsgTool('dsg.classifyRisk', {
      actionDescription: 'approve a vendor payout',
      capabilities: { canMoveMoneyOrApprovePayment: true },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const output = result.result as { riskLevel: string; requiredEvidence: string[] };
      expect(output.riskLevel).toBe('critical');
      expect(output.requiredEvidence).toContain('explicit_approval_path');
    }
  });

  it('takes the highest triggered base tier, not the last one evaluated', async () => {
    const result = await callDsgTool('dsg.classifyRisk', {
      actionDescription: 'send a notification and deploy a hotfix',
      capabilities: {
        canSendExternalCommunication: true, // medium
        canDeploySoftware: true, // high
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const output = result.result as { riskLevel: string };
      expect(output.riskLevel).toBe('high');
    }
  });

  it('escalates a level when there is no audit trail, never de-escalates', async () => {
    const result = await callDsgTool('dsg.classifyRisk', {
      actionDescription: 'send an external email with no logging',
      capabilities: {
        canSendExternalCommunication: true, // medium
        hasNoCurrentAuditTrail: true, // +1
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const output = result.result as { riskLevel: string; escalated: boolean };
      expect(output.riskLevel).toBe('high');
      expect(output.escalated).toBe(true);
    }
  });

  it('caps escalation at critical instead of overflowing', async () => {
    const result = await callDsgTool('dsg.classifyRisk', {
      actionDescription: 'grant admin access with no approval',
      capabilities: {
        canGrantAccessOrChangePermissions: true, // critical
        hasNoApprovalBeforeExecution: true, // would overflow past critical
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const output = result.result as { riskLevel: string };
      expect(output.riskLevel).toBe('critical');
    }
  });

  it('never claims certification or independent audit in its boundary', async () => {
    const result = await callDsgTool('dsg.classifyRisk', {
      actionDescription: 'deploy software',
      capabilities: { canDeploySoftware: true },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const output = result.result as { boundary: { statement: string } };
      expect(output.boundary.statement.toLowerCase()).not.toContain('certified');
    }
  });
});
