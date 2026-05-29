/**
 * GET /api/compliance-evidence-pack/annex4
 * Returns a structured EU AI Act Annex IV technical documentation checklist
 * mapped to DSG ONE controls. Add ?print=1 for HTML output.
 *
 * Enforcement deadline: August 2026 (high-risk AI systems, Article 11).
 * This is an evidence record — not a certification or legal opinion.
 * See certificationClaim: false below.
 */

import { NextResponse } from 'next/server';
import { REQUIREMENT_CATALOG } from '../../../../lib/ccvs/compliance-matrix';

export const dynamic = 'force-dynamic';

interface Annex4Item {
  item: number;
  title: string;
  eu_ai_act_reference: string;
  control_id: string;
  evidence_type: string;
  status: 'covered' | 'partial' | 'pending';
  dsg_evidence_url: string;
  notes: string;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  'https://tdealer01-crypto-dsg-control-plane.vercel.app';

const ANNEX4_ITEMS: Annex4Item[] = [
  {
    item: 1,
    title: 'General description of the AI system, including its intended purpose',
    eu_ai_act_reference: 'Annex IV § 1',
    control_id: 'CTRL-POLICY-ENGINE',
    evidence_type: 'unit',
    status: 'covered',
    dsg_evidence_url: `${BASE_URL}/api/ccvs/evidence-chain`,
    notes: 'DSG ONE policy engine is documented via REQUIREMENT_CATALOG and unit evidence envelopes (L1). Intended purpose: deterministic AI command governance for midmarket crypto operations.',
  },
  {
    item: 2,
    title: 'Version and update history of the AI system',
    eu_ai_act_reference: 'Annex IV § 2',
    control_id: 'CTRL-BUILD-PROVENANCE',
    evidence_type: 'provenance',
    status: 'covered',
    dsg_evidence_url: `${BASE_URL}/api/compliance-evidence-pack`,
    notes: 'SLSA L2 provenance via GitHub Actions. Build SHA, commit hash, and policy version recorded in every evidence envelope. VERCEL_GIT_COMMIT_SHA available in all deployed instances.',
  },
  {
    item: 3,
    title: 'Technical specifications including accuracy metrics and robustness measures',
    eu_ai_act_reference: 'Annex IV § 3',
    control_id: 'CTRL-RISK-GATE',
    evidence_type: 'adversarial',
    status: 'covered',
    dsg_evidence_url: `${BASE_URL}/api/ccvs/evidence-chain`,
    notes: 'Risk gate enforces deterministic decision bounds. Adversarial evidence (L3) covers replay attacks, tamper detection, and failure injection. Mutation score ≥70% required on main branch.',
  },
  {
    item: 4,
    title: 'Monitoring, functioning and control mechanisms including logging systems',
    eu_ai_act_reference: 'Annex IV § 4',
    control_id: 'CTRL-IMMUTABLE-AUDIT',
    evidence_type: 'adversarial',
    status: 'covered',
    dsg_evidence_url: `${BASE_URL}/api/audit-evidence`,
    notes: 'Immutable audit logs with SHA-256 hash chain. Every gateway decision is logged with traceId, requestHash, decisionHash, and committed flag. Tamper-evident via evidence-bundle.',
  },
  {
    item: 5,
    title: 'Data requirements including input data specifications and data governance',
    eu_ai_act_reference: 'Annex IV § 5',
    control_id: 'CTRL-POLICY-ENGINE',
    evidence_type: 'unit',
    status: 'covered',
    dsg_evidence_url: `${BASE_URL}/api/ccvs/evidence-chain`,
    notes: 'All inputs validated via readJsonBody (maxBytes, JSON parse safety). Command schema enforced by TOOL_POLICY. Blocked patterns enforced before processing. Input spec in lib/commands/schema.ts.',
  },
  {
    item: 6,
    title: 'Human oversight measures to interpret AI outputs and intervene when necessary',
    eu_ai_act_reference: 'Annex IV § 6',
    control_id: 'CTRL-HUMAN-GATE',
    evidence_type: 'integration',
    status: 'covered',
    dsg_evidence_url: `${BASE_URL}/api/ccvs/evidence-chain`,
    notes: 'Human approval required before any REVIEW-class AI action executes. Owner approval token bound to specific command + device + policy version. Approval cannot be bypassed without audit trail.',
  },
  {
    item: 7,
    title: 'Post-market monitoring plan and procedures',
    eu_ai_act_reference: 'Annex IV § 7',
    control_id: 'CTRL-REPLAY-REJECTION',
    evidence_type: 'adversarial',
    status: 'partial',
    dsg_evidence_url: `${BASE_URL}/api/compliance-evidence-pack`,
    notes: 'Replay rejection and idempotency keys prevent post-deployment command duplication. Continuous drift detection runs on every main push. Post-market incident collection is manual (Phase-2: automated incident webhook).',
  },
  {
    item: 8,
    title: 'Incident and serious malfunctions reporting obligations',
    eu_ai_act_reference: 'Annex IV § 8',
    control_id: 'CTRL-AUDIT-TRAIL',
    evidence_type: 'integration',
    status: 'partial',
    dsg_evidence_url: `${BASE_URL}/api/audit-evidence`,
    notes: 'Audit route captures all block/review decisions. Gateway errors are logged via logSecurityEvent. Formal incident report format and notifiable authority routing are pending (Phase-2).',
  },
  {
    item: 9,
    title: 'Instructions for use and user interface specifications',
    eu_ai_act_reference: 'Annex IV § 9',
    control_id: 'CTRL-MIDMARKET-GATE',
    evidence_type: 'integration',
    status: 'covered',
    dsg_evidence_url: `${BASE_URL}/api/compliance-evidence-pack`,
    notes: 'Integration evidence covers midmarket gate UI. Readiness endpoint, health endpoint, and protected route behavior documented. Shareable delivery proof report available at /delivery-proof.',
  },
];

function generatedAt(): string {
  return new Date().toISOString();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const print = url.searchParams.get('print') === '1';

  const covered = ANNEX4_ITEMS.filter((i) => i.status === 'covered').length;
  const partial = ANNEX4_ITEMS.filter((i) => i.status === 'partial').length;
  const pending = ANNEX4_ITEMS.filter((i) => i.status === 'pending').length;

  const crossReference = REQUIREMENT_CATALOG
    .filter((r) => r.framework === 'EU AI Act')
    .map((r) => ({ requirement_id: r.requirement_id, control_id: r.control_id, title: r.title }));

  const payload = {
    ok: true,
    schema_version: '1.0.0',
    document: 'EU AI Act Annex IV Technical Documentation Checklist',
    enforcement_deadline: '2026-08-02',
    certificationClaim: false,
    independentAuditClaim: false,
    generated_at: generatedAt(),
    deployment: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'unknown',
      env: process.env.VERCEL_ENV ?? 'local',
      policy_version: process.env.DSG_POLICY_VERSION ?? 'v1',
    },
    summary: {
      total: ANNEX4_ITEMS.length,
      covered,
      partial,
      pending,
      coverage_pct: Math.round((covered / ANNEX4_ITEMS.length) * 100),
    },
    items: ANNEX4_ITEMS,
    ccvs_cross_reference: crossReference,
    disclaimer:
      'This document is a self-attested technical evidence record produced by DSG ONE automated compliance tooling. It is not a legal certification, regulatory approval, or opinion from a notified body. Organizations subject to EU AI Act obligations should engage qualified legal counsel and conformity assessment bodies.',
  };

  if (print) {
    const rows = ANNEX4_ITEMS.map(
      (item) => `
      <tr>
        <td>${item.item}</td>
        <td>${item.title}</td>
        <td><code>${item.control_id}</code></td>
        <td class="status-${item.status}">${item.status.toUpperCase()}</td>
        <td>${item.notes}</td>
      </tr>`,
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>EU AI Act Annex IV — DSG ONE Evidence Record</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 2rem auto; padding: 0 1rem; color: #1a1a2e; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 1.5rem; }
  .summary { display: flex; gap: 1.5rem; margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; }
  .summary-item { text-align: center; }
  .summary-num { font-size: 1.75rem; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { background: #1a1a2e; color: white; padding: 0.75rem; text-align: left; }
  td { padding: 0.75rem; border-bottom: 1px solid #e0e0e0; vertical-align: top; }
  .status-covered { color: #15803d; font-weight: 600; }
  .status-partial { color: #b45309; font-weight: 600; }
  .status-pending { color: #dc2626; font-weight: 600; }
  .disclaimer { margin-top: 2rem; font-size: 0.8rem; color: #888; border-top: 1px solid #e0e0e0; padding-top: 1rem; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <h1>EU AI Act Annex IV — DSG ONE Technical Documentation</h1>
  <div class="meta">Generated: ${generatedAt()} · Policy: v1 · <strong>Self-attested evidence record — not a certification</strong></div>
  <div class="summary">
    <div class="summary-item"><div class="summary-num" style="color:#15803d">${covered}</div><div>Covered</div></div>
    <div class="summary-item"><div class="summary-num" style="color:#b45309">${partial}</div><div>Partial</div></div>
    <div class="summary-item"><div class="summary-num" style="color:#dc2626">${pending}</div><div>Pending</div></div>
    <div class="summary-item"><div class="summary-num">${Math.round((covered / ANNEX4_ITEMS.length) * 100)}%</div><div>Coverage</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Annex IV Requirement</th><th>DSG Control</th><th>Status</th><th>Evidence Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="disclaimer">${payload.disclaimer}</div>
</body>
</html>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  return NextResponse.json(payload);
}
