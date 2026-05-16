import { NextResponse } from 'next/server';
import { handleFinanceGovernanceApiError } from '../../../../../../lib/finance-governance/api-error';
import { FinanceGovernanceAuditLedgerRepository } from '../../../../../../lib/finance-governance/audit-ledger-repository';
import { FinanceGovernanceRepository } from '../../../../../../lib/finance-governance/repository';
import { getOrg } from '../../../../../../lib/server/getOrg';

export const dynamic = 'force-dynamic';

const approvalRepo = new FinanceGovernanceRepository();
const ledgerRepo = new FinanceGovernanceAuditLedgerRepository();

type RouteContext = { params: Promise<{ id: string }> };

function esc(s: string | null | undefined): string {
  if (!s) return '—';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-GB', { timeZone: 'UTC', hour12: false }) + ' UTC'; }
  catch { return iso; }
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === 'approved') return '#22c55e';
  if (s === 'rejected') return '#ef4444';
  if (s.includes('escalat')) return '#f59e0b';
  return '#94a3b8';
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const orgId = await getOrg();
    const { id: approvalId } = await context.params;

    const approvals = await approvalRepo.getApprovals(orgId);
    const approval = approvals.find((a) => a.id === approvalId);

    if (!approval) {
      return NextResponse.json({ error: 'approval_not_found' }, { status: 404 });
    }

    const ledgerRows = await ledgerRepo.listByApproval(orgId, approvalId).catch(() => []);
    const generatedAt = new Date().toLocaleString('en-GB', { timeZone: 'UTC', hour12: false }) + ' UTC';

    const auditRowsHtml = ledgerRows.length === 0
      ? `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px">No audit entries recorded yet</td></tr>`
      : ledgerRows.map((row) => `
        <tr>
          <td>${esc(row.action)}</td>
          <td>${esc(row.actor)}</td>
          <td style="color:${row.result === 'ok' ? '#22c55e' : '#ef4444'}">${esc(row.result)}</td>
          <td>${esc(row.next_status)}</td>
          <td style="font-family:monospace;font-size:11px;word-break:break-all">${esc(row.record_hash?.slice(0, 16))}…</td>
          <td>${fmt(row.created_at)}</td>
        </tr>`).join('');

    const statusHex = statusColor(approval.status);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Approval Record — ${esc(approvalId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fff;
      color: #0f172a;
      font-size: 13px;
      line-height: 1.6;
      padding: 40px;
      max-width: 860px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .brand span { color: #d97706; }
    .doc-type { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; margin-top: 4px; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    .meta strong { display: block; font-size: 13px; color: #0f172a; }
    .section { margin-bottom: 28px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #64748b;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
    .field { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
    .field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-bottom: 4px; }
    .field-value { font-weight: 600; color: #0f172a; word-break: break-all; }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 13px;
      background: ${statusHex}22;
      color: ${statusHex};
      border: 1px solid ${statusHex}44;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #f1f5f9; }
    th { text-align: left; padding: 8px 10px; font-weight: 600; font-size: 10px;
         text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
    td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .hash-full {
      font-family: monospace;
      font-size: 11px;
      word-break: break-all;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 10px;
      color: #334155;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 20px; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">DSG <span>ONE</span></div>
      <div class="doc-type">Approval Record / Audit Evidence</div>
    </div>
    <div class="meta">
      <strong>${esc(approvalId)}</strong>
      Generated: ${generatedAt}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Approval Details</div>
    <div class="grid grid-3">
      <div class="field">
        <div class="field-label">Approval ID</div>
        <div class="field-value">${esc(approval.id)}</div>
      </div>
      <div class="field">
        <div class="field-label">Vendor</div>
        <div class="field-value">${esc(approval.vendor)}</div>
      </div>
      <div class="field">
        <div class="field-label">Amount</div>
        <div class="field-value">${esc(approval.amount)}</div>
      </div>
      <div class="field">
        <div class="field-label">Status</div>
        <div class="field-value"><span class="status-badge">${esc(approval.status)}</span></div>
      </div>
      <div class="field">
        <div class="field-label">Risk / Note</div>
        <div class="field-value">${esc(approval.risk) || '—'}</div>
      </div>
      <div class="field">
        <div class="field-label">Organization</div>
        <div class="field-value">${esc(orgId)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Audit Trail</div>
    <table>
      <thead>
        <tr>
          <th>Action</th>
          <th>Actor</th>
          <th>Result</th>
          <th>Outcome</th>
          <th>Record Hash (preview)</th>
          <th>Timestamp (UTC)</th>
        </tr>
      </thead>
      <tbody>
        ${auditRowsHtml}
      </tbody>
    </table>
  </div>

  ${ledgerRows.length > 0 ? `
  <div class="section">
    <div class="section-title">Full Record Hashes (verification)</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${ledgerRows.map((row) => `
      <div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#94a3b8;margin-bottom:3px">
          ${esc(row.action)} · ${fmt(row.created_at)}
        </div>
        <div class="hash-full">${esc(row.record_hash)}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}

  <div class="footer">
    <span>DSG ONE — Finance Governance Audit Evidence. Hashes are SHA-256 record-level proofs.</span>
    <span>Exported ${generatedAt}</span>
  </div>

  <script>
    window.addEventListener('load', () => {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (!isMobile) window.print();
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
  } catch (error) {
    return handleFinanceGovernanceApiError('api/finance-governance/approvals/pdf', error);
  }
}
