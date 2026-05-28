/**
 * GET /api/ccvs/evidence-chain
 *
 * Returns the current CCVS compliance status: the latest chain_hash per
 * evidence type and a summary of the compliance matrix.  All data is
 * derived from compile-time constants and env vars — no live DB query.
 *
 * This endpoint is public (no auth) so auditors and CI pipelines can verify
 * the governance posture of the running deployment.
 */

import { NextResponse } from 'next/server';
import { EVIDENCE_SEVERITY } from '../../../../lib/ccvs/evidence-collector';
import { REQUIREMENT_CATALOG } from '../../../../lib/ccvs/compliance-matrix';
import { buildDriftSnapshot, detectDrift } from '../../../../lib/ccvs/drift-detector';

export const dynamic = 'force-dynamic';

export async function GET() {
  const currentSnapshot = buildDriftSnapshot();
  const driftReport = detectDrift(null, currentSnapshot);

  const requirementSummary = REQUIREMENT_CATALOG.map((req) => ({
    requirement_id: req.requirement_id,
    framework: req.framework,
    control_id: req.control_id,
    evidence_type: req.evidence_type,
    min_severity_level: req.min_severity_level,
    mutation_required: req.mutation_required,
  }));

  const severityTable = Object.entries(EVIDENCE_SEVERITY).map(([type, level]) => ({
    evidence_type: type,
    severity_level: level,
  }));

  return NextResponse.json({
    ok: true,
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    deployment: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'unknown',
      env: process.env.VERCEL_ENV ?? 'local',
      policy_version: currentSnapshot.policy_version,
    },
    drift: {
      changed: driftReport.changed,
      fields_changed: driftReport.fields_changed,
      invalidated_attestations: driftReport.invalidated_attestations,
    },
    severity_table: severityTable,
    requirements: requirementSummary,
    note: 'Live compliance matrix requires CI artifact upload. This endpoint reports static catalog and deployment context only.',
  });
}
