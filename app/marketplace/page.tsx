import Link from "next/link";

const actionMarketplaceUrl = "https://github.com/marketplace/actions/dsg-secure-deploy-gate";
const actionReleaseUrl = "https://github.com/tdealer01-crypto/dsg-secure-deploy-gate-action/releases/tag/v1.0.2";

const reviewerChecks = [
  {
    title: "Product home",
    href: "/",
    note: "Public landing page and product overview for DSG Control Plane.",
  },
  {
    title: "Health endpoint",
    href: "/api/health",
    note: "Public baseline probe for control-plane and DSG core health status.",
  },
  {
    title: "GitHub Marketplace Action",
    href: actionMarketplaceUrl,
    note: "Published DSG Secure Deploy Gate Action for deterministic CI/CD deployment gating.",
    external: true,
  },
  {
    title: "Login",
    href: "/login",
    note: "Entry into authenticated operator workspace routes.",
  },
];

const capabilities = [
  "Deterministic policy gate with ALLOW / STABILIZE / BLOCK decisions.",
  "Audit-oriented execution records and usage tracking.",
  "Authenticated operator surfaces for dashboard, audit, policy, and billing review.",
  "Published GitHub Marketplace Action for deterministic CI/CD deployment gating.",
  "Stable execution entry via /api/execute with deeper runtime handled behind the current execution layer.",
];

const reviewSteps = [
  "Open the product home and confirm the public landing page is reachable.",
  "Open /api/health and confirm the JSON baseline probe is returned.",
  "Open the GitHub Marketplace Action and confirm v1.0.2 usage is visible.",
  "Use /login or /password-login to enter authenticated operator routes.",
  "Use protected execution and operator APIs only with valid credentials and organization-scoped access.",
];

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-400">
            Marketplace Reviewer Page
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
            DSG — Deterministic Safety Gate
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-slate-300">
            DSG Control Plane exposes a public product surface, a public baseline health probe, a published GitHub Marketplace Action, and authenticated operator routes for governed AI execution. This page is designed to help marketplace reviewers distinguish public checks from protected runtime workflows.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/"
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
            >
              Open Product Home
            </Link>
            <Link
              href={actionMarketplaceUrl}
              className="rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white"
            >
              Open GitHub Marketplace Action
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
            >
              Open Login
            </Link>
            <Link
              href="/api/health"
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold text-slate-200"
            >
              Open Health Endpoint
            </Link>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
          <h2 className="text-2xl font-semibold">GitHub Marketplace Action</h2>
          <p className="mt-3 max-w-4xl text-slate-300">
            DSG Secure Deploy Gate is published on GitHub Marketplace as a deterministic deployment gate for CI/CD workflows. Use it as a required gate before production deployment jobs.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link href={actionMarketplaceUrl} className="rounded-xl bg-blue-400 px-5 py-3 font-bold text-black">
              View Marketplace listing
            </Link>
            <Link href={actionReleaseUrl} className="rounded-xl border border-blue-300/50 px-5 py-3 font-bold text-blue-100">
              View v1.0.2 release
            </Link>
          </div>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.0.2`}</pre>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Product Summary</h2>
            <p className="mt-4 text-slate-300">
              DSG is a control plane for governed AI execution. The public product surface is available for review, while dashboard, usage, audit, policy, capacity, and execution workflows remain protected operator routes.
            </p>
            <ul className="mt-6 space-y-3 text-slate-200">
              {capabilities.map((item) => (
                <li key={item} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Reviewer Checks</h2>
            <div className="mt-6 space-y-4">
              {reviewerChecks.map((item) => (
                <div key={item.href} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.note}</p>
                    </div>
                    <Link href={item.href} className="text-sm font-semibold text-emerald-400">
                      Open{item.external ? " ↗" : ""}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Deployment Model</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Public surface</p>
              <p className="mt-2 font-semibold">Next.js product shell + proof pages</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Public probe</p>
              <p className="mt-2 font-semibold">GET /api/health</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Protected execution entry</p>
              <p className="mt-2 font-semibold">POST /api/execute</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Review Steps</h2>
          <ol className="mt-6 space-y-3 text-slate-200">
            {reviewSteps.map((step, index) => (
              <li key={step} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 font-bold text-black">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Protected Execute API</h2>
          <p className="mt-3 text-slate-300">
            Execution requests use a bearer token and agent identifier. Reviewers should validate the public product surface with the landing page, GitHub Marketplace Action, and health endpoint first, then use authenticated operator access for protected execution and workspace flows.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`curl -X POST https://your-domain.com/api/execute \\
  -H "Authorization: Bearer DSG_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "agt_demo",
    "input": { "prompt": "approve invoice #123" },
    "context": { "risk_score": 0.12 }
  }'`}</pre>
        </section>
      </div>
    </main>
  );
}
