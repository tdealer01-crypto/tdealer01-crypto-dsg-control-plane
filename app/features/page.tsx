'use client';

import Link from 'next/link';

const features = [
  {
    id: 'determinism',
    title: 'Deterministic Security Gateway',
    description: 'Every AI action is verified by SMT solver before execution',
    details: [
      'Policy invariants verified by Z3 theorem prover',
      '8 core security theorems + 3 DeFi-specific proofs',
      'Static verification at design time, no runtime overhead',
      'UNSAT-certified constraints prevent policy violations',
    ],
    icon: '🔐',
  },
  {
    id: 'sequence',
    title: 'Gap-Free Sequence Generation',
    description: 'Monotonic, tamper-proof audit trail',
    details: [
      'No skipped numbers = no hidden entries',
      'Atomic database operations prevent race conditions',
      'Per-organization sequence counters',
      'O(1) performance with BigInt support',
    ],
    icon: '🔢',
  },
  {
    id: 'hashing',
    title: 'Deterministic SHA-256 Hashing',
    description: 'Cryptographic proof of decision determinism',
    details: [
      'Stable JSON serialization for reproducibility',
      'Request hash → Decision hash → Chain hash linkage',
      'Same input always produces same output (provably)',
      'FIPS 180-4 compliant SHA-256 implementation',
    ],
    icon: '#️⃣',
  },
  {
    id: 'chain',
    title: 'Hash Chain Verification',
    description: 'Detect tampering with cryptographic proofs',
    details: [
      'Each entry links to previous via SHA-256 chain hash',
      'Modification of any entry breaks all downstream hashes',
      'O(n) full verification or O(1) point verification',
      'Enterprise audit trail immune to backdating',
    ],
    icon: '⛓️',
  },
  {
    id: 'merkle',
    title: 'Merkle Tree Audit Proofs',
    description: 'Compact O(log n) compliance verification',
    details: [
      'Binary tree of cryptographic hashes',
      'Prove any entry included without scanning all 1000s',
      'Pre-computed root hashes at checkpoint intervals',
      'SARIF format export for standards-based tools',
    ],
    icon: '🌳',
  },
  {
    id: 'replay',
    title: 'Replay Protection & Idempotency',
    description: 'Prevent duplicate processing and ensure determinism',
    details: [
      'Nonce-based replay protection',
      'Idempotency keys for safe retries',
      'Request hash comparison for decision verification',
      'Cryptographic proof that input → output mapping is unchanged',
    ],
    icon: '🛡️',
  },
  {
    id: 'compliance',
    title: 'Enterprise Audit Compliance',
    description: 'Meet regulatory requirements with automated proof',
    details: [
      'EU AI Act Art. 12/14 evidence pack included',
      'ISO 42001 AI governance readiness',
      'CCVS v1.2 compliance evidence chain (L1–L5)',
      '3091 tests covering all code paths (72.08% mutation score)',
    ],
    icon: '✅',
  },
  {
    id: 'export',
    title: 'SARIF Format Export',
    description: 'Standard compliance report for auditors',
    details: [
      'Static Analysis Results Interchange Format (SARIF)',
      'Compatible with GitHub Code Scanning, SonarQube, etc.',
      'Automated compliance evidence generation',
      'Audit trail in industry-standard format',
    ],
    icon: '📋',
  },
];

const complianceItems = [
  { label: 'EU AI Act Art. 12/14', status: 'Live', detail: 'Evidence pack at /api/compliance-evidence-pack/annex4' },
  { label: 'ISO 42001 Readiness', status: 'Live', detail: 'Governance framework mapped to standard' },
  { label: 'CCVS v1.2', status: 'Live', detail: '3091 tests, 72.08% mutation score' },
  { label: 'Z3 Theorem Verification', status: 'Live', detail: '8 core theorems + 3 DeFi proofs' },
  { label: 'WORM Audit Trail', status: 'Live', detail: 'SHA-256 hash chain (tamper-evident)' },
  { label: 'JWT/JWKS Auth', status: 'Planned', detail: 'Supabase auth live; standalone completion coming' },
  { label: 'WORM Certified Storage', status: 'Planned', detail: 'External WORM certification in progress' },
  { label: 'Third-Party Audit', status: 'Roadmap', detail: 'Independent compliance audit' },
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-12">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 mb-16">
        <p className="text-emerald-400 text-xs uppercase tracking-widest font-bold">Core Capabilities</p>
        <h1 className="text-5xl md:text-6xl font-bold mt-4 leading-tight">
          Deterministic Security Gateway
        </h1>
        <p className="text-xl text-slate-300 mt-6 max-w-3xl">
          Eight foundational features that make AI governance verifiable, auditable, and compliant. Every feature is production-ready and powering DSG ONE today.
        </p>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-6xl px-6 mb-20">
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature) => (
            <div key={feature.id} className="border border-white/10 bg-white/[0.02] rounded-2xl p-8 hover:border-emerald-400/30 transition-colors">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-400 mb-6">{feature.description}</p>
              <ul className="space-y-3">
                {feature.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-3 text-sm text-slate-300">
                    <span className="text-emerald-400 mt-1 flex-shrink-0">→</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance Status */}
      <section className="mx-auto max-w-6xl px-6 mb-20">
        <p className="text-amber-400 text-xs uppercase tracking-widest font-bold">Regulatory Status</p>
        <h2 className="text-4xl font-bold mt-4 mb-8">Compliance & Standards</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {complianceItems.map((item) => (
            <div key={item.label} className="border border-white/10 bg-white/[0.02] rounded-xl p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-white">{item.label}</h3>
                <span className={`text-xs uppercase tracking-wider font-bold px-2 py-1 rounded ${
                  item.status === 'Live'
                    ? 'bg-emerald-400/20 text-emerald-300'
                    : item.status === 'Planned'
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-slate-400/20 text-slate-300'
                }`}>
                  {item.status}
                </span>
              </div>
              <p className="text-sm text-slate-400">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API Endpoints */}
      <section className="mx-auto max-w-6xl px-6 mb-20">
        <p className="text-emerald-400 text-xs uppercase tracking-widest font-bold">Integration Points</p>
        <h2 className="text-4xl font-bold mt-4 mb-8">Determinism Engine APIs</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-white/10 bg-white/[0.02] rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 text-emerald-300">POST /api/dsg-one/determinism/record</h3>
            <p className="text-sm text-slate-400 mb-4">Record a policy decision with deterministic proofs</p>
            <code className="text-xs bg-black/30 p-3 rounded block text-emerald-300">
{`{
  org_id: string
  request: PolicyExecutionRequest
  decision: PolicyExecutionDecision
}`}
            </code>
          </div>
          <div className="border border-white/10 bg-white/[0.02] rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 text-emerald-300">POST /api/dsg-one/determinism/verify</h3>
            <p className="text-sm text-slate-400 mb-4">Verify sequence authenticity and chain integrity</p>
            <code className="text-xs bg-black/30 p-3 rounded block text-emerald-300">
{`{
  org_id: string
  sequence_number: bigint
}`}
            </code>
          </div>
          <div className="border border-white/10 bg-white/[0.02] rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 text-emerald-300">POST /api/dsg-one/determinism/replay</h3>
            <p className="text-sm text-slate-400 mb-4">Replay decision to prove determinism</p>
            <code className="text-xs bg-black/30 p-3 rounded block text-emerald-300">
{`{
  org_id: string
  sequence_number: bigint
  currentRequest: PolicyExecutionRequest
}`}
            </code>
          </div>
          <div className="border border-white/10 bg-white/[0.02] rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 text-emerald-300">GET /api/dsg-one/determinism/export</h3>
            <p className="text-sm text-slate-400 mb-4">Export ledger as JSON or SARIF</p>
            <code className="text-xs bg-black/30 p-3 rounded block text-emerald-300">
{`?org_id=string
?format=json|sarif
?limit=1000`}
            </code>
          </div>
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/api-docs"
            className="inline-block bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-emerald-300 transition"
          >
            View Full API Documentation →
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="border border-emerald-400/30 bg-emerald-400/5 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to implement deterministic governance?</h2>
          <p className="text-slate-300 mb-8">Start with a free developer tier or request enterprise access for custom pricing.</p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/pricing"
              className="bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-emerald-300 transition"
            >
              View Pricing Plans
            </Link>
            <Link
              href="/demo"
              className="border border-emerald-400/40 text-emerald-300 px-6 py-3 rounded-xl font-bold hover:border-emerald-400 transition"
            >
              Try Demo
            </Link>
            <Link
              href="/request-access"
              className="border border-emerald-400/40 text-emerald-300 px-6 py-3 rounded-xl font-bold hover:border-emerald-400 transition"
            >
              Request Access
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
