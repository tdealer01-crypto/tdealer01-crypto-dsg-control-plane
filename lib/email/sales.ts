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
    'Welcome to DSG ONE — get started now',
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">DSG ONE — AI Governance Platform</h2>
      <p>Thank you for your interest in DSG ONE.</p>
      <p>Things you can do right now:</p>
      <ul>
        <li><a href="${BASE_URL}/enterprise-proof/demo">View Enterprise Proof Demo</a> — see a real audit trail</li>
        <li><a href="${BASE_URL}/pricing">Compare plans</a> — free trial, no card required</li>
        <li><a href="${BASE_URL}/request-access">Request access</a> — open the dashboard immediately</li>
      </ul>
      <a href="${BASE_URL}/request-access"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Start for free →
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
    `⚠️ You've used ${pct}% of your quota — upgrade before the system pauses`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#f59e0b">⚠️ Quota nearly full</h2>
      <p>Plan <strong>${opts.planKey.toUpperCase()}</strong>: <strong>${opts.executions.toLocaleString()}</strong> of ${opts.included.toLocaleString()} executions used (${pct}%)</p>
      <p>Once you hit the limit, additional executions are billed at $0.001 each — or upgrade your plan for a higher quota.</p>
      <a href="${BASE_URL}/dashboard/billing"
         style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        View plans and upgrade →
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
  const trialDate = opts.trialEnd ? new Date(opts.trialEnd).toLocaleDateString('en-US') : '14 days';
  await sendEmail(
    opts.email,
    `🚀 Your ${opts.planKey.toUpperCase()} trial has started — 3 things to do first`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">🚀 Trial started!</h2>
      <p>Plan <strong>${opts.planKey.toUpperCase()}</strong> is active until <strong>${trialDate}</strong></p>
      <h3>3 things to do in the first 24 hours:</h3>
      <ol>
        <li><a href="${BASE_URL}/dashboard/agents">Create your first Agent</a> — takes 2 minutes</li>
        <li><a href="${BASE_URL}/dashboard/policies">Set up a Policy</a> — define what your AI is allowed to do</li>
        <li><a href="${BASE_URL}/finance-governance/app">Open Finance Governance</a> — see the approval workflow</li>
      </ol>
      <a href="${BASE_URL}/dashboard"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Open Dashboard →
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
    `📊 You're halfway through your trial — have you tried this feature?`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#6366f1">📊 Halfway there</h2>
      <p>You have <strong>${opts.daysLeft} days</strong> left in your ${opts.planKey.toUpperCase()} trial</p>
      <p>Most popular features with customers:</p>
      <ul>
        <li><strong>Approval Workflow</strong> — AI requests approval before every execution</li>
        <li><strong>Audit Ledger</strong> — logs every action with evidence</li>
        <li><strong>Finance Governance</strong> — control AI managing budgets</li>
      </ul>
      <a href="${BASE_URL}/dashboard/billing"
         style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Upgrade before your trial ends →
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
    `⏰ Your trial ends in ${opts.daysLeft} days — upgrade before your data is lost`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#ef4444">⏰ Trial expiring soon</h2>
      <p>Your <strong>${opts.planKey.toUpperCase()}</strong> plan expires in <strong>${opts.daysLeft} days</strong></p>
      <p>Upgrade now to:</p>
      <ul>
        <li>Keep your audit trail and agents intact</li>
        <li>Zero downtime</li>
        <li>Pro starts at $99/month</li>
      </ul>
      <a href="${BASE_URL}/dashboard/billing"
         style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Upgrade now →
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
    `✅ Upgrade successful — welcome to DSG ONE ${opts.planKey.toUpperCase()}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">✅ Congratulations!</h2>
      <p>You've successfully upgraded to <strong>${opts.planKey.toUpperCase()} (${opts.billingInterval})</strong></p>
      <p>What's now unlocked:</p>
      <ul>
        <li>Higher execution quota per your plan</li>
        <li>Priority support</li>
        <li>Advanced governance features</li>
      </ul>
      <a href="${BASE_URL}/dashboard"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Open Dashboard →
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
      <h2 style="color:#10b981">🛂 Gate your AI actions now</h2>
      <p>${opts.openingLine}</p>
      <pre style="background:#0f172a;color:#86efac;padding:16px;border-radius:8px;font-size:13px;overflow:auto">// 1. Get API key from /dashboard/integrations
DSG_API_KEY="dsg_live_xxx"
DSG_AGENT_ID="my-agent"

// 2. Gate every action before execution
POST ${BASE_URL}/api/execute
Authorization: Bearer $DSG_API_KEY
{
  "agent_id": "$DSG_AGENT_ID",
  "action": "read invoice",
  "input": {"invoice_id": "INV-001"},
  "context": {"source": "agent"}
}
// → { "decision": "ALLOW", "proof_hash": "sha256:...", ... }</pre>
      <a href="${BASE_URL}/dashboard/integrations"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Get API Key →
      </a>
      <p style="color:#64748b;font-size:12px;margin-top:24px">Full working examples: <a href="${BASE_URL}/quickstart" style="color:#10b981">quickstart</a></p>
    </div>`);
}

// ─── Behavioral: Enable Block Mode ────────────────────────────────────────────
export async function sendBehavioralEnableBlock(opts: {
  email: string; subject: string; openingLine: string; executions: number;
}): Promise<void> {
  await sendEmail(opts.email, opts.subject,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#f59e0b">🔒 Enable BLOCK mode to see DSG working for real</h2>
      <p>${opts.openingLine}</p>
      <p>You've had <strong>${opts.executions} executions</strong> pass through the gate, but you're still in <code>audit_only</code> mode</p>
      <pre style="background:#0f172a;color:#86efac;padding:16px;border-radius:8px;font-size:13px">PATCH /api/dsg/ledger/config
{ "mode": "gate" }</pre>
      <a href="${BASE_URL}/dashboard/settings"
         style="background:#f59e0b;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Enable Block Mode →
      </a>
    </div>`);
}

// ─── Behavioral: Stuck — Offer Founder Call ───────────────────────────────────
export async function sendBehavioralStuckOffer(opts: {
  email: string; subject: string; openingLine: string; daysLeft: number;
}): Promise<void> {
  await sendEmail(opts.email, opts.subject,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#6366f1">You have ${opts.daysLeft} days left — can I get 15 minutes?</h2>
      <p>${opts.openingLine}</p>
      <ul style="color:#475569">
        <li>Stuck integrating with your existing framework?</li>
        <li>Not sure how DSG applies to your specific case?</li>
        <li>Want a guided setup walkthrough?</li>
      </ul>
      <a href="mailto:${process.env.FOUNDER_EMAIL ?? 'founder@dsg.pics'}?subject=Trial%20call%20request"
         style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Reply to this email → book a time
      </a>
      <p style="color:#64748b;font-size:12px;margin-top:24px">I respond within 4 hours.</p>
    </div>`);
}

// ─── Behavioral: High Usage — Upgrade Nudge ──────────────────────────────────
export async function sendBehavioralHighUsage(opts: {
  email: string; subject: string; openingLine: string; executions: number; daysLeft: number;
}): Promise<void> {
  await sendEmail(opts.email, opts.subject,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#10b981">🚀 You're using DSG heavily — time to upgrade</h2>
      <p>${opts.openingLine}</p>
      <p>Stats: <strong>${opts.executions} executions</strong>, <strong>${opts.daysLeft} days</strong> left in trial</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr style="background:#0f172a;color:#94a3b8">
          <th style="padding:8px;text-align:left">Plan</th><th style="padding:8px">Price</th><th style="padding:8px">Executions</th>
        </tr>
        <tr><td style="padding:8px">Pro</td><td style="padding:8px;text-align:center">$99/month</td><td style="padding:8px;text-align:center">Unlimited</td></tr>
        <tr style="background:#f0fdf4"><td style="padding:8px;font-weight:bold">Business ★</td><td style="padding:8px;text-align:center">$299/month</td><td style="padding:8px;text-align:center">Unlimited + team</td></tr>
      </table>
      <a href="${BASE_URL}/dashboard/billing"
         style="background:#10b981;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold">
        Upgrade before your trial ends →
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
    `🛂 ${opts.workspaceName} — gate issued first BLOCK (reach out now)`,
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
        Email ${opts.email} now →
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
    `Your ${fw} agent — does it block before acting, or just log after?`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto;line-height:1.6">
      <p>Hey,</p>
      <p>Came across <strong>${opts.githubRepo}</strong>${opts.githubStars > 0 ? ` (${opts.githubStars}★)` : ''} — looks like you're running a real ${fw} agent in production.</p>
      <p>Quick question: if your agent tried to delete production data, call an external API without authorization, or leak sensitive information right now — would your system <strong>stop it before it happens</strong>, or would you find out after?</p>
      <p>Most tools (LangSmith, Langfuse, DataDog) tell you what happened <em>after</em>. Too late.</p>
      <p><strong>DSG ONE blocks before the action executes</strong> — plus gives you a cryptographic audit trail that satisfies EU AI Act Articles 9, 12, and 14. One-line setup, no changes to your existing ${fw} code.</p>
      <p>If you're dealing with compliance, audit requirements, or just want to stop trusting your agent blindly — happy to give you free access.</p>
      <p>— DSG ONE founder<br>
      <a href="${BASE_URL}/eu-ai-act">${BASE_URL}/eu-ai-act</a></p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="font-size:12px;color:#94a3b8">
        You're receiving this because your GitHub project uses ${fw}.
        <a href="${BASE_URL}/unsubscribe?email=${encodeURIComponent(opts.email)}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>`,
  );
}

// ─── Trial Invite (for warmed leads) ─────────────────────────────────────────
// Sent to leads that received outreach + followup but haven't signed up yet
export async function sendLeadTrialInvite(opts: {
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
  const signupUrl = `${BASE_URL}/signup`;
  await sendEmail(
    opts.email,
    `Free 14-day trial — add governance to ${opts.githubRepo} today`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto;line-height:1.6">
      <p>Hey,</p>
      <p>We opened up self-serve trials for DSG ONE — no credit card, no waiting list.</p>
      <p>You can add governance to your ${fw} agent in under 5 minutes:</p>
      <ol>
        <li>Sign up below (14-day trial, free)</li>
        <li>Get an API key from the dashboard</li>
        <li>Add one line before every agent action — DSG blocks anything outside your policy</li>
      </ol>
      <a href="${signupUrl}"
         style="background:#10b981;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;font-size:16px;margin-top:8px">
        Start free trial →
      </a>
      <p style="margin-top:24px;color:#475569">If now isn't the right time, no problem — just reply and let me know.</p>
      <p>— DSG ONE founder</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="font-size:12px;color:#94a3b8">
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

// ─── Payment Failed (Dunning) ─────────────────────────────────────────────────
// Triggered on invoice.payment_failed webhook event
export async function sendPaymentFailed(opts: {
  email: string;
  planKey: string;
  amountDue: number;
  attemptCount: number;
  nextPaymentAttempt: number | null;
}): Promise<void> {
  const amountStr = (opts.amountDue / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const nextAttemptDate = opts.nextPaymentAttempt
    ? new Date(opts.nextPaymentAttempt * 1000).toLocaleDateString('en-US')
    : 'soon';

  await sendEmail(
    opts.email,
    `⚠️ Payment failed — update your billing method now`,
    `<div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#ef4444">⚠️ Payment could not be processed</h2>
      <p>We tried to charge ${amountStr} for your <strong>${opts.planKey.toUpperCase()}</strong> plan (attempt ${opts.attemptCount}).</p>
      <p>The charge was declined. This can happen if:</p>
      <ul>
        <li>Your card has expired or been replaced</li>
        <li>Your bank blocked the charge</li>
        <li>Insufficient funds</li>
      </ul>
      <p><strong>Next retry:</strong> ${nextAttemptDate}</p>
      <p>To avoid service suspension, update your billing method now:</p>
      <a href="${BASE_URL}/dashboard/billing"
         style="background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px">
        Update Payment Method →
      </a>
      <p style="color:#64748b;font-size:12px;margin-top:32px">If this charge was denied by mistake, contact your bank or <a href="mailto:support@dsg.pics" style="color:#64748b">reach out to support</a>.</p>
    </div>`,
  );
}
