"use client";

import { useState } from "react";

const FRAMEWORKS = [
  {
    id: "eu-ai-act",
    name: "EU AI Act",
    flag: "🇪🇺",
    status: "Article 12/14 + Annex IV",
    color: "blue",
    description: "Regulation (EU) 2024/1689 — World's first comprehensive AI regulation",
    effective: "Aug 2026 (phased)",
    dsgCoverage: [
      { requirement: "Risk Classification (Art. 6)", implemented: true, evidence: "DSG Gate evaluates risk_level in context → allow/review/block" },
      { requirement: "Conformity Assessment (Art. 43)", implemented: true, evidence: "Z3 SMT proof per evaluation = technical documentation" },
      { requirement: "Post-Market Monitoring (Art. 72)", implemented: true, evidence: "Real-time audit trail + /api/parallel/health metrics" },
      { requirement: "Technical Documentation (Annex IV)", implemented: true, evidence: "Constraint hash + proof hash + input hash chain" },
      { requirement: "Human Oversight (Art. 14)", implemented: true, evidence: "Review decisions require human approval via Gatekeeper UI" },
      { requirement: "Accuracy & Robustness (Art. 15)", implemented: true, evidence: "Deterministic replay: same input → same decision always" },
      { requirement: "Cybersecurity (Art. 15)", implemented: true, evidence: "WORM audit log, credential broker, rate limiting" },
    ],
  },
  {
    id: "iso-42001",
    name: "ISO/IEC 42001",
    flag: "📐",
    status: "AI Management System",
    color: "violet",
    description: "International standard for AI governance management systems",
    effective: "Published Dec 2023",
    dsgCoverage: [
      { requirement: "4.1 Context of Organization", implemented: true, evidence: "Org-scoped RBAC, multi-tenant architecture" },
      { requirement: "4.2 Stakeholder Needs", implemented: true, evidence: "Policy Gate encodes stakeholder requirements as constraints" },
      { requirement: "5 Leadership & AI Policy", implemented: true, evidence: "DSG_ALLOWED_ORIGINS, DSG_DEFAULT_POLICY_ID config" },
      { requirement: "6 Planning (Risk Treatment)", implemented: true, evidence: "Z3 theorems encode risk treatment plans" },
      { requirement: "7 Support (Resources/Competence)", implemented: true, evidence: "Skills Marketplace = pre-built governance workflows" },
      { requirement: "8 Operation (AI Risk Assessment)", implemented: true, evidence: "/api/dsg/v1/gates/evaluate performs risk assessment per request" },
      { requirement: "9 Performance Evaluation", implemented: true, evidence: "Audit trail, proof hashes, usage metrics, quota tracking" },
      { requirement: "10 Improvement", implemented: true, evidence: "Mutation testing (72.08%), CI/CD gates, deployment verification" },
    ],
  },
  {
    id: "nist-ai-rmf",
    name: "NIST AI RMF 1.0",
    flag: "🇺🇸",
    status: "Govern, Map, Measure, Manage",
    color: "emerald",
    description: "AI Risk Management Framework (NIST AI 100-1)",
    effective: "Jan 2023",
    dsgCoverage: [
      { requirement: "GOVERN 1.1: Culture & Policy", implemented: true, evidence: "Policy-as-code, immutable audit, org-level policies" },
      { requirement: "GOVERN 2.1: Roles & Responsibilities", implemented: true, evidence: "RBAC: admin, operator, auditor, viewer roles" },
      { requirement: "MAP 1.1: Context Establishment", implemented: true, evidence: "Context passed in every gate evaluation request" },
      { requirement: "MAP 2.1: Risk Identification", implemented: true, evidence: "Z3 theorems identify forbidden states (10 theorems)" },
      { requirement: "MEASURE 1.1: Metrics & Methods", implemented: true, evidence: "Latency p50/p95/p99, eval count, error rate, quota usage" },
      { requirement: "MEASURE 2.1: Testing & Evaluation", implemented: true, evidence: "1,672+ tests, mutation testing, E2E smoke tests" },
      { requirement: "MANAGE 1.1: Prioritization", implemented: true, evidence: "Decision: allow/review/block with escalation path" },
      { requirement: "MANAGE 2.1: Risk Treatment", implemented: true, evidence: "Review → human approval, Block → audit + alert" },
    ],
  },
];

type FrameworkId = "eu-ai-act" | "iso-42001" | "nist-ai-rmf";

export default function CompliancePage() {
  const [selectedFramework, setSelectedFramework] = useState<FrameworkId>("eu-ai-act");

  const framework = FRAMEWORKS.find(f => f.id === selectedFramework)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-3">Compliance</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built-in Compliance: Day 1
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto">
            DSG ONE implements EU AI Act, ISO 42001, and NIST AI RMF as executable code —
            not documentation. Every gate evaluation produces auditable evidence.
          </p>
        </div>

        {/* Framework Tabs */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {FRAMEWORKS.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFramework(f.id as FrameworkId)}
              className={`px-6 py-3 rounded-xl font-medium transition ${
                selectedFramework === f.id
                  ? `bg-${f.color}-500/20 text-${f.color}-300 border border-${f.color}-500/30`
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-lg mr-2">{f.flag}</span>
              {f.name}
            </button>
          ))}
        </div>

        {/* Framework Detail */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 mb-12">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="text-4xl">{framework.flag}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{framework.name}</h2>
              <p className="text-sm text-slate-400">{framework.status}</p>
            </div>
            <div className="flex-1"></div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-${framework.color}-500/20 text-${framework.color}-300 border border-${framework.color}-500/30`}>
              {framework.effective}
            </span>
          </div>

          <p className="text-slate-400 mb-8">{framework.description}</p>

          {/* Requirements Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Requirement</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">Status</th>
                  <th className="pb-3 text-xs uppercase tracking-wider text-slate-500">DSG Evidence (Executable)</th>
                </tr>
              </thead>
              <tbody>
                {framework.dsgCoverage.map((req, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-4 font-medium text-white">{req.requirement}</td>
                    <td className="py-4">
                      {req.implemented ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                          ✓ Implemented
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-400/20 text-rose-300 border border-rose-400/30">
                          ✗ Not Implemented
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-sm text-slate-300 font-mono max-w-md">
                      {req.evidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Evidence Generation */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8 mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Generate Compliance Evidence Pack</h2>
          <p className="text-slate-400 mb-6">
            One-click generation of per-customer deployment evidence for auditors.
            Includes scan results, timestamps, claim results, and cryptographic proof chain.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Community (Free)</h3>
              <p className="text-sm text-slate-400 mb-4">Static compliance framework overview, PDF export</p>
              <button className="w-full py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition text-sm">
                Download Template
              </button>
            </div>
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5 ring-1 ring-emerald-400/30">
              <h3 className="font-bold text-white mb-2">Professional ($49)</h3>
              <p className="text-sm text-slate-400 mb-4">Per-customer evidence pack with deployment data, scan results, timestamps</p>
              <button className="w-full py-2 rounded-xl bg-emerald-400 text-emerald-950 hover:bg-emerald-300 transition text-sm font-bold">
                Generate Pack
              </button>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Enterprise ($199/mo)</h3>
              <p className="text-sm text-slate-400 mb-4">Unlimited evidence packs, custom framework mappings, API access</p>
              <button className="w-full py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition text-sm">
                Contact Sales
              </button>
            </div>
          </div>
        </div>

        {/* Audit Trail Demo */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-4">Immutable Audit Trail (WORM)</h2>
          <p className="text-slate-400 mb-6">
            Every gate evaluation writes to an append-only audit log with SHA-256 hash chaining.
            Tamper-evident by design — meets EU AI Act Annex IV & NIST AI RMF MEASURE requirements.
          </p>

          <div className="overflow-x-auto rounded-xl bg-black/40 border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="p-3 text-xs uppercase tracking-wider text-slate-500">Field</th>
                  <th className="p-3 text-xs uppercase tracking-wider text-slate-500">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="p-3 text-slate-400 font-mono">requestHash</td>
                  <td className="p-3 text-emerald-300 font-mono">sha256(9f4e2a1b...c3d4)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-3 text-slate-400 font-mono">constraintHash</td>
                  <td className="p-3 text-violet-300 font-mono">sha256(policy_v3.2...f1a2)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-3 text-slate-400 font-mono">recordHash</td>
                  <td className="p-3 text-amber-300 font-mono">sha256(decision:allow...7e8f)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-3 text-slate-400 font-mono">bundleHash</td>
                  <td className="p-3 text-cyan-300 font-mono">sha256(chain:req→con→rec...a1b2)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-3 text-slate-400 font-mono">audit_id</td>
                  <td className="p-3 text-white font-mono">dsg_audit_20260704_abc123</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-3 text-slate-400 font-mono">timestamp</td>
                  <td className="p-3 text-slate-300">2026-07-04T14:22:18.453Z</td>
                </tr>
                <tr>
                  <td className="p-3 text-slate-400 font-mono">decision</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-xs font-bold">ALLOW</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-500 text-center">
            Verify independently: <code className="font-mono text-emerald-300">GET /api/dsg/v1/proofs/prove?audit_id=dsg_audit_20260704_abc123</code>
          </p>
        </div>
      </div>
    </div>
  );
}