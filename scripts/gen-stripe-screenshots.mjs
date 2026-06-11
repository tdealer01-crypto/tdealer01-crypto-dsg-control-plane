import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const REVIEW_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f9fc; display: flex; height: 100vh; }

  /* Sidebar */
  .sidebar {
    width: 220px; background: #0d2137; color: #8ea3b5; flex-shrink: 0;
    display: flex; flex-direction: column; padding: 0;
  }
  .sidebar-logo { padding: 20px 20px 24px; display: flex; align-items: center; gap: 10px; }
  .sidebar-logo svg { width: 28px; height: 28px; }
  .sidebar-logo span { color: #fff; font-size: 15px; font-weight: 600; }
  .sidebar-section { padding: 0 0 8px; }
  .sidebar-section-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #5a7a8e; padding: 12px 20px 6px; }
  .sidebar-item { padding: 7px 20px; font-size: 13px; color: #8ea3b5; cursor: pointer; border-left: 3px solid transparent; }
  .sidebar-item:hover { color: #d9e9f5; }
  .sidebar-item.active { color: #fff; background: rgba(255,255,255,0.06); border-left-color: #635bff; }
  .sidebar-item.sub { padding-left: 32px; font-size: 12px; }

  /* Main */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { background: #fff; border-bottom: 1px solid #e3e8ee; padding: 0 28px; height: 52px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #697386; }
  .breadcrumb .sep { color: #c1c9d2; }
  .breadcrumb .current { color: #1a1f36; font-weight: 500; }
  .topbar-right { display: flex; align-items: center; gap: 16px; }
  .topbar-btn { background: #fff; border: 1px solid #e3e8ee; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 500; color: #3c4257; cursor: pointer; }
  .topbar-btn.primary { background: #635bff; border-color: #635bff; color: #fff; }

  /* Content */
  .content { flex: 1; display: flex; overflow: hidden; }
  .content-main { flex: 1; padding: 28px; overflow-y: auto; }

  /* Page header */
  .page-header { margin-bottom: 24px; }
  .page-header h1 { font-size: 20px; font-weight: 600; color: #1a1f36; margin-bottom: 4px; }
  .page-header-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #697386; }
  .status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 500; }
  .badge-success { background: #d7f5e9; color: #0a7040; }
  .badge-warning { background: #fff4d6; color: #8a5a00; }
  .badge-danger { background: #ffe4e4; color: #c0392b; }

  /* Cards */
  .card { background: #fff; border: 1px solid #e3e8ee; border-radius: 8px; margin-bottom: 16px; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid #f0f4f8; display: flex; align-items: center; justify-content: space-between; }
  .card-header h3 { font-size: 13px; font-weight: 600; color: #1a1f36; }
  .card-body { padding: 20px; }
  .row { display: flex; gap: 24px; margin-bottom: 14px; }
  .row:last-child { margin-bottom: 0; }
  .field { flex: 1; }
  .field label { font-size: 11px; font-weight: 600; color: #697386; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
  .field value { font-size: 13px; color: #1a1f36; }
  .field value.mono { font-family: monospace; font-size: 12px; color: #3c4257; }
  .amount { font-size: 22px; font-weight: 600; color: #1a1f36; }

  /* Right panel (app) */
  .right-panel { width: 300px; border-left: 1px solid #e3e8ee; background: #fff; flex-shrink: 0; overflow-y: auto; }
  .panel-tabs { border-bottom: 1px solid #e3e8ee; display: flex; }
  .panel-tab { padding: 12px 16px; font-size: 12px; font-weight: 500; color: #697386; cursor: pointer; border-bottom: 2px solid transparent; }
  .panel-tab.active { color: #635bff; border-bottom-color: #635bff; }

  /* DSG App inside panel */
  .dsg-app { padding: 16px; }
  .dsg-title { font-size: 13px; font-weight: 600; color: #1a1f36; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .dsg-title img { width: 18px; height: 18px; }
  .dsg-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .dsg-badge.review { background: #fff4d6; color: #8a5a00; border: 1px solid #f5d87e; }
  .dsg-badge.allow { background: #d7f5e9; color: #0a7040; border: 1px solid #7dd3b0; }
  .dsg-badge.block { background: #ffe4e4; color: #c0392b; border: 1px solid #f5a0a0; }
  .dsg-banner { padding: 10px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 10px; border-left: 3px solid; }
  .dsg-banner.review { background: #fffbf0; border-color: #f5a623; color: #5a3e00; }
  .dsg-banner.allow { background: #f0faf5; border-color: #27ae60; color: #0a4a25; }
  .dsg-banner.block { background: #fff5f5; border-color: #e74c3c; color: #5a0000; }
  .dsg-banner-title { font-weight: 600; margin-bottom: 3px; font-size: 12px; }
  .dsg-banner-desc { font-size: 11.5px; line-height: 1.5; }
  .dsg-divider { border: none; border-top: 1px solid #f0f4f8; margin: 12px 0; }
  .dsg-meta { font-size: 11px; color: #697386; }
  .dsg-meta-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .dsg-meta-label { color: #9ba9b9; }
  .dsg-meta-value { color: #3c4257; font-family: monospace; font-size: 10.5px; }
  .dsg-proof-hash { font-family: monospace; font-size: 10px; color: #9ba9b9; word-break: break-all; padding: 6px 8px; background: #f8fafc; border-radius: 4px; margin-top: 8px; }
  .dsg-spinner { display: flex; align-items: center; justify-content: center; padding: 24px; }
  .spinner { width: 20px; height: 20px; border: 2px solid #e3e8ee; border-top-color: #635bff; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .panel-app-header { padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e3e8ee; font-size: 11px; color: #697386; font-weight: 500; }
</style>
</head>
<body>
  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-logo">
      <svg viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#635bff"/><path d="M14 6C9.6 6 6 9.6 6 14s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="#fff" opacity="0.5"/><path d="M14 10v4l3 3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span>stripe</span>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">Payments</div>
      <div class="sidebar-item">Overview</div>
      <div class="sidebar-item active">Payments</div>
      <div class="sidebar-item sub">Charges</div>
      <div class="sidebar-item sub">Disputes</div>
      <div class="sidebar-item">Balances</div>
      <div class="sidebar-item">Payouts</div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">Customers</div>
      <div class="sidebar-item">Customers</div>
      <div class="sidebar-item">Products</div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">Developers</div>
      <div class="sidebar-item">API keys</div>
      <div class="sidebar-item">Webhooks</div>
    </div>
  </div>

  <!-- Main -->
  <div class="main">
    <div class="topbar">
      <div class="breadcrumb">
        <span>Payments</span>
        <span class="sep">›</span>
        <span class="current">ch_3RmN9B2eZvKYlo2C0841xK7p</span>
      </div>
      <div class="topbar-right">
        <button class="topbar-btn">Refund</button>
        <button class="topbar-btn primary">Capture</button>
      </div>
    </div>

    <div class="content">
      <div class="content-main">
        <div class="page-header">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:6px;">
            <h1>฿75,000.00</h1>
            <span class="status-badge badge-warning">⚠ Requires review</span>
          </div>
          <div class="page-header-meta">
            <span>THB · 2026-06-11 14:23:07</span>
            <span>·</span>
            <span>Visa ending in 4242</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Payment details</h3></div>
          <div class="card-body">
            <div class="row">
              <div class="field">
                <label>Amount</label>
                <value class="amount">฿75,000</value>
              </div>
              <div class="field">
                <label>Status</label>
                <value><span class="status-badge badge-warning">Review</span></value>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label>Payment ID</label>
                <value class="mono">ch_3RmN9B2eZvKYlo2C0841xK7p</value>
              </div>
              <div class="field">
                <label>Created</label>
                <value>Jun 11, 2026 at 14:23</value>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label>Customer</label>
                <value>merchant_acct_8842</value>
              </div>
              <div class="field">
                <label>Payment method</label>
                <value>Visa •••• 4242</value>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Timeline</h3></div>
          <div class="card-body" style="font-size:13px; color:#697386;">
            <div style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-start;">
              <div style="width:8px; height:8px; background:#f5a623; border-radius:50%; margin-top:4px; flex-shrink:0;"></div>
              <div><strong style="color:#1a1f36;">Held for review</strong><br>Governance policy flagged this payment · Jun 11, 14:23</div>
            </div>
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <div style="width:8px; height:8px; background:#e3e8ee; border-radius:50%; margin-top:4px; flex-shrink:0;"></div>
              <div>Payment created · Jun 11, 14:23</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right panel — DSG App -->
      <div class="right-panel">
        <div class="panel-tabs">
          <div class="panel-tab active">Apps</div>
          <div class="panel-tab">Metadata</div>
          <div class="panel-tab">Events</div>
        </div>
        <div class="panel-app-header">DSG Governance Gate</div>
        <div class="dsg-app">
          <div class="dsg-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="5" fill="#635bff"/><path d="M12 4L4 8v6c0 4 4 7 8 8 4-1 8-4 8-8V8L12 4z" fill="#fff" opacity="0.9"/></svg>
            DSG Governance Gate
          </div>
          <div class="dsg-badge review">⚠ REVIEW</div>
          <div class="dsg-banner review">
            <div class="dsg-banner-title">Manual review required</div>
            <div class="dsg-banner-desc">Transaction amount ฿75,000 exceeds medium-risk threshold (฿50,000). Routed to compliance queue for operator approval.</div>
          </div>
          <hr class="dsg-divider">
          <div class="dsg-meta">
            <div class="dsg-meta-row">
              <span class="dsg-meta-label">Policy</span>
              <span class="dsg-meta-value">standard_txn_gate v2.1</span>
            </div>
            <div class="dsg-meta-row">
              <span class="dsg-meta-label">Risk score</span>
              <span class="dsg-meta-value">62 / 100</span>
            </div>
            <div class="dsg-meta-row">
              <span class="dsg-meta-label">Rule triggered</span>
              <span class="dsg-meta-value">amount_threshold</span>
            </div>
            <div class="dsg-meta-row">
              <span class="dsg-meta-label">Evaluated</span>
              <span class="dsg-meta-value">Jun 11, 14:23:08 UTC</span>
            </div>
          </div>
          <div class="dsg-proof-hash">sha256:7c4e2a1b9f3d8e5c0a6b4d2f1e9c7a3b…</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const BLOCK_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f9fc; display: flex; height: 100vh; }
  .sidebar { width: 220px; background: #0d2137; color: #8ea3b5; flex-shrink: 0; display: flex; flex-direction: column; padding: 0; }
  .sidebar-logo { padding: 20px 20px 24px; display: flex; align-items: center; gap: 10px; }
  .sidebar-logo svg { width: 28px; height: 28px; }
  .sidebar-logo span { color: #fff; font-size: 15px; font-weight: 600; }
  .sidebar-section { padding: 0 0 8px; }
  .sidebar-section-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #5a7a8e; padding: 12px 20px 6px; }
  .sidebar-item { padding: 7px 20px; font-size: 13px; color: #8ea3b5; cursor: pointer; border-left: 3px solid transparent; }
  .sidebar-item.active { color: #fff; background: rgba(255,255,255,0.06); border-left-color: #635bff; }
  .sidebar-item.sub { padding-left: 32px; font-size: 12px; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { background: #fff; border-bottom: 1px solid #e3e8ee; padding: 0 28px; height: 52px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #697386; }
  .breadcrumb .current { color: #1a1f36; font-weight: 500; }
  .topbar-btn { background: #fff; border: 1px solid #e3e8ee; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 500; color: #3c4257; cursor: pointer; }
  .topbar-btn.disabled { opacity: 0.4; cursor: not-allowed; }
  .content { flex: 1; display: flex; overflow: hidden; }
  .content-main { flex: 1; padding: 28px; overflow-y: auto; }
  .page-header { margin-bottom: 24px; }
  .page-header h1 { font-size: 20px; font-weight: 600; color: #1a1f36; margin-bottom: 4px; }
  .status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 500; }
  .badge-danger { background: #ffe4e4; color: #c0392b; }
  .badge-warning { background: #fff4d6; color: #8a5a00; }
  .badge-success { background: #d7f5e9; color: #0a7040; }
  .page-header-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #697386; }
  .card { background: #fff; border: 1px solid #e3e8ee; border-radius: 8px; margin-bottom: 16px; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid #f0f4f8; display: flex; align-items: center; justify-content: space-between; }
  .card-header h3 { font-size: 13px; font-weight: 600; color: #1a1f36; }
  .card-body { padding: 20px; }
  .row { display: flex; gap: 24px; margin-bottom: 14px; }
  .row:last-child { margin-bottom: 0; }
  .field { flex: 1; }
  .field label { font-size: 11px; font-weight: 600; color: #697386; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
  .field value { font-size: 13px; color: #1a1f36; }
  .field value.mono { font-family: monospace; font-size: 12px; color: #3c4257; }
  .blocked-banner { background: #fff0f0; border: 1px solid #fca5a5; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 12px; }
  .blocked-icon { font-size: 20px; flex-shrink: 0; }
  .blocked-title { font-size: 14px; font-weight: 600; color: #991b1b; margin-bottom: 4px; }
  .blocked-desc { font-size: 12.5px; color: #7f1d1d; }
  .right-panel { width: 300px; border-left: 1px solid #e3e8ee; background: #fff; flex-shrink: 0; overflow-y: auto; }
  .panel-tabs { border-bottom: 1px solid #e3e8ee; display: flex; }
  .panel-tab { padding: 12px 16px; font-size: 12px; font-weight: 500; color: #697386; cursor: pointer; border-bottom: 2px solid transparent; }
  .panel-tab.active { color: #635bff; border-bottom-color: #635bff; }
  .dsg-app { padding: 16px; }
  .dsg-title { font-size: 13px; font-weight: 600; color: #1a1f36; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .dsg-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .dsg-badge.block { background: #ffe4e4; color: #c0392b; border: 1px solid #f5a0a0; }
  .dsg-banner { padding: 10px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 10px; border-left: 3px solid; }
  .dsg-banner.block { background: #fff5f5; border-color: #e74c3c; color: #5a0000; }
  .dsg-banner-title { font-weight: 600; margin-bottom: 3px; font-size: 12px; }
  .dsg-banner-desc { font-size: 11.5px; line-height: 1.5; }
  .dsg-divider { border: none; border-top: 1px solid #f0f4f8; margin: 12px 0; }
  .dsg-meta { font-size: 11px; color: #697386; }
  .dsg-meta-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .dsg-meta-label { color: #9ba9b9; }
  .dsg-meta-value { color: #3c4257; font-family: monospace; font-size: 10.5px; }
  .dsg-proof-hash { font-family: monospace; font-size: 10px; color: #9ba9b9; word-break: break-all; padding: 6px 8px; background: #f8fafc; border-radius: 4px; margin-top: 8px; }
  .panel-app-header { padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e3e8ee; font-size: 11px; color: #697386; font-weight: 500; }
</style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-logo">
      <svg viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#635bff"/><path d="M14 6C9.6 6 6 9.6 6 14s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="#fff" opacity="0.5"/><path d="M14 10v4l3 3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span>stripe</span>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">Payments</div>
      <div class="sidebar-item">Overview</div>
      <div class="sidebar-item active">Payments</div>
      <div class="sidebar-item sub">Charges</div>
      <div class="sidebar-item sub">Disputes</div>
      <div class="sidebar-item">Balances</div>
      <div class="sidebar-item">Payouts</div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">Customers</div>
      <div class="sidebar-item">Customers</div>
      <div class="sidebar-item">Products</div>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-label">Developers</div>
      <div class="sidebar-item">API keys</div>
      <div class="sidebar-item">Webhooks</div>
    </div>
  </div>

  <div class="main">
    <div class="topbar">
      <div class="breadcrumb">
        <span>Payments</span>
        <span style="color:#c1c9d2; margin: 0 2px;">›</span>
        <span class="current">ch_3RmP7D2eZvKYlo2C0193yW2m</span>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="topbar-btn disabled">Refund</button>
        <button class="topbar-btn disabled">Capture</button>
      </div>
    </div>

    <div class="content">
      <div class="content-main">
        <div class="blocked-banner">
          <div class="blocked-icon">🚫</div>
          <div>
            <div class="blocked-title">Payment blocked by governance policy</div>
            <div class="blocked-desc">DSG Governance Gate has flagged this transaction. No funds were captured. Review the policy decision in the Apps panel.</div>
          </div>
        </div>

        <div class="page-header">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:6px;">
            <h1>฿150,000.00</h1>
            <span class="status-badge badge-danger">✕ Blocked</span>
          </div>
          <div class="page-header-meta">
            <span>THB · 2026-06-11 16:47:22</span>
            <span>·</span>
            <span>Mastercard ending in 5555</span>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Payment details</h3></div>
          <div class="card-body">
            <div class="row">
              <div class="field">
                <label>Amount</label>
                <value style="font-size:22px; font-weight:600; color:#1a1f36;">฿150,000</value>
              </div>
              <div class="field">
                <label>Status</label>
                <value><span class="status-badge badge-danger">Blocked</span></value>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label>Payment ID</label>
                <value class="mono">ch_3RmP7D2eZvKYlo2C0193yW2m</value>
              </div>
              <div class="field">
                <label>Created</label>
                <value>Jun 11, 2026 at 16:47</value>
              </div>
            </div>
            <div class="row">
              <div class="field">
                <label>Customer</label>
                <value>merchant_acct_2271</value>
              </div>
              <div class="field">
                <label>Payment method</label>
                <value>Mastercard •••• 5555</value>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Timeline</h3></div>
          <div class="card-body" style="font-size:13px; color:#697386;">
            <div style="display:flex; gap:10px; margin-bottom:10px; align-items:flex-start;">
              <div style="width:8px; height:8px; background:#e74c3c; border-radius:50%; margin-top:4px; flex-shrink:0;"></div>
              <div><strong style="color:#1a1f36;">Blocked by governance policy</strong><br>High-risk transaction blocked · DSG gate v2.1 · Jun 11, 16:47</div>
            </div>
            <div style="display:flex; gap:10px; align-items:flex-start;">
              <div style="width:8px; height:8px; background:#e3e8ee; border-radius:50%; margin-top:4px; flex-shrink:0;"></div>
              <div>Payment attempted · Jun 11, 16:47</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right panel — DSG App -->
      <div class="right-panel">
        <div class="panel-tabs">
          <div class="panel-tab active">Apps</div>
          <div class="panel-tab">Metadata</div>
          <div class="panel-tab">Events</div>
        </div>
        <div class="panel-app-header">DSG Governance Gate</div>
        <div class="dsg-app">
          <div class="dsg-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="5" fill="#635bff"/><path d="M12 4L4 8v6c0 4 4 7 8 8 4-1 8-4 8-8V8L12 4z" fill="#fff" opacity="0.9"/></svg>
            DSG Governance Gate
          </div>
          <div class="dsg-badge block">✕ BLOCK</div>
          <div class="dsg-banner block">
            <div class="dsg-banner-title">Transaction blocked</div>
            <div class="dsg-banner-desc">Amount ฿150,000 exceeds high-risk threshold. Destination account has no prior transaction history. Policy requires two-person approval for this risk level.</div>
          </div>
          <hr class="dsg-divider">
          <div class="dsg-meta">
            <div class="dsg-meta-row">
              <span class="dsg-meta-label">Policy</span>
              <span class="dsg-meta-value">standard_txn_gate v2.1</span>
            </div>
            <div class="dsg-meta-row">
              <span class="dsg-meta-label">Risk score</span>
              <span class="dsg-meta-value">91 / 100</span>
            </div>
            <div class="dsg-meta-row">
              <span class="dsg-meta-label">Rules triggered</span>
              <span class="dsg-meta-value">high_amount, new_dest</span>
            </div>
            <div class="dsg-meta-row">
              <span class="dsg-meta-label">Evaluated</span>
              <span class="dsg-meta-value">Jun 11, 16:47:22 UTC</span>
            </div>
          </div>
          <div class="dsg-proof-hash">sha256:2f8a1c3e9b4d7f0e5c2a8b1d4f9e3c6a…</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage();

// Screenshot 2 — REVIEW state
await page.setViewportSize({ width: 1440, height: 900 });
await page.setContent(REVIEW_HTML, { waitUntil: 'networkidle' });
await page.screenshot({ path: '/home/user/tdealer01-crypto-dsg-control-plane/screenshot2-review-state.png', fullPage: false });
console.log('✅ screenshot2-review-state.png saved');

// Screenshot 3 — BLOCK state
await page.setContent(BLOCK_HTML, { waitUntil: 'networkidle' });
await page.screenshot({ path: '/home/user/tdealer01-crypto-dsg-control-plane/screenshot3-block-state.png', fullPage: false });
console.log('✅ screenshot3-block-state.png saved');

await browser.close();
console.log('Done.');
