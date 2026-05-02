import Link from "next/link";

const evidence = [
  ["Production Gateway Benchmark", "6/6 checks passed, 100% pass rate", "Implemented"],
  ["SMT2 Runtime Invariants", "6/6 invariant cases passed", "Implemented"],
  ["Comparison Rubric", "190/200, 95% internal rubric score", "Implemented"],
  ["Public Vendor Baseline", "5 public documentation baselines, vendorRuntimeTested=0", "Implemented"],
  ["Audit Export API", "Exportable JSON audit evidence", "Implemented"],
  ["Evidence Bundle with Hash/Signature Metadata", "Portable bundle with bundleHash, eventHashes, and signature metadata", "Implemented"],
  ["GitHub Secure Deploy Gate Action", "CI/CD gate evidence with verdict and evidence hash", "Implemented"],
  ["PDF Evidence Report", "Human-readable reviewer report", "Planned"],
];

export default function EvidencePackPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">Evidence Pack</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            Audit evidence for governed AI execution
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            DSG ONE produces structured AI action governance evidence with runtime decisions, request hashes, record hashes, benchmark evidence, invariant checks, evidence bundle hash/signature metadata, and exportable audit records.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/ai-compliance" className="rounded-xl bg-emerald-400 px-5 py-3 font-bold text-black">Back to AI compliance</Link>
            <Link href="/api/gateway/evidence/bundle?orgId=org-smoke" className="rounded-xl border border-emerald-300/50 px-5 py-3 font-bold text-emerald-100">Download evidence bundle</Link>
            <Link href="/api/gateway/audit/export?orgId=org-smoke" className="rounded-xl border border-emerald-300/50 px-5 py-3 font-bold text-emerald-100">Open audit export JSON</Link>
            <Link href="/marketplace/production-evidence" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200">View production evidence</Link>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950 p-4 text-sm font-bold uppercase tracking-wide text-slate-300">
            <div>Evidence source</div><div>Purpose</div><div>Status</div>
          </div>
          {evidence.map(([source, purpose, status]) => (
            <div key={source} className="grid grid-cols-3 gap-4 border-b border-slate-800 p-4 last:border-b-0">
              <div className="font-semibold text-white">{source}</div>
              <div className="text-slate-300">{purpose}</div>
              <div className={status === "Implemented" ? "font-bold text-emerald-300" : "font-bold text-amber-300"}>{status}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Sample evidence bundle structure</h2>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`{
  "type": "dsg-gateway-signed-evidence-bundle",
  "version": "1.0",
  "orgId": "org-smoke",
  "count": 1,
  "bundleHash": "sha256-bundle-placeholder",
  "eventHashes": ["sha256-event-placeholder"],
  "signature": {
    "algorithm": "hmac-sha256",
    "signature": "hmac-signature-placeholder",
    "signatureMode": "hmac",
    "keyId": "env:DSG_EVIDENCE_SIGNING_SECRET"
  },
  "events": [
    {
      "tool_name": "custom_http.customer_webhook",
      "action": "post",
      "decision": "allow",
      "request_hash": "sha256-request-placeholder",
      "record_hash": "sha256-record-placeholder"
    }
  ]
}`}</pre>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-bold">Boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            This page shows sample and internal production evidence. DSG ONE returns HMAC signature metadata when DSG_EVIDENCE_SIGNING_SECRET is configured. If the signing secret is not configured, DSG ONE returns hash-only signature metadata.
          </p>
          <p className="mt-3 leading-7 text-slate-300">
            This page does not claim WORM storage, external attestation, third-party audit, or guaranteed compliance.
          </p>
        </section>
      </div>
    </main>
  );
}
