'use client';

import Link from 'next/link';
import { CheckCircle2, Download, Shield, FileText, Clock, Globe } from 'lucide-react';

export default function ComplianceProofPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block bg-emerald-500/30 rounded-full px-4 py-2 mb-6">
            <span className="text-sm font-semibold">Compliance Proof API</span>
          </div>

          <h1 className="text-5xl font-bold mb-6">
            EU AI Act Compliance. Automatically.
          </h1>

          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            Export audit-ready compliance evidence. Support EU AI Act, ISO 42001, and NIST AI RMF. 
            Prove governance. Pass audits.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/api/compliance/export"
              className="bg-white text-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition"
            >
              Try API (Free)
            </Link>
            <Link
              href="#pricing"
              className="bg-emerald-500/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-500/40 transition border border-emerald-400"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Frameworks Section */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Supported Frameworks</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* EU AI Act */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-bold">EU AI Act</h3>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Annex IV - Technical documentation requirements (9 items)
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ General description + purpose</li>
                <li>✓ Version + update history</li>
                <li>✓ Technical specifications</li>
                <li>✓ Monitoring + logging</li>
                <li>✓ Human oversight</li>
              </ul>
              <p className="text-xs text-gray-500 mt-6">Deadline: August 2026</p>
            </div>

            {/* ISO 42001 */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-amber-600" />
                <h3 className="text-xl font-bold">ISO 42001</h3>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                AI Management System (5 key controls)
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ Planning (A.6)</li>
                <li>✓ Internal audit (A.9.2)</li>
                <li>✓ Continuous improvement (A.10)</li>
                <li>✓ Risk assessment (A.7.3)</li>
                <li>✓ Operational planning (A.8)</li>
              </ul>
              <p className="text-xs text-gray-500 mt-6">Published: November 2023</p>
            </div>

            {/* NIST RMF */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-purple-600" />
                <h3 className="text-xl font-bold">NIST AI RMF</h3>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                AI Risk Management Framework (5 practices)
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ GOVERN 1.1</li>
                <li>✓ MAP 2.1</li>
                <li>✓ MEASURE 3.1</li>
                <li>✓ MANAGE 4.1</li>
                <li>✓ RISKS 5.1</li>
              </ul>
              <p className="text-xs text-gray-500 mt-6">Released: January 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Features</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex gap-4">
            <Download className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">One-Click Export</h3>
              <p className="text-gray-600">
                Export JSON with audit log, evidence, and framework mappings. Includes cryptographic hashes for verification.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <FileText className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">HTML Reports</h3>
              <p className="text-gray-600">
                Generate printable compliance reports. Share with auditors, regulators, and stakeholders.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Shield className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">Audit Ready</h3>
              <p className="text-gray-600">
                All evidence collected with timestamps and proofs. Shareable links expire after 90 days.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Clock className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">Keep Updated</h3>
              <p className="text-gray-600">
                Automatic updates as your system evolves. Re-export anytime to track compliance progress.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Example */}
      <div className="bg-gray-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Quick Start</h2>

          <div className="bg-gray-800 p-6 rounded-lg overflow-x-auto">
            <pre className="text-sm font-mono">
{`POST /api/compliance/export
Content-Type: application/json

{
  "framework": "eu_ai_act",
  "includeAuditLog": true,
  "includeEvidence": true
}

Response:
{
  "reportId": "report_1234567_abc123",
  "framework": ["eu_ai_act"],
  "exportDate": "2026-06-04T10:00:00Z",
  "dataHash": "sha256...",
  "shareableUrl": "/api/compliance-report/report_...",
  "expiresAt": "2026-09-02T10:00:00Z",
  "status": "ready",
  "data": {
    "frameworks": { ... },
    "auditLog": { ... },
    "claimBoundary": { ... }
  }
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-5xl mx-auto px-4 py-20" id="pricing">
        <h2 className="text-4xl font-bold text-center mb-16">Pricing</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-2">Freemium</h3>
            <p className="text-gray-600 mb-6">Try it free</p>
            <div className="text-4xl font-bold mb-2">Free<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-gray-600 mb-8">1 export per month</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Single framework export</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>JSON format</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>90-day storage</span>
              </li>
            </ul>

            <button className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
              Get Started
            </button>
          </div>

          <div className="border-2 border-emerald-600 rounded-xl p-8 bg-emerald-50 relative">
            <div className="absolute top-0 left-8 bg-emerald-600 text-white px-4 py-1 rounded-b-lg text-sm font-bold">
              Most Popular
            </div>

            <h3 className="text-2xl font-bold mb-2 mt-4">Standard</h3>
            <p className="text-gray-600 mb-6">For teams and enterprises</p>
            <div className="text-4xl font-bold mb-2">$199<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-gray-600 mb-8">10 exports per month</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>All frameworks (EU, ISO, NIST)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>JSON + HTML reports</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Audit log + evidence</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Shareable links</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Email support</span>
              </li>
            </ul>

            <button className="block w-full bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition">
              Start Free Trial
            </button>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-emerald-600 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Pass Your Compliance Audit</h2>
          <p className="text-xl text-emerald-100 mb-8">
            Generate audit-ready evidence in minutes. Support EU AI Act (August 2026), ISO 42001, NIST RMF.
          </p>
          <button className="inline-block bg-white text-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-50 transition">
            Export Evidence Now
          </button>
        </div>
      </div>
    </div>
  );
}
