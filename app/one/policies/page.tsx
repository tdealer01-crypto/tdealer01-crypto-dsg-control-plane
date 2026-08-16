'use client';

import { useEffect, useState } from 'react';

interface ManifestConstraint {
  constraintId: string;
  name: string;
  severity: string;
  message: string;
}

interface Manifest {
  policyRef?: string;
  policyVersion?: string;
  constraintSetHash?: string;
  constraints?: ManifestConstraint[];
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'border-red-500/30 bg-red-500/10 text-red-300',
  high: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  medium: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  low: 'border-slate-600 bg-slate-800 text-slate-300',
};

/**
 * Policies — what the org allows, and the active policy version.
 *
 * Read-only by design: this screen exists so the user can see what the gate
 * checks before approving a plan, not to become a second policy editor.
 */
export default function PoliciesPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/dsg/v1/policies/manifest', { cache: 'no-store' })
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => {
        if (!alive) return;
        if (!ok) throw new Error(payload.error || 'Could not load the policy manifest.');
        setManifest(payload.manifest ?? payload);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load policies.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const constraints = manifest?.constraints ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold">Policies</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every plan step is checked against these before it may run.
      </p>

      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && <p className="mt-6 text-sm text-slate-400">Loading…</p>}

      {manifest && (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Policy</dt>
              <dd className="mt-0.5 text-slate-200">{manifest.policyRef ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Version</dt>
              <dd className="mt-0.5 text-slate-200">{manifest.policyVersion ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Constraint set</dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-slate-300">
                {manifest.constraintSetHash
                  ? `${manifest.constraintSetHash.slice(0, 8)}…`
                  : '—'}
              </dd>
            </div>
          </dl>

          <ul className="mt-4 space-y-2">
            {constraints.map((constraint) => (
              <li
                key={constraint.constraintId}
                className="flex items-start gap-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">{constraint.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{constraint.message}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
                    SEVERITY_STYLE[constraint.severity] ?? SEVERITY_STYLE.low
                  }`}
                >
                  {constraint.severity}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            An undecidable check is never treated as a pass. Low-risk steps fall back to human
            review; anything above that is blocked.
          </p>
        </>
      )}
    </div>
  );
}
