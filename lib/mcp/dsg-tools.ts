import crypto from 'node:crypto';
import { evaluateDeterministicGate } from '@/lib/dsg/deterministic/gate-engine';
import type { DeterministicRiskLevel } from '@/lib/dsg/deterministic/types';
import { buildEvidenceEnvelope, EVIDENCE_SEVERITY } from '@/lib/ccvs/evidence-collector';
import type { EvidenceType } from '@/lib/ccvs/evidence-collector';
import { REQUIREMENT_CATALOG } from '@/lib/ccvs/compliance-matrix';
import type { ComplianceMatrix, ComplianceMatrixRow } from '@/lib/ccvs/compliance-matrix';
import type { DsgToolName } from './schemas';

const BLOCKED_CLAIMS = new Set([
  'production-ready',
  'marketplace-ready',
  'enterprise-ready 100%',
  'full customer production go-live',
  'certified compliance',
  'guaranteed compliance',
  'third-party audited',
  'worm-certified storage',
  'jwt/jwks auth complete',
  'real cryptographic signing complete',
  'external production z3 solver invocation',
  'mainnet launched',
]);

const ALLOWED_CLAIMS = new Set([
  'production-connected',
  'evidence-ready',
  'audit-ready',
  'governance-enabling',
  'deterministic gate scaffold',
  'setup-ready',
  'pre-audit evidence mapping',
]);

function randomToken(len = 24): string {
  return crypto.randomBytes(len).toString('base64url').slice(0, len);
}

export type DsgToolResult =
  | { ok: true; result: unknown }
  | { ok: false; code: number; message: string };

export async function callDsgTool(
  name: DsgToolName,
  args: Record<string, unknown>
): Promise<DsgToolResult> {
  try {
    switch (name) {
      case 'dsg.evaluate':
        return await handleEvaluate(args);
      case 'dsg.verifyClaim':
        return handleVerifyClaim(args);
      case 'dsg.recordEvidence':
        return handleRecordEvidence(args);
      case 'dsg.exportComplianceBundle':
        return handleExportComplianceBundle(args);
      case 'dsg.getReadiness':
        return handleGetReadiness();
      default:
        return { ok: false, code: -32601, message: `Unknown DSG tool: ${String(name)}` };
    }
  } catch (err) {
    return { ok: false, code: -32603, message: err instanceof Error ? err.message : 'DSG tool error' };
  }
}

async function handleEvaluate(args: Record<string, unknown>): Promise<DsgToolResult> {
  const action = String(args.action ?? '');
  const actor = String(args.actor ?? 'unknown');
  const tool = String(args.tool ?? action);
  const argsContext = (args.args && typeof args.args === 'object') ? args.args as Record<string, unknown> : {};
  const env = (args.env && typeof args.env === 'object') ? args.env as Record<string, unknown> : {};

  const riskLevel = (['low', 'medium', 'high', 'critical'].includes(String(env.riskLevel))
    ? String(env.riskLevel)
    : 'medium') as DeterministicRiskLevel;

  const context: Record<string, unknown> = {
    action,
    actor,
    tool,
    ...argsContext,
    requirement_clear: Boolean(action),
    permission_granted: Boolean(actor),
    tool_available: Boolean(tool),
  };

  const request = {
    nonce: randomToken(24),
    idempotencyKey: randomToken(32),
    context,
    ...(env.planId ? { planId: String(env.planId) } : {}),
    ...(env.policyRef ? { policyRef: String(env.policyRef) } : {}),
    riskLevel,
  };

  const decision = await evaluateDeterministicGate(request);

  return {
    ok: true,
    result: {
      gateStatus: decision.gateStatus,
      proofStatus: decision.proofStatus,
      riskLevel: decision.riskLevel,
      reason: decision.reason ?? null,
      proofHash: decision.proof.proofHash,
      proofId: decision.proof.proofId,
      constraintsChecked: decision.proof.constraintsChecked,
      boundary: {
        statement: 'Deterministic TypeScript static-check scaffold. No external Z3 solver invoked.',
        externalSolverInvoked: false,
        productionReadyClaim: false,
      },
    },
  };
}

function handleVerifyClaim(args: Record<string, unknown>): DsgToolResult {
  const claim = String(args.claim ?? '').trim().toLowerCase();
  const evidenceRefs = Array.isArray(args.evidenceRefs) ? args.evidenceRefs as string[] : [];

  if (BLOCKED_CLAIMS.has(claim)) {
    return {
      ok: true,
      result: {
        allowed: false,
        status: 'blocked',
        reason: `Claim "${claim}" requires independent third-party evidence that is not present. Per DSG policy, this claim is blocked without separately verified evidence.`,
        claimBoundary: 'pre-audit evidence mapping',
        evidenceRefsReceived: evidenceRefs.length,
      },
    };
  }

  if (ALLOWED_CLAIMS.has(claim)) {
    return {
      ok: true,
      result: {
        allowed: true,
        status: 'allowed',
        reason: `Claim "${claim}" is within the allowed evidence-ready boundary.`,
        claimBoundary: claim,
        evidenceRefsReceived: evidenceRefs.length,
      },
    };
  }

  if (evidenceRefs.length > 0) {
    return {
      ok: true,
      result: {
        allowed: true,
        status: 'allowed',
        reason: `Claim "${claim}" is not in the blocked list and has ${evidenceRefs.length} evidence reference(s) provided.`,
        claimBoundary: 'evidence-supported',
        evidenceRefsReceived: evidenceRefs.length,
      },
    };
  }

  return {
    ok: true,
    result: {
      allowed: false,
      status: 'requires-evidence',
      reason: `Claim "${claim}" requires at least one evidence reference to be considered valid. Provide evidenceRefs.`,
      claimBoundary: 'pending',
      evidenceRefsReceived: 0,
    },
  };
}

function handleRecordEvidence(args: Record<string, unknown>): DsgToolResult {
  const kind = String(args.kind ?? 'unit') as EvidenceType;
  const hash = String(args.hash ?? '');
  const url = String(args.url ?? '');
  const metadata = (args.metadata && typeof args.metadata === 'object') ? args.metadata as Record<string, unknown> : {};

  if (!EVIDENCE_SEVERITY[kind]) {
    return { ok: false, code: -32602, message: `Invalid evidence kind: ${kind}` };
  }

  const envelope = buildEvidenceEnvelope({
    evidenceType: kind,
    subjects: [{ name: url || `evidence:${kind}`, digest: { sha256: hash } }],
    run: {
      repo: String(metadata.repo ?? 'mcp:unknown'),
      commit: String((metadata.commit ?? hash.slice(0, 16)) || 'unknown'),
      workflow_run_id: `mcp-${Date.now()}`,
      builder_id: 'mcp:dsg.recordEvidence',
      invocation_id: randomToken(16),
    },
    oidc: {
      issuer: 'https://token.actions.githubusercontent.com',
      audience: 'ccvs-evidence',
      sub: String(metadata.actor ?? 'mcp:operator'),
    },
    metrics: {
      ...(metadata.testCount !== undefined ? { tests_total: Number(metadata.testCount) } : {}),
      ...(metadata.passCount !== undefined ? { tests_passed: Number(metadata.passCount) } : {}),
      ...metadata,
    },
    policyVersion: String(metadata.policyVersion ?? 'v1'),
  });

  return {
    ok: true,
    result: {
      envelopeId: envelope.integrity.chain_hash,
      integrityHash: envelope.integrity.chain_hash,
      severityLevel: envelope.severity_level,
      schema_version: envelope.schema_version,
      generated_at: envelope.generated_at,
    },
  };
}

function handleExportComplianceBundle(args: Record<string, unknown>): DsgToolResult {
  const framework = String(args.framework ?? 'all');

  const filtered = framework === 'all'
    ? REQUIREMENT_CATALOG
    : REQUIREMENT_CATALOG.filter((r) => r.framework === framework);

  if (filtered.length === 0) {
    return { ok: false, code: -32602, message: `No controls found for framework: ${framework}` };
  }

  const rows: ComplianceMatrixRow[] = filtered.map((r) => ({
    ...r,
    evidence_hash: null,
    status: 'pending' as const,
    verified_at: null,
  }));

  const summary = {
    total: rows.length,
    pass: 0,
    fail: 0,
    pending: rows.length,
    not_verified: 0,
    claim_pass_eligible: false,
  };

  const matrix: ComplianceMatrix & { framework: string; boundary: Record<string, unknown> } = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    policy_version: 'v1',
    framework,
    rows,
    summary,
    boundary: {
      certificationClaim: false,
      independentAuditClaim: false,
      statement: 'Pre-audit evidence mapping only. Not a legal certification or independent audit result.',
    },
  };

  return { ok: true, result: matrix };
}

function handleGetReadiness(): DsgToolResult {
  const total = REQUIREMENT_CATALOG.length;
  const euAiAct = REQUIREMENT_CATALOG.filter((r) => r.framework === 'EU AI Act').length;
  const iso42001 = REQUIREMENT_CATALOG.filter((r) => r.framework === 'ISO 42001').length;

  return {
    ok: true,
    result: {
      ok: true,
      readinessLevel: 'PENDING' as const,
      complianceSummary: {
        total,
        frameworks: { 'EU AI Act': euAiAct, 'ISO 42001': iso42001 },
        claim_pass_eligible: false,
        note: 'Live DB evidence run required for claim_pass_eligible=true. Run npm run test:live:db:required.',
      },
      evidenceChainHealthy: true,
      boundary: {
        certificationClaim: false,
        independentAuditClaim: false,
        statement: 'Pre-audit evidence mapping. No independent certification.',
      },
      timestamp: new Date().toISOString(),
    },
  };
}
