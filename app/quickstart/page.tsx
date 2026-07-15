'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Metadata } from 'next';

const BASE_URL = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

const STEPS = [
  {
    num: '01',
    title: 'Declare your session',
    subtitle: 'Tell DSG ONE which actions your agent is allowed to perform — before it runs.',
    description:
      'Every agent session starts with a declaration. This is your contract: the gate will only allow actions that match what you declared here.',
    curl: `curl -X POST ${BASE_URL}/api/try/gate \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "my-agent-run-001",
    "declared_actions": [
      "read database",
      "send email",
      "update user record"
    ],
    "ttl_minutes": 30
  }'`,
    python: `import requests

response = requests.post(
    "${BASE_URL}/api/try/gate",
    json={
        "session_id": "my-agent-run-001",
        "declared_actions": [
            "read database",
            "send email",
            "update user record"
        ],
        "ttl_minutes": 30,
    }
)

data = response.json()
print(data["decision"])          # "ALLOW"
print(data["declaration_stamp"]) # "DSG-A4B2C1D3"`,
    javascript: `const response = await fetch("${BASE_URL}/api/try/gate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    session_id: "my-agent-run-001",
    declared_actions: [
      "read database",
      "send email",
      "update user record",
    ],
    ttl_minutes: 30,
  }),
});

const data = await response.json();
console.log(data.decision);          // "ALLOW"
console.log(data.declaration_stamp); // "DSG-A4B2C1D3"`,
    response: `{
  "ok": true,
  "decision": "ALLOW",
  "session_id": "my-agent-run-001",
  "declaration_stamp": "DSG-A4B2C1D3",
  "declared_actions": ["read database", "send email", "update user record"],
  "ttl_minutes": 30,
  "expires_at": "2026-05-18T05:02:00.000Z",
  "agent_guidance": {
    "message": "Session declared. Gate is active for 30 minutes."
  }
}`,
  },
  {
    num: '02',
    title: 'Gate every action',
    subtitle: 'Before your agent executes anything, ask the gate. Gets a cryptographic stamp if allowed.',
    description:
      'Send the action string to the gate before your agent runs it. If the action matches your declaration, you get an ALLOW stamp. If not — or if it matches a permanently blocked pattern — you get BLOCK with full guidance.',
    curl: `curl -X POST ${BASE_URL}/api/try/gate \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "my-agent-run-001",
    "action": "send email to user@example.com"
  }'`,
    python: `def gate_check(session_id: str, action: str) -> dict:
    response = requests.post(
        "${BASE_URL}/api/try/gate",
        json={"session_id": session_id, "action": action}
    )
    return response.json()

# Before every agent action:
result = gate_check("my-agent-run-001", "send email to user@example.com")

if result["decision"] == "ALLOW":
    stamp = result["stamp"]
    # Execute the action — you have a cryptographic proof
    send_email(to="user@example.com", audit_stamp=stamp)
else:
    # BLOCK — do not execute, check guidance
    print(result["agent_guidance"]["suggested_llm_prompt"])`,
    javascript: `async function gateCheck(sessionId, action) {
  const res = await fetch("${BASE_URL}/api/try/gate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, action }),
  });
  return res.json();
}

// Before every agent action:
const result = await gateCheck("my-agent-run-001", "send email to user@example.com");

if (result.decision === "ALLOW") {
  const stamp = result.stamp;
  // Execute the action — you have a cryptographic proof
  await sendEmail({ to: "user@example.com", auditStamp: stamp });
} else {
  // BLOCK — do not execute, check guidance
  console.log(result.agent_guidance.suggested_llm_prompt);
}`,
    response: `{
  "decision": "ALLOW",
  "stamp": "DSG-X9K3M7P2",
  "action": "send email to user@example.com",
  "session_state": {
    "session_id": "my-agent-run-001",
    "declared_actions": ["read database", "send email", "update user record"],
    "stamps_issued": 1,
    "blocked_count": 0,
    "ttl_remaining_min": 29
  }
}`,
  },
  {
    num: '03',
    title: 'Handle ALLOW and BLOCK',
    subtitle: 'ALLOW comes with a cryptographic stamp. BLOCK comes with full agent guidance.',
    description:
      'When an action is blocked, the gate returns the reason, what alternatives are available, and a suggested prompt so your LLM can self-correct — without human intervention.',
    curl: `# Try a blocked action:
curl -X POST ${BASE_URL}/api/try/gate \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "my-agent-run-001",
    "action": "delete all user records"
  }'`,
    python: `result = gate_check("my-agent-run-001", "delete all user records")

if result["decision"] == "BLOCK":
    reason = result["reason"]
    guidance = result["agent_guidance"]

    # Self-healing: pass the suggested prompt back to your LLM
    corrected_action = your_llm.complete(
        guidance["suggested_llm_prompt"]
    )
    print(f"Blocked: {reason}")
    print(f"Alternatives: {guidance['can_proceed_with']}")`,
    javascript: `const result = await gateCheck("my-agent-run-001", "delete all user records");

if (result.decision === "BLOCK") {
  const { reason, agent_guidance } = result;

  // Self-healing: pass the suggested prompt back to your LLM
  const correctedAction = await yourLLM.complete(
    agent_guidance.suggested_llm_prompt
  );
  console.log("Blocked:", reason);
  console.log("Alternatives:", agent_guidance.can_proceed_with);
}`,
    response: `{
  "decision": "BLOCK",
  "reason": "Pattern \"delete\\\\s+all\" is permanently blocked regardless of declaration",
  "blocked_action": "delete all user records",
  "session_state": {
    "session_id": "my-agent-run-001",
    "declared_actions": ["read database", "send email", "update user record"],
    "stamps_issued": 1,
    "blocked_count": 1,
    "ttl_remaining_min": 28
  },
  "agent_guidance": {
    "can_proceed_with": ["read database", "send email", "update user record"],
    "suggested_llm_prompt": "Your action \\"delete all user records\\" was blocked by DSG Gate. You can still perform: read database, send email, update user record. Choose an alternative or stop."
  }
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

BASE = "${BASE_URL}/api/try/gate"

def declare(session_id: str, actions: list[str], ttl: int = 60) -> dict:
    return requests.post(BASE, json={
        "session_id": session_id,
        "declared_actions": actions,
        "ttl_minutes": ttl,
    }).json()

def gate(session_id: str, action: str) -> dict:
    return requests.post(BASE, json={
        "session_id": session_id,
        "action": action,
    }).json()

# 1. Declare at the start of your agent run
session = declare(
    session_id="invoice-processor-run-42",
    actions=["read invoice", "validate amount", "send payment confirmation"],
)
assert session["decision"] == "ALLOW", "Session declaration failed"

# 2. Gate every action before executing
actions_to_run = [
    "read invoice from database",
    "validate amount against threshold",
    "send payment confirmation email",
    "delete all invoices",  # this will be blocked
]

stamps = []
for action in actions_to_run:
    result = gate("invoice-processor-run-42", action)
    if result["decision"] == "ALLOW":
        stamp = result["stamp"]
        stamps.append(stamp)
        # Execute with cryptographic proof
        run_action(action, audit_stamp=stamp)
    else:
        # Log and skip — do not execute
        print(f"BLOCKED: {action}")
        print(f"Reason: {result['reason']}")
        break

print(f"Completed {len(stamps)} actions with audit stamps: {stamps}")`;

const FULL_EXAMPLE_JS = `const BASE = "${BASE_URL}/api/try/gate";

async function declare(sessionId, actions, ttlMinutes = 60) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, declared_actions: actions, ttl_minutes: ttlMinutes }),
  });
  return res.json();
}

async function gate(sessionId, action) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, action }),
  });
  return res.json();
}

// 1. Declare at the start of your agent run
const session = await declare(
  "invoice-processor-run-42",
  ["read invoice", "validate amount", "send payment confirmation"]
);
if (session.decision !== "ALLOW") throw new Error("Session declaration failed");

// 2. Gate every action before executing
const actionsToRun = [
  "read invoice from database",
  "validate amount against threshold",
  "send payment confirmation email",
  "delete all invoices", // this will be blocked
];

const stamps = [];
for (const action of actionsToRun) {
  const result = await gate("invoice-processor-run-42", action);
  if (result.decision === "ALLOW") {
    stamps.push(result.stamp);
    await runAction(action, { auditStamp: result.stamp });
  } else {
    console.log("BLOCKED:", action);
    console.log("Reason:", result.reason);
    break;
  }
}

console.log(\`Completed \${stamps.length} actions with audit stamps:\`, stamps);`;

export default function QuickstartPage() {
  const [activeLang, setActiveLang] = useState<Lang>('curl');
  const [fullExLang, setFullExLang] = useState<'python' | 'javascript'>('python');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <section className="border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-block rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1.5 text-sm font-semibold text-amber-200">
            REST API — no SDK required
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Integrate DSG ONE in
            <span className="text-amber-300"> 5 minutes</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
            Three API calls. No installation. Works with any language, any AI framework.
            Your agent declares its intent — DSG ONE gates every action with a cryptographic stamp.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/dashboard/integrations"
              className="rounded-xl bg-amber-300 px-7 py-3 font-bold text-slate-950 hover:bg-amber-200"
            >
              Get your API key →
            </Link>
            <Link
              href="/eu-ai-act"
              className="rounded-xl border border-slate-600 px-7 py-3 font-bold text-slate-200 hover:border-slate-400"
            >
              Why compliance matters
            </Link>
          </div>
        </div>
      </section>

      {/* Base URL */}
      <section className="border-b border-white/10 bg-slate-900/50 px-6 py-6">
        <div className="mx-auto max-w-4xl flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-400 shrink-0">Base URL</span>
          <code className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-4 py-2 font-mono text-sm text-emerald-300">
            {BASE_URL}/api/try/gate
          </code>
          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            No auth required for trial
          </span>
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

      {/* How stamps work */}
      <section className="border-t border-white/10 bg-slate-900/50 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-2xl font-black">What the stamp proves</h2>
          <p className="mb-8 text-slate-400">
            Every ALLOW response includes a cryptographic stamp. This is your audit evidence.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Tamper-proof',
                desc: 'The stamp is generated server-side and tied to your session ID and action. It cannot be forged or replayed.',
                icon: '🔒',
              },
              {
                title: 'EU AI Act Art. 12',
                desc: 'Every gated action is logged with timestamp and decision. Satisfies record-keeping requirements for high-risk AI.',
                icon: '📋',
              },
              {
                title: 'Self-healing agents',
                desc: 'BLOCK responses include a suggested prompt so your LLM can decide next steps without human intervention.',
                icon: '🤖',
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

      {/* Rate limits */}
      <section className="border-t border-white/10 bg-slate-900/50 px-6 py-12">
        <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-bold text-slate-100">Trial limits</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-amber-400">·</span> 60 requests / minute
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">·</span> Sessions expire after TTL (default 60 min)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">·</span> No API key required for trial
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">·</span> Production accounts: unlimited with API key
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-bold text-slate-100">Permanently blocked actions</h3>
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
          <p className="mt-6 text-sm text-slate-500">No credit card · 5-minute setup · REST API — no SDK</p>
        </div>
      </section>
    </main>
  );
}
