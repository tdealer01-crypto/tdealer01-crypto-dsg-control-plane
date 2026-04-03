"use client";

const TOOLS = [
  ['readiness', 'GET /api/core/monitor', 'Read readiness, health, entropy, alerts, billing'],
  ['execute_action', 'POST /api/mcp/call', 'Create intent + execute through DSG gate'],
  ['audit_summary', 'GET /api/runtime-summary', 'Read runtime truth + latest ledger entries'],
  ['checkpoint', 'POST /api/checkpoint', 'Create checkpoint hash from truth + ledger'],
  ['recovery_validate', 'POST /api/runtime-recovery', 'Validate lineage integrity and sequence continuity'],
  ['capacity', 'GET /api/capacity', 'Read quota and utilization'],
  ['list_agents', 'GET /api/agents', 'Read org agents and usage'],
  ['create_agent', 'POST /api/agents', 'Create new agent and one-time API key'],
  ['list_policies', 'GET /api/policies', 'Read available policies'],
  ['reconcile_effect', 'POST /api/effect-callback', 'Reconcile effect status'],
] as const;

export default function SkillsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">DSG Skills</p>
          <h1 className="mt-3 text-4xl font-bold">Agent Tool Registry</h1>
          <p className="mt-3 max-w-3xl text-slate-300">
            หน้านี้อธิบาย DSG tool/skill ที่ใช้งานจริงในระบบ ผ่าน <code className="rounded bg-slate-800 px-2 py-1 text-emerald-300">POST /api/agent-chat</code>{' '}
            และ runtime spine เดียวกันทั้งหมด
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-xl font-semibold">Built-in Tools (10)</h2>
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
          <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-emerald-200">{`curl -N http://localhost:3000/api/agent-chat \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <agent_api_key>' \\
  --data '{"message":"check readiness and capacity"}'`}</pre>
        </section>
      </div>
    </main>
  );
}
