'use client';

import { useState } from 'react';

type Decision = 'BLOCK' | 'REVIEW' | 'INCIDENT_REPORT_ALLOWED';
type EvidenceLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type EvaluationResult = {
  ok: boolean;
  type: string;
  decision: Decision;
  evidenceLevel: EvidenceLevel;
  severity: Severity;
  reasons: string[];
  allowedActions: string[];
  blockedActions: string[];
  rawDataStored: false;
  boundary: {
    statement: string;
    darkWebCrawlingEnabled: boolean;
    torAutomationEnabled: boolean;
    rawDataStorageEnabled: boolean;
  };
  error?: string;
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
  L1: 'L1 — Source category / owner name only',
  L2: 'L2 — Masked samples or hashes present',
  L3: 'L3 — Owner confirmed',
  L4: 'L4 — Provider or internal log confirmed',
};

export default function BreachSignalPage() {
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

  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setApiError('');
    setResult(null);

    const body = {
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
      }
    } catch (err) {
      setApiError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Breach Signal Evaluation</h1>
        <p className="mt-1 text-sm text-slate-400">
          DSG responsible-disclosure intake gate. No raw data is stored. Evaluation is deterministic and sandboxed.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Signal Metadata</h2>

            <label className="block">
              <span className="mb-1 block text-xs text-slate-400">Owner domain / identifier</span>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="example.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-slate-400">Legal purpose</span>
              <input
                type="text"
                value={legalPurpose}
                onChange={(e) => setLegalPurpose(e.target.value)}
                placeholder="owner_notification"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-slate-400">Source category</span>
              <input
                type="text"
                value={sourceCategory}
                onChange={(e) => setSourceCategory(e.target.value)}
                placeholder="breach-signal"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-slate-400">Claimed data types (comma-separated)</span>
              <input
                type="text"
                value={claimedDataTypes}
                onChange={(e) => setClaimedDataTypes(e.target.value)}
                placeholder="email, hashed_password, api_key"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-slate-400">Masked samples (one per line)</span>
              <textarea
                value={maskedSamples}
                onChange={(e) => setMaskedSamples(e.target.value)}
                placeholder={'som***@example.com\nsk_live_****a91f'}
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
              />
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-slate-400">Hashes (one per line)</span>
              <textarea
                value={hashes}
                onChange={(e) => setHashes(e.target.value)}
                placeholder="sha256:abc123..."
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
              />
            </label>

            <div className="mt-3">
              <span className="mb-1 block text-xs text-slate-400">Network route</span>
              <div className="flex gap-3">
                {(['standard', 'tor', 'unknown'] as const).map((route) => (
                  <label key={route} className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="networkRoute"
                      value={route}
                      checked={networkRoute === route}
                      onChange={() => setNetworkRoute(route)}
                      className="accent-emerald-400"
                    />
                    <span className="text-xs text-slate-300">{route}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Risk Flags</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Raw data included', value: rawDataIncluded, set: setRawDataIncluded },
                { label: 'Full dump included', value: fullDumpIncluded, set: setFullDumpIncluded },
                { label: 'Requires login', value: requiresLogin, set: setRequiresLogin },
                { label: 'Requires payment', value: requiresPayment, set: setRequiresPayment },
                { label: 'Requires download', value: requiresDownload, set: setRequiresDownload },
                { label: 'Autonomous agent access', value: autonomousAgentAccess, set: setAutonomousAgentAccess },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => set(e.target.checked)}
                    className="accent-red-400"
                  />
                  <span className="text-xs text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Confirmation</h2>
            <div className="space-y-2">
              {[
                { label: 'Owner confirmed', value: ownerConfirmed, set: setOwnerConfirmed },
                { label: 'Provider confirmed', value: providerConfirmed, set: setProviderConfirmed },
                { label: 'Internal log confirmed', value: internalLogConfirmed, set: setInternalLogConfirmed },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => set(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  <span className="text-xs text-slate-300">{label}</span>
                </label>
              ))}
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
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Decision</p>
                    <span
                      className={`inline-block rounded-xl border px-3 py-1 text-base font-bold ${DECISION_STYLES[result.decision]}`}
                    >
                      {result.decision}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Severity</p>
                    <p className={`font-bold ${SEVERITY_STYLES[result.severity]}`}>{result.severity}</p>
                  </div>
                  <div className="text-right">
                    <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Evidence</p>
                    <p className="text-sm text-slate-300">{result.evidenceLevel}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">{EVIDENCE_LABELS[result.evidenceLevel]}</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Reasons</h3>
                {result.reasons.length === 0 ? (
                  <p className="text-xs text-slate-500">—</p>
                ) : (
                  <ul className="space-y-1">
                    {result.reasons.map((r) => (
                      <li key={r} className="text-xs text-slate-300">
                        • {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-900/40 bg-emerald-900/10 p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">Allowed Actions</h3>
                <ul className="space-y-1">
                  {result.allowedActions.map((a) => (
                    <li key={a} className="text-xs text-emerald-300">
                      ✓ {a}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-red-900/40 bg-red-900/10 p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-red-400">Blocked Actions</h3>
                <ul className="space-y-1">
                  {result.blockedActions.map((a) => (
                    <li key={a} className="text-xs text-red-300">
                      ✗ {a}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Safety Boundary</p>
                <p className="mt-1 text-xs text-slate-400">{result.boundary.statement}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-slate-400">
                    rawDataStored: {String(result.rawDataStored)}
                  </span>
                  <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-slate-400">
                    darkWebCrawling: {String(result.boundary.darkWebCrawlingEnabled)}
                  </span>
                  <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-slate-400">
                    torAutomation: {String(result.boundary.torAutomationEnabled)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
