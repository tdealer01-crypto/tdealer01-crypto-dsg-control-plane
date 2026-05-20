import Link from 'next/link';

const yaml = `name: DSG Secure Deploy Gate

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  dsg-gate:
    runs-on: ubuntu-latest
    steps:
      - name: DSG Secure Deploy Gate
        id: dsg
        uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.1.0
        with:
          preset: strict
          readiness_url: "https://your-app.vercel.app/api/readiness"
          protected_url: "https://your-app.vercel.app/api/private-audit"
          protected_expected: "401,403"
          comment_on_pr: "true"

      - name: Upload DSG evidence
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: dsg-evidence-\${{ github.run_id }}
          path: dsg-evidence.json`;

const checks = [
  ['Readiness gate', 'Checks an app readiness endpoint before release.'],
  ['Protected-route gate', 'Confirms private routes deny anonymous access.'],
  ['Deterministic proof', 'Emits evidence, policy, proof, and chain hashes.'],
  ['PR comment', 'Posts GO / NO-GO directly into pull requests.'],
];

const steps = [
  ['Copy YAML', 'Paste the workflow into your repository.'],
  ['Set readiness URL', 'Point the gate at your /api/readiness endpoint.'],
  ['Add protected route', 'Strict mode verifies private routes are not public.'],
  ['Review proof', 'Every run produces GO / NO-GO evidence.'],
];

const outputs = [
  ['verdict', 'GO or NO-GO'],
  ['readiness_status', 'HTTP status from readiness endpoint'],
  ['protected_status', 'HTTP status from protected route'],
  ['evidence_hash', 'SHA-256 hash of canonical evidence'],
  ['policy_hash', 'SHA-256 hash of canonical policy'],
  ['proof_hash', 'SHA-256 hash of canonical proof'],
  ['chain_hash', 'SHA-256 proof chain hash'],
];

export default function ProofGateGitHubActionPage() {
  return (
    <main className="dsg-shell min-h-screen text-slate-100">
      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div>
            <p className="dsg-chip">GitHub Marketplace Action</p>
            <h1 className="dsg-text-gradient mt-6 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              Add deterministic deploy proof to GitHub Actions.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              DSG Secure Deploy Gate checks readiness, verifies protected routes, emits GO / NO-GO, and creates deterministic evidence hashes for release workflows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://github.com/marketplace/actions/dsg-secure-deploy-gate"
                className="dsg-btn-gold"
              >
                View Marketplace Action
              </a>
              <a
                href="https://github.com/tdealer01-crypto/dsg-secure-deploy-gate-action"
                className="dsg-btn-blue"
              >
                View source
              </a>
              <Link href="/quickstart" className="dsg-btn-red">
                Control Plane quickstart
              </Link>
            </div>
          </div>

          <div className="dsg-card-blue rounded-3xl p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">
              Copy this workflow
            </p>
            <pre className="mt-5 max-h-[620px] overflow-auto rounded-2xl border border-white/10 bg-black/50 p-4 text-xs leading-6 text-slate-100">
              <code>{yaml}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="dsg-chip">What reviewers see</p>
        <h2 className="mt-4 text-4xl font-black text-white">
          A deploy gate with proof outputs, not just a health check.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {checks.map(([title, body]) => (
            <article key={title} className="dsg-card rounded-3xl p-5">
              <h3 className="text-xl font-black text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/20">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="dsg-chip">Four-step setup</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(([title, body], index) => (
              <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-3xl font-black text-amber-200">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-3 text-xl font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="dsg-chip">Deterministic outputs</p>
        <h2 className="mt-4 text-4xl font-black text-white">
          Every run creates evidence that can be checked again.
        </h2>
        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/10 text-slate-100">
              <tr>
                <th className="p-4 font-black">Output</th>
                <th className="p-4 font-black">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {outputs.map(([name, meaning]) => (
                <tr key={name} className="border-t border-white/10">
                  <td className="p-4 font-mono text-amber-100">{name}</td>
                  <td className="p-4 text-slate-300">{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="dsg-card-red rounded-3xl p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-200">
            Truth boundary
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-200">
            DSG Secure Deploy Gate creates deployment evidence for governance workflows. It is not a legal certification or third-party audit by itself.
          </p>
        </div>
      </section>
    </main>
  );
}
