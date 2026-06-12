/**
 * GET /api/proof/claim-readiness
 *
 * Query claim status across the deployed system.
 * Returns a summary of compliance claims and their evidence status.
 *
 * Query parameters:
 *   - claims: comma-separated claim IDs (optional, defaults to standard set)
 *   - includeEvidence: boolean to include detailed evidence artifacts (optional, defaults to false)
 *
 * Example:
 *   GET /api/proof/claim-readiness?claims=ISO-42001-A.6-PLANNING,NIST-GOVERN-01&includeEvidence=true
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

interface ClaimReadinessReport {
  claim_id: string;
  status: ClaimStatus;
  required_evidence: EvidenceRequirement[];
  available_evidence?: EvidenceArtifact[];
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
        type: 'unit',
        level: 1,
        description: 'Security unit tests',
      },
      {
        type: 'adversarial',
        level: 3,
        description: 'Adversarial/fuzz tests for API surfaces',
      },
      {
        type: 'oversight',
        level: 4,
        description: 'Manual security review & audit logs',
      },
    ],
    pass_criteria: 'No high/critical vulns in npm audit; rate-limiting active; CORS configured',
    responsible_owner: 'Security',
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
  evidenceAvailable: EvidenceArtifact[]
): { status: ClaimStatus; gaps: string[] } {
  const gaps: string[] = [];

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
    const includeEvidence = includeEvidenceParam === 'true';

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

      // Assess status
      const { status, gaps } = assessClaimStatus(spec, evidenceAvailable);

      claimsData.push({
        claim_id: spec.claim_id,
        status,
        required_evidence: spec.required_evidence_types,
        ...(includeEvidence && evidenceAvailable.length > 0
          ? { available_evidence: evidenceAvailable }
          : {}),
        gaps,
      });
    }

    // Build summary
    const summary = {
      pass: claimsData.filter((c) => c.status === 'PASS').length,
      partial: claimsData.filter((c) => c.status === 'PARTIAL').length,
      block: claimsData.filter((c) => c.status === 'BLOCK').length,
      total: claimsData.length,
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
   → Returns 5-6 default claims with their status
   → No query params, defaults to standard set

2. GET /api/proof/claim-readiness?claims=ISO-42001-A.6-PLANNING
   → Returns 1 claim only
   → Filters by comma-separated list

3. GET /api/proof/claim-readiness?claims=ISO-42001-A.6-PLANNING,NIST-GOVERN-01&includeEvidence=true
   → Returns 2 claims + detailed evidence artifacts
   → Evidence array populated when includeEvidence=true

4. GET /api/proof/claim-readiness?claims=INVALID-CLAIM
   → Returns 400 with error: "Invalid claim IDs: INVALID-CLAIM"
   → Lists valid claim IDs in response

5. Supabase backend down:
   → Returns 503 with warning: "Evidence backend unavailable; status may be incomplete"
   → Status degrades gracefully but does not fail completely

6. Supabase backend empty (no evidence yet):
   → Returns 200 with BLOCK status for all claims
   → Includes warning: "Evidence backend empty..."
   → Endpoint remains usable during development phase
*/
