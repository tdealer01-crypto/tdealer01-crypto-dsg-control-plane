import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EU AI Act Controls for AI Agents — DSG ONE',
  description:
    'EU AI Act obligations are phasing in. AI agents need pre-execution controls, audit records, and human oversight mapped to Articles 9, 12 & 14. Connect DSG ONE in one line — no stack rebuild required.',
};

const COMPARISON = [
  { tool: 'LangSmith', audit: true, block: false, art14: false, tamper: false },
  { tool: 'Langfuse', audit: true, block: false, art14: false, tamper: false },
  { tool: 'DataDog / Log tools', audit: true, block: false, art14: false, tamper: false },
  { tool: 'DSG ONE', audit: true, block: true, art14: true, tamper: true, highlight: true },
];

const ARTICLES = [
  {
    id: 'Art. 9',
    title: 'Risk Management',
    requirement:
      'Requires a continuous risk management process — identification, evaluation, mitigation, and monitoring throughout the AI lifecycle. Logging after the fact does not satisfy prevention requirements.',
    dsg: 'Gates every action before execution — blocks immediately when a risk threshold is exceeded, providing a pre-execution control layer as part of a broader risk management process.',
  },
  {
    id: 'Art. 12',
    title: 'Record Keeping',
    requirement:
      'Requires logging capabilities to enable tracing of the AI system functioning throughout its lifecycle, including events relevant to risk and post-market monitoring.',
    dsg: 'Tamper-evident audit records — every action is hashed (SHA-256), cryptographically verifiable, and includes timestamp, session context, and decision rationale.',
  },
  {
    id: 'Art. 14',
    title: 'Human Oversight',
    requirement:
      'Humans must be able to understand capabilities and limitations, monitor operation, detect automation bias, interpret output, override or reverse decisions, and interrupt or stop the system.',
    dsg: 'BLOCK + approval workflow stops the agent before execution. Audit dashboard provides monitoring. Decision rationale supports interpretation. Human override is always available.',
  },
];

const ART14_CONTROLS = [
  { need: 'Human can stop action before execution', evidence: 'BLOCK response halts agent before execution' },
  { need: 'Human can override or reverse decisions', evidence: 'Approval workflow — require human sign-off before allow' },
  { need: 'Human can interpret AI output', evidence: 'Decision rationale included in every gate response' },
  { need: 'Human can monitor operation', evidence: 'Audit dashboard — full session and action history' },
  { need: 'Human can detect automation bias', evidence: 'Risk threshold alerts — flag patterns before harm' },
];

const FRAMEWORKS = [
  {
    name: 'REST API (any framework)',
    code: `# Works with LangChain, CrewAI, AutoGen, or any agent
import requests

result = requests.post("https://your-domain/api/try/gate", json={
    "session_id": "run-001",
    "action": "send_payment"
}).json()

if result["decision"] == "ALLOW":
    execute_action()  # proceed with stamp`,
  },
  {
    name: 'OpenAI Agents SDK',
    code: `import requests

def gate(session_id: str, action: str) -> bool:
    r = requests.post("/api/try/gate", json={
        "session_id": session_id,
        "action": action,
    }).json()
    return r["decision"] == "ALLOW"

# Before every tool call:
if gate(run_id, tool_call.name):
    tool_call.execute()`,
  },
  {
    name: 'JavaScript / TypeScript',
    code: `async function gate(sessionId: string, action: string) {
  const r = await fetch("/api/try/gate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, action }),
  });
  return (await r.json()).decision === "ALLOW";
}

// Before every agent action:
if (await gate(runId, action)) execute();`,
  },
];

export default function EUAIActPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      {/* Hero */}
      <section className="border-b border-red-500/20 bg-gradient-to-b from-red-950/40 to-slate-950 px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-block rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-sm font-semibold text-red-300">
            EU AI Act obligations are phasing in — prepare before high-risk enforcement dates
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            Do you know what your<br />
            <span className="text-red-400">AI agent is doing right now?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Other tools tell you what happened <em>after</em> the damage is done.<br />
            <strong className="text-white">DSG ONE blocks before the action executes</strong> — with tamper-evident audit records that can be cryptographically verified.
          </p>
          <p className="mt-3 text-slate-400">
            One-line setup. Adds pre-execution controls, audit logs, and human oversight evidence mapped to EU AI Act Articles 9, 12 &amp; 14. No changes to your existing stack.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/request-access"
              className="rounded-xl bg-emerald-400 px-8 py-3.5 font-bold text-black hover:bg-emerald-300"
            >
              Get Free Access →
            </Link>
            <Link
              href="/ai-compliance"
              className="rounded-xl border border-slate-600 px-8 py-3.5 font-bold text-slate-200 hover:border-slate-400"
            >
              View Compliance Evidence
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-black">How DSG ONE compares</h2>
          <p className="mb-10 text-center text-slate-400">
            A CCTV camera tells you a thief broke in &nbsp;|&nbsp; DSG ONE is the security guard — stops them at the door, with evidence
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700 bg-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4">Tool</th>
                  <th className="px-5 py-4 text-center">Audit Trail</th>
                  <th className="px-5 py-4 text-center">Blocks Before Acting</th>
                  <th className="px-5 py-4 text-center">Supports Art. 14 Controls</th>
                  <th className="px-5 py-4 text-center">Tamper-Evident Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {COMPARISON.map((row) => (
                  <tr
                    key={row.tool}
                    className={row.highlight ? 'bg-emerald-950/40' : 'hover:bg-slate-800/40'}
                  >
                    <td className={`px-5 py-4 font-semibold ${row.highlight ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {row.highlight && <span className="mr-2 text-emerald-400">★</span>}
                      {row.tool}
                    </td>
                    {(['audit', 'block', 'art14', 'tamper'] as const).map((key) => (
                      <td key={key} className="px-5 py-4 text-center text-lg">
                        {row[key] ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-slate-600">✗</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* EU AI Act Articles */}
      <section className="bg-slate-900/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-black">Mapped to three critical Articles</h2>
          <p className="mb-12 text-center text-slate-400">
            One DSG ONE connection — supports key technical controls required for high-risk AI systems under EU AI Act Articles 9, 12 &amp; 14
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {ARTICLES.map((a) => (
              <div key={a.id} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
                <div className="mb-3 inline-block rounded-lg bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  {a.id}
                </div>
                <h3 className="mb-2 text-lg font-bold">{a.title}</h3>
                <p className="mb-4 text-sm text-slate-400">{a.requirement}</p>
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm font-medium text-emerald-300">DSG ONE: {a.dsg}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-slate-600">
            DSG ONE provides technical controls that support compliance. Full EU AI Act compliance requires a broader organizational risk management program, legal assessment, and deployment-specific review.
          </p>
        </div>
      </section>

      {/* Art. 14 Human Oversight Controls */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-3xl font-black">Art. 14 — Human Oversight Controls</h2>
          <p className="mb-8 text-slate-400">
            Article 14 requires more than just a stop button. Humans must be able to understand, monitor, interpret, override, and stop the AI system throughout its operation. DSG ONE maps directly to each requirement.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700 bg-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4">Art. 14 Requirement</th>
                  <th className="px-5 py-4">DSG ONE Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ART14_CONTROLS.map((row) => (
                  <tr key={row.need} className="hover:bg-slate-800/40">
                    <td className="px-5 py-4 text-slate-300">{row.need}</td>
                    <td className="px-5 py-4 text-emerald-300">{row.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Prevention vs Detection */}
      <section className="bg-slate-900/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-black">Prevention ≠ Detection</h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="mb-1 text-sm font-bold text-red-400">Other tools — Detection</div>
                  <p className="text-sm text-slate-300">You find out your agent deleted the production database.<br />The data is gone. You cannot undo it.</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="mb-1 text-sm font-bold text-emerald-400">DSG ONE — Prevention</div>
                  <p className="text-sm text-slate-300">The action is blocked before the agent executes it.<br />Alert sent. Evidence recorded. Zero damage.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-4 text-sm font-bold text-slate-400">TAMPER-EVIDENT AUDIT RECORD</div>
              <div className="space-y-2 font-mono text-xs text-emerald-300">
                <div>action: &quot;delete_table&quot;</div>
                <div>decision: <span className="text-red-400">BLOCK</span></div>
                <div>timestamp: 2026-05-18T04:32:00Z</div>
                <div>requestHash: <span className="text-slate-400">sha256:8f3a2b...</span></div>
                <div>recordHash: <span className="text-slate-400">sha256:1c9d4e...</span></div>
                <div className="pt-2 text-slate-400"># tamper-evident — hash verifiable</div>
                <div className="text-slate-400"># cryptographically verifiable record</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code — REST API setup */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-black">One REST call. No changes to your existing stack.</h2>
          <p className="mb-10 text-center text-slate-400">
            Your existing agent keeps running exactly as before — DSG ONE adds a governance layer via REST API. No SDK required.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {FRAMEWORKS.map((fw) => (
              <div key={fw.name} className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
                <div className="mb-3 text-sm font-bold text-slate-300">{fw.name}</div>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">{fw.code}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ICP */}
      <section className="bg-slate-900/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-black">Who needs DSG ONE</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: '🏦',
                title: 'Fintech & Banks',
                desc: 'AI agents handling transactions must have audit trails and block unauthorized actions per financial regulators.',
              },
              {
                icon: '📋',
                title: 'SOC 2 / ISO 42001 Audits',
                desc: 'Auditors require evidence that your AI is controlled and monitored. DSG ONE generates the evidence package automatically.',
              },
              {
                icon: '🌐',
                title: 'Any Company with GDPR / PDPA',
                desc: 'AI agents that touch personal data must log who accessed what, when, and why — and be able to prove it.',
              },
            ].map((icp) => (
              <div key={icp.title} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
                <div className="mb-3 text-3xl">{icp.icon}</div>
                <h3 className="mb-2 font-bold">{icp.title}</h3>
                <p className="text-sm text-slate-400">{icp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-emerald-500/20 bg-emerald-950/20 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-black">Add controls in 5 minutes</h2>
          <p className="mb-8 text-slate-300">
            Our team will help you set up pre-execution blocking, audit records,<br />
            and human oversight controls mapped to EU AI Act Articles 9, 12, and 14.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/request-access"
              className="rounded-xl bg-emerald-400 px-8 py-4 text-lg font-bold text-black hover:bg-emerald-300"
            >
              Get Free Access →
            </Link>
            <Link
              href="/ai-compliance"
              className="rounded-xl border border-slate-600 px-8 py-4 text-lg font-bold text-slate-200 hover:border-slate-400"
            >
              View Compliance Evidence
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            No credit card · 5-minute setup · No changes to your existing stack
          </p>
        </div>
      </section>

    </main>
  );
}
