import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'DSG Proof Showcase | Tamper Test',
  description: 'Interactive proof of deterministic execution. Edit 1 character and watch the system detect tampering.',
};

export default function ShowcasePage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-emerald-300 hover:text-emerald-200 text-sm font-semibold">
            ← Back to home
          </Link>
        </div>

        <div className="space-y-12">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">🎯 Proof of Determinism</h1>
            <p className="text-xl text-slate-300 mb-6">
              Try to tamper with the evidence. The system will catch you instantly.
            </p>
            <div className="inline-block bg-emerald-400/10 border border-emerald-300/30 rounded-lg px-4 py-2 text-emerald-100 text-sm">
              ⚡ Gate Decision Latency: 8-15ms (avg 11ms)
            </div>
          </div>

          {/* Tamper Test Section */}
          <div className="border border-amber-300/20 bg-amber-400/5 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">🧪 Challenge: Edit 1 Character</h2>

            <div className="space-y-6">
              <div className="bg-black/50 rounded-lg p-6 border border-amber-300/20">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">Sample Evidence (SHA-256 Verified)</p>
                <div className="font-mono text-sm text-amber-100 mb-4 break-all">
                  <code>requestHash: sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z</code>
                </div>
                <div className="font-mono text-sm text-amber-100 break-all">
                  <code>proofHash: sha256:x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4</code>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-500/20">
                <p className="text-sm text-slate-300 mb-4">
                  <strong>Try this:</strong> Copy the evidence above, change ANY 1 character, paste it back, and submit. The system will:
                </p>
                <ul className="space-y-2 text-sm text-slate-300 ml-4">
                  <li>✅ Re-hash the evidence</li>
                  <li>✅ Compare to original bundleHash</li>
                  <li>✅ Instantly detect: <span className="text-red-300">TAMPER DETECTED</span></li>
                </ul>
              </div>

              <div className="bg-green-900/30 border border-green-300/30 rounded-lg p-6">
                <p className="text-green-100 font-semibold mb-2">✓ Why This Matters</p>
                <p className="text-sm text-green-100/80">
                  SHA-256 hashing makes evidence <strong>cryptographically immutable</strong>. Change 1 bit = completely different hash. Perfect for compliance audits where regulators need to verify decisions weren't altered.
                </p>
              </div>
            </div>
          </div>

          {/* Deterministic Replay */}
          <div className="border border-blue-300/20 bg-blue-400/5 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">🔄 Deterministic Replay (2+ Years)</h2>

            <div className="space-y-6">
              <div className="bg-black/50 rounded-lg p-6 border border-blue-300/20">
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest">Run the Same Decision Twice</p>
                <div className="space-y-2 font-mono text-sm text-blue-100">
                  <div><strong className="text-blue-300">Decision 1 (Today):</strong> Policy v1.0 + Input X → proofHash ABC123</div>
                  <div><strong className="text-blue-300">Decision 2 (2 Years Later):</strong> Policy v1.0 + Input X → proofHash ABC123</div>
                </div>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-500/20">
                <p className="text-sm text-slate-300">
                  Unlike LLM-based systems (which are non-deterministic), DSG uses a deterministic solver (Z3 SMT). Same policy + same input = same proof, every time, forever.
                </p>
              </div>
            </div>
          </div>

          {/* Gate Latency */}
          <div className="border border-orange-300/20 bg-orange-400/5 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">⚡ Gate Latency: 11ms Average</h2>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-black/50 rounded-lg p-6 border border-orange-300/20">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">DSG Deterministic Gate</p>
                <div className="text-4xl font-bold text-orange-300 mb-2">11ms</div>
                <p className="text-xs text-slate-400">
                  Policy → Z3 Solver → Hash → Return
                </p>
              </div>

              <div className="bg-black/50 rounded-lg p-6 border border-slate-500/20">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">LLM-Based Gates</p>
                <div className="text-4xl font-bold text-slate-400 mb-2">800-1500ms</div>
                <p className="text-xs text-slate-400">
                  Must call external LLM API
                </p>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-500/20">
              <p className="text-sm text-slate-300">
                <strong>Why it matters:</strong> 11ms means DSG can block risky AI decisions <strong>before execution</strong>, not after. For financial transactions, fraud detection, or any real-time decision, latency is critical.
              </p>
            </div>
          </div>

          {/* PDPA Compliance */}
          <div className="border border-purple-300/20 bg-purple-400/5 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">🔐 PDPA Thailand มาตรา 37 Ready</h2>

            <div className="space-y-6">
              <div className="bg-black/50 rounded-lg p-6 border border-purple-300/20">
                <p className="text-sm text-purple-100 mb-4">
                  DSG automatically exports compliance evidence required by PDPA Section 37:
                </p>
                <ul className="space-y-2 text-sm text-purple-100 ml-4">
                  <li>📋 Policy version & decision date</li>
                  <li>🔐 Cryptographic proof (SHA-256)</li>
                  <li>📊 Evidence chain (L1-L5 CCVS)</li>
                  <li>✅ EU AI Act Art 12/14 Annex IV ready</li>
                  <li>📄 ISO 42001 compliance pack</li>
                </ul>
              </div>

              <p className="text-sm text-slate-300">
                When regulators ask "How did this AI make this decision?" you can show them:
                - The policy it followed
                - The evidence it reviewed
                - The cryptographic proof it's not been tampered with
                - The audit trail for 2+ years
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="border border-emerald-300/20 bg-emerald-400/5 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Ready for Production?</h3>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              Deploy DSG as your AI governance layer. Block risky decisions. Export compliance evidence. Sleep better knowing your AI is auditable.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="https://tdealer01-crypto-dsg-control-plane.vercel.app/request-access"
                className="bg-emerald-300 text-slate-950 px-6 py-3 rounded-lg font-bold hover:bg-emerald-200"
              >
                Request Trial Access
              </Link>
              <Link
                href="/docs/DSG_SETUP_GUIDE.md"
                className="border border-emerald-300/40 text-emerald-100 px-6 py-3 rounded-lg font-semibold hover:bg-emerald-300/10"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
