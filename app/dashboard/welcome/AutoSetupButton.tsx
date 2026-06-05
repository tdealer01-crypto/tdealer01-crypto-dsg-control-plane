'use client';

import { useState } from 'react';
import Link from 'next/link';
import OnboardingMascot from '../../../components/OnboardingMascot';

type SetupState = 'idle' | 'running' | 'done' | 'error';
type Lang = 'python' | 'javascript' | 'curl';

type SetupResult = {
  ok: boolean;
  api_key?: string;
  agent_id?: string;
  execution_id?: string;
  error?: string;
  // Per-step statuses returned by POST /api/setup/auto, used to drive the
  // evidence-true onboarding stepper. Optional — older responses may omit them.
  policy?: string;
  agent?: string;
  checkpoint?: string;
  rpc_commit?: string;
  first_run_complete?: boolean;
};

// Map a raw setup/auto step status string to a simple boolean "passed".
function stepPassed(status: string | undefined, okValues: string[]): boolean {
  return typeof status === 'string' && okValues.includes(status);
}

function codeSnippet(lang: Lang, apiKey: string) {
  if (lang === 'python') return `import requests

DSG_API_KEY = "${apiKey}"
BASE_URL = "https://tdealer01-crypto-dsg-control-plane.vercel.app"

def gate(session_id: str, action: str) -> str:
    r = requests.post(f"{BASE_URL}/api/execute", json={
        "session_id": session_id,
        "action": action,
    }, headers={"Authorization": f"Bearer {DSG_API_KEY}"})
    return r.json().get("decision", "BLOCK")

# Call gate() before every action your agent performs
if gate("run-001", "send email to customer") == "ALLOW":
    send_email()   # passed the gate - safe to run
else:
    pass           # BLOCK - stop, do not run`;

  if (lang === 'javascript') return `const DSG_API_KEY = "${apiKey}";
const BASE_URL = "https://tdealer01-crypto-dsg-control-plane.vercel.app";

async function gate(sessionId, action) {
  const res = await fetch(\`\${BASE_URL}/api/execute\`, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${DSG_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session_id: sessionId, action }),
  });
  const data = await res.json();
  return data.decision; // "ALLOW" | "BLOCK"
}

// Call gate() before every action your agent performs
const decision = await gate("run-001", "send email to customer");
if (decision === "ALLOW") {
  await sendEmail(); // passed the gate
}`;

  return `curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "run-001",
    "action": "send email to customer"
  }'

# Response:
# { "decision": "ALLOW", "stamp": "DSG-A4B2" }
# or
# { "decision": "BLOCK", "reason": "action not declared" }`;
}

export default function AutoSetupButton() {
  const [state, setState] = useState<SetupState>('idle');
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<Lang>('python');
  const [codeCopied, setCodeCopied] = useState(false);

  async function runSetup() {
    setState('running');
    try {
      const res = await fetch('/api/setup/auto', { method: 'POST' });
      const data = await res.json();
      setResult(data);
      setState(data.ok ? 'done' : 'error');
    } catch {
      setResult({ ok: false, error: 'Network error — please try again.' });
      setState('error');
    }
  }

  function copyKey() {
    if (!result?.api_key) return;
    navigator.clipboard.writeText(result.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state === 'idle') {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <OnboardingMascot pose="waving" size={56} />
            <div>
              <h2 className="text-lg font-bold text-white">Quick Setup — ติดตั้งอัตโนมัติ</h2>
              <p className="mt-1 max-w-lg text-sm text-slate-400">
                กดปุ่มเดียว — DSG จะสร้าง agent, policy, API key และรัน execution แรกให้อัตโนมัติ
                ใช้เวลาไม่ถึง 10 วินาที
              </p>
            </div>
          </div>
          <button
            onClick={runSetup}
            className="shrink-0 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
          >
            ติดตั้งเลย →
          </button>
        </div>
      </div>
    );
  }

  if (state === 'running') {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex items-center gap-4">
          <OnboardingMascot pose="walking" size={48} />
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          <div>
            <p className="font-bold text-white">กำลังติดตั้ง...</p>
            <p className="text-sm text-slate-400">สร้าง agent · ตั้ง policy · รัน execution แรก</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'done' && result) {
    // Evidence-true step states derived from the real setup/auto response.
    const onboardingFlowSteps = [
      { label: 'Policy พร้อม', done: stepPassed(result.policy, ['OK']) },
      { label: 'Agent เชื่อมต่อ', done: stepPassed(result.agent, ['CREATED', 'EXISTS']) },
      { label: 'Evidence แรกถูกบันทึก', done: Boolean(result.execution_id) },
    ];

    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <h2 className="font-bold text-white">ติดตั้งเสร็จแล้ว — พร้อมใช้งาน</h2>
              <p className="text-sm text-slate-400">Agent, policy และ audit trail ถูกสร้างแล้ว</p>
            </div>
          </div>
          <OnboardingMascot pose="waving" size={56} message="พร้อมแล้ว!" />
        </div>

        {/* Onboarding step trail — the mascot "walked" through these. The check
            states come from the real setup response, not the mascot. */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            ขั้นตอน onboarding
          </p>
          <ol className="space-y-1.5">
            {onboardingFlowSteps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm">
                <span className={s.done ? 'text-emerald-400' : 'text-slate-500'}>
                  {s.done ? '✓' : '○'}
                </span>
                <span className={s.done ? 'text-slate-200' : 'text-slate-500'}>{s.label}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Default safety posture — what the starter policy enforces */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Default safe policy · นโยบายความปลอดภัยเริ่มต้น
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            <li><span className="font-mono text-red-300">BLOCK</span> — action ที่ risk ≥ 0.80 ถูกหยุดก่อนทำงาน</li>
            <li><span className="font-mono text-amber-300">STABILIZE</span> — risk ≥ 0.40 ถูกตั้งให้รอ review/approval</li>
            <li><span className="font-mono text-emerald-300">ALLOW</span> — risk &lt; 0.40 ผ่าน gate ได้</li>
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            ทุก decision มี evidence stamp ตรวจสอบย้อนหลังได้ใน Audit log
          </p>
        </div>

        {result.api_key && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-300">
              API Key — เห็นครั้งเดียว บันทึกไว้เลย
            </p>
            <div className="flex items-center gap-3">
              <code className="flex-1 truncate rounded-lg bg-slate-900 px-3 py-2 text-sm font-mono text-emerald-300">
                {result.api_key}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              ใส่ใน header: <code className="text-slate-300">Authorization: Bearer {'<key>'}</code>
            </p>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          {result.agent_id && (
            <div className="rounded-lg bg-slate-800/60 px-3 py-2">
              <span className="text-slate-400">Agent ID: </span>
              <span className="font-mono text-slate-200 text-xs">{result.agent_id}</span>
            </div>
          )}
          {result.execution_id && (
            <div className="rounded-lg bg-slate-800/60 px-3 py-2">
              <span className="text-slate-400">Execution: </span>
              <span className="font-mono text-slate-200 text-xs">{result.execution_id}</span>
            </div>
          )}
        </div>

        {/* Code snippet */}
        {result.api_key && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                เพิ่มในโค้ด agent ของคุณ
              </p>
              <div className="flex gap-1">
                {(['python', 'javascript', 'curl'] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`rounded px-2 py-1 text-xs font-bold transition ${
                      lang === l
                        ? 'bg-emerald-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {l === 'javascript' ? 'JS' : l === 'python' ? 'Python' : 'cURL'}
                  </button>
                ))}
              </div>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-emerald-300 font-mono">
              {codeSnippet(lang, result.api_key)}
            </pre>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codeSnippet(lang, result.api_key!));
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }}
              className="text-xs font-semibold text-slate-400 hover:text-white"
            >
              {codeCopied ? '✓ Copied' : 'Copy code'}
            </button>
          </div>
        )}

        {/* Download install file */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 space-y-3">
          <div>
            <p className="text-sm font-bold text-white">ดาวน์โหลดไฟล์ติดตั้ง</p>
            <p className="text-xs text-slate-400 mt-1">
              วางไฟล์นี้ในโฟลเดอร์ agent ของคุณ → import ใช้ได้เลย ไม่ต้อง config อะไรเพิ่ม
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/quickstart/download?lang=python"
              download="dsg_gate.py"
              className="flex items-center gap-2 rounded-lg border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-sm font-bold text-blue-300 hover:bg-blue-400/20"
            >
              <span>⬇</span> dsg_gate.py
            </a>
            <a
              href="/api/quickstart/download?lang=javascript"
              download="dsg_gate.js"
              className="flex items-center gap-2 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-300 hover:bg-yellow-400/20"
            >
              <span>⬇</span> dsg_gate.js
            </a>
          </div>
          <p className="text-xs text-slate-500">
            Python: <code className="text-slate-300">from dsg_gate import gate</code>
            {' · '}
            JS: <code className="text-slate-300">const {'{ gate }'} = require(&apos;./dsg_gate&apos;)</code>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/dashboard"
            className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-300"
          >
            เปิด Dashboard →
          </Link>
          <Link
            href="/quickstart"
            className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-bold text-slate-200 hover:border-slate-400"
          >
            ดู Quickstart →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
      <div className="flex items-start gap-3">
        <OnboardingMascot pose="blocked" size={52} />
        <div className="flex-1">
          <p className="font-bold text-white">Setup ไม่สำเร็จ</p>
          <p className="mt-1 text-sm text-slate-400">{result?.error ?? 'เกิดข้อผิดพลาด — ลองใหม่อีกครั้ง'}</p>
        </div>
        <button
          onClick={() => { setState('idle'); setResult(null); }}
          className="shrink-0 rounded-xl border border-slate-600 px-4 py-2 text-sm font-bold text-slate-300 hover:border-slate-400"
        >
          ลองใหม่
        </button>
      </div>
    </div>
  );
}
