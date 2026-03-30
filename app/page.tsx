import Link from 'next/link';

type Section = {
  heading: string;
  body: string;
  points?: string[];
};

type CopySet = {
  id: string;
  label: string;
  headline: string;
  subheadline: string;
  trustLine: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  sections: Section[];
};

const marketContext = [
  'Observability / evals (e.g., LangSmith)',
  'Governance / compliance (e.g., Credo AI)',
  'Runtime guardrails (e.g., Amazon Bedrock Guardrails)',
  'AI security (e.g., Lakera Guard)',
  'OSS tracing / eval tooling (e.g., Arize Phoenix)',
];

const copySets: CopySet[] = [
  {
    id: 'set-a',
    label: 'Set A · Control-First Narrative',
    headline: 'Operate AI with deterministic control, timestamped evidence, and real-time governance.',
    subheadline:
      'DSG ONE is an auditable control plane for organizations that need AI systems to be observable, reviewable, and governable under zero-trust conditions.',
    trustLine: 'Research-informed. Verification-aware. Built for audit-heavy AI operations.',
    primaryCta: { label: 'Start Free Trial', href: '/pricing' },
    secondaryCta: { label: 'Open Command Workspace', href: '/workspace' },
    sections: [
      {
        heading: 'The next AI bottleneck is not generation. It is governance.',
        body: 'As AI systems move from experimentation into operational authority, organizations need execution control, runtime visibility, structured auditability, and governance that survives real-world scrutiny.',
      },
      {
        heading: 'A control plane for serious AI operations.',
        body: 'DSG ONE is an operator-facing control layer that helps constrain execution, inspect state, and review mission behavior with clearer accountability.',
        points: [
          'Operator access',
          'Agent workflows',
          'Execution visibility',
          'Audit surfaces',
          'Mission monitoring and readiness state',
          'Command workspace control',
        ],
      },
      {
        heading: 'Built around determinism, evidence, and control.',
        body: 'Critical paths should be explicit enough to review, measurable enough to verify, and observable enough to intervene during runtime.',
        points: [
          'Deterministic control where it matters',
          'Mathematics of truth with measurable state',
          'System-wide inspectability across execution and alerts',
          'Real-time governance, not postmortem-only governance',
          'Governance encoded in access, flow, evidence, and monitoring',
        ],
      },
    ],
  },
  {
    id: 'set-b',
    label: 'Set B · Market-Positioned Investor Narrative',
    headline: 'A narrower, stricter operating model for high-accountability AI deployments.',
    subheadline:
      'DSG ONE focuses on control-first execution governance in a market where capabilities are often split across observability, compliance, runtime guardrails, and AI security layers.',
    trustLine: 'Positioned with evidence discipline: assert only what implementation and runtime behavior can support.',
    primaryCta: { label: 'Open App Shell', href: '/app-shell' },
    secondaryCta: { label: 'Review Research', href: '/docs' },
    sections: [
      {
        heading: 'Designed for environments where trust must be earned.',
        body: 'For enterprise AI operations, internal agent platforms, audit-heavy workflows, and review-sensitive deployments where intervention and traceability are mandatory.',
      },
      {
        heading: 'Different from single-layer products.',
        body: 'Many products lead in one layer. DSG ONE emphasizes orchestration discipline across operational control, evidence surfaces, and runtime intervention paths.',
        points: [
          'Control first',
          'Evidence first',
          'Governance in real time',
          'Leaner dependency profile',
          'Offline-capable control-plane direction',
        ],
      },
      {
        heading: 'Evaluation standard: inspect, test, verify.',
        body: 'Do not trust claims by default. Review routes, auth flow, execution path, audit surfaces, mission workspace, and runtime behavior directly.',
      },
    ],
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-b from-slate-900 to-slate-950 p-8 md:p-10">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">DSG ONE</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight md:text-6xl">
            Deterministic, auditable, zero-trust control plane for AI operations.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
            Two ready-to-use landing copy sets below, structured for direct use in a Next.js + Tailwind page.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Market context (reference framing)</h2>
          <ul className="mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
            {marketContext.map((item) => (
              <li key={item} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-8 px-6 pb-16">
        {copySets.map((set) => (
          <article key={set.id} className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">{set.label}</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight md:text-4xl">{set.headline}</h2>
            <p className="mt-4 max-w-4xl text-slate-300">{set.subheadline}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={set.primaryCta.href} className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950">
                {set.primaryCta.label}
              </Link>
              <Link
                href={set.secondaryCta.href}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-slate-100"
              >
                {set.secondaryCta.label}
              </Link>
            </div>

            <p className="mt-5 text-sm text-emerald-200">{set.trustLine}</p>

            <div className="mt-8 space-y-5">
              {set.sections.map((section) => (
                <div key={section.heading} className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <h3 className="text-lg font-semibold">{section.heading}</h3>
                  <p className="mt-2 text-slate-300">{section.body}</p>
                  {section.points ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
                      {section.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
