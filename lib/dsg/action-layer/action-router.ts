import { dsgHash } from './action-contract';
import type { DsgActionContract, DsgActionResult, DsgActionTimelineEvent } from './types';

export function routeDsgAction(contract: DsgActionContract): DsgActionResult {
  const blockedReasons: string[] = [];

  if (!contract.actor.actorId) blockedReasons.push('actor missing');
  if (!contract.actor.workspaceId) blockedReasons.push('workspace missing');
  if (!contract.inputHash) blockedReasons.push('input hash missing');
  if (contract.mode === 'EXECUTE' && !contract.actor.permissions.includes('dsg:execute')) {
    blockedReasons.push('execute permission missing');
  }

  const status = blockedReasons.length > 0 ? 'BLOCKED' : contract.mode === 'BLOCKED' ? 'BLOCKED' : 'PASS';
  const claim = status === 'PASS' ? 'ACTION_LAYER_EXECUTION_PASS' : 'ACTION_LAYER_PROOF_REQUIRED';
  const proofHash = dsgHash({ contract, status, blockedReasons, claim });
  const at = contract.createdAt;
  const timeline: DsgActionTimelineEvent[] = [
    {
      id: `${contract.actionId}:input`,
      at,
      kind: 'input',
      title: 'Input normalized',
      detail: `inputHash=${contract.inputHash}`,
      proofHash: contract.inputHash,
    },
    {
      id: `${contract.actionId}:contract`,
      at,
      kind: 'contract',
      title: 'Deterministic contract created',
      detail: `${contract.flow}.${contract.intent} risk=${contract.risk} mode=${contract.mode}`,
      proofHash: dsgHash(contract),
    },
    {
      id: `${contract.actionId}:result`,
      at,
      kind: 'result',
      title: status === 'PASS' ? 'Action passed deterministic gate' : 'Action blocked by deterministic gate',
      detail: blockedReasons.length ? blockedReasons.join('; ') : 'all required contract fields present',
      proofHash,
    },
  ];

  return {
    ok: status === 'PASS',
    actionId: contract.actionId,
    flow: contract.flow,
    intent: contract.intent,
    status,
    claim,
    proofHash,
    blockedReasons,
    nextAction: status === 'PASS' ? 'Append proof event to action timeline.' : 'Attach missing proof before execution.',
    timeline,
  };
}
