import Link from 'next/link';

const releaseValidatedAt =
  process.env.NEXT_PUBLIC_RELEASE_VALIDATED_AT ?? '2026-04-25 Production Launch Baseline';

const links = {
  liveDemo: process.env.NEXT_PUBLIC_PROOF_DEMO_URL ?? '/dashboard/command-center',
  dataRoom: process.env.NEXT_PUBLIC_BUYER_DATA_ROOM_URL ?? '/enterprise-proof/report',
  proofPack: process.env.NEXT_PUBLIC_PROOF_PACK_URL ?? '/enterprise-proof/report',
  requestAccess:
    process.env.NEXT_PUBLIC_REQUEST_ACCESS_URL ??
    'mailto:t.dealer01@dsg.pics?subject=DSG%20Proof%20Demo%20Access',
  health: process.env.NEXT_PUBLIC_HEALTH_URL ?? '/api/health',
  readiness: process.env.NEXT_PUBLIC_READINESS_URL ?? '/api/readiness',
  monitor: process.env.NEXT_PUBLIC_MONITOR_URL ?? '/api/core/monitor',
};

const proofItems = [
  {
    label: 'Production runtime',
    value: 'Live deployment baseline',
    detail: 'Health and readiness endpoints available for inspection.',
  },
  {
    label: 'Go / No-Go gate',
    value: 'Evidence-based launch check',
    detail: 'Release decision is backed by readiness and smoke checks.',
  },
  {
    label: 'Test baseline',
    value: '199 passed',
    detail: 'Baseline test result prepared for buyer review.',
  },
  {
    label: 'DOI artifacts',
    value: 'Zenodo references',
    detail: 'Research context is archived and independently referenceable.',
  },
  {
    label: 'Formal scope',
    value: 'Z3-backed gate-core invariants',
    detail: 'Deterministic control model only. No overclaim of full SaaS proof.',
  },
  {
    label: 'Audit model',
    value: 'Proof / ledger design',
    detail: 'Execution evidence, audit trail, and buyer inspection path.',
  },
];

const outcomes = [
  {
    status: 'ALLOW',
    title: 'Request approved',
    detail: 'risk_score 0.18 is below stabilize threshold 0.40. Execution can continue with audit record attached.',
    className: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100',
  },
  {
    status: 'STABILIZE',
    title: 'Human review recommended',
    detail: 'risk_score 0.42 exceeded stabilize threshold 0.40 but stayed below block threshold 0.80.',
    className: 'border-yellow-300/35 bg-yellow-300/10 text-yellow-100',
  },
  {
    status: 'BLOCK',
    title: 'Request blocked',
    detail: 'risk_score 0.86 exceeded block threshold 0.80. Execution is blocked and logged for inspection.',
    className: 'border-red-400/40 bg-red-500/10 text-red-100',
  },
];

const apiSample = `POST /api/execute
{
  "agent": "buyer-demo",
  "action": "execute_trade_signal",
  "risk_score": 0.42,
  "policy_id": "policy_default"
}

Response
{
  "decision": "STABILIZE",
  "proof_id": "prf_9d3c4a1b",
  "ledger_ref": "led_20260425_0017",
  "reason": "risk_score 0.42 exceeded stabilize threshold 0.40 and stayed below block threshold 0.80"
}`;

function StatusChip({ children, tone = 'gold' }: { children: React.ReactNode; tone?: 'gold' | 'green' | 'gray' }) {
  const toneClass = {
    gold: 'border-yellow-300/35 bg-yellow-300/10 text-yellow-100',
    green: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100',
    gray: 'border-white/10 bg-white/5 text-slate-300',
  }[tone];

  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>{children}</span>;
}

function ProofLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  const className = primary
    ? 'rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700'
    : 'rounded-2xl border border-yellow-300/35 bg-yellow-300/10 px-5 py-3 font-semibold text-yellow-100 hover:bg-yellow-300/20';

  return href.startsWith('mailto:') ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function EnterpriseProofDemoPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#F7F7F2]" data-testid="enterprise-proof-demo">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(225,6,0,0.2),transparent_35%),radial-gradient(circle_at_top_left,rgba(212,175,55,0.14),transparent_35%)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusChip tone="green">Runtime ready</StatusChip>
              <StatusChip>Buyer proof page</StatusChip>
              <StatusChip tone="gray">Validated baseline: {releaseValidatedAt}</StatusChip>
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-white md:text-6xl">
              Don&apos;t believe the claim. Inspect the system.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              This page is built for buyer verification: live demo behavior, deterministic API execution sample,
              architecture scope, readiness evidence, DOI references, and Z3-backed formal verification scope.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ProofLink href={links.liveDemo} primary>
                Try live demo
              </ProofLink>
              <ProofLink href={links.dataRoom}>Open buyer data room</ProofLink>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <Link href={links.health} className="underline decoration-yellow-300/40 underline-offset-4 hover:text-yellow-100">
                /api/health
              </Link>
              <Link href={links.readiness} className="underline decoration-yellow-300/40 underline-offset-4 hover:text-yellow-100">
                /api/readiness
              </Link>
              <Link href={links.monitor} className="underline decoration-yellow-300/40 underline-offset-4 hover:text-yellow-100">
                /api/core/monitor
              </Link>
              <Link href={links.proofPack} className="underline decoration-yellow-300/40 underline-offset-4 hover:text-yellow-100">
                proof pack
              </Link>
            </div>
          </div>

          <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-red-500/10">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Command preview</p>
            <h2 className="mt-1 text-2xl font-semibold">/api/execute gate result</h2>
            <div className="mt-5 grid gap-3">
              {outcomes.map((outcome) => (
                <article key={outcome.status} className={`rounded-2xl border p-4 ${outcome.className}`}>
                  <p className="text-xs font-bold tracking-[0.22em]">{outcome.status}</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{outcome.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{outcome.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-yellow-200">Proof pack</p>
            <h2 className="mt-2 text-3xl font-semibold">What a buyer can inspect</h2>
          </div>
          <StatusChip tone="gray">Evidence before valuation</StatusChip>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proofItems.map((item) => (
            <article key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm text-slate-400">{item.label}</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{item.value}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-12 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-semibold">Formal verification scope</h2>
          <p className="mt-4 leading-7 text-slate-300">
            The Z3 layer does not claim to prove the entire SaaS product correct. Its scope is the deterministic
            gate-core model and control invariants: decision behavior, threshold logic, and safety conditions encoded
            in SMT-LIB/Z3.
          </p>
          <p className="mt-4 leading-7 text-slate-300">
            The full product is validated separately through tests, typecheck, runtime readiness, deployment gates, and
            production smoke checks.
          </p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">API sample</p>
          <h2 className="mt-1 text-2xl font-semibold">Buyer can run this</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-sm leading-7 text-slate-100">
            <code>{apiSample}</code>
          </pre>
        </article>
      </section>

      <section className="border-t border-white/10 bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 lg:grid-cols-2">
          <article>
            <p className="text-xs uppercase tracking-[0.22em] text-yellow-200">Buyer memo</p>
            <h2 className="mt-2 text-3xl font-semibold">Valuation position</h2>
            <p className="mt-4 leading-7 text-slate-300">
              The $1M figure is not positioned as a generic SaaS revenue multiple. It is a strategic acquisition ceiling
              depending on IP scope, exclusivity, handover, support, and buyer use case.
            </p>
            <p className="mt-4 leading-7 text-slate-300">
              For a pure code asset, valuation is lower. For a strategic buyer looking for an AI execution governance
              layer, deterministic MCP gateway, audit-ready decision payloads, and a live deterministic proof/gate
              scaffold control plane, the discussion is different.
            </p>
          </article>

          <article className="rounded-3xl border border-yellow-300/30 bg-yellow-300/10 p-6">
            <h3 className="text-2xl font-semibold">Inspection beats belief.</h3>
            <p className="mt-3 leading-7 text-slate-300">
              You don&apos;t have to believe the claim. Evaluate live runtime behavior, source inspection, deployment
              checks, DOI artifacts, test baseline, and formal verification scope.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ProofLink href={links.requestAccess} primary>
                Request demo access
              </ProofLink>
              <ProofLink href={links.proofPack}>Download proof pack</ProofLink>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
