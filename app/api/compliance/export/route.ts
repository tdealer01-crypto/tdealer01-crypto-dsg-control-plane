import { NextRequest, NextResponse } from 'next/server';
import { REQUIREMENT_CATALOG } from '@/lib/ccvs/compliance-matrix';
import type { ComplianceMatrix, ComplianceMatrixRow } from '@/lib/ccvs/compliance-matrix';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

const BOUNDARY = {
  certificationClaim: false,
  independentAuditClaim: false,
  statement: 'Pre-audit evidence mapping only. Not a legal certification or independent audit result.',
};

export async function OPTIONS(request: Request) {
  return buildPreflightResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') ?? 'json';
    const framework = searchParams.get('framework') ?? 'all';

    const filtered = framework === 'all'
      ? REQUIREMENT_CATALOG
      : REQUIREMENT_CATALOG.filter((r) => r.framework === framework);

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

    const matrix: ComplianceMatrix = {
      schema_version: '1.0.0',
      generated_at: new Date().toISOString(),
      policy_version: 'v1',
      rows,
      summary,
    };

    const auditLog = {
      schema_version: '1.0.0',
      generated_at: matrix.generated_at,
      framework,
      controls_total: rows.length,
      boundary: BOUNDARY,
      controls: rows.map((r) => ({
        requirement_id: r.requirement_id,
        framework: r.framework,
        article: r.article_or_section,
        title: r.title,
        status: r.status,
        evidence_type: r.evidence_type,
        min_severity_level: r.min_severity_level,
      })),
    };

    const replayProof = {
      schema_version: '1.0.0',
      generated_at: matrix.generated_at,
      type: 'compliance-export-replay-proof',
      boundary: BOUNDARY,
      framework,
      rows_hash: rows.length.toString(),
      note: 'Full replay proof requires running npm run ccvs:pipeline with live evidence.',
    };

    const claimBoundary = {
      schema_version: '1.0.0',
      generated_at: matrix.generated_at,
      ...BOUNDARY,
      allowed_claims: [
        'production-connected',
        'evidence-ready',
        'audit-ready',
        'governance-enabling',
        'deterministic gate scaffold',
        'setup-ready',
        'pre-audit evidence mapping',
      ],
      blocked_claims: [
        'production-ready',
        'marketplace-ready',
        'enterprise-ready 100%',
        'certified compliance',
        'guaranteed compliance',
        'third-party audited',
        'WORM-certified storage',
      ],
    };

    const bundle = {
      'evidence.json': matrix,
      'audit-log.json': auditLog,
      'replay-proof.json': replayProof,
      'claim-boundary.json': claimBoundary,
    };

    const corsHeaders = buildCorsHeaders(request);

    if (format === 'bundle') {
      return NextResponse.json(bundle, { headers: corsHeaders });
    }

    const key = (format as keyof typeof bundle) in bundle ? format as keyof typeof bundle : 'evidence.json';
    return NextResponse.json(bundle[key], { headers: corsHeaders });

  } catch (err) {
    return handleApiError(err);
  }
}
