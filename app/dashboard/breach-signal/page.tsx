'use client';

import { useState, useEffect, useCallback } from 'react';

type Decision = 'BLOCK' | 'REVIEW' | 'INCIDENT_REPORT_ALLOWED';
type EvidenceLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type HibpBreach = {
  name: string;
  title: string;
  domain: string;
  breachDate: string;
  dataClasses: string[];
  isVerified: boolean;
};

type UrlFlags = {
  detectedDomain: string | null;
  networkRoute: 'standard' | 'tor' | 'unknown';
  requiresLogin: boolean;
  requiresDownload: boolean;
};

type HibpInfo = {
  checked: boolean;
  breachCount: number;
  elevatedEvidence: boolean;
  skipReason: string | null;
  breaches: HibpBreach[];
};

type EvaluationResult = {
  ok: boolean;
  decision: Decision;
  evidenceLevel: EvidenceLevel;
  severity: Severity;
  reasons: string[];
  allowedActions: string[];
  blockedActions: string[];
  rawDataStored: false;
  sourceUrl: string | null;
  urlFlags: UrlFlags | null;
  hibp: HibpInfo | null;
  boundary: {
    statement: string;
    darkWebCrawlingEnabled: boolean;
    torAutomationEnabled: boolean;
    rawDataStorageEnabled: boolean;
  };
  error?: string;
};

type HistoryItem = {
  id: string;
  source_url: string | null;
  owner: string | null;
  legal_purpose: string | null;
  decision: string;
  evidence_level: string;
  severity: string;
  reasons: string[];
  hibp_checked: boolean;
  hibp_breach_count: number | null;
  hibp_elevated_evidence: boolean;
  raw_data_stored: boolean;
  created_at: string;
};

const DECISION_STYLES: Record<Decision, string> = {
  BLOCK: 'bg-red-500/20 text-red-300 border-red-500/40',
  REVIEW: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  INCIDENT_REPORT_ALLOWED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

const SEVERITY_STYLES: Record<Severity, string> = {
  LOW: 'text-slate-400',
  MEDIUM: 'text-amber-400',
  HIGH: 'text-orange-400',
  CRITICAL: 'text-red-400',
};

const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  L0: 'L0 — No evidence',
  L1: 'L1 — Source / owner name',
  L2: 'L2 — Masked samples or hashes',
  L3: 'L3 — Owner confirmed',
  L4: 'L4 — Provider / internal log confirmed',
};

function formatDate(v: string) {
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function decisionBadge(decision: string) {
  const s =
    decision === 'BLOCK' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
    decision === 'REVIEW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
  return <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${s}`}>{decision}</span>;
}

export default function BreachSignalPage() {
  const [tab, setTab] = useState<'evaluate' | 'history'>('evaluate');

  // Form state
  const [sourceUrl, setSourceUrl] = useState('');
  const [owner, setOwner] = useState('');
  const [legalPurpose, setLegalPurpose] = useState('');
  const [sourceCategory, setSourceCategory] = useState('breach-signal');
  const [claimedDataTypes, setClaimedDataTypes] = useState('');
  const [maskedSamples, setMaskedSamples] = useState('');
  const [hashes, setHashes] = useState('');
  const [networkRoute, setNetworkRoute] = useState<'standard' | 'tor' | 'unknown'>('standard');
  const [rawDataIncluded, setRawDataIncluded] = useState(false);
  const [fullDumpIncluded, setFullDumpIncluded] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [requiresDownload, setRequiresDownload] = useState(false);
  const [autonomousAgentAccess, setAutonomousAgentAccess] = useState(false);
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);
  const [providerConfirmed, setProviderConfirmed] = useState(false);
  const [internalLogConfirmed, setInternalLogConfirmed] = useState(false);

  // Auto-detect from URL
  function handleUrlChange(val: string) {
    setSourceUrl(val);
    if (!val.trim()) return;
    try {
      const u = new URL(val.trim().startsWith('http') ? val.trim() : `http://${val.trim()}`);
      if (u.hostname.endsWith('.onion')) setNetworkRoute('tor');
      const full = u.href;
      if (/login|signin|auth\b|account|members/i.test(full)) setRequiresLogin(true);
      if (/download|\.zip$|\.tar$|\.rar$|\.sql$/i.test(full)) setRequiresDownload(true);
      if (!owner && u.hostname) setOwner(u.hostname.replace(/^www\./, ''));
    } catch { /* invalid URL — skip */ }
  }

  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // History state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch('/api/dsg/breach-signal/history?limit=50', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setHistoryError(data.error ?? `HTTP ${res.status}`);
      } else {
        setHistory(data.items ?? []);
      }
    } catch (err) {
      setHistoryError(String(err));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setApiError('');
    setResult(null);

    const body = {
      sourceUrl: sourceUrl || undefined,
      owner: owner || undefined,
      legalPurpose: legalPurpose || undefined,
      sourceCategory: sourceCategory || undefined,
      claimedDataTypes: claimedDataTypes
        ? claimedDataTypes.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      maskedSamples: maskedSamples
        ? maskedSamples.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined,
      hashes: hashes
        ? hashes.split('\n').map((s) => s.trim()).filter(Boolean)
        : undefined,
      networkRoute,
      rawDataIncluded: rawDataIncluded || undefined,
      fullDumpIncluded: fullDumpIncluded || undefined,
      requiresLogin: requiresLogin || undefined,
      requiresPayment: requiresPayment || undefined,
      requiresDownload: requiresDownload || undefined,
      autonomousAgentAccess: autonomousAgentAccess || undefined,
      ownerConfirmed: ownerConfirmed || undefined,
      providerConfirmed: providerConfirmed || undefined,
      internalLogConfirmed: internalLogConfirmed || undefined,
    };

    try {
      const res = await fetch('/api/dsg/breach-signal/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      const data: EvaluationResult = await res.json();
      if (!res.ok || !data.ok) {
        setApiError(data.error ?? `HTTP ${res.status}`);
      } else {
        setResult(data);
        // Sync auto-detected flags back to form
        if (data.urlFlags) {
          setNetworkRoute(data.urlFlags.networkRoute);
          if (data.urlFlags.requiresLogin) setRequiresLogin(true);
          if (data.urlFlags.requiresDownload) setRequiresDownload(true);
        }
      }
    } catch (err) {
      setApiError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Breach Signal Evaluation</h1>
          <p className="mt-1 text-sm text-slate-400">
            DSG responsible-disclosure intake gate — deterministic, sandboxed, no raw data stored.
          </p>
        </div>
        <div className="flex gap-2">
          {(['evaluate', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'rounded-xl border px-4 py-2 text-sm font-semibold transition-colors capitalize',
                tab === t
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-slate-100',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'evaluate' && (
        <div className="grid gap-8 lg:grid-cols-2">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* URL with auto-detect */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Source URL <span className="text-slate-600 normal-case">(auto-detects Tor / login / download)</span>
              </h2>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://example.com/breach or http://xyz.onion/dump"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
              />
              {sourceUrl && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className={`rounded-lg px-2 py-0.5 ${networkRoute === 'tor' ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                    route: {networkRoute}
                  </span>
                  {requiresLogin && <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-amber-300">login detected</span>}
                  {requiresDownload && <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-amber-300">download detected</span>}
                </div>
              )}
            </div>

            {/* Signal Metadata */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Signal Metadata</h2>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-400">Owner domain</span>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="example.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-400">Legal purpose</span>
                  <input
                    type="text"
                    value={legalPurpose}
                    onChange={(e) => setLegalPurpose(e.target.value)}
                    placeholder="owner_notification"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-400">Claimed data types (comma-separated)</span>
                  <input
                    type="text"
                    value={claimedDataTypes}
                    onChange={(e) => setClaimedDataTypes(e.target.value)}
                    placeholder="email, hashed_password, api_key"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-400">Masked samples (one per line)</span>
                  <textarea
                    value={maskedSamples}
                    onChange={(e) => setMaskedSamples(e.target.value)}
                    placeholder={'som***@example.com\nsk_live_****a91f'}
                    rows={2}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-400">Hashes (one per line)</span>
                  <textarea
                    value={hashes}
                    onChange={(e) => setHashes(e.target.value)}
                    placeholder="sha256:abc123..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
                  />
                </label>
                <div>
                  <span className="mb-1 block text-xs text-slate-400">Network route</span>
                  <div className="flex gap-3">
                    {(['standard', 'tor', 'unknown'] as const).map((route) => (
                      <label key={route} className="flex cursor-pointer items-center gap-1.5">
                        <input type="radio" name="networkRoute" value={route} checked={networkRoute === route} onChange={() => setNetworkRoute(route)} className="accent-emerald-400" />
                        <span className="text-xs text-slate-300">{route}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Risk flags + Confirmation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Risk Flags</h2>
                <div className="space-y-2">
                  {[
                    ['Raw data included', rawDataIncluded, setRawDataIncluded],
                    ['Full dump included', fullDumpIncluded, setFullDumpIncluded],
                    ['Requires login', requiresLogin, setRequiresLogin],
                    ['Requires payment', requiresPayment, setRequiresPayment],
                    ['Requires download', requiresDownload, setRequiresDownload],
                    ['Autonomous agent access', autonomousAgentAccess, setAutonomousAgentAccess],
                  ].map(([label, value, setter]) => (
                    <label key={label as string} className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={value as boolean} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} className="accent-red-400" />
                      <span className="text-xs text-slate-300">{label as string}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Confirmation</h2>
                <div className="space-y-2">
                  {[
                    ['Owner confirmed', ownerConfirmed, setOwnerConfirmed],
                    ['Provider confirmed', providerConfirmed, setProviderConfirmed],
                    ['Internal log confirmed', internalLogConfirmed, setInternalLogConfirmed],
                  ].map(([label, value, setter]) => (
                    <label key={label as string} className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={value as boolean} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} className="accent-emerald-400" />
                      <span className="text-xs text-slate-300">{label as string}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? 'Evaluating…' : 'Evaluate Signal'}
            </button>
          </form>

          {/* Result panel */}
          <div className="space-y-4">
            {apiError && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                <strong>Error:</strong> {apiError}
              </div>
            )}

            {!result && !apiError && !loading && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
                Submit a signal to see the evaluation result.
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Decision header */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Decision</p>
                      <span className={`inline-block rounded-xl border px-3 py-1 text-base font-bold ${DECISION_STYLES[result.decision]}`}>
                        {result.decision}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Severity</p>
                      <p className={`font-bold ${SEVERITY_STYLES[result.severity]}`}>{result.severity}</p>
                    </div>
                    <div className="text-right">
                      <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Evidence</p>
                      <p className="text-sm font-bold text-slate-300">{result.evidenceLevel}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{EVIDENCE_LABELS[result.evidenceLevel]}</p>
                </div>

                {/* URL flags */}
                {result.urlFlags && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Auto-detected from URL</h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {result.urlFlags.detectedDomain && (
                        <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-slate-300">domain: {result.urlFlags.detectedDomain}</span>
                      )}
                      <span className={`rounded-lg px-2 py-0.5 ${result.urlFlags.networkRoute === 'tor' ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                        route: {result.urlFlags.networkRoute}
                      </span>
                      {result.urlFlags.requiresLogin && <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-amber-300">login required</span>}
                      {result.urlFlags.requiresDownload && <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-amber-300">download required</span>}
                    </div>
                  </div>
                )}

                {/* HIBP */}
                {result.hibp && (
                  <div className={`rounded-2xl border p-4 ${result.hibp.checked && result.hibp.breachCount > 0 ? 'border-orange-500/40 bg-orange-500/10' : 'border-slate-800 bg-slate-900'}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">HIBP Check</h3>
                      {result.hibp.checked ? (
                        <span className={`text-xs font-bold ${result.hibp.breachCount > 0 ? 'text-orange-300' : 'text-emerald-400'}`}>
                          {result.hibp.breachCount > 0 ? `${result.hibp.breachCount} breach${result.hibp.breachCount > 1 ? 'es' : ''} found` : 'No known breaches'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">{result.hibp.skipReason ?? 'skipped'}</span>
                      )}
                    </div>
                    {result.hibp.elevatedEvidence && (
                      <p className="mt-1 text-xs text-orange-300">HIBP confirmed — evidence elevated to provider-confirmed level</p>
                    )}
                    {result.hibp.breaches.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {result.hibp.breaches.slice(0, 5).map((b) => (
                          <li key={b.name} className="text-xs text-slate-300">
                            <span className="font-medium text-white">{b.title}</span>
                            <span className="ml-1 text-slate-500">({b.breachDate})</span>
                            <span className="ml-1 text-slate-500">— {b.dataClasses.slice(0, 3).join(', ')}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Reasons */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Reasons</h3>
                  {result.reasons.length === 0 ? (
                    <p className="text-xs text-slate-500">—</p>
                  ) : (
                    <ul className="space-y-1">
                      {result.reasons.map((r) => <li key={r} className="text-xs text-slate-300">• {r}</li>)}
                    </ul>
                  )}
                </div>

                {/* Allowed / Blocked */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-emerald-900/40 bg-emerald-900/10 p-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">Allowed</h3>
                    <ul className="space-y-1">
                      {result.allowedActions.map((a) => <li key={a} className="text-xs text-emerald-300">✓ {a}</li>)}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-red-900/40 bg-red-900/10 p-4">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">Blocked</h3>
                    <ul className="space-y-1">
                      {result.blockedActions.map((a) => <li key={a} className="text-xs text-red-300">✗ {a}</li>)}
                    </ul>
                  </div>
                </div>

                {/* Boundary */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Safety Boundary</p>
                  <p className="mt-1 text-xs text-slate-400">{result.boundary.statement}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-slate-400">rawDataStored: false</span>
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-slate-400">darkWebCrawling: false</span>
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-slate-400">torAutomation: false</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">Last 50 evaluations — stored in DB with audit trail.</p>
            <button
              onClick={loadHistory}
              disabled={historyLoading}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-50"
            >
              {historyLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {historyError && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
              {historyError}
            </div>
          )}

          {!historyError && history.length === 0 && !historyLoading && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-500">
              No evaluations recorded yet. Submit a signal to start the audit trail.
            </div>
          )}

          {history.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900">
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">Owner</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">Source URL</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">Decision</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">Severity</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">Evidence</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-400">HIBP</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800/50 bg-slate-950 hover:bg-slate-900/50">
                      <td className="px-4 py-3 text-slate-400">{formatDate(item.created_at)}</td>
                      <td className="px-4 py-3 text-slate-300">{item.owner ?? '—'}</td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-slate-400" title={item.source_url ?? ''}>
                        {item.source_url ?? '—'}
                      </td>
                      <td className="px-4 py-3">{decisionBadge(item.decision)}</td>
                      <td className={`px-4 py-3 font-semibold ${SEVERITY_STYLES[item.severity as Severity] ?? 'text-slate-300'}`}>
                        {item.severity}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{item.evidence_level}</td>
                      <td className="px-4 py-3">
                        {item.hibp_checked ? (
                          <span className={item.hibp_breach_count ? 'text-orange-300' : 'text-emerald-400'}>
                            {item.hibp_breach_count ? `${item.hibp_breach_count} breaches` : 'clean'}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
