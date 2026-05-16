// Sales automation email templates and send helpers
// All functions are fire-and-forget (no throws) — missing RESEND_API_KEY = no-op

const FROM = process.env.RESEND_FROM_EMAIL ?? 'DSG ONE <no-reply@dsg.pics>';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  }).catch(() => null);
}

// ─── Lead Welcome ─────────────────────────────────────────────────────────────
// Triggered when a visitor shares their email in public-chat
export async function sendLeadWelcome(email: string): Promise<void> {
  await sendEmail(
    email,
    'ยินดีต้อนรับสู่ DSG ONE — เริ่มต้นได้เลย',
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">DSG ONE — AI Governance Platform</h2>
      <p>ขอบคุณที่สนใจ DSG ONE ครับ</p>
      <p>สิ่งที่ทำได้ทันที:</p>
      <ul>
        <li><a href="${BASE_URL}/enterprise-proof/demo">ดู Enterprise Proof Demo</a> — เห็น audit trail จริง</li>
        <li><a href="${BASE_URL}/pricing">เปรียบเทียบ Plan</a> — Trial ฟรี ไม่ต้องใส่บัตร</li>
        <li><a href="${BASE_URL}/request-access">ขอ Access</a> — เริ่มใช้ dashboard ได้เลย</li>
      </ul>
      <a href="${BASE_URL}/request-access"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        เริ่มใช้งานฟรี →
      </a>
      <p style="color:#64748b;font-size:12px;margin-top:32px">DSG ONE | ${BASE_URL}</p>
    </div>`,
  );
}

// ─── 80% Quota Alert ──────────────────────────────────────────────────────────
// Triggered from /api/capacity when utilization >= 0.8
export async function sendQuotaAlert(opts: {
  email: string;
  planKey: string;
  executions: number;
  included: number;
  utilization: number;
}): Promise<void> {
  const pct = Math.round(opts.utilization * 100);
  await sendEmail(
    opts.email,
    `⚠️ คุณใช้ quota ไปแล้ว ${pct}% — อัปเกรดก่อนระบบหยุด`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#f59e0b">⚠️ Quota ใกล้เต็มแล้ว</h2>
      <p>Plan <strong>${opts.planKey.toUpperCase()}</strong>: ใช้ไป <strong>${opts.executions.toLocaleString()}</strong> จาก ${opts.included.toLocaleString()} executions (${pct}%)</p>
      <p>เมื่อใช้ครบ execution จะถูกคิด overage $0.001/ครั้ง หรืออัปเกรด plan เพื่อ quota สูงขึ้น</p>
      <a href="${BASE_URL}/dashboard/billing"
         style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        ดู Plan และอัปเกรด →
      </a>
    </div>`,
  );
}

// ─── Trial Welcome (D0) ───────────────────────────────────────────────────────
// Triggered on checkout.session.completed
export async function sendTrialWelcome(opts: {
  email: string;
  planKey: string;
  trialEnd: string | null;
}): Promise<void> {
  const trialDate = opts.trialEnd ? new Date(opts.trialEnd).toLocaleDateString('th-TH') : '14 วัน';
  await sendEmail(
    opts.email,
    `🚀 Trial ${opts.planKey.toUpperCase()} เริ่มแล้ว — 3 สิ่งที่ควรทำก่อน`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">🚀 Trial เริ่มแล้ว!</h2>
      <p>Plan <strong>${opts.planKey.toUpperCase()}</strong> พร้อมใช้งานจนถึง <strong>${trialDate}</strong></p>
      <h3>3 สิ่งที่ควรทำใน 24 ชั่วโมงแรก:</h3>
      <ol>
        <li><a href="${BASE_URL}/dashboard/agents">สร้าง Agent แรก</a> — ใช้เวลา 2 นาที</li>
        <li><a href="${BASE_URL}/dashboard/policies">ตั้ง Policy</a> — กำหนดว่า AI ทำอะไรได้บ้าง</li>
        <li><a href="${BASE_URL}/finance-governance/app">เปิด Finance Governance</a> — ดู approval workflow</li>
      </ol>
      <a href="${BASE_URL}/dashboard"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        เปิด Dashboard →
      </a>
    </div>`,
  );
}

// ─── Trial Mid-Point (D7) ────────────────────────────────────────────────────
// Triggered by cron job /api/cron/drip-emails
export async function sendTrialMidpoint(opts: {
  email: string;
  planKey: string;
  daysLeft: number;
}): Promise<void> {
  await sendEmail(
    opts.email,
    `📊 Trial ผ่านไปครึ่งทางแล้ว — คุณใช้ feature นี้ยัง?`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#6366f1">📊 ผ่านมาครึ่งทางแล้ว</h2>
      <p>เหลืออีก <strong>${opts.daysLeft} วัน</strong> ใน Trial ${opts.planKey.toUpperCase()}</p>
      <p>Feature ที่ลูกค้าชอบมากที่สุด:</p>
      <ul>
        <li><strong>Approval Workflow</strong> — AI ขออนุมัติก่อน execute ทุกครั้ง</li>
        <li><strong>Audit Ledger</strong> — log ทุก action พร้อม evidence</li>
        <li><strong>Finance Governance</strong> — ควบคุม AI ที่จัดการงบประมาณ</li>
      </ul>
      <a href="${BASE_URL}/dashboard/billing"
         style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        อัปเกรดก่อน Trial หมด →
      </a>
    </div>`,
  );
}

// ─── Trial Expiry Warning (D13) ───────────────────────────────────────────────
// Triggered by cron job /api/cron/drip-emails
export async function sendTrialExpiry(opts: {
  email: string;
  planKey: string;
  daysLeft: number;
}): Promise<void> {
  await sendEmail(
    opts.email,
    `⏰ Trial หมดใน ${opts.daysLeft} วัน — อัปเกรดก่อนข้อมูลหาย`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#ef4444">⏰ Trial ใกล้หมดแล้ว</h2>
      <p>Plan <strong>${opts.planKey.toUpperCase()}</strong> จะหมดใน <strong>${opts.daysLeft} วัน</strong></p>
      <p>อัปเกรดตอนนี้เพื่อ:</p>
      <ul>
        <li>ข้อมูล audit trail และ agents ยังคงอยู่ครบ</li>
        <li>ไม่มี downtime</li>
        <li>ราคา Pro เริ่มต้น $99/เดือน</li>
      </ul>
      <a href="${BASE_URL}/dashboard/billing"
         style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        อัปเกรดตอนนี้ →
      </a>
    </div>`,
  );
}

// ─── Upgrade Success ──────────────────────────────────────────────────────────
// Triggered when subscription status transitions to active
export async function sendUpgradeSuccess(opts: {
  email: string;
  planKey: string;
  billingInterval: string;
}): Promise<void> {
  await sendEmail(
    opts.email,
    `✅ อัปเกรดสำเร็จแล้ว — ยินดีต้อนรับสู่ DSG ONE ${opts.planKey.toUpperCase()}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">✅ ยินดีด้วย!</h2>
      <p>คุณอัปเกรดเป็น <strong>${opts.planKey.toUpperCase()} (${opts.billingInterval})</strong> สำเร็จแล้ว</p>
      <p>สิ่งที่ unlock แล้ว:</p>
      <ul>
        <li>Executions เพิ่มขึ้นตาม plan</li>
        <li>Priority support</li>
        <li>Advanced governance features</li>
      </ul>
      <a href="${BASE_URL}/dashboard"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        เปิด Dashboard →
      </a>
    </div>`,
  );
}
