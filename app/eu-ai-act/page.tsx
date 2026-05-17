import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EU AI Act Compliance for AI Agents — DSG ONE',
  description:
    'EU AI Act is now in force. AI agents need audit trails, human oversight, and real-time intervention. Connect DSG ONE in one line — compliant without rebuilding your stack.',
};

const COMPARISON = [
  { tool: 'LangSmith', audit: true, block: false, art14: false, math: false },
  { tool: 'Langfuse', audit: true, block: false, art14: false, math: false },
  { tool: 'DataDog / Log tools', audit: true, block: false, art14: false, math: false },
  { tool: 'DSG ONE', audit: true, block: true, art14: true, math: true, highlight: true },
];

const ARTICLES = [
  {
    id: 'Art. 9',
    title: 'Risk Management',
    requirement: 'Must prevent risks before they occur — logging after the fact is not sufficient.',
    dsg: 'Gates every action before execution — blocks immediately when risk threshold is exceeded.',
  },
  {
    id: 'Art. 12',
    title: 'Record Keeping',
    requirement: 'Log every AI action with timestamp, context, and decision rationale.',
    dsg: 'Cryptographic audit trail — every action is hashed, tamper-proof, and verifiable.',
  },
  {
    id: 'Art. 14',
    title: 'Human Oversight',
    requirement: 'Humans must be able to intervene and stop the AI system at any time.',
    dsg: 'BLOCK response + approval workflow — stops the agent before damage occurs.',
  },
];

const FRAMEWORKS = [
  { name: 'LangChain', code: `from dsg_one import DSGGate\nchain = DSGGate(chain)` },
  { name: 'OpenAI Agents SDK', code: `import { DSGGate } from "@dsg-one/sdk"\nconst agent = DSGGate(agent)` },
  { name: 'CrewAI', code: `from dsg_one import DSGGate\ncrew = DSGGate(crew)` },
];

export default function EUAIActPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      {/* Hero */}
      <section className="border-b border-red-500/20 bg-gradient-to-b from-red-950/40 to-slate-950 px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-block rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-sm font-semibold text-red-300">
            EU AI Act is now in force — is your organization ready?
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            Do you know what your<br />
            <span className="text-red-400">AI agent is doing right now?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Other tools tell you what happened <em>after</em> the damage is done.<br />
            <strong className="text-white">DSG ONE blocks before the action executes</strong> — with a cryptographic audit trail that is mathematically provable.
          </p>
          <p className="mt-3 text-slate-400">One-line setup. Passes EU AI Act Articles 9, 12 &amp; 14. No changes to your existing stack.</p>
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
                  <th className="px-5 py-4 text-center">Passes Art. 14</th>
                  <th className="px-5 py-4 text-center">Mathematically Provable</th>
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
                    {(['audit', 'block', 'art14', 'math'] as const).map((key) => (
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
          <h2 className="mb-3 text-center text-3xl font-black">Covers all three critical Articles</h2>
          <p className="mb-12 text-center text-slate-400">One DSG ONE connection — satisfies the core EU AI Act requirements for high-risk AI systems</p>
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
        </div>
      </section>

      {/* Prevention vs Detection */}
      <section className="px-6 py-20">
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
              <div className="mb-4 text-sm font-bold text-slate-400">CRYPTOGRAPHIC PROOF</div>
              <div className="space-y-2 font-mono text-xs text-emerald-300">
                <div>action: &quot;delete_table&quot;</div>
                <div>decision: <span className="text-red-400">BLOCK</span></div>
                <div>timestamp: 2026-05-18T04:32:00Z</div>
                <div>requestHash: <span className="text-slate-400">sha256:8f3a2b...</span></div>
                <div>recordHash: <span className="text-slate-400">sha256:1c9d4e...</span></div>
                <div className="pt-2 text-slate-400"># tamper-proof — immutable record</div>
                <div className="text-slate-400"># mathematically verifiable</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code — 1 line setup */}
      <section className="bg-slate-900/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-black">One line. No changes to your existing stack.</h2>
          <p className="mb-10 text-center text-slate-400">Your existing agent keeps running exactly as before — DSG ONE adds a governance layer in front of it.</p>
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
      <section className="px-6 py-20">
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
          <h2 className="mb-4 text-3xl font-black">Compliant in 5 minutes</h2>
          <p className="mb-8 text-slate-300">
            Our team will help you set up and verify that your system passes<br />
            EU AI Act Articles 9, 12, and 14. Free. No credit card required.
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
