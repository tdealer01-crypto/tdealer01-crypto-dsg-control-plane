'use client';

import Link from 'next/link';
import { CheckCircle2, Zap, Code, Shield, Globe, GitBranch } from 'lucide-react';

export default function PolicyGatesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-800 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block bg-violet-500/30 rounded-full px-4 py-2 mb-6">
            <span className="text-sm font-semibold">Policy Gate SDK</span>
          </div>

          <h1 className="text-5xl font-bold mb-6">
            Gate Any Action. Not Just Code Changes.
          </h1>

          <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">
            Deterministic, edge-ready policy gates for payments, deployments, API calls, and workflows. 
            No external solver. Fast. Verifiable.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="https://npmjs.com/package/@dsg-platform/gates"
              className="bg-white text-violet-600 px-8 py-3 rounded-lg font-semibold hover:bg-violet-50 transition"
            >
              npm install (Free)
            </Link>
            <Link
              href="#pricing"
              className="bg-violet-500/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-violet-500/40 transition border border-violet-400"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Use Cases</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">💳 Payment Approval</h3>
              <p className="text-gray-600">
                Gate payments before they hit the network. Enforce amount limits, daily caps, and approval workflows.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">🚀 Deployment Gates</h3>
              <p className="text-gray-600">
                Block production deployments until migrations run, tests pass, and code review happens.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">🔐 File Access Control</h3>
              <p className="text-gray-600">
                Protect sensitive files and paths. Require approval before editing migrations, configs, or secrets.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">⚙️ API Rate Limiting</h3>
              <p className="text-gray-600">
                Gate API calls by role, time window, or quota. Enforce rules on edge functions.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">🤖 Agent Control</h3>
              <p className="text-gray-600">
                Control what AI agents can do. Gate code changes, database mutations, and API access.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">📋 Workflow Approval</h3>
              <p className="text-gray-600">
                Route workflow steps to human approval. Enforce SLAs with automatic timeout and rejection.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Why Policy Gates?</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="flex gap-4">
            <Zap className="w-6 h-6 text-violet-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">⚡ Fast & Deterministic</h3>
              <p className="text-gray-600">
                No randomness, no external solver calls. Pure TypeScript logic. Reproducible hashes for every decision.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Code className="w-6 h-6 text-violet-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">Code or JSON</h3>
              <p className="text-gray-600">
                Define policies in JSON or TypeScript. Easy config or powerful custom logic.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Globe className="w-6 h-6 text-violet-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">Works Everywhere</h3>
              <p className="text-gray-600">
                Next.js middleware, Express, Vercel Edge Functions, MCP servers, GitHub Actions.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <Shield className="w-6 h-6 text-violet-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">Cryptographic Proofs</h3>
              <p className="text-gray-600">
                SHA-256 request/decision/policy hashes. Audit trail. Verify any decision.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <GitBranch className="w-6 h-6 text-violet-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">Open Source</h3>
              <p className="text-gray-600">
                @dsg-platform/gates on npm. MIT licensed. Audit the code yourself.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <CheckCircle2 className="w-6 h-6 text-violet-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">Zero Vendor Lock-In</h3>
              <p className="text-gray-600">
                Use local evaluation or our API. Portable policies. Own your data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Examples */}
      <div className="bg-gray-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-12">Integration Examples</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Next.js */}
            <div>
              <h3 className="text-xl font-bold mb-4">Next.js Middleware</h3>
              <div className="bg-gray-800 p-6 rounded-lg overflow-x-auto">
                <pre className="text-sm font-mono">{`import { createGateMiddleware } \\
  from '@dsg-platform/gates/examples';

const gateMiddleware = createGateMiddleware({
  apiKey: process.env.DSG_API_KEY,
  protectedPaths: ['/api/admin/*']
});

export function middleware(request) {
  return gateMiddleware(request);
}`}</pre>
              </div>
            </div>

            {/* GitHub Actions */}
            <div>
              <h3 className="text-xl font-bold mb-4">GitHub Actions</h3>
              <div className="bg-gray-800 p-6 rounded-lg overflow-x-auto">
                <pre className="text-sm font-mono">{`- name: Gate Deploy
  uses: dsg-platform/policy-gate-action@v1
  with:
    policy: |
      {
        "constraints": [{
          "type": "role_check",
          "value": ["maintainer"]
        }]
      }
    action: "deploy to production"`}</pre>
              </div>
            </div>

            {/* Local Evaluation */}
            <div>
              <h3 className="text-xl font-bold mb-4">Local Evaluation</h3>
              <div className="bg-gray-800 p-6 rounded-lg overflow-x-auto">
                <pre className="text-sm font-mono">{`const client = new DSGGatesClient();

const response = await client.evaluateGate({
  executionId: 'exec-123',
  agentId: 'claude',
  action: 'deploy',
  input: { amount: 50000 }
}, policy);

console.log(response.decision); // ALLOW`}</pre>
              </div>
            </div>

            {/* Vercel Edge */}
            <div>
              <h3 className="text-xl font-bold mb-4">Vercel Edge Functions</h3>
              <div className="bg-gray-800 p-6 rounded-lg overflow-x-auto">
                <pre className="text-sm font-mono">{`export const config = {
  runtime: 'edge'
};

export default async (request) => {
  const client = new DSGGatesClient();
  const response = await client
    .evaluateGate(req, policy);
  
  if (response.decision === 'BLOCK') {
    return new Response('Blocked', { status: 403 });
  }
  return fetch(request);
};`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-5xl mx-auto px-4 py-20" id="pricing">
        <h2 className="text-4xl font-bold text-center mb-16">Pricing</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-2">Freemium</h3>
            <p className="text-gray-600 mb-6">Perfect for small projects</p>
            <div className="text-4xl font-bold mb-2">Free<span className="text-lg text-gray-600">/day</span></div>
            <p className="text-gray-600 mb-8">100 gate evaluations per day</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Local + remote evaluation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Cryptographic proofs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Community support</span>
              </li>
            </ul>

            <button className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
              Get Started
            </button>
          </div>

          <div className="border-2 border-violet-600 rounded-xl p-8 bg-violet-50 relative">
            <div className="absolute top-0 left-8 bg-violet-600 text-white px-4 py-1 rounded-b-lg text-sm font-bold">
              Most Popular
            </div>

            <h3 className="text-2xl font-bold mb-2 mt-4">Pro</h3>
            <p className="text-gray-600 mb-6">For teams and production</p>
            <div className="text-4xl font-bold mb-2">$299<span className="text-lg text-gray-600">/month</span></div>
            <p className="text-gray-600 mb-8">Unlimited evaluations</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Everything in Freemium</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Unlimited evaluations</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Priority API support</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Custom policies</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>SLA guarantee</span>
              </li>
            </ul>

            <button className="block w-full bg-violet-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-violet-700 transition">
              Start Pro Trial
            </button>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-violet-600 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Gate Every Action</h2>
          <p className="text-xl text-violet-100 mb-8">
            Install @dsg-platform/gates today. Works locally and on edge. No external solver. Open source.
          </p>
          <Link
            href="https://npmjs.com/package/@dsg-platform/gates"
            className="inline-block bg-white text-violet-600 px-8 py-3 rounded-lg font-semibold hover:bg-violet-50 transition"
          >
            npm install @dsg-platform/gates
          </Link>
        </div>
      </div>
    </div>
  );
}
