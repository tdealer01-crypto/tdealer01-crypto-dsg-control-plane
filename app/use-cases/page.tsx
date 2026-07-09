'use client';

import Link from 'next/link';

const useCases = [
  {
    id: 'ai-deployment',
    icon: '🤖',
    title: 'AI Deployment Governance',
    description: 'Gate AI models and agents before they reach production',
    problem: [
      'AI models deployed without proper review can cause financial loss, regulatory violations, or brand damage',
      'Once code is in production, proving what policy gates were applied and why becomes a reconstruction effort',
      'Urgent deployments bypass controls without a trace',
    ],
    solution: [
      'Every AI deployment is gated by deterministic policy engine',
      'SHA-256 hash chain proves which policy applied and what was verified',
      'Merkle tree proofs allow auditors to verify compliance without scanning millions of records',
      'Replay capability proves that the same input always produces the same decision',
    ],
    metrics: ['90% reduction in post-deployment audit time', 'Zero policy bypass incidents', '100% decision determinism'],
    audience: ['AI/ML Teams', 'DevOps', 'Compliance Officers'],
  },
  {
    id: 'finance-approval',
    icon: '💰',
    title: 'Finance Approval Workflows',
    description: 'Prove every payment approval follows policy',
    problem: [
      'Payments scatter across email, Slack, ERP systems, and spreadsheets',
      'When regulators ask "who approved this vendor payment and why", teams often reconstruct the story',
      'Exception overrides happen without controlled escalation',
    ],
    solution: [
      'Unified approval workflow with deterministic gate decisions',
      'Each approval decision recorded with hashes proving no tampering',
      'Gap-free sequence numbers prove no hidden or deleted approvals',
      'WORM audit trail survives regulatory audits unchanged',
    ],
    metrics: ['100% approval traceability', 'Audit time cut by 75%', 'Zero missing approvals'],
    audience: ['CFO/Finance Teams', 'Internal Audit', 'External Auditors'],
  },
  {
    id: 'vendor-onboarding',
    icon: '🏢',
    title: 'Vendor Risk & Onboarding',
    description: 'Gate high-risk vendors with deterministic policy',
    problem: [
      'Vendor risk scoring is often subjective and changes over time',
      'Regulators want to know: what risk factors were considered, why was the vendor approved',
      'Vendor re-scoring lacks historical evidence of prior approvals',
    ],
    solution: [
      'Deterministic vendor risk scoring with auditable evidence',
      'Each vendor decision includes risk factors, thresholds, and decision hash',
      'Replay functionality proves that vendor scoring logic is consistent',
      'Merkle proofs allow fast audit verification of thousands of vendors',
    ],
    metrics: ['100% policy consistency', 'Audit-ready vendor records', 'Reduced re-onboarding errors'],
    audience: ['Procurement', 'Risk Management', 'Compliance'],
  },
  {
    id: 'data-access',
    icon: '🔐',
    title: 'Data Access & Privacy Control',
    description: 'Audit who accessed what data and why',
    problem: [
      'Access logs exist but linking them to policy decisions is manual',
      'Privacy regulators (GDPR, CCPA) need deterministic proof of access decisions',
      'Exceptions to access policies lack documented evidence',
    ],
    solution: [
      'Each data access request gated with deterministic decision record',
      'Hash chain proves no access logs were retroactively modified',
      'SARIF export for privacy impact assessments',
      'Replay proofs show that same user/context always gets same access decision',
    ],
    metrics: ['100% access audit trail', 'GDPR Article 15 ready', 'Privacy compliance proof'],
    audience: ['Data Privacy Officers', 'Security Teams', 'Regulators'],
  },
  {
    id: 'contract-approval',
    icon: '📜',
    title: 'Contract & Legal Approval',
    description: 'Proof that contracts met policy before execution',
    problem: [
      'Contract approvals happen in email chains and shared documents',
      'No deterministic evidence of what policy gates were applied',
      'Dispute resolution often requires manual document reconstruction',
    ],
    solution: [
      'Contract submissions gated by deterministic approval workflow',
      'Decision hash proves contract terms were evaluated consistently',
      'Chain hash shows approval sequence (legal → finance → exec)',
      'WORM trail survives contract disputes unchanged',
    ],
    metrics: ['Legal audit ready', '100% approval sequence proof', 'Contract dispute resolved in hours not weeks'],
    audience: ['Legal Department', 'Procurement', 'Executive Leadership'],
  },
  {
    id: 'compliance-reporting',
    icon: '📊',
    title: 'Regulatory Compliance Reporting',
    description: 'Auto-generate audit-ready compliance evidence',
    problem: [
      'Regulators want evidence of policy enforcement (ISO, SOC2, HIPAA, GDPR)',
      'Manual audit response takes weeks and errors are expensive',
      'Policy changes over time but audit evidence is static',
    ],
    solution: [
      'Determinism engine records every policy decision',
      'SARIF export auto-generates compliance reports',
      'Merkle tree proofs allow fast partial audits',
      'EU AI Act evidence pack included for AI governance audits',
    ],
    metrics: ['Audit time cut by 80%', 'Compliance reports auto-generated', 'Policy changes fully audited'],
    audience: ['Compliance Officers', 'Auditors', 'Regulators'],
  },
];

function UseCaseCard({ useCase }: { useCase: typeof useCases[0] }) {
  return (
    <div className="border border-white/10 bg-white/[0.02] rounded-2xl p-8 hover:border-emerald-400/30 transition-colors">
      <div className="text-5xl mb-4">{useCase.icon}</div>
      <h3 className="text-2xl font-bold text-white mb-2">{useCase.title}</h3>
      <p className="text-slate-400 mb-6">{useCase.description}</p>

      <div className="mb-6 pb-6 border-b border-white/10">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">The Problem</p>
        <ul className="space-y-2">
          {useCase.problem.map((p) => (
            <li key={p} className="text-sm text-slate-300 flex gap-2">
              <span className="text-red-400 flex-shrink-0">✗</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6 pb-6 border-b border-white/10">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">DSG ONE Solution</p>
        <ul className="space-y-2">
          {useCase.solution.map((s) => (
            <li key={s} className="text-sm text-slate-300 flex gap-2">
              <span className="text-emerald-400 flex-shrink-0">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Impact</p>
        <div className="grid grid-cols-2 gap-3">
          {useCase.metrics.map((metric) => (
            <div key={metric} className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg p-3">
              <p className="text-sm text-emerald-300 font-semibold">{metric}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">For</p>
        <div className="flex flex-wrap gap-2">
          {useCase.audience.map((role) => (
            <span key={role} className="text-xs bg-slate-400/20 text-slate-300 px-3 py-1 rounded-full">
              {role}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UseCasesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-12">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 mb-16">
        <p className="text-emerald-400 text-xs uppercase tracking-widest font-bold">Real-World Applications</p>
        <h1 className="text-5xl md:text-6xl font-bold mt-4 mb-6">Use Cases</h1>
        <p className="text-xl text-slate-300 max-w-3xl">
          Six critical governance workflows where deterministic policy decisions transform how organizations audit, comply, and prove control.
        </p>
      </section>

      {/* Use Cases Grid */}
      <section className="mx-auto max-w-6xl px-6 mb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {useCases.map((useCase) => (
            <UseCaseCard key={useCase.id} useCase={useCase} />
          ))}
        </div>
      </section>

      {/* Industry Solutions */}
      <section className="mx-auto max-w-6xl px-6 mb-20">
        <h2 className="text-4xl font-bold mb-12">By Industry</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { industry: 'Financial Services', solutions: ['Payment approval workflows', 'Vendor risk management', 'Compliance reporting'] },
            { industry: 'Healthcare', solutions: ['Data access audit', 'Privacy (HIPAA) proof', 'Clinical decision records'] },
            { industry: 'AI/SaaS', solutions: ['Model deployment gates', 'Feature flag decisions', 'A/B test governance'] },
            { industry: 'Tech', solutions: ['Infrastructure changes', 'Security exceptions', 'Configuration audits'] },
            { industry: 'Insurance', solutions: ['Claims approval', 'Fraud detection decision', 'Policy exception tracking'] },
            { industry: 'Government', solutions: ['Procurement governance', 'Access control audit', 'Regulatory compliance'] },
          ].map((sector) => (
            <div key={sector.industry} className="border border-white/10 bg-white/[0.02] rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">{sector.industry}</h3>
              <ul className="space-y-3">
                {sector.solutions.map((solution) => (
                  <li key={solution} className="text-sm text-slate-400 flex gap-2">
                    <span className="text-emerald-400">→</span>
                    <span>{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="border border-emerald-400/30 bg-emerald-400/5 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">See deterministic governance in action</h2>
          <p className="text-slate-300 mb-8">Try the demo or request access to explore your specific use case.</p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/demo"
              className="bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-emerald-300 transition"
            >
              Try Demo
            </Link>
            <Link
              href="/request-access"
              className="border border-emerald-400/40 text-emerald-300 px-6 py-3 rounded-xl font-bold hover:border-emerald-400 transition"
            >
              Request Access
            </Link>
            <Link
              href="/contact"
              className="border border-emerald-400/40 text-emerald-300 px-6 py-3 rounded-xl font-bold hover:border-emerald-400 transition"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
