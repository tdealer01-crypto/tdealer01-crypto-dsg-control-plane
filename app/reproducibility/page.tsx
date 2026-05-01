export default function ReproducibilityPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-5xl rounded-3xl border border-cyan-500/30 bg-slate-900 p-10">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Reproducibility Report</p>
        <h1 className="mt-4 text-5xl font-black">Reproduce DSG core evidence</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          Users can independently reproduce core governance routes, deploy gate checks, and UX route verification.
        </p>

        <div className="mt-8 rounded-2xl bg-slate-950 p-6 font-mono text-sm leading-7 text-cyan-200">
          npm run ux:routes{`\n`}
          curl -I /controls{`\n`}
          curl -I /approvals?orgId=org-smoke{`\n`}
          curl -I /evidence-pack{`\n`}
          verify bundleHash / requestHash / recordHash
        </div>

        <section className="mt-8 space-y-4 text-slate-300">
          <p><strong>User benefit:</strong> Buyers and reviewers can verify repeatable governance behavior.</p>
          <p><strong>Real action:</strong> Run checks and inspect routes.</p>
          <p><strong>Evidence:</strong> Route verifier output, hashes, signed bundle.</p>
          <p><strong>Tangible output:</strong> Reproducibility report plus evidence artifacts.</p>
        </section>
      </div>
    </main>
  );
}
