/**
 * GET /api/compliance-evidence-pack/annex4
 *
 * EU AI Act Annex IV — Technical Documentation checklist mapped to DSG ONE
 * governance controls and CCVS evidence. August 2026 enforcement deadline.
 *
 * Returns JSON by default. Add ?format=html for rendered checklist.
 *
 * certificationClaim: false — this is a pre-audit evidence mapping, not a
 * certification. See /api/compliance-evidence-pack for full boundary statement.
 */

import { NextResponse } from 'next/server';
import { REQUIREMENT_CATALOG } from '../../../../lib/ccvs/compliance-matrix';

export const dynamic = 'force-dynamic';

type AnnexIVStatus = 'covered' | 'partial' | 'pending';

interface AnnexIVItem {
  item_number: number;
  title: string;
  description: string;
  dsg_control_id: string;
  dsg_control_description: string;
  evidence_type: string;
  ccvs_requirement_id: string | null;
  status: AnnexIVStatus;
  coverage_notes: string;
}

const ANNEX_IV_ITEMS: AnnexIVItem[] = [
  {
    item_number: 1,
    title: 'General description and intended purpose',
    description: 'General description of the AI system including intended purpose, categories of persons affected, and contexts of use.',
    dsg_control_id: 'CTRL-POLICY-ENGINE',
    dsg_control_description: 'Policy engine enforces governance rules on every AI action; purpose and affected parties documented in policy config.',
    evidence_type: 'unit',
    ccvs_requirement_id: 'NIST-RMF-GOVERN-1.1',
    status: 'covered',
    coverage_notes: 'Purpose documented in README and policy engine. CCVS unit evidence verifies policy enforcement on every action.',
  },
  {
    item_number: 2,
    title: 'Version and update history',
    description: 'Software version used, changes between versions, and date of each version.',
    dsg_control_id: 'CTRL-BUILD-PROVENANCE',
    dsg_control_description: 'SLSA L2 provenance records commit SHA, workflow, and build inputs for every CI run.',
    evidence_type: 'provenance',
    ccvs_requirement_id: 'SLSA-L2-PROV',
    status: 'covered',
    coverage_notes: 'Git SHA committed to provenance envelope. SLSA L2 signed bundle produced on every main push.',
  },
  {
    item_number: 3,
    title: 'Technical specifications and performance metrics',
    description: 'Technical specifications, accuracy, robustness, and cybersecurity metrics.',
    dsg_control_id: 'CTRL-RISK-GATE',
    dsg_control_description: 'Risk gate enforces quantitative risk thresholds; adversarial tests verify robustness against replay and tamper attacks.',
    evidence_type: 'adversarial',
    ccvs_requirement_id: 'ISO42001-A7.3',
    status: 'covered',
    coverage_notes: 'Z3-verified policy bounds (amount ≤ $1k, slippage ≤ 50bps). Mutation score ≥70% confirms robustness of gate logic.',
  },
  {
    item_number: 4,
    title: 'Monitoring, functioning, and control systems',
    description: 'Systems for monitoring AI system functioning and logging during the lifetime.',
    dsg_control_id: 'CTRL-IMMUTABLE-AUDIT',
    dsg_control_description: 'SHA-256 WORM hash chain: requestHash → decisionHash → recordHash. Tamper-evident audit log.',
    evidence_type: 'adversarial',
    ccvs_requirement_id: 'EU-AI-ACT-ART12',
    status: 'covered',
    coverage_notes: 'Audit log chain verified by adversarial test suite. Immutability enforced by hash-chained envelopes.',
  },
  {
    item_number: 5,
    title: 'Input data specifications',
    description: 'Data requirements including datasheets describing training methodologies and characteristics of training data.',
    dsg_control_id: 'CTRL-POLICY-ENGINE',
    dsg_control_description: 'Input validation and normalization enforced before any policy decision; schema documented in DsgCommandEnvelope.',
    evidence_type: 'unit',
    ccvs_requirement_id: 'NIST-RMF-GOVERN-1.1',
    status: 'partial',
    coverage_notes: 'DSG ONE is a governance layer, not an ML model — training data specifications are not applicable. Input schema for DsgCommandEnvelope is fully validated by normalize.ts (100% line coverage). Formal input data documentation (docs/api/command-envelope.md) is pending and will move this item to covered.',
  },
  {
    item_number: 6,
    title: 'Human oversight measures',
    description: 'Measures to support human oversight including technical features to facilitate interpretation of AI outputs.',
    dsg_control_id: 'CTRL-HUMAN-GATE',
    dsg_control_description: 'Every high-risk action requires explicit human approval token before execution.',
    evidence_type: 'integration',
    ccvs_requirement_id: 'EU-AI-ACT-ART14',
    status: 'covered',
    coverage_notes: 'Human approval gate tested in agent-command-gate.test.ts. STABILIZE decisions require human token; BLOCK is automatic.',
  },
  {
    item_number: 7,
    title: 'Post-market monitoring',
    description: 'Measures for post-market monitoring including automatic logging and collection of data.',
    dsg_control_id: 'CTRL-REPLAY-REJECTION',
    dsg_control_description: 'Replay attack rejection ensures governance proofs cannot be reused; drift detector monitors config changes.',
    evidence_type: 'replay',
    ccvs_requirement_id: 'NIST-RMF-MEASURE-2.6',
    status: 'covered',
    coverage_notes: 'Drift snapshot committed to main on every CI run. Replay matrix tests verify proof freshness enforcement.',
  },
  {
    item_number: 8,
    title: 'Incident reporting and corrective action',
    description: 'Description of any serious incidents, corrective actions taken, and lessons learned.',
    dsg_control_id: 'CTRL-AUDIT-TRAIL',
    dsg_control_description: 'Complete audit trail for all governed AI decisions with Supabase persistence.',
    evidence_type: 'integration',
    ccvs_requirement_id: 'ISO42001-A9.2',
    status: 'partial',
    coverage_notes: 'Audit trail records all governed decisions with SHA-256 hash chain and Supabase persistence. Incident notification stub: POST /api/notifications with severity=critical triggers alert channel. Full SIEM/PagerDuty integration is pending (roadmap Q3 2026). Status remains partial until external alerting is verified end-to-end.',
  },
  {
    item_number: 9,
    title: 'Instructions for use',
    description: 'Instructions for deployers including any known limitations, risks, and recommended mitigation measures.',
    dsg_control_id: 'CTRL-MIDMARKET-GATE',
    dsg_control_description: 'Midmarket governance autopilot documented with operational runbooks.',
    evidence_type: 'integration',
    ccvs_requirement_id: 'DSG-MIDMARKET-AUTOPILOT',
    status: 'covered',
    coverage_notes: 'README, API reference, and go:no-go runbook cover deployment instructions. Limitations documented in Supported Claims section.',
  },
];

function buildSummary(items: AnnexIVItem[]) {
  return {
    total: items.length,
    covered: items.filter((i) => i.status === 'covered').length,
    partial: items.filter((i) => i.status === 'partial').length,
    pending: items.filter((i) => i.status === 'pending').length,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  const summary = buildSummary(ANNEX_IV_ITEMS);
  const requirementIndex = Object.fromEntries(
    REQUIREMENT_CATALOG.map((r) => [r.requirement_id, r]),
  );

  const items = ANNEX_IV_ITEMS.map((item) => ({
    ...item,
    requirement_detail: item.ccvs_requirement_id ? (requirementIndex[item.ccvs_requirement_id] ?? null) : null,
  }));

  if (format === 'html') {
    const rows = items
      .map((item) => {
        const icon = item.status === 'covered' ? '✅' : item.status === 'partial' ? '⚠️' : '🔲';
        return `<tr>
          <td style="text-align:center;font-weight:bold">${item.item_number}</td>
          <td><strong>${item.title}</strong><br><small>${item.description}</small></td>
          <td><code>${item.dsg_control_id}</code><br><small>${item.dsg_control_description}</small></td>
          <td style="text-align:center">${icon} ${item.status}</td>
          <td><small>${item.coverage_notes}</small></td>
        </tr>`;
      })
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EU AI Act Annex IV — DSG ONE Technical Documentation</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 2rem auto; padding: 0 1rem; }
    h1 { color: #1a1a2e; }
    .badge { display: inline-block; background: #2d6a4f; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem; margin-right: 0.5rem; }
    .badge.partial { background: #d4a017; }
    table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
    th { background: #1a1a2e; color: white; padding: 0.75rem; text-align: left; }
    td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr:hover td { background: #f9fafb; }
    .summary { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; }
    .disclaimer { font-size: 0.8rem; color: #6b7280; border-top: 1px solid #e5e7eb; margin-top: 2rem; padding-top: 1rem; }
    code { background: #f3f4f6; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>EU AI Act Annex IV — Technical Documentation</h1>
  <p>DSG ONE ProofGate Control Plane — Annex IV mapping for compliance review.</p>
  <p><strong>Enforcement deadline:</strong> August 2026 | <strong>System:</strong> DSG ONE v1.1</p>

  <div class="summary">
    <strong>Summary:</strong>
    <span class="badge">${summary.covered} Covered</span>
    <span class="badge partial">${summary.partial} Partial</span>
    <span class="badge" style="background:#6b7280">${summary.pending} Pending</span>
    of ${summary.total} Annex IV items
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:4%">#</th>
        <th style="width:28%">Annex IV Requirement</th>
        <th style="width:30%">DSG ONE Control</th>
        <th style="width:10%">Status</th>
        <th style="width:28%">Coverage Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="disclaimer">
    <strong>Boundary statement:</strong> certificationClaim=false · independentAuditClaim=false.
    This document is a pre-audit evidence mapping, not a legal certification.
    Generated: ${new Date().toISOString()}
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return NextResponse.json({
    ok: true,
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    regulation: 'EU AI Act',
    annex: 'IV',
    enforcement_deadline: '2026-08-01',
    certificationClaim: false,
    independentAuditClaim: false,
    summary,
    items,
  });
}
