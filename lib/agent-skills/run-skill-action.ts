import { prepareGovernedToolRequest } from '../dsg/tools/governed-tools';
import { getSkillFromLock } from './lock-skill';
import type { SkillRunRequest, SkillRunResult } from './types';

export async function runSkillAction(request: SkillRunRequest): Promise<SkillRunResult> {
  const entry = await getSkillFromLock(request.skillId);

  if (!entry) {
    return {
      ok: false,
      skillId: request.skillId,
      gateStatus: 'blocked',
      gateReason: 'SKILL_NOT_REGISTERED',
      simulated: true,
      auditId: `skill:${request.skillId}:not_registered`,
    };
  }

  if (entry.status === 'blocked') {
    return {
      ok: false,
      skillId: request.skillId,
      gateStatus: 'blocked',
      gateReason: 'SKILL_BLOCKED_IN_REGISTRY',
      simulated: true,
      auditId: `skill:${request.skillId}:registry_blocked`,
    };
  }

  if (entry.status === 'needs_approval' || entry.status === 'needs_review') {
    return {
      ok: false,
      skillId: request.skillId,
      gateStatus: 'review',
      gateReason: `SKILL_REQUIRES_${entry.status.toUpperCase()}`,
      simulated: true,
      auditId: `skill:${request.skillId}:${entry.status}`,
    };
  }

  // Gate via governed-tools framework before any execution
  const prepared = prepareGovernedToolRequest({
    tool: 'api',
    action: entry.permissions.externalWrite ? 'create' : 'query',
    goal: request.goal,
    args: {
      skillId: request.skillId,
      sourceUrl: entry.sourceUrl,
      ...request.args,
    },
    evidence: [
      `skill_hash:${entry.computedHash}`,
      `skill_status:${entry.status}`,
      `risk_level:${entry.riskLevel}`,
    ],
  });

  return {
    ok: prepared.ok,
    skillId: request.skillId,
    gateStatus: prepared.status,
    gateReason: prepared.blockedReasons.length > 0 ? prepared.blockedReasons.join(',') : undefined,
    simulated: true,
    auditId: prepared.audit.id,
  };
}
