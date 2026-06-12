/**
 * GET /api/proof/claim-readiness
 *
 * Query claim status across the deployed system.
 * Returns a summary of compliance claims and their evidence status.
 *
 * Query parameters:
 *   - claims: comma-separated claim IDs (optional, defaults to standard set)
 *   - includeEvidence: boolean to include detailed evidence artifacts (optional, defaults to false)
 *   - includeSecurityBreakdown: boolean to include detailed security metric breakdown (optional, defaults to false)
 *
 * Example:
 *   GET /api/proof/claim-readiness?claims=ISO-42001-A.6-PLANNING,NIST-GOVERN-01&includeEvidence=true
 *   GET /api/proof/claim-readiness?claims=SECURITY-HARDENING&includeSecurityBreakdown=true
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

type ClaimStatus = 'PASS' | 'BLOCK' | 'PARTIAL';

interface EvidenceRequirement {
  type: string;
  level: number; // 1-5 per CCVS
  description: string;
}

interface ClaimSpec {
  claim_id: string;
  label: string;
  required_evidence_types: EvidenceRequirement[];
  pass_criteria: string;
  responsible_owner: string;
}

interface EvidenceArtifact {
  evidence_type: string;
  hash: string;
  signed_at: string;
  verified: boolean;
  severity_level: number;
}

interface SecurityBreakdown {
  npm_audit?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    timestamp?: string;
  };
  gitleaks?: {
    secrets: number;
    patterns: string[];
    timestamp?: string;
  };
  codeql?: {
    critical: number;
    high: number;
    medium: number;
    tool_version?: string;
    timestamp?: string;
  };
  sbom?: {
    components: number;
    vulnerabilities: number;
    format: string;
    hash?: string;
    timestamp?: string;
  };
}

interface ClaimReadinessReport {
  claim_id: string;
  status: ClaimStatus;
  required_evidence: EvidenceRequirement[];
  available_evidence?: EvidenceArtifact[];
  security_breakdown?: SecurityBreakdown;
  gaps: string[];
  share_url?: string;
}

interface ApiResponse {
  ok: boolean;
  deployment: {
    commit: string;
    env: string;
    policy_version: string;
    timestamp: string;
  };
  claims: ClaimReadinessReport[];
  summary: {
    pass: number;
    partial: number;
    block: number;
    total: number;
    security_claims: number;
  };
  checkpoint: {
    timestamp: string;
    commit: string;
    matrix_hash?: string;
  };
  warning?: string;
}

// ============================================================================
// Claim Evidence Standard (in-memory mapping)
// ============================================================================

const CLAIM_EVIDENCE_STANDARD: Record<string, ClaimSpec> = {
  'ISO-42001-A.6-PLANNING': {
    claim_id: 'ISO-42001-A.6-PLANNING',
    label: 'AI System & Design Controls Planning',
    required_evidence_types: [
      {
        type: 'unit',
        level: 1,
        description: 'Unit test coverage for planning module',
      },
      {
        type: 'integration',
        level: 2,
        description: 'Integration tests for design workflow',
      },
      {
        type: 'adversarial',
        level: 3,
        description: 'Adversarial tests for edge cases',
      },
    ],
    pass_criteria: 'All L1-L3 evidence types present; no unresolved design gaps',
    responsible_owner: 'Engineering / Governance',
  },
  'NIST-GOVERN-01': {
    claim_id: 'NIST-GOVERN-01',
    label: 'NIST Governance & Decision-Making',
    required_evidence_types: [
      {
        type: 'unit',
        level: 1,
        description: 'Unit tests for governance gates',
      },
      {
        type: 'integration',
        level: 2,
        description: 'Integration tests for policy evaluation',
      },
      {
        type: 'replay',
        level: 3,
        description: 'Replay tests for deterministic gates',
      },
    ],
    pass_criteria: 'Gate logic verified; policy version pinned; audit trail complete',
    responsible_owner: 'Security / Compliance',
  },
  'SUPPLY-CHAIN-01': {
    claim_id: 'SUPPLY-CHAIN-01',
    label: 'Supply Chain & Provenance Integrity',
    required_evidence_types: [
      {
        type: 'sbom',
        level: 3,
        description: 'Software Bill of Materials (SBOM)',
      },
      {
        type: 'provenance',
        level: 5,
        description: 'Build provenance & signed attestations',
      },
    ],
    pass_criteria: 'SBOM generated; provenance chain complete; signatures valid',
    responsible_owner: 'DevOps / Build',
  },
  'SECURITY-HARDENING': {
    claim_id: 'SECURITY-HARDENING',
    label: 'Security & Hardening Controls',
    required_evidence_types: [
      {
        type: 'npm_audit',
        level: 3,
        description: 'npm vulnerability audit (critical=0, high≤0)',
      },
      {
        type: 'gitleaks',
        level: 3,
        description: 'gitleaks secret scanning (secrets=0)',
      },
      {
        type: 'codeql',
        level: 3,
        description: 'CodeQL static analysis (critical=0)',
      },
    ],
    pass_criteria: 'Critical vulns = 0; high ≤ 0; no secrets detected; CodeQL critical = 0',
    responsible_owner: 'Security',
  },
  'SBOM-GENERATED': {
    claim_id: 'SBOM-GENERATED',
    label: 'Software Bill of Materials Generation',
    required_evidence_types: [
      {
        type: 'sbom',
        level: 3,
        description: 'SBOM present and valid (CycloneDX format, ≥100 components)',
      },
    ],
    pass_criteria: 'SBOM exists; format = CycloneDX; components ≥ 100',
    responsible_owner: 'DevOps / Build',
  },
  'RUNTIME-INTEGRITY': {
    claim_id: 'RUNTIME-INTEGRITY',
    label: 'Runtime Execution & Audit Trail Integrity',
    required_evidence_types: [
      {
        type: 'integration',
        level: 2,
        description: 'Integration tests for runtime commit',
      },
      {
        type: 'replay',
        level: 3,
        description: 'Replay tests for ledger consistency',
      },
      {
        type: 'mutation',
        level: 4,
        description: 'Mutation tests for gate/policy logic',
      },
    ],
    pass_criteria: 'Runtime commit RPC present; ledger immutable; no evidence gaps',
    responsible_owner: 'Engineering / Runtime',
  },
};

// ============================================================================
// Helper: Parse claims query
// ============================================================================

function parseClaimsQuery(claimsParam: string | undefined): string[] {
  if (!claimsParam || claimsParam.trim() === '') {
    // Default claims when none specified
    return [
      'ISO-42001-A.6-PLANNING',
      'NIST-GOVERN-01',
      'SUPPLY-CHAIN-01',
      'SECURITY-HARDENING',
      'SBOM-GENERATED',
      'RUNTIME-INTEGRITY',
    ];
  }

  return claimsParam
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

// ============================================================================
// Helper: Get claim metadata
// ============================================================================

function getClaimMetadata(claim_id: string): ClaimSpec | null {
  return CLAIM_EVIDENCE_STANDARD[claim_id] ?? null;
}

// ============================================================================
// Helper: Get security evidence from Supabase
// ============================================================================

async function getSecurityEvidence(): Promise<SecurityBreakdown> {
  const breakdown: SecurityBreakdown = {};

  try {
    const admin = getSupabaseAdmin();

    // Query claim_readiness_artifacts for security-related evidence
    const { data, error } = await admin
      .from('claim_readiness_artifacts')
      .select('evidence_type, artifact_data, created_at')
      .in('evidence_type', ['npm_audit', 'gitleaks', 'codeql', 'sbom'])
      .order('created_at', { ascending: false });

    if (error || !data) {
      return breakdown;
    }

    // Group artifacts by evidence_type and take most recent
    const latest: Record<string, (typeof data)[0]> = {};
    for (const artifact of data) {
      if (!latest[artifact.evidence_type]) {
        latest[artifact.evidence_type] = artifact;
      }
    }

    // Parse npm_audit
    if (latest.npm_audit) {
      const artifactData = latest.npm_audit.artifact_data as Record<string, unknown>;
      breakdown.npm_audit = {
        critical: (artifactData.critical as number) ?? 0,
        high: (artifactData.high as number) ?? 0,
        medium: (artifactData.medium as number) ?? 0,
        low: (artifactData.low as number) ?? 0,
        timestamp: latest.npm_audit.created_at ?? undefined,
      };
    }

    // Parse gitleaks
    if (latest.gitleaks) {
      const artifactData = latest.gitleaks.artifact_data as Record<string, unknown>;
      breakdown.gitleaks = {
        secrets: (artifactData.secrets_detected as number) ?? 0,
        patterns: (artifactData.patterns as string[]) ?? [],
        timestamp: latest.gitleaks.created_at ?? undefined,
      };
    }

    // Parse codeql
    if (latest.codeql) {
      const artifactData = latest.codeql.artifact_data as Record<string, unknown>;
      breakdown.codeql = {
        critical: (artifactData.critical as number) ?? 0,
        high: (artifactData.high as number) ?? 0,
        medium: (artifactData.medium as number) ?? 0,
        tool_version: (artifactData.tool_version as string) ?? undefined,
        timestamp: latest.codeql.created_at ?? undefined,
      };
    }

    // Parse sbom
    if (latest.sbom) {
      const artifactData = latest.sbom.artifact_data as Record<string, unknown>;
      breakdown.sbom = {
        components: (artifactData.components as number) ?? 0,
        vulnerabilities: (artifactData.vulnerabilities as number) ?? 0,
        format: (artifactData.format as string) ?? 'unknown',
        hash: (artifactData.hash as string) ?? undefined,
        timestamp: latest.sbom.created_at ?? undefined,
      };
    }

    return breakdown;
  } catch {
    // Supabase unavailable or query failed; return empty breakdown
    return breakdown;
  }
}

// ============================================================================
// Helper: Get evidence status from Supabase
// ============================================================================

async function getEvidenceStatus(
  claim_id: string,
  includeEvidence: boolean
): Promise<{ available: EvidenceArtifact[]; hasRequiredEvidence: boolean }> {
  try {
    const admin = getSupabaseAdmin();

    // Query delivery_proof_reports table for evidence matching this claim
    // In the current schema, matrix_json contains claim results; we parse it here.
    const { data, error } = await admin
      .from('delivery_proof_reports')
      .select('id, matrix_json, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      // No evidence in backend yet; return empty
      return { available: [], hasRequiredEvidence: false };
    }

    const report = data[0];
    const matrix = report.matrix_json as Record<string, unknown> | null;

    if (!matrix) {
      return { available: [], hasRequiredEvidence: false };
    }

    // Extract evidence for this claim from the matrix
    const claimData = (matrix as Record<string, unknown>)[claim_id] as
      | Record<string, unknown>
      | undefined;

    if (!claimData) {
      return { available: [], hasRequiredEvidence: false };
    }

    const artifacts: EvidenceArtifact[] = [];
    const evidenceTypes = Object.keys(claimData);

    for (const evidence_type of evidenceTypes) {
      const ev = (claimData as Record<string, unknown>)[evidence_type] as
        | Record<string, unknown>
        | undefined;

      if (ev && typeof ev === 'object') {
        artifacts.push({
          evidence_type,
          hash: (ev.hash as string) ?? 'unknown',
          signed_at: report.created_at ?? new Date().toISOString(),
          verified: (ev.verified as boolean) ?? false,
          severity_level: (ev.severity_level as number) ?? 1,
        });
      }
    }

    // Simple heuristic: if we have at least one artifact, consider some evidence available
    const hasRequiredEvidence = artifacts.length > 0;

    return {
      available: includeEvidence ? artifacts : [],
      hasRequiredEvidence,
    };
  } catch {
    // Supabase unavailable or query failed
    return { available: [], hasRequiredEvidence: false };
  }
}

// ============================================================================
// Helper: Assess claim status
// ============================================================================

function assessClaimStatus(
  spec: ClaimSpec,
  evidenceAvailable: EvidenceArtifact[],
  securityBreakdown?: SecurityBreakdown
): { status: ClaimStatus; gaps: string[] } {
  const gaps: string[] = [];

  // Special handling for SECURITY-HARDENING claim
  if (spec.claim_id === 'SECURITY-HARDENING' && securityBreakdown) {
    // Check if required security artifacts exist
    const hasNpmAudit = securityBreakdown.npm_audit !== undefined;
    const hasGitleaks = securityBreakdown.gitleaks !== undefined;
    const hasCodeql = securityBreakdown.codeql !== undefined;

    if (!hasNpmAudit && !hasGitleaks && !hasCodeql) {
      gaps.push('Missing npm_audit evidence: run npm audit scan');
      gaps.push('Missing gitleaks evidence: run gitleaks scan');
      gaps.push('Missing codeql evidence: run CodeQL analysis');
      return { status: 'BLOCK', gaps };
    }

    // Assess pass criteria: critical=0, high≤0, secrets=0, CodeQL critical=0
    let critical = false;
    let highVulns = false;
    let secretsFound = false;
    let codeqlCritical = false;

    if (securityBreakdown.npm_audit) {
      if (securityBreakdown.npm_audit.critical > 0) {
        critical = true;
        gaps.push(`npm audit: ${securityBreakdown.npm_audit.critical} critical vulnerabilities found`);
      }
      if (securityBreakdown.npm_audit.high > 0) {
        highVulns = true;
        gaps.push(`npm audit: ${securityBreakdown.npm_audit.high} high vulnerabilities found`);
      }
    } else {
      gaps.push('npm_audit artifact not found; assuming no scan');
      return { status: 'BLOCK', gaps };
    }

    if (securityBreakdown.gitleaks) {
      if (securityBreakdown.gitleaks.secrets > 0) {
        secretsFound = true;
        gaps.push(`gitleaks: ${securityBreakdown.gitleaks.secrets} secrets detected`);
      }
    } else {
      gaps.push('gitleaks artifact not found; assuming no scan');
      return { status: 'BLOCK', gaps };
    }

    if (securityBreakdown.codeql) {
      if (securityBreakdown.codeql.critical > 0) {
        codeqlCritical = true;
        gaps.push(`CodeQL: ${securityBreakdown.codeql.critical} critical issues found`);
      }
    } else {
      gaps.push('codeql artifact not found; assuming no scan');
      return { status: 'BLOCK', gaps };
    }

    // Pass if no critical/high issues and no secrets
    if (!critical && !secretsFound && !codeqlCritical) {
      if (highVulns) {
        return { status: 'PARTIAL', gaps };
      }
      return { status: 'PASS', gaps: [] };
    }

    return { status: 'BLOCK', gaps };
  }

  // Special handling for SBOM-GENERATED claim
  if (spec.claim_id === 'SBOM-GENERATED' && securityBreakdown) {
    if (!securityBreakdown.sbom) {
      gaps.push('SBOM artifact not found; run SBOM generation workflow');
      return { status: 'BLOCK', gaps };
    }

    if (securityBreakdown.sbom.components < 100) {
      gaps.push(
        `SBOM has only ${securityBreakdown.sbom.components} components (requires ≥100)`
      );
      return { status: 'PARTIAL', gaps };
    }

    if (securityBreakdown.sbom.format !== 'CycloneDX') {
      gaps.push(`SBOM format is ${securityBreakdown.sbom.format} (requires CycloneDX)`);
      return { status: 'BLOCK', gaps };
    }

    return { status: 'PASS', gaps: [] };
  }

  // Generic handling for other claims
  if (evidenceAvailable.length === 0) {
    // No evidence at all
    spec.required_evidence_types.forEach((req) => {
      gaps.push(`Missing ${req.type} (L${req.level}): ${req.description}`);
    });
    return { status: 'BLOCK', gaps };
  }

  // Check which required evidence types we have
  const availableTypes = new Set(evidenceAvailable.map((a) => a.evidence_type));

  for (const req of spec.required_evidence_types) {
    if (!availableTypes.has(req.type)) {
      gaps.push(`Missing ${req.type} (L${req.level}): ${req.description}`);
    }
  }

  if (gaps.length === 0) {
    return { status: 'PASS', gaps: [] };
  }

  // Some but not all required evidence present
  return { status: 'PARTIAL', gaps };
}

// ============================================================================
// Main GET handler
// ============================================================================

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const claimsParam = url.searchParams.get('claims') ?? undefined;
    const includeEvidenceParam = url.searchParams.get('includeEvidence') ?? 'false';
    const includeSecurityBreakdownParam = url.searchParams.get('includeSecurityBreakdown') ?? 'false';
    const includeEvidence = includeEvidenceParam === 'true';
    const includeSecurityBreakdown = includeSecurityBreakdownParam === 'true';

    // Parse claims from query
    const claimIds = parseClaimsQuery(claimsParam);

    // Validate claim IDs
    const invalidClaimIds = claimIds.filter((cid) => !(cid in CLAIM_EVIDENCE_STANDARD));
    if (invalidClaimIds.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid claim IDs: ${invalidClaimIds.join(', ')}`,
          valid_claims: Object.keys(CLAIM_EVIDENCE_STANDARD),
        },
        { status: 400 }
      );
    }

    // Deployment info
    const deploymentCommit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? 'local';
    const deploymentEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local';
    const now = new Date().toISOString();

    // Get security evidence once if any claim requests it
    const hasSecurityClaims = claimIds.some((cid) =>
      ['SECURITY-HARDENING', 'SBOM-GENERATED'].includes(cid)
    );
    let securityBreakdown: SecurityBreakdown | undefined;
    if (hasSecurityClaims || includeSecurityBreakdown) {
      securityBreakdown = await getSecurityEvidence();
    }

    // Query evidence for each claim
    let supabaseHealthy = true;
    const claimsData: ClaimReadinessReport[] = [];
    let evidentBackendEmpty = false;

    for (const claim_id of claimIds) {
      const spec = getClaimMetadata(claim_id);
      if (!spec) {
        continue;
      }

      // Get available evidence
      let evidenceAvailable: EvidenceArtifact[];
      try {
        const { available, hasRequiredEvidence } = await getEvidenceStatus(claim_id, includeEvidence);
        evidenceAvailable = available;

        if (!hasRequiredEvidence && available.length === 0) {
          evidentBackendEmpty = true;
        }
      } catch {
        supabaseHealthy = false;
        evidenceAvailable = [];
      }

      // Assess status (pass security breakdown for security claims)
      const { status, gaps } = assessClaimStatus(
        spec,
        evidenceAvailable,
        ['SECURITY-HARDENING', 'SBOM-GENERATED'].includes(claim_id) ? securityBreakdown : undefined
      );

      const report: ClaimReadinessReport = {
        claim_id: spec.claim_id,
        status,
        required_evidence: spec.required_evidence_types,
        gaps,
      };

      // Add available evidence if requested
      if (includeEvidence && evidenceAvailable.length > 0) {
        report.available_evidence = evidenceAvailable;
      }

      // Add security breakdown for security claims if requested
      if (
        (includeSecurityBreakdown || claim_id === 'SECURITY-HARDENING' || claim_id === 'SBOM-GENERATED') &&
        securityBreakdown &&
        Object.keys(securityBreakdown).length > 0
      ) {
        report.security_breakdown = securityBreakdown;
      }

      claimsData.push(report);
    }

    // Build summary
    const securityClaimCount = claimsData.filter((c) =>
      ['SECURITY-HARDENING', 'SBOM-GENERATED'].includes(c.claim_id)
    ).length;

    const summary = {
      pass: claimsData.filter((c) => c.status === 'PASS').length,
      partial: claimsData.filter((c) => c.status === 'PARTIAL').length,
      block: claimsData.filter((c) => c.status === 'BLOCK').length,
      total: claimsData.length,
      security_claims: securityClaimCount,
    };

    // Build response
    const response: ApiResponse = {
      ok: summary.block === 0,
      deployment: {
        commit: deploymentCommit,
        env: deploymentEnv,
        policy_version: 'v1',
        timestamp: now,
      },
      claims: claimsData,
      summary,
      checkpoint: {
        timestamp: now,
        commit: deploymentCommit,
      },
    };

    // Add warnings if relevant
    if (!supabaseHealthy) {
      response.warning = 'Evidence backend unavailable; status may be incomplete';
    } else if (evidentBackendEmpty) {
      response.warning = 'Evidence backend empty; all claims in BLOCK status pending evidence collection';
    }

    // Return response
    const status = supabaseHealthy || evidentBackendEmpty ? 200 : 503;
    return NextResponse.json(response, {
      status,
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    // Unexpected error
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}

// ============================================================================
// Test cases (inline comments for reference)
// ============================================================================

/*
Test cases:
1. GET /api/proof/claim-readiness
   → Returns 6 default claims (added SBOM-GENERATED) with their status
   → No query params, defaults to standard set
   → Summary includes security_claims count

2. GET /api/proof/claim-readiness?claims=SECURITY-HARDENING
   → Returns 1 claim with security_breakdown populated
   → Checks npm_audit, gitleaks, codeql artifacts
   → Pass if: critical=0, high=0, secrets=0, CodeQL critical=0

3. GET /api/proof/claim-readiness?claims=SBOM-GENERATED&includeSecurityBreakdown=true
   → Returns SBOM claim with detailed breakdown
   → Pass if: components ≥100 AND format=CycloneDX
   → Partial if: components <100
   → Block if: SBOM missing

4. GET /api/proof/claim-readiness?claims=SECURITY-HARDENING,SBOM-GENERATED&includeSecurityBreakdown=true
   → Returns 2 security claims with full breakdown
   → Aggregates npm_audit, gitleaks, codeql, sbom data

5. GET /api/proof/claim-readiness?claims=ISO-42001-A.6-PLANNING,NIST-GOVERN-01&includeEvidence=true
   → Returns 2 non-security claims + detailed evidence artifacts
   → Evidence array populated when includeEvidence=true

6. GET /api/proof/claim-readiness?claims=INVALID-CLAIM
   → Returns 400 with error: "Invalid claim IDs: INVALID-CLAIM"
   → Lists valid claim IDs in response

7. Security artifacts missing (no evidence collected yet):
   → SECURITY-HARDENING returns BLOCK with warning: "npm_audit artifact not found; assuming no scan"
   → SBOM-GENERATED returns BLOCK with warning: "SBOM artifact not found; run SBOM generation workflow"

8. Supabase backend down:
   → Returns 503 with warning: "Evidence backend unavailable; status may be incomplete"
   → Status degrades gracefully but does not fail completely

9. Supabase backend empty (no evidence yet):
   → Returns 200 with BLOCK status for all claims
   → Includes warning: "Evidence backend empty..."
   → Endpoint remains usable during development phase
*/
