'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Metadata } from 'next';

const BASE_URL = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

const STEPS = [
  {
    num: '01',
    title: 'Get your API key',
    subtitle: 'Retrieve your DSG_API_KEY and DSG_AGENT_ID from the dashboard.',
    description:
      'Every agent needs credentials to connect to the production governed path. Visit /dashboard/integrations to get your API key and agent ID — or download a pre-filled helper script that includes both automatically.',
    curl: `# Get your API key from /dashboard/integrations
DSG_API_KEY="dsg_live_xxxxxxxxxxxx"
DSG_AGENT_ID="my-agent-001"

curl -X POST ${BASE_URL}/api/execute \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $DSG_API_KEY" \\
  -d '{
    "agent_id": "'$DSG_AGENT_ID'",
    "action": "read database",
    "input": {"table": "invoices"},
    "context": {"source": "agent"}
  }'`,
    python: `# Install the official template:
# curl ${BASE_URL}/api/quickstart/download?lang=python > dsg_gate.py

from dsg_gate import gate

# Before every agent action, ask the gate:
decision = gate("my-session-001", "read database")

if decision == "ALLOW":
    # Safe to execute
    fetch_invoices()
else:
    # BLOCK — do not execute
    print(f"Action blocked: {decision}")`,
    javascript: `// Download the official template:
// curl ${BASE_URL}/api/quickstart/download?lang=javascript > dsg_gate.js

const { gate } = require('./dsg_gate');

// Before every agent action, ask the gate:
const decision = await gate("my-session-001", "read database");

if (decision === "ALLOW") {
  // Safe to execute
  fetchInvoices();
} else {
  // BLOCK — do not execute
  console.log(\`Action blocked: \${decision}\`);
}`,
    response: `{
  "decision": "ALLOW",
  "reason": "action allowed by policy",
  "proof_hash": "sha256:abc123def456...",
  "execution_id": "exec-2026-07-16-abcdef",
  "stop_reason": null
}`,
  },
  {
    num: '02',
    title: 'Gate every action',
    subtitle: 'Call /api/execute before side effects — get decision + proof.',
    description:
      'Submit your agent action with agent_id, action name, input data, and context. The governed path returns a decision: ALLOW (proceed), BLOCK (stop), REVIEW (escalate), or STABILIZE (queue). All decisions are logged with proof hashes for audit trails.',
    curl: `curl -X POST ${BASE_URL}/api/execute \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $DSG_API_KEY" \\
  -d '{
    "agent_id": "my-agent-001",
    "action": "send email",
    "input": {"to": "user@example.com", "subject": "Invoice"},
    "context": {"risk_score": 0.2, "source": "agent"}
  }'`,
    python: `import requests

def execute_with_gate(agent_id: str, action: str, input_data: dict, context: dict = None):
    response = requests.post(
        "${BASE_URL}/api/execute",
        headers={
            "Authorization": f"Bearer {DSG_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "agent_id": agent_id,
            "action": action,
            "input": input_data,
            "context": context or {"source": "agent"},
        },
    )
    return response.json()

# Call before side effects:
result = execute_with_gate(
    agent_id="my-agent-001",
    action="send email",
    input_data={"to": "user@example.com", "subject": "Invoice"},
)

decision = result.get("decision")
if decision == "ALLOW":
    send_email(...)
elif decision == "BLOCK":
    print(f"Blocked: {result['reason']}")
else:  # REVIEW, STABILIZE
    queue_for_approval(...)`,
    javascript: `async function executeWithGate(agentId, action, input, context = {}) {
  const response = await fetch("${BASE_URL}/api/execute", {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${process.env.DSG_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: agentId,
      action,
      input,
      context: { source: "agent", ...context },
    }),
  });
  return response.json();
}

// Call before side effects:
const result = await executeWithGate(
  "my-agent-001",
  "send email",
  { to: "user@example.com", subject: "Invoice" }
);

if (result.decision === "ALLOW") {
  sendEmail(...);
} else if (result.decision === "BLOCK") {
  console.error(\`Blocked: \${result.reason}\`);
} else {
  queueForApproval(...);
}`,
    response: `{
  "decision": "ALLOW",
  "reason": "matches inline threshold policy",
  "proof_hash": "sha256:7e4c3f8a...",
  "execution_id": "exec-2026-07-16-xyz789",
  "stop_reason": null,
  "usage": {
    "execution_count": 42,
    "remaining_quota": 958
  }
}`,
  },
  {
    num: '03',
    title: 'Handle decisions',
    subtitle: 'ALLOW → execute; BLOCK → stop; REVIEW/STABILIZE → queue.',
    description:
      'Every decision includes reason and proof_hash for audit. ALLOW means the action matches policy. BLOCK means stop immediately. REVIEW and STABILIZE queue for approval — use webhooks or polling to track status. All outcomes are logged in your audit trail.',
    curl: `# Blocked decision:
curl -X POST ${BASE_URL}/api/execute \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $DSG_API_KEY" \\
  -d '{
    "agent_id": "my-agent-001",
    "action": "delete all invoices",
    "input": {},
    "context": {"source": "agent"}
  }'`,
    python: `# Handle all decision types:
result = execute_with_gate(
    agent_id="my-agent-001",
    action="delete all invoices",
    input_data={},
)

decision = result["decision"]
reason = result["reason"]
proof_hash = result["proof_hash"]

if decision == "ALLOW":
    delete_invoices()
    log_audit("action executed", proof_hash)
elif decision == "BLOCK":
    print(f"Permanently blocked: {reason}")
    # Do NOT execute
elif decision in ["REVIEW", "STABILIZE"]:
    queue_id = result.get("queue_id")
    print(f"Queued for review: {queue_id}")
    # Wait for approval via webhook or polling`,
    javascript: `// Handle all decision types:
const result = await executeWithGate(
  "my-agent-001",
  "delete all invoices",
  {}
);

const { decision, reason, proof_hash } = result;

if (decision === "ALLOW") {
  deleteInvoices();
  auditLog("action executed", proof_hash);
} else if (decision === "BLOCK") {
  console.error(\`Permanently blocked: \${reason}\`);
  // Do NOT execute
} else if (["REVIEW", "STABILIZE"].includes(decision)) {
  const queueId = result.queue_id;
  console.log(\`Queued for review: \${queueId}\`);
  // Poll or subscribe to webhooks for approval
}`,
    response: `{
  "decision": "BLOCK",
  "reason": "pattern \\"delete.*all\\" blocked by permanent policy",
  "proof_hash": "sha256:9f2a1b5c...",
  "execution_id": "exec-2026-07-16-blocked42",
  "stop_reason": "policy_violation"
}`,
  },
];

const LANGS = ['curl', 'python', 'javascript'] as const;
type Lang = (typeof LANGS)[number];

const LANG_LABELS: Record<Lang, string> = {
  curl: 'cURL',
  python: 'Python',
  javascript: 'JavaScript',
};

const FULL_EXAMPLE_PYTHON = `import requests
import logging

DSG_BASE_URL = "${BASE_URL}"
DSG_API_KEY = "dsg_live_xxxxxxxxxxxx"  # from /dashboard/integrations
DSG_AGENT_ID = "my-invoice-agent"

logger = logging.getLogger(__name__)

def execute_with_dsg(action: str, input_data: dict) -> dict:
    """Call /api/execute before every side effect."""
    try:
        resp = requests.post(
            f"{DSG_BASE_URL}/api/execute",
            headers={
                "Authorization": f"Bearer {DSG_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "agent_id": DSG_AGENT_ID,
                "action": action,
                "input": input_data,
                "context": {"source": "invoice-processor", "timestamp_ms": 0},
            },
            timeout=5,
        )
        return resp.json()
    except Exception as exc:
        logger.error("[DSG] execute error: %s — defaulting to BLOCK", exc)
        return {"decision": "BLOCK", "reason": "network_error"}

# Example: Process a batch of invoices
invoices = [
    {"id": "INV-001", "amount": 5000},
    {"id": "INV-002", "amount": 15000},
    {"id": "INV-003", "amount": 1000000},  # suspicious amount
]

for invoice in invoices:
    # 1. Ask gate before processing
    result = execute_with_dsg(
        action="process invoice",
        input_data={"invoice_id": invoice["id"], "amount": invoice["amount"]},
    )

    decision = result["decision"]
    reason = result.get("reason", "")
    proof_hash = result.get("proof_hash", "")

    if decision == "ALLOW":
        logger.info(f"Processing {invoice['id']} — proof: {proof_hash}")
        # Execute: send to payment processor, record audit, etc.
        process_invoice(invoice)
    elif decision == "BLOCK":
        logger.warning(f"Blocked {invoice['id']}: {reason}")
        # Do NOT execute
    else:
        # REVIEW or STABILIZE
        logger.info(f"Queued {invoice['id']} for approval")
        queue_for_approval(invoice)

print("Invoice batch completed with full audit trail")`;

const FULL_EXAMPLE_JS = `const DSG_BASE_URL = "${BASE_URL}";
const DSG_API_KEY = "dsg_live_xxxxxxxxxxxx";  // from /dashboard/integrations
const DSG_AGENT_ID = "my-invoice-agent";

async function executeWithDSG(action, inputData) {
  try {
    const res = await fetch(\`\${DSG_BASE_URL}/api/execute\`, {
      method: "POST",
      headers: {
        "Authorization": \`Bearer \${DSG_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: DSG_AGENT_ID,
        action,
        input: inputData,
        context: { source: "invoice-processor", timestamp_ms: 0 },
      }),
    });
    return res.json();
  } catch (err) {
    console.error("[DSG] execute error:", err, "— defaulting to BLOCK");
    return { decision: "BLOCK", reason: "network_error" };
  }
}

// Example: Process a batch of invoices
const invoices = [
  { id: "INV-001", amount: 5000 },
  { id: "INV-002", amount: 15000 },
  { id: "INV-003", amount: 1000000 },  // suspicious amount
];

for (const invoice of invoices) {
  // 1. Ask gate before processing
  const result = await executeWithDSG(
    "process invoice",
    { invoice_id: invoice.id, amount: invoice.amount }
  );

  const { decision, reason = "", proof_hash = "" } = result;

  if (decision === "ALLOW") {
    console.log(\`Processing \${invoice.id} — proof: \${proof_hash}\`);
    // Execute: send to payment processor, record audit, etc.
    processInvoice(invoice);
  } else if (decision === "BLOCK") {
    console.warn(\`Blocked \${invoice.id}: \${reason}\`);
    // Do NOT execute
  } else {
    // REVIEW or STABILIZE
    console.log(\`Queued \${invoice.id} for approval\`);
    queueForApproval(invoice);
  }
}

console.log("Invoice batch completed with full audit trail");`;

export default function QuickstartPage() {
  const [activeLang, setActiveLang] = useState<Lang>('curl');
  const [fullExLang, setFullExLang] = useState<'python' | 'javascript'>('python');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-block rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-1.5 text-sm font-semibold text-emerald-200">
            Production Governed Execution Path
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Gate AI actions before they run.
            <span className="text-emerald-300"> Full audit trail.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            One REST API. Any language. Zero installation. Post your agent action to /api/execute,
            get back a decision (ALLOW / BLOCK / REVIEW / STABILIZE) with proof hashes and audit logs.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard/integrations"
              className="rounded-xl bg-emerald-600 px-7 py-3 font-bold text-white hover:bg-emerald-500"
            >
              Get your API key →
            </Link>
            <Link
              href="/eu-ai-act"
              className="rounded-xl border border-slate-600 px-7 py-3 font-bold text-slate-200 hover:border-slate-400"
            >
              Compliance ready
            </Link>
          </div>
        </div>
      </section>

      {/* Base URL */}
      <section className="border-b border-white/10 bg-slate-900/50 px-6 py-6">
        <div className="mx-auto max-w-4xl flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-400 shrink-0">Endpoint</span>
          <code className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 font-mono text-sm text-emerald-300">
            {BASE_URL}/api/execute
          </code>
          <Link
            href="/dashboard/integrations"
            className="shrink-0 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-300/20"
          >
            Get API Key →
          </Link>
        </div>
      </section>

      {/* Language tabs */}
      <section className="sticky top-[73px] z-40 border-b border-white/10 bg-[#08090b]/90 px-6 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl flex items-center gap-2">
          <span className="mr-2 text-xs text-slate-500">Examples in:</span>
          {LANGS.map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={[
                'rounded-lg border px-4 py-1.5 text-sm font-semibold transition',
                activeLang === lang
                  ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200',
              ].join(' ')}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-16">
          {STEPS.map((step, i) => (
            <div key={step.num} className="grid gap-8 md:grid-cols-[1fr_1.6fr]">
              {/* Left: explanation */}
              <div className="flex flex-col justify-center">
                <div className="mb-3 text-4xl font-black text-white/10">{step.num}</div>
                <h2 className="mb-2 text-xl font-bold text-slate-100">{step.title}</h2>
                <p className="mb-3 text-sm font-medium text-amber-300">{step.subtitle}</p>
                <p className="text-sm text-slate-400">{step.description}</p>
                {i < STEPS.length - 1 && (
                  <div className="mt-6 hidden h-px bg-white/5 md:block" />
                )}
              </div>

              {/* Right: code */}
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden">
                  <div className="border-b border-white/10 bg-slate-800/50 px-4 py-2 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-500/60" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <span className="h-3 w-3 rounded-full bg-green-500/60" />
                    <span className="ml-3 text-xs text-slate-500">
                      {LANG_LABELS[activeLang]}
                    </span>
                  </div>
                  <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-emerald-300">
                    <code>{step[activeLang]}</code>
                  </pre>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 overflow-hidden">
                  <div className="border-b border-emerald-500/20 px-4 py-2">
                    <span className="text-xs font-semibold text-emerald-400">Response</span>
                  </div>
                  <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-slate-300">
                    <code>{step.response}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Audit and proof */}
      <section className="border-t border-white/10 bg-slate-900/50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-2xl font-black">Every decision is auditable</h2>
          <p className="mb-8 text-slate-400">
            Every execution returns a proof_hash and execution_id. All decisions logged with reason and timestamp.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Proof Hash',
                desc: 'SHA256 hash of decision + payload. Tied to execution_id for deterministic replay and audit trail verification.',
                icon: '🔐',
              },
              {
                title: 'EU AI Act Art. 12 Ready',
                desc: 'Every gated action logged with timestamp, decision, reason, and proof hash. Export for compliance auditors.',
                icon: '📋',
              },
              {
                title: 'Policy-driven',
                desc: 'Decisions come from deterministic gates, not randomness. Same input = same decision. Fully auditable and reproducible.',
                icon: '⚙️',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
                <div className="mb-3 text-2xl">{item.icon}</div>
                <h3 className="mb-2 font-bold text-slate-100">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full working example */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-2xl font-black">Full working example</h2>
          <p className="mb-6 text-slate-400">
            Copy-paste this to run a complete agent session with declare → gate → execute.
          </p>

          {/* Language switch */}
          <div className="mb-4 flex gap-2">
            {(['python', 'javascript'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setFullExLang(lang)}
                className={[
                  'rounded-lg border px-4 py-1.5 text-sm font-semibold transition',
                  fullExLang === lang
                    ? 'border-amber-300/40 bg-amber-300/10 text-amber-200'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200',
                ].join(' ')}
              >
                {lang === 'python' ? 'Python' : 'JavaScript'}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden">
            <div className="border-b border-white/10 bg-slate-800/50 px-4 py-2 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500/60" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <span className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-slate-500">
                {fullExLang === 'python' ? 'agent_example.py' : 'agentExample.js'}
              </span>
            </div>
            <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-emerald-300">
              <code>{fullExLang === 'python' ? FULL_EXAMPLE_PYTHON : FULL_EXAMPLE_JS}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Account limits and policies */}
      <section className="border-t border-white/10 bg-slate-900/50 px-6 py-12">
        <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-bold text-slate-100">Starter agent limits</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-amber-400">·</span> 1,000 executions / month (starter)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">·</span> 60 requests / minute (rate limit)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">·</span> Requires valid API key (Bearer token)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">·</span> Usage tracked per organization
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-bold text-slate-100">Permanently blocked patterns</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              {[
                'delete all / drop table / truncate',
                'bypass policy / override gate',
                'rm -rf / format disk',
                'exfiltrate / steal data',
              ].map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="text-red-400">✗</span> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Download ready-to-use files */}
      <section className="border-t border-white/10 bg-slate-900/50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-2xl font-black">Download ready-to-use files</h2>
          <p className="mb-8 text-slate-400">
            Skip the manual setup. Download pre-configured helper scripts with your API key already embedded.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-2 font-bold text-slate-100">Python Helper</h3>
              <p className="mb-4 text-sm text-slate-400">dsg_gate.py — ready to drop into your agent code</p>
              <Link
                href="/api/quickstart/download?lang=python"
                className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Download dsg_gate.py
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-2 font-bold text-slate-100">JavaScript Helper</h3>
              <p className="mb-4 text-sm text-slate-400">dsg_gate.js — CommonJS or ESM compatible</p>
              <Link
                href="/api/quickstart/download?lang=javascript"
                className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Download dsg_gate.js
              </Link>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
            <h3 className="mb-2 font-bold text-slate-100">Integration Pack</h3>
            <p className="mb-4 text-sm text-slate-400">
              Get all env vars, smoke tests, and a Node.js code snippet in one JSON response. Great for team setups.
            </p>
            <code className="block rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-300 mb-4">
              curl -s -X POST {BASE_URL}/api/quickstart/integration-pack \
              <br />
              &nbsp;&nbsp;-H &quot;Authorization: Bearer $DSG_API_KEY&quot; |
              jq .
            </code>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-amber-300/20 bg-amber-950/20 px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-black">Ready to protect production?</h2>
          <p className="mb-8 text-slate-300">
            Get an API key, connect your agent, and generate your first compliance-ready audit trail.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard/integrations"
              className="rounded-xl bg-amber-300 px-8 py-4 text-lg font-bold text-slate-950 hover:bg-amber-200"
            >
              Start free →
            </Link>
            <Link
              href="/eu-ai-act"
              className="rounded-xl border border-slate-600 px-8 py-4 text-lg font-bold text-slate-200 hover:border-slate-400"
            >
              EU AI Act compliance
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">No credit card · 5-minute setup · Production API · Full audit trail</p>
        </div>
      </section>
    </main>
  );
}
