'use client';

import Link from 'next/link';
import { useState } from 'react';

const apiSections = [
  {
    title: 'Determinism Engine',
    description: 'Record, verify, and audit deterministic policy decisions',
    endpoints: [
      {
        method: 'POST',
        path: '/api/dsg-one/determinism/record',
        description: 'Record a policy execution with deterministic proofs',
        request: {
          body: {
            org_id: 'string (required)',
            request: {
              orgId: 'string',
              policyId: 'string',
              requestType: 'approval | payment | deployment | access',
              requestData: 'Record<string, unknown>',
              requesterId: 'string',
              requesterRole: 'string (optional)',
              metadata: 'Record<string, unknown> (optional)',
            },
            decision: {
              decision: 'ALLOW | BLOCK | REVIEW',
              reason: 'string',
              riskScore: 'number (optional)',
              evidence: 'Record<string, unknown> (optional)',
            },
          },
        },
        response: {
          sequenceNumber: 'bigint',
          requestHash: 'string (sha256:...)',
          decisionHash: 'string (sha256:...)',
          chainHash: 'string (sha256:...)',
          merkleLeafHash: 'string (md5 hash)',
          timestamp: 'ISO 8601',
          isReplayable: 'boolean',
        },
        example: {
          request: JSON.stringify({
            org_id: 'org_123',
            request: {
              orgId: 'org_123',
              policyId: 'pol_payment_approval',
              requestType: 'payment',
              requestData: { amount: 50000, vendor: 'acme' },
              requesterId: 'user_456',
            },
            decision: {
              decision: 'ALLOW',
              reason: 'Within policy thresholds',
              riskScore: 2.5,
            },
          }, null, 2),
          response: JSON.stringify({
            sequenceNumber: 1,
            requestHash: 'sha256:abc123...',
            decisionHash: 'sha256:def456...',
            chainHash: 'sha256:ghi789...',
            merkleLeafHash: 'md5hash...',
            timestamp: '2026-07-09T04:30:00Z',
            isReplayable: true,
          }, null, 2),
        },
      },
      {
        method: 'POST',
        path: '/api/dsg-one/determinism/verify',
        description: 'Verify that a sequence entry is authentic and unmodified',
        request: {
          body: {
            org_id: 'string (required)',
            sequence_number: 'bigint (required)',
          },
        },
        response: {
          ok: 'boolean',
          error: 'string (if ok=false)',
        },
        example: {
          request: JSON.stringify({
            org_id: 'org_123',
            sequence_number: 1,
          }, null, 2),
          response: JSON.stringify({
            ok: true,
          }, null, 2),
        },
      },
      {
        method: 'POST',
        path: '/api/dsg-one/determinism/replay',
        description: 'Replay a decision to prove determinism (same input → same output)',
        request: {
          body: {
            org_id: 'string (required)',
            sequence_number: 'bigint (required)',
            currentRequest: 'PolicyExecutionRequest (required)',
            currentDecision: 'PolicyExecutionDecision (required)',
          },
        },
        response: {
          isDeterministic: 'boolean',
          error: 'string (if error occurred)',
        },
        example: {
          request: JSON.stringify({
            org_id: 'org_123',
            sequence_number: 1,
            currentRequest: { /* same request as original */ },
            currentDecision: { /* same decision as original */ },
          }, null, 2),
          response: JSON.stringify({
            isDeterministic: true,
          }, null, 2),
        },
      },
      {
        method: 'GET',
        path: '/api/dsg-one/determinism/export',
        description: 'Export ledger entries as JSON or SARIF format',
        request: {
          queryParams: {
            org_id: 'string (required)',
            format: 'json | sarif (default: json)',
            limit: 'number (default: 1000, max: 10000)',
            offset: 'number (default: 0)',
          },
        },
        response: {
          format: 'JSON array or SARIF v2.1.0 document',
        },
        example: {
          request: '/api/dsg-one/determinism/export?org_id=org_123&format=json&limit=100',
          response: JSON.stringify({
            ledger: [{
              entryId: 'entry_001',
              orgId: 'org_123',
              sequenceNumber: 1,
              requestHash: 'sha256:abc...',
              decisionHash: 'sha256:def...',
              chainHash: 'sha256:ghi...',
              timestamp: '2026-07-09T04:30:00Z',
            }],
          }, null, 2),
        },
      },
    ],
  },
];

const authSection = {
  title: 'Authentication',
  description: 'All Determinism Engine endpoints require authentication',
  details: [
    {
      method: 'Service Role Token',
      description: 'Backend requests use Supabase service_role key',
      example: 'Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>',
    },
    {
      method: 'User Session',
      description: 'Frontend requests use Supabase JWT from session',
      example: 'Authorization: Bearer <SESSION_JWT>',
    },
  ],
};

const errorCodes = [
  { code: 'SEQUENCE_NOT_FOUND', message: 'Requested sequence number does not exist', status: 404 },
  { code: 'CHAIN_HASH_MISMATCH', message: 'Hash chain integrity check failed (tampering detected)', status: 400 },
  { code: 'DECISION_HASH_MISMATCH', message: 'Decision hash does not match recorded value', status: 400 },
  { code: 'VERIFICATION_ERROR', message: 'Error during verification process', status: 500 },
  { code: 'REPLAY_ERROR', message: 'Error during replay verification', status: 500 },
  { code: 'SUPABASE_UNAVAILABLE', message: 'Database connection unavailable', status: 503 },
  { code: 'MISSING_ORG_ID', message: 'org_id parameter is required', status: 400 },
];

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-black/30 border border-white/5 rounded p-4 text-xs overflow-x-auto">
      <code className="text-emerald-300">{code}</code>
    </pre>
  );
}

function EndpointCard({ endpoint }: { endpoint: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden mb-6">
      <div
        className="bg-white/[0.02] p-6 cursor-pointer hover:bg-white/[0.04] transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded font-mono text-xs font-bold ${
              endpoint.method === 'POST'
                ? 'bg-blue-400/20 text-blue-300'
                : 'bg-green-400/20 text-green-300'
            }`}>
              {endpoint.method}
            </span>
            <code className="font-mono text-sm">{endpoint.path}</code>
          </div>
          <span className="text-slate-400">{expanded ? '▼' : '▶'}</span>
        </div>
        <p className="text-slate-400 text-sm mt-2">{endpoint.description}</p>
      </div>

      {expanded && (
        <div className="bg-black/20 border-t border-white/10 p-6 space-y-6">
          {endpoint.request && (
            <div>
              <h4 className="font-bold text-white mb-3">Request</h4>
              {endpoint.request.body && (
                <div>
                  <p className="text-xs uppercase text-slate-400 mb-2">Body:</p>
                  <CodeBlock code={endpoint.request.body.constructor === Object
                    ? JSON.stringify(endpoint.request.body, null, 2)
                    : JSON.stringify(endpoint.request.body, null, 2)} />
                </div>
              )}
              {endpoint.request.queryParams && (
                <div>
                  <p className="text-xs uppercase text-slate-400 mb-2">Query Parameters:</p>
                  <ul className="text-sm space-y-2 text-slate-300">
                    {Object.entries(endpoint.request.queryParams).map(([key, desc]) => (
                      <li key={key}><code className="text-emerald-300">{key}</code>: {desc as string}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {endpoint.response && (
            <div>
              <h4 className="font-bold text-white mb-3">Response</h4>
              <CodeBlock code={endpoint.response.constructor === Object
                ? JSON.stringify(endpoint.response, null, 2)
                : JSON.stringify(endpoint.response, null, 2)} />
            </div>
          )}

          {endpoint.example && (
            <div>
              <h4 className="font-bold text-white mb-3">Example</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-slate-400 mb-2">Request:</p>
                  <CodeBlock code={endpoint.example.request} />
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400 mb-2">Response:</p>
                  <CodeBlock code={endpoint.example.response} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white py-12">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 mb-16">
        <p className="text-emerald-400 text-xs uppercase tracking-widest font-bold">API Reference</p>
        <h1 className="text-5xl md:text-6xl font-bold mt-4 mb-6">Determinism Engine API</h1>
        <p className="text-xl text-slate-300 max-w-3xl">
          Complete REST API reference for recording, verifying, and auditing deterministic policy decisions.
        </p>
      </section>

      {/* Authentication */}
      <section className="mx-auto max-w-6xl px-6 mb-16">
        <h2 className="text-3xl font-bold mb-6">{authSection.title}</h2>
        <p className="text-slate-400 mb-8">{authSection.description}</p>
        <div className="grid md:grid-cols-2 gap-6">
          {authSection.details.map((auth) => (
            <div key={auth.method} className="border border-white/10 bg-white/[0.02] rounded-xl p-6">
              <h3 className="font-bold text-white mb-2">{auth.method}</h3>
              <p className="text-sm text-slate-400 mb-4">{auth.description}</p>
              <CodeBlock code={auth.example} />
            </div>
          ))}
        </div>
      </section>

      {/* Endpoints */}
      {apiSections.map((section) => (
        <section key={section.title} className="mx-auto max-w-6xl px-6 mb-16">
          <h2 className="text-3xl font-bold mb-2">{section.title}</h2>
          <p className="text-slate-400 mb-8">{section.description}</p>
          {section.endpoints.map((endpoint) => (
            <EndpointCard key={endpoint.path} endpoint={endpoint} />
          ))}
        </section>
      ))}

      {/* Error Codes */}
      <section className="mx-auto max-w-6xl px-6 mb-16">
        <h2 className="text-3xl font-bold mb-8">Error Codes</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {errorCodes.map((error) => (
            <div key={error.code} className="border border-white/10 bg-white/[0.02] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <code className="font-bold text-red-400">{error.code}</code>
                <span className="text-xs bg-red-400/20 text-red-300 px-2 py-1 rounded">{error.status}</span>
              </div>
              <p className="text-sm text-slate-400">{error.message}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="border border-emerald-400/30 bg-emerald-400/5 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to integrate?</h2>
          <p className="text-slate-300 mb-8">Check out our integration guide and start recording deterministic decisions.</p>
          <Link
            href="/docs"
            className="inline-block bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-bold hover:bg-emerald-300 transition"
          >
            View Integration Guide →
          </Link>
        </div>
      </section>
    </main>
  );
}
