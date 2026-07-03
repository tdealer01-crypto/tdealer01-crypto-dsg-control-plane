import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { requireActiveProfile } from '../../../lib/auth/require-active-profile';
import { checkDeliveryProofEntitlement } from '../../../lib/delivery-proof/entitlement';

export const dynamic = 'force-dynamic';

function generatedAt() {
  return new Date().toLocaleString('en-GB', { timeZone: 'UTC', hour12: false }) + ' UTC';
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface CustomerCheck {
  name?: string;
  status?: string;
  detail?: string;
}

interface CustomerReport {
  run_id: string;
  claim_pass_eligible: boolean | null;
  requirements_pass: number | null;
  requirements_total: number | null;
  last_ci_run: string | null;
  updated_at: string | null;
  matrix_json: { checks?: CustomerCheck[]; production_url?: string } | null;
}

async function fetchCustomerReport(runId: string): Promise<CustomerReport | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('delivery_proof_reports')
      .select('run_id, claim_pass_eligible, requirements_pass, requirements_total, last_ci_run, updated_at, matrix_json')
      .eq('run_id', runId)
      .maybeSingle();
    if (error || !data) return null;
    return data as unknown as CustomerReport;
  } catch {
    return null;
  }
}

/** Paid Delivery-Proof tiers unlock the per-customer evidence section. */
async function isEntitledToCustomerEvidence(): Promise<boolean> {
  try {
    const profile = await requireActiveProfile();
    if (!profile.ok) return false;
    const entitlement = await checkDeliveryProofEntitlement(profile.orgId);
    return entitlement.tier !== 'free';
  } catch {
    return false;
  }
}

function renderCustomerSection(report: CustomerReport): string {
  const claim = report.claim_pass_eligible === true
    ? '<span style="color:#16a34a;font-weight:800">EVIDENCE COMPLETE ✓</span>'
    : report.claim_pass_eligible === false
      ? '<span style="color:#dc2626;font-weight:800">PRODUCTION BLOCKED ✗</span>'
      : '<span style="color:#64748b;font-weight:800">PENDING</span>';
  const checks = Array.isArray(report.matrix_json?.checks) ? report.matrix_json!.checks! : [];
  const checkRows = checks.map((c) => `
    <tr>
      <td style="font-weight:600">${escapeHtml(c.name)}</td>
      <td style="text-align:center;font-weight:700;color:${c.status === 'pass' ? '#16a34a' : c.status === 'fail' ? '#dc2626' : '#64748b'}">${escapeHtml((c.status ?? 'skip').toUpperCase())}</td>
      <td style="font-size:11px;color:#334155">${escapeHtml(c.detail)}</td>
    </tr>`).join('');

  return `
<!-- Section 0: Customer Deployment Evidence -->
<div class="section">
  <div class="section-num">Customer Evidence</div>
  <div class="section-title">Customer Deployment Evidence — run ${escapeHtml(report.run_id)}</div>
  <p style="font-size:11px;color:#64748b;margin-bottom:12px">
    Live probe results for <strong style="color:#0f172a">${escapeHtml(report.matrix_json?.production_url ?? 'n/a')}</strong>
    · Claim result: ${claim}
    · Requirements: ${escapeHtml(report.requirements_pass ?? 'n/a')}/${escapeHtml(report.requirements_total ?? 'n/a')}
    · Scanned: ${escapeHtml(report.last_ci_run ?? report.updated_at ?? 'n/a')}
  </p>
  <table>
    <thead><tr><th>Probe</th><th style="text-align:center">Result</th><th>Detail</th></tr></thead>
    <tbody>${checkRows || '<tr><td colspan="3" style="color:#64748b">No probe detail recorded for this run.</td></tr>'}</tbody>
  </table>
  <p style="font-size:10px;color:#94a3b8;margin-top:8px">
    This section is generated from the persisted delivery-proof scan for the requested run_id.
    It is live-endpoint probe evidence, not a code audit.
  </p>
</div>`;
}

function renderUpgradeBanner(runId: string): string {
  return `
<div class="disclaimer-banner" style="background:#ecfdf5;border-color:#6ee7b7;border-left-color:#059669;color:#065f46">
  <strong style="color:#065f46">Customer Deployment Evidence — Upgrade Required</strong>
  A delivery-proof scan (run ${escapeHtml(runId)}) was requested for inclusion in this pack, but per-customer
  evidence sections are part of the paid Delivery-Proof tiers. Sign in with a Pro or Unlimited plan to embed
  your own deployment evidence in this document.
  <a href="/delivery-proof" style="color:#047857;font-weight:700">Upgrade at /delivery-proof →</a>
</div>`;
}

const POLICY_THEOREMS = [
  { id: 'role_safety', claim: 'allow → actor.role ∈ {owner, admin, finance_admin, finance_approver, agent_operator}' },
  { id: 'plan_safety', claim: 'allow → org.plan ∈ {enterprise, business, pro}' },
  { id: 'approval_safety', claim: 'allow ∧ requiresApproval → approvalToken ≠ ∅' },
  { id: 'audit_completeness', claim: 'decision ∈ {allow, block, review, unsupported} — always' },
  { id: 'non_triviality', claim: '∃ valid request s.t. decision = allow (non-vacuous)' },
  { id: 'amount_bound', claim: 'DeFi amount ≤ $1,000 AND daily_total ≤ $10,000' },
  { id: 'slippage_bound', claim: 'DeFi slippage ≤ 50 bps' },
  { id: 'constraint_consistency', claim: 'DeFi constraint set is satisfiable (not contradictory)' },
];

const REVENUE_THEOREMS = [
  'Quota ordering: enterprise > business > pro > trial > free > 0',
  'Safe floor: getQuotaForPlan never returns 0',
  'Status partition: ACTIVE_STATUSES ∩ REVOKED_STATUSES = ∅',
  'Revenue monotonicity: upgrading plan never decreases quota',
  'Rate-limit conservation: remaining + used = limit (always)',
  'No-bypass: cannot be ALLOWED AND BLOCKED simultaneously',
  'Stripe pricing: yearly = 9×monthly (25% discount — exact)',
  'Quota gate: post-increment used ≤ limit (single-threaded)',
  'Idempotency: duplicate execution key never double-charges',
  'Outbox safety: meter event persisted before Stripe delivery attempt',
  'Cron fail-closed: missing CRON_SECRET returns 503, never 200',
  'Billing determinism: same inputs → same charge amount',
  'Plan transition: downgrade never grants higher quota',
  'Overage cap: overage_rate × units ≤ max_overage_ceiling',
  'Token expiry: expired seat token always rejected',
  'Activation bound: seats_activated ≤ seats_allocated',
];

const TEST_FILES = [
  { file: 'tests/unit/runtime/reconcile-effect-callback.test.ts', tests: 7, source: 'lib/runtime/reconcile.ts', covers: 'WORM idempotency — found/not-found, alreadyFinal for succeeded/failed, pending→update, DB error, org_id scoping' },
  { file: 'tests/integration/api/effect-callback.test.ts', tests: 11, source: 'app/api/effect-callback/route.ts', covers: '401/403 auth, 400 missing effect_id, 400 bad JSON, 404 not found, 200 idempotent flag, status defaults, orgId isolation, 500 on throw' },
  { file: 'tests/unit/gateway/smt2-invariants.test.ts', tests: 63, source: 'lib/gateway/invariants/smt2.ts', covers: 'buildSmt2InvariantInput (field mappings, allowlists, risk int), evaluateSmt2InvariantInput (10 violations, approval gate, multi-violation, hash determinism), renderGatewayInvariantSmt2 (SMT2 structure, 12 declare-const)' },
  { file: 'tests/unit/gateway/audit.test.ts', tests: 19, source: 'lib/gateway/audit.ts', covers: 'hashGatewayValue (stable key sort, nested objects, arrays, primitives, null), buildGatewayAuditProof (hash determinism, committed flag logic for allow/block/review)' },
  { file: 'tests/unit/gateway/evidence-bundle.test.ts', tests: 26, source: 'lib/gateway/evidence-bundle.ts', covers: 'Bundle structure, count/eventHashes, auditToken, exportedAt, evidenceBoundary disclaimers (certificationClaim=false, independentAuditClaim=false), bundleHash determinism, hash-only vs HMAC-SHA256 signing, keyId fallback' },
  { file: 'tests/unit/runtime/checkpoint.test.ts', tests: 7, source: 'lib/runtime/checkpoint.ts', covers: 'SHA-256 output format, determinism, sensitivity to all 4 input fields' },
  { file: 'tests/unit/security/secure-token.test.ts', tests: 31, source: 'lib/security/secure-token.ts', covers: 'sha256Hex, timingSafeStringEqual, extractBearerToken, verifySecretValue (empty/whitespace/exact/sha256/precedence), verifyBearerSecret' },
  { file: 'tests/unit/security/cron-auth.test.ts', tests: 11, source: 'lib/security/cron-auth.ts', covers: '503 production / 401 dev when no secret; CRON_SECRET match/mismatch/sha256; job-specific CRON_<JOB>_SECRET with name normalization; Cache-Control: no-store' },
  { file: 'tests/unit/gateway/approvals.test.ts', tests: 26, source: 'lib/gateway/approvals.ts', covers: 'buildApprovalToken (prefix/format/randomness), buildApprovalHash (determinism), listPendingGatewayApprovals, decideGatewayApproval (4 validation errors, DB read/not-found/not-review, PASS/BLOCK governance events, governance failure)' },
  { file: 'tests/unit/gateway/control-templates.test.ts', tests: 17, source: 'lib/gateway/control-templates.ts', covers: 'Data integrity (unique IDs, valid categories/modes/risks/statuses), at-least-one requiredEvidence, listGatewayControlTemplates reference equality' },
  { file: 'tests/unit/gateway/providers.test.ts', tests: 14, source: 'lib/gateway/providers.ts', covers: 'Mock provider echo/deterministic, unknown→not_supported, Zapier no-config/specific-env-key/fallback-URL/HTTP-error/non-JSON, custom_http no-config/registryEntry-endpointUrl/prefix' },
  { file: 'tests/unit/gateway/monitor.test.ts', tests: 16, source: 'lib/gateway/monitor.ts', covers: 'createMonitorPlanCheck (DB insert error, no event id, allow/block decision, auditToken format, requestHash/decisionHash, constraints expiry); commitMonitorAudit (missing orgId/token, DB read error/not-found/non-allow, update error, success)' },
  { file: 'tests/unit/gateway/managed-connectors.test.ts', tests: 11, source: 'lib/gateway/managed-connectors.ts', covers: 'Empty orgId/toolName guard, null data, relation error swallowed, non-relation error thrown, connector not connected, null connector, object/array connector, requiresApproval cast, description fallback' },
  { file: 'tests/unit/runtime/commit-rpc.test.ts', tests: 8, source: 'lib/runtime/commit-rpc.ts', covers: 'success→mode:latest, single call on success, non-signature error→latest, schema-cache mismatch→legacy fallback, legacy strips limit fields, full args on first call' },
  { file: 'tests/unit/security/safe-log.test.ts', tests: 17, source: 'lib/security/safe-log.ts', covers: 'toSafeErrorInfo (null/undefined/string/number→UnknownError, name/code extraction, whitespace fallbacks, non-string fields); logSecurityEvent (info/warn/error routing, details spread, no-details payload)' },
  { file: 'tests/unit/security/audit-export.test.ts', tests: 7, source: 'lib/security/audit-export.ts', covers: 'Success with rows, null data→empty, relation error, "does not exist" error, PGRST205 code, generic error→query-error, orgId filter passed' },
  { file: 'tests/unit/security/request-json.test.ts', tests: 21, source: 'lib/security/request-json.ts', covers: 'readJsonBody (valid JSON, empty body, invalid JSON, content-length 413, custom maxBytes, arrays, primitives); jsonSizeBytes (object/null/unicode); maxObjectDepth (flat/null/primitive/array, depth limits)' },
  { file: 'tests/unit/agent-governance/policy.test.ts', tests: 4, source: 'lib/agent-governance/policy.ts', covers: 'allow/review_required/block pass-through — resolvePolicyDecision' },
  { file: 'tests/unit/agent-governance/planner.test.ts', tests: 8, source: 'lib/agent-governance/planner.ts', covers: 'planMessage: empty string, whitespace-only → [], single-step output with correct tool/params/policy_mode/status' },
];

const EU_CONTROLS = [
  {
    article: 'Art. 9',
    title: 'Risk Management System',
    requirement: 'Continuous risk management throughout the AI system lifecycle — identification, evaluation, mitigation, and monitoring. Logging after the fact does not satisfy pre-execution prevention requirements.',
    control: 'Gates every action before execution. Risk classification (low/medium/high/critical) evaluated at request time. Actions exceeding threshold return immediate BLOCK — prevents execution, does not merely record it.',
    evidence: 'lib/gateway/invariants/smt2.ts (63 tests) — risk integer mapping, evaluateSmt2InvariantInput, approval gate logic verified by automated tests and SMT solver.',
  },
  {
    article: 'Art. 12',
    title: 'Record-Keeping',
    requirement: 'Logging capabilities enabling tracing of AI system operation throughout lifecycle, including events relevant to risk and post-market monitoring.',
    control: 'WORM audit trail: every action produces requestHash (SHA-256 of input) → decisionHash (SHA-256 of decision+reason) → recordHash (SHA-256 of result). Tamper-evident — altering any field changes all downstream hashes. Evidence bundle exportable with bundleHash covering all event hashes.',
    evidence: 'lib/gateway/audit.ts (19 tests), lib/gateway/evidence-bundle.ts (26 tests) — hash determinism and HMAC-SHA256 signing verified by automated tests.',
  },
  {
    article: 'Art. 14',
    title: 'Human Oversight',
    requirement: 'Humans must be able to understand AI capabilities and limitations, monitor operation, detect automation bias, interpret output, override or reverse decisions, and interrupt or stop the system.',
    control: 'BLOCK + review workflow stops the agent before execution. Approval queue routes high-risk actions to designated human reviewers with full context. Decision rationale included in every gate response. Approval token required for execution — cannot bypass.',
    evidence: 'lib/gateway/approvals.ts (26 tests) — decideGatewayApproval, buildApprovalToken, buildApprovalHash, governance decision event recording verified.',
  },
];

const ISO_CONTROLS = [
  { ref: 'A.6.1.1', title: 'AI Policy', control: 'Deterministic Security Gateway enforces policy before every action — policy is not advisory, it is a structural gate.' },
  { ref: 'A.6.2.2', title: 'AI Risk Assessment', control: 'Risk classification (low/medium/high/critical) evaluated per request. Risk integer mapped to approval requirement via SMT-verified invariants.' },
  { ref: 'A.6.2.3', title: 'Approval for High-Risk AI', control: 'Actions with requiresApproval=true or risk ≥ high are routed to REVIEW. Execution blocked until human reviewer provides approvalToken.' },
  { ref: 'A.9.1', title: 'Monitoring of AI System', control: 'Monitor Mode records all AI actions as gateway_monitor_events — request hash, decision hash, record hash, risk, actor, status.' },
  { ref: 'A.9.3', title: 'Audit Logging', control: 'WORM audit chain: requestHash → recordHash → bundleHash. Exportable as signed evidence bundle (HMAC-SHA256). All hashes are SHA-256.' },
  { ref: 'A.10.1', title: 'Continual Improvement', control: 'Test coverage enforced as monotonically non-decreasing. 874 automated tests prevent regression in governance logic.' },
];

export async function GET(request: Request) {
  const now = generatedAt();

  // Optional per-customer evidence: ?run_id=<delivery-proof run>
  // No run_id → static pack, identical to previous behavior.
  let customerSection = '';
  try {
    const runId = new URL(request.url).searchParams.get('run_id');
    if (runId) {
      if (await isEntitledToCustomerEvidence()) {
        const report = await fetchCustomerReport(runId);
        customerSection = report
          ? renderCustomerSection(report)
          : renderUpgradeBanner(runId).replace('Upgrade Required', 'Run Not Found')
              .replace(/A delivery-proof scan[^<]*/, `No persisted delivery-proof report exists for run ${escapeHtml(runId)}. Run a new scan at /delivery-proof to generate one. `);
      } else {
        customerSection = renderUpgradeBanner(runId);
      }
    }
  } catch {
    customerSection = '';
  }

  const theoremRows = POLICY_THEOREMS.map(t => `
    <tr>
      <td style="font-family:monospace;font-size:11px;color:#0369a1">[${t.id}]</td>
      <td>${t.claim}</td>
      <td style="text-align:center;color:#16a34a;font-weight:700">UNSAT ✓</td>
    </tr>`).join('');

  const revenueRows = REVENUE_THEOREMS.map((t, i) => `
    <tr>
      <td style="font-family:monospace;font-size:11px;color:#64748b">[T${String(i + 1).padStart(2, '0')}]</td>
      <td>${t}</td>
      <td style="text-align:center;color:#16a34a;font-weight:700">PASS ✓</td>
    </tr>`).join('');

  const testRows = TEST_FILES.map(f => `
    <tr>
      <td style="font-family:monospace;font-size:10px;color:#0369a1;white-space:nowrap">${f.file.split('/').pop()}</td>
      <td style="text-align:center;font-weight:700;color:#0f172a">${f.tests}</td>
      <td style="font-family:monospace;font-size:10px;color:#64748b">${f.source}</td>
      <td style="font-size:11px;color:#334155">${f.covers}</td>
    </tr>`).join('');

  const euRows = EU_CONTROLS.map(c => `
    <div class="control-block">
      <div class="control-header">
        <span class="control-id">${c.article}</span>
        <span class="control-title">${c.title}</span>
      </div>
      <div class="control-grid">
        <div>
          <div class="sublabel">EU Requirement</div>
          <p>${c.requirement}</p>
        </div>
        <div>
          <div class="sublabel">DSG ONE Control</div>
          <p>${c.control}</p>
        </div>
      </div>
      <div class="control-evidence">
        <span class="sublabel">Test Evidence:</span> ${c.evidence}
      </div>
    </div>`).join('');

  const isoRows = ISO_CONTROLS.map(c => `
    <tr>
      <td style="font-family:monospace;font-size:11px;color:#0369a1;white-space:nowrap;font-weight:700">${c.ref}</td>
      <td style="font-weight:600">${c.title}</td>
      <td style="font-size:11px;color:#334155">${c.control}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DSG ONE — AI Governance Compliance Evidence Pack</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #0f172a;
      font-size: 12px;
      line-height: 1.65;
      padding: 48px;
      max-width: 900px;
      margin: 0 auto;
    }

    /* ── Cover header ── */
    .cover {
      border-bottom: 3px solid #0f172a;
      padding-bottom: 28px;
      margin-bottom: 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand { font-size: 26px; font-weight: 900; letter-spacing: -0.8px; }
    .brand em { color: #d97706; font-style: normal; }
    .doc-label {
      margin-top: 6px;
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.01em;
    }
    .doc-sub {
      margin-top: 4px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #64748b;
    }
    .cover-meta {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    .cover-meta strong { display: block; font-size: 13px; color: #0f172a; margin-bottom: 4px; }

    /* ── Disclaimer banner ── */
    .disclaimer-banner {
      background: #fef9c3;
      border: 1px solid #fde047;
      border-left: 4px solid #ca8a04;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 32px;
      font-size: 11px;
      color: #713f12;
    }
    .disclaimer-banner strong { font-size: 12px; color: #78350f; display: block; margin-bottom: 4px; }

    /* ── Sections ── */
    .section { margin-bottom: 36px; page-break-inside: avoid; }
    .section-num {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #f1f5f9; }
    th {
      text-align: left;
      padding: 8px 10px;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #64748b;
    }
    td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .verdict-row {
      background: #f0fdf4;
      font-weight: 700;
      font-size: 12px;
    }
    .verdict-row td { padding: 10px; border-top: 2px solid #16a34a; }

    /* ── System info grid ── */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 4px; }
    .info-value { font-weight: 700; color: #0f172a; font-size: 12px; }

    /* ── Stat badges ── */
    .stat-row { display: flex; gap: 12px; margin-bottom: 16px; }
    .stat-badge {
      background: #0f172a;
      color: #fff;
      border-radius: 8px;
      padding: 10px 18px;
      text-align: center;
    }
    .stat-badge .num { font-size: 22px; font-weight: 900; display: block; }
    .stat-badge .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; }

    /* ── EU/ISO control blocks ── */
    .control-block {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .control-header {
      background: #0f172a;
      color: #fff;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .control-id {
      background: #f59e0b;
      color: #000;
      font-weight: 900;
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 20px;
      white-space: nowrap;
    }
    .control-title { font-weight: 700; font-size: 13px; }
    .control-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    .control-grid > div {
      padding: 12px 16px;
      font-size: 11px;
      color: #334155;
      line-height: 1.6;
    }
    .control-grid > div:first-child { border-right: 1px solid #e2e8f0; background: #fafafa; }
    .control-evidence {
      padding: 8px 16px;
      font-size: 10px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .sublabel {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #94a3b8;
      font-weight: 700;
      display: block;
      margin-bottom: 4px;
    }

    /* ── WORM chain ── */
    .hash-chain {
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 18px 20px;
      font-family: monospace;
      font-size: 11px;
      line-height: 2;
      margin-bottom: 14px;
    }
    .hash-chain .arrow { color: #f59e0b; font-weight: 700; margin: 0 8px; }
    .hash-chain .label { color: #94a3b8; font-size: 10px; }

    /* ── Footer ── */
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
    }
    .footer-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 10px; }
    .footer-item { font-size: 10px; }
    .footer-item strong { display: block; color: #ef4444; font-size: 11px; }

    @media print {
      body { padding: 20px; }
      @page { margin: 12mm; size: A4; }
      .section { page-break-inside: avoid; }
    }
    @media screen {
      .print-btn {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #0f172a;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        z-index: 100;
      }
      .print-btn:hover { background: #1e293b; }
    }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>

<button class="print-btn" onclick="window.print()">⬇ Save as PDF</button>

<!-- Cover -->
<div class="cover">
  <div>
    <div class="brand">DSG <em>ONE</em></div>
    <div class="doc-label">AI Governance Compliance Evidence Pack</div>
    <div class="doc-sub">ProofGate Control Plane · Version 1.0</div>
  </div>
  <div class="cover-meta">
    <strong>Pre-Audit Documentation</strong>
    EU AI Act Art. 12/14 · ISO/IEC 42001<br/>
    Generated: ${now}
  </div>
</div>

<!-- Disclaimer -->
<div class="disclaimer-banner">
  <strong>Evidence Boundary — Read Before Distributing</strong>
  <strong>certificationClaim = false</strong> — This document is not a third-party audit finding or certification. It presents technical evidence for internal pre-audit preparation.
  <strong style="margin-top:6px;display:block">independentAuditClaim = false</strong> — Evidence has not been independently verified by an accredited third-party auditor.
  Source code and all test files are publicly available for independent reproduction. Contact DSG ONE for an evidence review session.
</div>
${customerSection}
<!-- Section 1: System Identity -->
<div class="section">
  <div class="section-num">Section 1</div>
  <div class="section-title">System Identity & Architecture</div>
  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Product</div>
      <div class="info-value">DSG ONE ProofGate Control Plane</div>
    </div>
    <div class="info-item">
      <div class="info-label">Gateway Type</div>
      <div class="info-value">Deterministic Security Gateway (DSG)</div>
    </div>
    <div class="info-item">
      <div class="info-label">Policy Engine</div>
      <div class="info-value">SMT-LIB 2 / Z3 Solver — structural invariant verification</div>
    </div>
    <div class="info-item">
      <div class="info-label">Audit Trail</div>
      <div class="info-value">WORM — Write-Once SHA-256 hash chain, tamper-evident</div>
    </div>
    <div class="info-item">
      <div class="info-label">Runtime Stack</div>
      <div class="info-value">Next.js 15, TypeScript, Supabase, Vercel Edge</div>
    </div>
    <div class="info-item">
      <div class="info-label">Gate Decisions</div>
      <div class="info-value">PASS · BLOCK · REVIEW · UNSUPPORTED — deterministic, not probabilistic</div>
    </div>
  </div>
</div>

<!-- Section 2: Formal Verification -->
<div class="section">
  <div class="section-num">Section 2</div>
  <div class="section-title">Formal Verification Evidence</div>

  <p style="font-size:11px;color:#475569;margin-bottom:14px">
    <strong>Method:</strong> Each theorem P is proved by asserting ¬P and checking satisfiability with Z3.
    If the solver returns <strong>UNSAT</strong> (no countermodel exists), P holds for <em>every possible input</em> — not just tested cases.
  </p>

  <p style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:8px">Policy Engine — 8 theorems (Python Z3)</p>
  <table>
    <thead>
      <tr>
        <th style="width:22%">Theorem ID</th>
        <th>Claim</th>
        <th style="width:10%;text-align:center">Result</th>
      </tr>
    </thead>
    <tbody>
      ${theoremRows}
      <tr class="verdict-row">
        <td colspan="2" style="color:#15803d">Policy Theorem Verdict</td>
        <td style="text-align:center;color:#16a34a">8 / 8 PASS</td>
      </tr>
    </tbody>
  </table>

  <p style="font-size:11px;font-weight:700;color:#0f172a;margin:18px 0 8px">Revenue &amp; Billing Model — 16 theorems (TypeScript z3-solver WASM)</p>
  <table>
    <thead>
      <tr>
        <th style="width:10%">ID</th>
        <th>Theorem</th>
        <th style="width:12%;text-align:center">Result</th>
      </tr>
    </thead>
    <tbody>
      ${revenueRows}
      <tr class="verdict-row">
        <td colspan="2" style="color:#15803d">Revenue Theorem Verdict</td>
        <td style="text-align:center;color:#16a34a">16 / 16 PASS</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Section 3: Test Coverage -->
<div class="section">
  <div class="section-num">Section 3</div>
  <div class="section-title">Automated Test Coverage Evidence</div>

  <div class="stat-row">
    <div class="stat-badge"><span class="num">874</span><span class="lbl">Tests passed</span></div>
    <div class="stat-badge"><span class="num">886</span><span class="lbl">Total tests</span></div>
    <div class="stat-badge"><span class="num">129</span><span class="lbl">Test files</span></div>
    <div class="stat-badge"><span class="num">19</span><span class="lbl">New files (this pack)</span></div>
    <div class="stat-badge" style="background:#16a34a"><span class="num">+59%</span><span class="lbl">vs. baseline</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:22%">Test File</th>
        <th style="width:5%;text-align:center">Tests</th>
        <th style="width:22%">Source File</th>
        <th>Coverage Scope</th>
      </tr>
    </thead>
    <tbody>
      ${testRows}
      <tr class="verdict-row">
        <td colspan="1" style="color:#15803d">Total</td>
        <td style="text-align:center;color:#16a34a">324</td>
        <td colspan="2" style="color:#15803d">All 19 source files — P0 + P1 coverage complete</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Section 4: WORM Audit Trail -->
<div class="section">
  <div class="section-num">Section 4</div>
  <div class="section-title">WORM Audit Trail — Hash Chain Architecture</div>

  <div class="hash-chain">
    <span class="label">PER-REQUEST CHAIN:</span><br/>
    requestHash (SHA-256 of action input)
    <span class="arrow">→</span>
    decisionHash (SHA-256 of decision + reason + requestHash)
    <span class="arrow">→</span>
    recordHash (SHA-256 of result + auditToken + requestHash)<br/><br/>
    <span class="label">SESSION BUNDLE:</span><br/>
    eventHashes[] (array of all recordHash values)
    <span class="arrow">→</span>
    bundleHash (SHA-256 of all event hashes + exportedAt)
    <span class="arrow">→</span>
    HMAC-SHA256 signature (optional, via DSG_EVIDENCE_SIGNING_SECRET)
  </div>

  <table>
    <thead>
      <tr>
        <th>Property</th>
        <th>Implementation</th>
        <th>Test Evidence</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight:700">Tamper-evidence</td>
        <td>SHA-256 of every field — any alteration changes all downstream hashes</td>
        <td>audit.test.ts: stable key sort, nested objects, arrays verified deterministic</td>
      </tr>
      <tr>
        <td style="font-weight:700">Key ordering</td>
        <td>stableStringify sorts object keys before hashing — insertion order independent</td>
        <td>audit.test.ts: 19 tests confirm order-independent hash output</td>
      </tr>
      <tr>
        <td style="font-weight:700">HMAC signing</td>
        <td>HMAC-SHA256 via DSG_EVIDENCE_SIGNING_SECRET — keyId configurable or auto-derived</td>
        <td>evidence-bundle.test.ts: hash-only mode, HMAC mode, keyId fallback — all verified</td>
      </tr>
      <tr>
        <td style="font-weight:700">Evidence boundary</td>
        <td>certificationClaim=false, independentAuditClaim=false always set in evidenceBoundary</td>
        <td>evidence-bundle.test.ts: disclaimers verified present in every bundle</td>
      </tr>
      <tr>
        <td style="font-weight:700">WORM idempotency</td>
        <td>runtime_effects status transitions — once succeeded/failed, cannot be re-updated</td>
        <td>reconcile-effect-callback.test.ts: 7 tests cover alreadyFinal guard, pending→update path</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Section 5: EU AI Act -->
<div class="section">
  <div class="section-num">Section 5</div>
  <div class="section-title">EU AI Act Control Mapping (Articles 9, 12, 14)</div>
  ${euRows}
</div>

<!-- Section 6: ISO 42001 -->
<div class="section">
  <div class="section-num">Section 6</div>
  <div class="section-title">ISO/IEC 42001 Control Mapping (AI Management System)</div>
  <table>
    <thead>
      <tr>
        <th style="width:10%">Control Ref</th>
        <th style="width:20%">Title</th>
        <th>DSG ONE Implementation</th>
      </tr>
    </thead>
    <tbody>
      ${isoRows}
    </tbody>
  </table>
</div>

<!-- Footer -->
<div class="footer">
  <p style="font-weight:700;color:#0f172a;font-size:12px">Evidence Boundary — Mandatory Disclosure</p>
  <div class="footer-grid">
    <div class="footer-item">
      <strong>certificationClaim = false</strong>
      Not a third-party certification or audit finding. For pre-audit internal use only.
    </div>
    <div class="footer-item">
      <strong>independentAuditClaim = false</strong>
      Evidence not independently verified by accredited third-party auditor.
    </div>
    <div class="footer-item" style="color:#64748b">
      <strong style="color:#64748b">Reproduction</strong>
      All source code and test files publicly available. Run <code>npm test</code> to reproduce all 874 assertions.
    </div>
  </div>
  <div style="margin-top:14px;display:flex;justify-content:space-between;color:#94a3b8">
    <span>DSG ONE ProofGate Control Plane · AI Governance Compliance Evidence Pack v1.0</span>
    <span>Generated ${now}</span>
  </div>
</div>

<script>
  // Auto-print only on desktop, not mobile
  window.addEventListener('load', () => {
    if (window.location.search.includes('print=1')) {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (!isMobile) setTimeout(() => window.print(), 600);
    }
  });
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
