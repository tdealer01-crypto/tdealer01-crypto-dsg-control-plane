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

// ─── Behavioral: No Agent Connected (D1+) ─────────────────────────────────────
export async function sendBehavioralNoAgent(opts: {
  email: string; subject: string; openingLine: string;
}): Promise<void> {
  await sendEmail(opts.email, opts.subject,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">🛂 DSG Gate รอ agent ของคุณอยู่</h2>
      <p>${opts.openingLine}</p>
      <pre style="background:#0f172a;color:#86efac;padding:16px;border-radius:8px;font-size:13px;overflow:auto">// 1. ประกาศ session
POST ${BASE_URL}/api/try/gate
{ "session_id": "sess_abc", "declared_actions": ["read_file","send_email"], "ttl_minutes": 30 }

// 2. ตรวจก่อนทุก action
POST ${BASE_URL}/api/try/gate
{ "session_id": "sess_abc", "action": "read_file path=/reports/q1.pdf" }
// → { "decision": "ALLOW", "stamp": "DSG-A3F8" }</pre>
      <a href="${BASE_URL}/dashboard/api-keys"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        รับ API Key →
      </a>
      <p style="color:#64748b;font-size:12px;margin-top:24px">มีคำถาม? ตอบ email นี้ได้เลยครับ</p>
    </div>`);
}

// ─── Behavioral: Enable Block Mode ────────────────────────────────────────────
export async function sendBehavioralEnableBlock(opts: {
  email: string; subject: string; openingLine: string; executions: number;
}): Promise<void> {
  await sendEmail(opts.email, opts.subject,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#f59e0b">🔒 เปิด BLOCK mode เพื่อเห็น DSG ทำงานจริง</h2>
      <p>${opts.openingLine}</p>
      <p>ตอนนี้มี <strong>${opts.executions} executions</strong> ผ่าน gate แล้ว แต่ยังอยู่ใน <code>audit_only</code> mode</p>
      <pre style="background:#0f172a;color:#86efac;padding:16px;border-radius:8px;font-size:13px">PATCH /api/dsg/ledger/config
{ "mode": "gate" }</pre>
      <a href="${BASE_URL}/dashboard/settings"
         style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        เปิด Block Mode →
      </a>
    </div>`);
}

// ─── Behavioral: Stuck — Offer Founder Call ───────────────────────────────────
export async function sendBehavioralStuckOffer(opts: {
  email: string; subject: string; openingLine: string; daysLeft: number;
}): Promise<void> {
  await sendEmail(opts.email, opts.subject,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#6366f1">ยังเหลือ ${opts.daysLeft} วัน — ขอ 15 นาทีได้ไหมครับ?</h2>
      <p>${opts.openingLine}</p>
      <ul style="color:#475569">
        <li>ติด integration กับ framework ที่ใช้อยู่?</li>
        <li>ยังไม่แน่ใจว่า DSG จะช่วยกรณีของคุณยังไง?</li>
        <li>อยากให้ช่วย setup ดูให้?</li>
      </ul>
      <a href="mailto:${process.env.FOUNDER_EMAIL ?? 'founder@dsg.pics'}?subject=Trial%20call%20request"
         style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        ตอบ email นี้ → นัดเวลาได้เลย
      </a>
      <p style="color:#64748b;font-size:12px;margin-top:24px">ตอบภายใน 4 ชั่วโมงครับ</p>
    </div>`);
}

// ─── Behavioral: High Usage — Upgrade Nudge ──────────────────────────────────
export async function sendBehavioralHighUsage(opts: {
  email: string; subject: string; openingLine: string; executions: number; daysLeft: number;
}): Promise<void> {
  await sendEmail(opts.email, opts.subject,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">🚀 คุณใช้ DSG หนักมาก — ถึงเวลา upgrade</h2>
      <p>${opts.openingLine}</p>
      <p>Stats: <strong>${opts.executions} executions</strong>, เหลือ <strong>${opts.daysLeft} วัน</strong> ใน trial</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr style="background:#0f172a;color:#94a3b8">
          <th style="padding:8px;text-align:left">Plan</th><th style="padding:8px">ราคา</th><th style="padding:8px">Executions</th>
        </tr>
        <tr><td style="padding:8px">Pro</td><td style="padding:8px;text-align:center">$99/เดือน</td><td style="padding:8px;text-align:center">ไม่จำกัด</td></tr>
        <tr style="background:#f0fdf4"><td style="padding:8px;font-weight:bold">Business ★</td><td style="padding:8px;text-align:center">$299/เดือน</td><td style="padding:8px;text-align:center">ไม่จำกัด + team</td></tr>
      </table>
      <a href="${BASE_URL}/dashboard/billing"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">
        อัปเกรดก่อน trial หมด →
      </a>
    </div>`);
}

// ─── Founder Alert: First Block ────────────────────────────────────────────────
export async function sendFounderAlertFirstBlock(opts: {
  orgId: string; workspaceName: string; email: string; action: string; reason: string;
}): Promise<void> {
  const founderEmail = process.env.FOUNDER_EMAIL;
  if (!founderEmail) return;
  await sendEmail(
    founderEmail,
    `🛂 ${opts.workspaceName} — gate ออก BLOCK แรกแล้ว (reach out now)`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">WOW MOMENT: first BLOCK</h2>
      <table style="font-size:14px;border-collapse:collapse">
        <tr><td style="padding:6px;color:#64748b">Org</td><td style="padding:6px"><strong>${opts.orgId}</strong></td></tr>
        <tr><td style="padding:6px;color:#64748b">Workspace</td><td style="padding:6px"><strong>${opts.workspaceName}</strong></td></tr>
        <tr><td style="padding:6px;color:#64748b">Email</td><td style="padding:6px"><a href="mailto:${opts.email}">${opts.email}</a></td></tr>
        <tr><td style="padding:6px;color:#64748b">Action blocked</td><td style="padding:6px;color:#ef4444">${opts.action}</td></tr>
        <tr><td style="padding:6px;color:#64748b">Reason</td><td style="padding:6px">${opts.reason}</td></tr>
      </table>
      <a href="mailto:${opts.email}?subject=DSG%20just%20blocked%20something%20%E2%80%94%20good%20sign!"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Email ${opts.email} ตอนนี้ →
      </a>
    </div>`);
}

// ─── GitHub Lead Cold Outreach ────────────────────────────────────────────────
export async function sendGitHubLeadOutreach(opts: {
  email: string;
  framework: string;
  githubRepo: string;
  githubStars: number;
}): Promise<void> {
  const frameworkLabel: Record<string, string> = {
    langchain: 'LangChain', 'langchain-js': 'LangChain.js',
    autogen: 'AutoGen', crewai: 'CrewAI',
    'openai-agents': 'OpenAI Agents SDK', 'openai-agents-js': 'OpenAI Agents SDK (JS)',
    'pydantic-ai': 'PydanticAI',
  };
  const fw = frameworkLabel[opts.framework] ?? opts.framework;
  await sendEmail(
    opts.email,
    `Saw your ${fw} repo — question about agent safety`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto;line-height:1.6">
      <p>Hey,</p>
      <p>Came across <strong>${opts.githubRepo}</strong>${opts.githubStars > 0 ? ` (${opts.githubStars}★)` : ''} while looking at ${fw} projects.</p>
      <p>Quick question: when your agent calls tools or executes actions, do you have a way to block specific actions, audit what ran, or add governance rules? Or is it currently just fire-and-hope?</p>
      <p>I'm building <strong>DSG ONE</strong> — a governance layer that sits in front of your agent and lets you gate tool calls, log every action, and set rules like "never delete production data". One-line setup for ${fw}.</p>
      <p>Would it be useful for what you're building?</p>
      <p>Happy to give you free access if you want to try it on your project.</p>
      <p>— DSG ONE founder<br>
      <a href="${BASE_URL}">${BASE_URL}</a></p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="font-size:12px;color:#94a3b8">
        You're receiving this because your GitHub project uses ${fw}.
        <a href="${BASE_URL}/unsubscribe?email=${encodeURIComponent(opts.email)}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>`,
  );
}

// ─── GitHub Lead Follow-up ────────────────────────────────────────────────────
export async function sendGitHubLeadFollowup(opts: {
  email: string;
  framework: string;
  githubRepo: string;
}): Promise<void> {
  const frameworkLabel: Record<string, string> = {
    langchain: 'LangChain', 'langchain-js': 'LangChain.js',
    autogen: 'AutoGen', crewai: 'CrewAI',
    'openai-agents': 'OpenAI Agents SDK', 'openai-agents-js': 'OpenAI Agents SDK (JS)',
    'pydantic-ai': 'PydanticAI',
  };
  const fw = frameworkLabel[opts.framework] ?? opts.framework;
  await sendEmail(
    opts.email,
    `Quick follow-up — ${opts.githubRepo}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto;line-height:1.6">
      <p>Hey,</p>
      <p>Sent a note a few days ago about adding governance to your ${fw} project — just bumping it up in case it got buried.</p>
      <p>One yes/no question: does your agent currently have any way to prevent it from taking destructive actions (deleting data, calling paid APIs without limits, etc.)?</p>
      <p>If no — that's exactly what DSG ONE fixes, in one line of code. Happy to walk you through it on a 15-min call or just give you access to try it yourself.</p>
      <p>Either way, let me know.</p>
      <p>— DSG ONE founder</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="font-size:12px;color:#94a3b8">
        <a href="${BASE_URL}/unsubscribe?email=${encodeURIComponent(opts.email)}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>`,
  );
}
