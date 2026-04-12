"use client";

import { useState } from "react";

const TOOLS = [
  ["readiness", "GET /api/core/monitor", "Read readiness, health, entropy, alerts, billing"],
  ["execute_action", "POST /api/mcp/call", "Create intent + execute through DSG gate"],
  ["browser_navigate", "POST /api/mcp/call", "Navigate URL and extract output via Browserbase"],
  ["telegram_send", "POST /api/mcp/call", "Send Telegram messages through controlled executor"],
  ["audit_summary", "GET /api/runtime-summary", "Read runtime truth + latest ledger entries"],
  ["checkpoint", "POST /api/checkpoint", "Create checkpoint hash from truth + ledger"],
  ["recovery_validate", "POST /api/runtime-recovery", "Validate lineage integrity and sequence continuity"],
  ["capacity", "GET /api/capacity", "Read quota and utilization"],
  ["list_agents", "GET /api/agents", "Read org agents and usage"],
  ["create_agent", "POST /api/agents", "Create new agent and one-time API key"],
  ["create_chatbot_agent", "POST /api/agents", "Create chatbot-ready agent with default monthly limit"],
  ["list_policies", "GET /api/policies", "Read available policies"],
  ["reconcile_effect", "POST /api/effect-callback", "Reconcile effect status"],
  ["auto_setup", "POST /api/setup/auto", "Auto-configure: policy + agent + execution + billing + onboarding"],
] as const;

type SetupResult = {
  ok?: boolean;
  org_id?: string;
  execution_id?: string;
  api_key?: string;
  api_key_warning?: string;
  steps?: string[];
  env_check?: Record<string, string>;
  next_steps?: string[];
  error?: string;
};

export default function SkillsPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState("");

  async function runAutoSetup() {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/setup/auto", { method: "POST", cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `Setup failed (${res.status})`);
      } else {
        setResult(json);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">DSG Skills</p>
          <h1 className="mt-3 text-4xl font-bold">Agent Tool Registry</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            DSG tool/skill ที่ใช้งานจริงในระบบ ผ่าน{" "}
            <code className="rounded bg-slate-800 px-2 py-1 text-emerald-300">POST /api/agent-chat</code>{" "}
            และ runtime spine เดียวกันทั้งหมด
          </p>
        </section>

        <section className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-8">
          <h2 className="text-xl font-semibold text-emerald-200">Auto-Setup (ตั้งค่าอัตโนมัติ)</h2>
          <p className="mt-2 text-sm text-slate-300">
            กดปุ่มเดียว — สร้าง policy, agent, execution, billing subscription, onboarding state,
            runtime roles ครบทั้งระบบ + เช็ค env vars ที่ยังขาด
          </p>
          <button
            onClick={() => void runAutoSetup()}
            disabled={running}
            className="mt-4 rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-50"
          >
            {running ? "กำลังตั้งค่า..." : "เริ่ม Auto-Setup"}
          </button>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold text-emerald-300">
                  {result.ok ? "✅ Setup สำเร็จ" : "⚠️ Setup มีปัญหาบางส่วน"}
                </p>
                <p className="mt-1 text-sm text-slate-400">Org: {result.org_id}</p>
                {result.execution_id && (
                  <p className="text-sm text-slate-400">Execution: {result.execution_id}</p>
                )}
              </div>

              {result.api_key && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <p className="font-semibold text-amber-200">🔑 API Key (เก็บไว้ — จะไม่แสดงอีก)</p>
                  <code className="mt-2 block break-all rounded bg-slate-950 p-3 text-xs text-emerald-300">
                    {result.api_key}
                  </code>
                </div>
              )}

              {result.steps && result.steps.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="font-semibold">Steps:</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {result.steps.map((step, i) => (
                      <li key={i} className={step.includes("FAIL") ? "text-red-300" : "text-emerald-300"}>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.env_check && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="font-semibold">Env Check:</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {Object.entries(result.env_check).map(([key, val]) => (
                      <li key={key} className={String(val).includes("❌") ? "text-red-300" : "text-emerald-300"}>
                        {key}: {val}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.next_steps && result.next_steps.length > 0 && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
                  <p className="font-semibold text-amber-200">ต้องทำเพิ่ม:</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-100">
                    {result.next_steps.map((step, i) => (
                      <li key={i}>• {step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-xl font-semibold">Built-in Tools ({TOOLS.length})</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-200">
                <tr>
                  <th className="px-4 py-2">Tool</th>
                  <th className="px-4 py-2">Endpoint</th>
                  <th className="px-4 py-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map(([name, endpoint, purpose]) => (
                  <tr key={name} className="border-t border-slate-800 text-slate-300">
                    <td className="px-4 py-3 font-mono text-emerald-300">{name}</td>
                    <td className="px-4 py-3">{endpoint}</td>
                    <td className="px-4 py-3">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-xl font-semibold">Example: Stream Agent Chat (SSE)</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-emerald-200">{`curl -N https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent-chat \\
  -H 'Content-Type: application/json' \\
  -H 'Cookie: <session_cookie>' \\
  --data '{"message":"check readiness and capacity"}'`}</pre>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-xl font-semibold">Auto-Setup via curl</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-emerald-200">{`curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/setup/auto \\
  -H 'Cookie: <session_cookie>'`}</pre>
        </section>
      </div>
    </main>
  );
}
