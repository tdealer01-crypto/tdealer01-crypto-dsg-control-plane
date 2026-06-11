import { chromium } from 'playwright';

const SHARED_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f9fc; display: flex; height: 100vh; }
  .sidebar { width: 220px; background: #0d2137; color: #8ea3b5; flex-shrink: 0; display: flex; flex-direction: column; }
  .sidebar-logo { padding: 20px 20px 24px; display: flex; align-items: center; gap: 10px; }
  .sidebar-logo span { color: #fff; font-size: 15px; font-weight: 600; }
  .sidebar-section-label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #5a7a8e; padding: 12px 20px 6px; }
  .sidebar-item { padding: 7px 20px; font-size: 13px; color: #8ea3b5; border-left: 3px solid transparent; }
  .sidebar-item.active { color: #fff; background: rgba(255,255,255,0.06); border-left-color: #635bff; }
  .sidebar-item.sub { padding-left: 32px; font-size: 12px; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { background: #fff; border-bottom: 1px solid #e3e8ee; padding: 0 28px; height: 52px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
  .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #697386; }
  .breadcrumb .sep { color: #c1c9d2; }
  .breadcrumb .current { color: #1a1f36; font-weight: 500; }
  .topbar-btn { background: #fff; border: 1px solid #e3e8ee; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 500; color: #3c4257; }
  .topbar-btn.primary { background: #635bff; border-color: #635bff; color: #fff; }
  .topbar-btn.disabled { opacity: 0.4; }
  .content { flex: 1; display: flex; overflow: hidden; }
  .content-main { flex: 1; padding: 28px; overflow-y: auto; }
  .status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 2px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 500; }
  .badge-success { background: #d7f5e9; color: #0a7040; }
  .badge-warning { background: #fff4d6; color: #8a5a00; }
  .badge-danger { background: #ffe4e4; color: #c0392b; }
  .card { background: #fff; border: 1px solid #e3e8ee; border-radius: 8px; margin-bottom: 16px; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid #f0f4f8; }
  .card-header h3 { font-size: 13px; font-weight: 600; color: #1a1f36; }
  .card-body { padding: 20px; }
  .row { display: flex; gap: 24px; margin-bottom: 14px; }
  .row:last-child { margin-bottom: 0; }
  .field { flex: 1; }
  .field label { font-size: 11px; font-weight: 600; color: #697386; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
  .mono { font-family: monospace; font-size: 12px; color: #3c4257; }
  .right-panel { width: 320px; border-left: 1px solid #e3e8ee; background: #fff; flex-shrink: 0; overflow-y: auto; }
  .panel-tabs { border-bottom: 1px solid #e3e8ee; display: flex; }
  .panel-tab { padding: 12px 16px; font-size: 12px; font-weight: 500; color: #697386; border-bottom: 2px solid transparent; }
  .panel-tab.active { color: #635bff; border-bottom-color: #635bff; }
  .panel-app-header { padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid #e3e8ee; font-size: 11px; color: #697386; font-weight: 500; }
  .dsg-app { padding: 16px; }
  .dsg-title { font-size: 13px; font-weight: 600; color: #1a1f36; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .dsg-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
  .dsg-badge.allow { background: #d7f5e9; color: #0a7040; border: 1px solid #7dd3b0; }
  .dsg-badge.review { background: #fff4d6; color: #8a5a00; border: 1px solid #f5d87e; }
  .dsg-badge.block { background: #ffe4e4; color: #c0392b; border: 1px solid #f5a0a0; }
  .dsg-banner { padding: 10px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 10px; border-left: 3px solid; }
  .dsg-banner.allow { background: #f0faf5; border-color: #27ae60; color: #0a4a25; }
  .dsg-banner.review { background: #fffbf0; border-color: #f5a623; color: #5a3e00; }
  .dsg-banner.block { background: #fff5f5; border-color: #e74c3c; color: #5a0000; }
  .dsg-banner-title { font-weight: 600; margin-bottom: 3px; font-size: 12px; }
  .dsg-banner-desc { font-size: 11.5px; line-height: 1.5; }
  .dsg-divider { border: none; border-top: 1px solid #f0f4f8; margin: 12px 0; }
  .dsg-meta-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .dsg-meta-label { font-size: 11px; color: #9ba9b9; }
  .dsg-meta-value { font-size: 10.5px; color: #3c4257; font-family: monospace; }
  .dsg-proof-hash { font-family: monospace; font-size: 10px; color: #9ba9b9; word-break: break-all; padding: 6px 8px; background: #f8fafc; border-radius: 4px; margin-top: 8px; }
`;

const SIDEBAR_HTML = `
  <div class="sidebar">
    <div class="sidebar-logo">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect width="28" height="28" rx="6" fill="#635bff"/><circle cx="14" cy="14" r="7" stroke="#fff" stroke-width="1.5" opacity="0.6"/><path d="M14 10v4l2.5 2.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span>stripe</span>
    </div>
    <div>
      <div class="sidebar-section-label">Payments</div>
      <div class="sidebar-item">Overview</div>
      <div class="sidebar-item active">Payments</div>
      <div class="sidebar-item sub">Charges</div>
      <div class="sidebar-item sub">Disputes</div>
      <div class="sidebar-item">Balances</div>
      <div class="sidebar-item">Payouts</div>
    </div>
    <div>
      <div class="sidebar-section-label">Customers</div>
      <div class="sidebar-item">Customers</div>
      <div class="sidebar-item">Products</div>
    </div>
    <div>
      <div class="sidebar-section-label">Developers</div>
      <div class="sidebar-item">API keys</div>
      <div class="sidebar-item">Webhooks</div>
    </div>
  </div>
`;

const DSG_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="5" fill="#635bff"/><path d="M12 4L4 8v6c0 4 4 7 8 8 4-1 8-4 8-8V8L12 4z" fill="#fff" opacity="0.9"/></svg>`;

const ALLOW_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
${SHARED_STYLES}
</style></head><body>
${SIDEBAR_HTML}
<div class="main">
  <div class="topbar">
    <div class="breadcrumb">
      <span>Payments</span><span class="sep">›</span>
      <span class="current">ch_3NxK4B2eZvKYlo2C08x1pQ7r</span>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="topbar-btn">Refund</button>
      <button class="topbar-btn primary">Capture</button>
    </div>
  </div>
  <div class="content">
    <div class="content-main">
      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
          <span style="font-size:22px;font-weight:700;color:#1a1f36;">฿3,500.00</span>
          <span class="status-badge badge-success">✓ Succeeded</span>
        </div>
        <div style="font-size:13px;color:#697386;">THB · 2026-06-11 09:14:33 · Visa ending in 4242</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Payment details</h3></div>
        <div class="card-body">
          <div class="row">
            <div class="field"><label>Amount</label><span style="font-size:20px;font-weight:600;color:#1a1f36;">฿3,500</span></div>
            <div class="field"><label>Status</label><span class="status-badge badge-success">Succeeded</span></div>
          </div>
          <div class="row">
            <div class="field"><label>Payment ID</label><span class="mono">ch_3NxK4B2eZvKYlo2C08x1pQ7r</span></div>
            <div class="field"><label>Created</label><span style="font-size:13px;color:#1a1f36;">Jun 11, 2026 at 09:14</span></div>
          </div>
          <div class="row">
            <div class="field"><label>Customer</label><span style="font-size:13px;color:#1a1f36;">merchant_acct_3301</span></div>
            <div class="field"><label>Payment method</label><span style="font-size:13px;color:#1a1f36;">Visa •••• 4242</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Timeline</h3></div>
        <div class="card-body" style="font-size:13px;color:#697386;">
          <div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;">
            <div style="width:8px;height:8px;background:#27ae60;border-radius:50%;margin-top:4px;flex-shrink:0;"></div>
            <div><strong style="color:#1a1f36;">Payment succeeded</strong><br>Governance policy: ALLOW · Jun 11, 09:14</div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="width:8px;height:8px;background:#e3e8ee;border-radius:50%;margin-top:4px;flex-shrink:0;"></div>
            <div>Payment created · Jun 11, 09:14</div>
          </div>
        </div>
      </div>
    </div>
    <div class="right-panel">
      <div class="panel-tabs">
        <div class="panel-tab active">Apps</div>
        <div class="panel-tab">Metadata</div>
        <div class="panel-tab">Events</div>
      </div>
      <div class="panel-app-header">DSG Governance Gate</div>
      <div class="dsg-app">
        <div class="dsg-title">${DSG_ICON} DSG Governance Gate</div>
        <div class="dsg-badge allow">✓ ALLOW</div>
        <div class="dsg-banner allow">
          <div class="dsg-banner-title">Policy evaluation: ALLOW</div>
          <div class="dsg-banner-desc">Transaction passed all governance rules. Amount ฿3,500 is within approved limits for this account.</div>
        </div>
        <hr class="dsg-divider">
        <div class="dsg-meta-row"><span class="dsg-meta-label">Policy</span><span class="dsg-meta-value">standard_txn_gate v2.1</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Risk score</span><span class="dsg-meta-value">12 / 100</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Rules checked</span><span class="dsg-meta-value">7 / 7 passed</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Evaluated</span><span class="dsg-meta-value">Jun 11, 09:14:33 UTC</span></div>
        <div class="dsg-proof-hash">sha256:a3f9b2c8d1e4f7a2b5c8d3e6f1a4b7c2…</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

const REVIEW_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
${SHARED_STYLES}
</style></head><body>
${SIDEBAR_HTML}
<div class="main">
  <div class="topbar">
    <div class="breadcrumb">
      <span>Payments</span><span class="sep">›</span>
      <span class="current">ch_3RmN9B2eZvKYlo2C0841xK7p</span>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="topbar-btn">Refund</button>
      <button class="topbar-btn primary">Capture</button>
    </div>
  </div>
  <div class="content">
    <div class="content-main">
      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
          <span style="font-size:22px;font-weight:700;color:#1a1f36;">฿75,000.00</span>
          <span class="status-badge badge-warning">⚠ Requires review</span>
        </div>
        <div style="font-size:13px;color:#697386;">THB · 2026-06-11 14:23:07 · Visa ending in 4242</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Payment details</h3></div>
        <div class="card-body">
          <div class="row">
            <div class="field"><label>Amount</label><span style="font-size:20px;font-weight:600;color:#1a1f36;">฿75,000</span></div>
            <div class="field"><label>Status</label><span class="status-badge badge-warning">Review</span></div>
          </div>
          <div class="row">
            <div class="field"><label>Payment ID</label><span class="mono">ch_3RmN9B2eZvKYlo2C0841xK7p</span></div>
            <div class="field"><label>Created</label><span style="font-size:13px;color:#1a1f36;">Jun 11, 2026 at 14:23</span></div>
          </div>
          <div class="row">
            <div class="field"><label>Customer</label><span style="font-size:13px;color:#1a1f36;">merchant_acct_8842</span></div>
            <div class="field"><label>Payment method</label><span style="font-size:13px;color:#1a1f36;">Visa •••• 4242</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Timeline</h3></div>
        <div class="card-body" style="font-size:13px;color:#697386;">
          <div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start;">
            <div style="width:8px;height:8px;background:#f5a623;border-radius:50%;margin-top:4px;flex-shrink:0;"></div>
            <div><strong style="color:#1a1f36;">Held for review</strong><br>Governance policy flagged this payment · Jun 11, 14:23</div>
          </div>
          <div style="display:flex;gap:10px;align-items:flex-start;">
            <div style="width:8px;height:8px;background:#e3e8ee;border-radius:50%;margin-top:4px;flex-shrink:0;"></div>
            <div>Payment created · Jun 11, 14:23</div>
          </div>
        </div>
      </div>
    </div>
    <div class="right-panel">
      <div class="panel-tabs">
        <div class="panel-tab active">Apps</div>
        <div class="panel-tab">Metadata</div>
        <div class="panel-tab">Events</div>
      </div>
      <div class="panel-app-header">DSG Governance Gate</div>
      <div class="dsg-app">
        <div class="dsg-title">${DSG_ICON} DSG Governance Gate</div>
        <div class="dsg-badge review">⚠ REVIEW</div>
        <div class="dsg-banner review">
          <div class="dsg-banner-title">Manual review required</div>
          <div class="dsg-banner-desc">Amount ฿75,000 exceeds medium-risk threshold (฿50,000). Routed to compliance queue for operator approval.</div>
        </div>
        <hr class="dsg-divider">
        <div class="dsg-meta-row"><span class="dsg-meta-label">Policy</span><span class="dsg-meta-value">standard_txn_gate v2.1</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Risk score</span><span class="dsg-meta-value">62 / 100</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Rule triggered</span><span class="dsg-meta-value">amount_threshold</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Evaluated</span><span class="dsg-meta-value">Jun 11, 14:23:08 UTC</span></div>
        <div class="dsg-proof-hash">sha256:7c4e2a1b9f3d8e5c0a6b4d2f1e9c7a3b…</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

const BLOCK_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
${SHARED_STYLES}
</style></head><body>
${SIDEBAR_HTML}
<div class="main">
  <div class="topbar">
    <div class="breadcrumb">
      <span>Payments</span><span class="sep">›</span>
      <span class="current">ch_3RmP7D2eZvKYlo2C0193yW2m</span>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="topbar-btn disabled">Refund</button>
      <button class="topbar-btn disabled">Capture</button>
    </div>
  </div>
  <div class="content">
    <div class="content-main">
      <div style="background:#fff0f0;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:flex-start;gap:12px;">
        <span style="font-size:18px;flex-shrink:0;">🚫</span>
        <div>
          <div style="font-size:14px;font-weight:600;color:#991b1b;margin-bottom:4px;">Payment blocked by governance policy</div>
          <div style="font-size:12.5px;color:#7f1d1d;">DSG Governance Gate blocked this transaction. No funds were captured. Two-person approval required.</div>
        </div>
      </div>
      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
          <span style="font-size:22px;font-weight:700;color:#1a1f36;">฿150,000.00</span>
          <span class="status-badge badge-danger">✕ Blocked</span>
        </div>
        <div style="font-size:13px;color:#697386;">THB · 2026-06-11 16:47:22 · Mastercard ending in 5555</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Payment details</h3></div>
        <div class="card-body">
          <div class="row">
            <div class="field"><label>Amount</label><span style="font-size:20px;font-weight:600;color:#1a1f36;">฿150,000</span></div>
            <div class="field"><label>Status</label><span class="status-badge badge-danger">Blocked</span></div>
          </div>
          <div class="row">
            <div class="field"><label>Payment ID</label><span class="mono">ch_3RmP7D2eZvKYlo2C0193yW2m</span></div>
            <div class="field"><label>Created</label><span style="font-size:13px;color:#1a1f36;">Jun 11, 2026 at 16:47</span></div>
          </div>
          <div class="row">
            <div class="field"><label>Customer</label><span style="font-size:13px;color:#1a1f36;">merchant_acct_2271</span></div>
            <div class="field"><label>Required approvers</label><span style="font-size:13px;color:#e74c3c;font-weight:500;">2 of 2 pending</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
          <h3>Approvals required</h3>
          <span style="font-size:11px;color:#f5a623;font-weight:600;">0 / 2 approved</span>
        </div>
        <div class="card-body" style="font-size:13px;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f4f8;">
            <div>
              <div style="font-weight:500;color:#1a1f36;">Primary Approver</div>
              <div style="font-size:12px;color:#697386;">compliance@dsg.pics</div>
            </div>
            <span style="font-size:11px;color:#8a5a00;background:#fff4d6;padding:2px 8px;border-radius:4px;font-weight:500;">Pending</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
            <div>
              <div style="font-weight:500;color:#1a1f36;">Secondary Approver</div>
              <div style="font-size:12px;color:#697386;">risk@dsg.pics</div>
            </div>
            <span style="font-size:11px;color:#8a5a00;background:#fff4d6;padding:2px 8px;border-radius:4px;font-weight:500;">Pending</span>
          </div>
        </div>
      </div>
    </div>
    <div class="right-panel">
      <div class="panel-tabs">
        <div class="panel-tab active">Apps</div>
        <div class="panel-tab">Metadata</div>
        <div class="panel-tab">Events</div>
      </div>
      <div class="panel-app-header">DSG Governance Gate</div>
      <div class="dsg-app">
        <div class="dsg-title">${DSG_ICON} DSG Governance Gate</div>
        <div class="dsg-badge block">✕ BLOCK</div>
        <div class="dsg-banner block">
          <div class="dsg-banner-title">Transaction blocked</div>
          <div class="dsg-banner-desc">฿150,000 exceeds high-risk threshold. New destination account. Two-person approval required per policy.</div>
        </div>
        <hr class="dsg-divider">
        <div class="dsg-meta-row"><span class="dsg-meta-label">Policy</span><span class="dsg-meta-value">standard_txn_gate v2.1</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Risk score</span><span class="dsg-meta-value">91 / 100</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Rules triggered</span><span class="dsg-meta-value">high_amount, new_dest</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Approvals</span><span class="dsg-meta-value" style="color:#e74c3c;">0 / 2 received</span></div>
        <div class="dsg-meta-row"><span class="dsg-meta-label">Evaluated</span><span class="dsg-meta-value">Jun 11, 16:47:22 UTC</span></div>
        <div class="dsg-proof-hash">sha256:2f8a1c3e9b4d7f0e5c2a8b1d4f9e3c6a…</div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1600, height: 900 });

await page.setContent(ALLOW_HTML, { waitUntil: 'networkidle' });
await page.screenshot({ path: '/home/user/tdealer01-crypto-dsg-control-plane/stripe-listing-1-allow.png' });
console.log('✅ stripe-listing-1-allow.png  (1600x900)');

await page.setContent(REVIEW_HTML, { waitUntil: 'networkidle' });
await page.screenshot({ path: '/home/user/tdealer01-crypto-dsg-control-plane/stripe-listing-2-review.png' });
console.log('✅ stripe-listing-2-review.png (1600x900)');

await page.setContent(BLOCK_HTML, { waitUntil: 'networkidle' });
await page.screenshot({ path: '/home/user/tdealer01-crypto-dsg-control-plane/stripe-listing-3-block.png' });
console.log('✅ stripe-listing-3-block.png  (1600x900)');

await browser.close();
console.log('All 3 screenshots done — 1600×900 px each.');
