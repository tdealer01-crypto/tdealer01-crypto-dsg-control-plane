import Link from "next/link";

export default function SecurityReviewPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-5xl rounded-3xl border border-rose-500/20 bg-slate-900 p-10">
        <p className="text-sm uppercase tracking-[0.25em] text-rose-300">DSG ONE Security Review</p>
        <h1 className="mt-4 text-5xl font-black">Security review boundary and hardening roadmap</h1>
        <ul className="mt-8 space-y-4 text-lg leading-8 text-slate-300">
          <li>Current deterministic controls (verified in repository)</li>
          <li>Evidence integrity model (evidence-ready design)</li>
          <li>Protected route behavior (verified route behavior)</li>
          <li>Approval governance (verified workflow path)</li>
          <li>Deploy gate coverage (alignment/support)</li>
          <li>Future independent review path (not yet claimed)</li>
        </ul>
        <p className="mt-8 text-slate-300">Boundary: this route documents DSG ONE security posture and review path; it is not an external audit, certification, or formal attestation.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/evidence-pack" className="rounded-xl bg-rose-300 px-4 py-2 font-semibold text-black">Review evidence pack</Link>
          <Link href="/support" className="rounded-xl border border-rose-300/40 px-4 py-2 font-semibold text-rose-100">Contact support</Link>
        </div>
      </div>
    </main>
  );
}
