'use client';

import { useState } from 'react';

type SearchResult = {
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  license: string | null;
  status: string;
};

type VerifyResult = {
  skillId: string;
  verification: {
    status: string;
    reasons: string[];
    checks: Record<string, unknown>;
  };
  draft: { riskLevel: string; permissions: Record<string, unknown> };
  nextStep: string;
};

const statusColor: Record<string, string> = {
  verified: 'text-green-400',
  needs_review: 'text-yellow-400',
  needs_approval: 'text-orange-400',
  blocked: 'text-red-400',
  discovered: 'text-slate-400',
};

export default function AgentSkillsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/agent-skills/search?q=${encodeURIComponent(query)}&limit=10`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.code ?? 'SEARCH_FAILED');
      setResults(json.data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'SEARCH_FAILED');
    } finally {
      setLoading(false);
    }
  }

  async function verifyRepo(fullName: string) {
    const [owner, repo] = fullName.split('/');
    if (!owner || !repo) return;
    setLoading(true);
    setError(null);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/agent-skills/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ owner, repo }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.code ?? 'VERIFY_FAILED');
      setVerifyResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'VERIFY_FAILED');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 font-mono">
      <h1 className="text-2xl font-bold text-green-400 mb-2">DSG SkillGate</h1>
      <p className="text-slate-400 text-sm mb-8">
        Search → Inspect → Verify → Lock → Gate — open-source skills under DSG governance
      </p>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <input
          className="flex-1 bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm focus:outline-none focus:border-green-500"
          placeholder="Search GitHub skills (e.g. 'github repo auditor')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button
          onClick={search}
          disabled={loading}
          className="bg-green-500 hover:bg-green-400 text-black font-bold px-5 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3 mb-8">
          <h2 className="text-slate-400 text-xs uppercase tracking-wider mb-3">
            {results.length} discovered
          </h2>
          {results.map((r) => (
            <div
              key={r.fullName}
              className="bg-slate-900 border border-slate-800 rounded p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline font-semibold text-sm"
                >
                  {r.fullName}
                </a>
                {r.description && (
                  <p className="text-slate-400 text-xs mt-1 truncate">{r.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span>★ {r.stars}</span>
                  {r.license && <span>{r.license}</span>}
                  <span className={statusColor[r.status] ?? 'text-slate-400'}>{r.status}</span>
                </div>
              </div>
              <button
                onClick={() => verifyRepo(r.fullName)}
                className="shrink-0 text-xs border border-slate-600 hover:border-green-500 text-slate-300 hover:text-green-400 px-3 py-1.5 rounded"
              >
                Verify
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Verify result */}
      {verifyResult && (
        <div className="bg-slate-900 border border-slate-700 rounded p-5">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold">{verifyResult.skillId}</h2>
            <span className={`text-xs font-semibold ${statusColor[verifyResult.verification.status] ?? 'text-slate-400'}`}>
              {verifyResult.verification.status.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span className="text-xs text-slate-500 ml-auto">
              risk: {verifyResult.draft.riskLevel}
            </span>
          </div>

          {verifyResult.verification.reasons.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-400 mb-2">Flags:</p>
              <ul className="space-y-1">
                {verifyResult.verification.reasons.map((r) => (
                  <li key={r} className="text-xs text-orange-400">• {r}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-slate-400 mt-4 border-t border-slate-800 pt-3">
            {verifyResult.nextStep}
          </p>
        </div>
      )}
    </main>
  );
}
