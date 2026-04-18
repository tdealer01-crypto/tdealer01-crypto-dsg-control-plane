import Link from 'next/link';

export default function EnterpriseProofStartPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white" data-testid="enterprise-proof-start">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold md:text-6xl">Public proof summary for governed AI runtime</h1>
        <p className="mt-4 max-w-4xl text-lg text-slate-300">
          This page explains the control model publicly. Verified runtime evidence is available inside authenticated
          workspaces.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">What this page includes</h2>
            <ul className="mt-4 space-y-2 text-slate-200">
              <li>• Public narrative summary</li>
              <li>• Machine-readable report</li>
              <li>• Verification boundary</li>
            </ul>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">What this page does not include</h2>
            <ul className="mt-4 space-y-2 text-slate-200">
              <li>• Workspace-scoped runtime evidence</li>
              <li>• Authenticated audit views</li>
              <li>• Organization-specific execution records</li>
            </ul>
          </section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/enterprise-proof/report" className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950">
            Open public report
          </Link>
          <Link href="/api/enterprise-proof/report" className="rounded-2xl border border-white/20 bg-white/5 px-5 py-3 font-semibold text-white">
            View machine-readable JSON
          </Link>
          <Link href="/enterprise-proof/verified" className="rounded-2xl border border-violet-300/35 bg-violet-400/10 px-5 py-3 font-semibold text-violet-100">
            Access verified workspace evidence
          </Link>
        </div>

        <p className="mt-8 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-4 text-cyan-100">
          Public pages explain the control model. Workspace routes remain the source of record for verified runtime
          evidence.
        </p>
      </section>
    </main>
  );
}
