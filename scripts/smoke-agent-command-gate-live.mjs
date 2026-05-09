const baseUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.DSG_BASE_URL || 'http://localhost:3000';
const cookie = process.env.DSG_SESSION_COOKIE || '';
const workspaceId = process.env.DSG_SMOKE_ORG_ID || process.env.DSG_WORKSPACE_ID || '';

if (!workspaceId) {
  console.error('Missing DSG_SMOKE_ORG_ID or DSG_WORKSPACE_ID');
  process.exit(2);
}

if (!cookie) {
  console.error('Missing DSG_SESSION_COOKIE for authenticated smoke test');
  process.exit(2);
}

const headers = {
  'content-type': 'application/json',
  cookie,
};

function baseGate(commandId, overrides = {}) {
  return {
    workspaceId,
    runtime: {
      agentId: 'smoke-agent-001',
      agentType: 'workflow-agent',
      sessionId: `smoke-session-${Date.now()}`,
      agentWillExecuteAction: true,
      requiresResultCallback: true,
    },
    command: {
      commandId,
      actionType: 'read',
      targetSystemId: 'smoke-system',
      operationName: 'read_smoke_record',
      riskLevel: 'low',
      dataClasses: ['public'],
      ...overrides.command,
    },
    rbac: {
      actorId: 'smoke-actor',
      role: 'operator',
      permissions: ['tool:execute_low'],
      ...overrides.rbac,
    },
    audit: {
      preAuditEventId: `smoke-audit-${Date.now()}`,
      ledgerId: 'smoke-ledger',
      chainHeadHash: 'smoke-chain-head',
      ...overrides.audit,
    },
    evidence: {
      evidenceManifestId: `smoke-evidence-${Date.now()}`,
      policySnapshotHash: 'smoke-policy-hash',
      ...overrides.evidence,
    },
  };
}

async function post(path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const pass = await post('/api/dsg/agent-command-gate', baseGate(`smoke-pass-${Date.now()}`));
if (pass.status !== 200 || pass.json?.result?.decision !== 'PASS' || pass.json?.persisted !== true) {
  console.error('PASS smoke failed', JSON.stringify(pass, null, 2));
  process.exit(1);
}

const block = await post('/api/dsg/agent-command-gate', baseGate(`smoke-block-${Date.now()}`, {
  command: {
    actionType: 'write',
    riskLevel: 'medium',
    dataClasses: ['internal'],
  },
  rbac: {
    permissions: ['tool:execute_medium'],
  },
}));
if (block.status !== 409 || block.json?.result?.decision !== 'BLOCK' || block.json?.persisted !== true) {
  console.error('BLOCK smoke failed', JSON.stringify(block, null, 2));
  process.exit(1);
}

const envelope = pass.json.result.actionEnvelope;
const receipt = await post('/api/dsg/agent-command-gate/result', {
  workspaceId,
  agentId: envelope.agentId,
  sessionId: envelope.sessionId,
  commandId: envelope.commandId,
  envelopeId: envelope.envelopeId,
  decisionHash: envelope.decisionHash,
  status: 'SUCCESS',
  startedAt: new Date(Date.now() - 1000).toISOString(),
  completedAt: new Date().toISOString(),
  observedResultHash: `observed-${Date.now()}`,
  evidenceItemIds: [`evidence-${Date.now()}`],
  targetSystemReceiptId: `receipt-${Date.now()}`,
});
if (receipt.status !== 200 || receipt.json?.receipt?.accepted !== true || receipt.json?.persisted !== true) {
  console.error('result receipt smoke failed', JSON.stringify(receipt, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  checks: {
    passDecisionHash: pass.json.result.decisionHash,
    blockDecisionHash: block.json.result.decisionHash,
    receiptHash: receipt.json.receipt.receiptHash,
  },
}, null, 2));
