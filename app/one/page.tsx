'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const EXAMPLES = [
  'Deploy the latest verified version to production',
  'Deploy a preview of this branch',
  'Push this branch and open a pull request',
  'Apply the pending database migration',
];

/**
 * Run — the home screen.
 *
 * One field. The user says what they want; DSG compiles it into a plan and
 * takes them to the approval. Everything else in the product hangs off this.
 */
export default function RunPage() {
  const router = useRouter();
  const [intent, setIntent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<string[] | null>(null);

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);
    setSupported(null);

    try {
      const response = await fetch('/api/dsg/v1/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          intent: trimmed,
          surface: 'api',
          // The browser surface can reach the systems the org has connected
          // through the control plane's own integrations.
          connectedSystems: ['github', 'vercel', 'supabase'],
          auditAvailable: true,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload.message || payload.error || 'Could not build a plan for that.');
        if (Array.isArray(payload.supportedIntents)) {
          setSupported(payload.supportedIntents.map((item: { example: string }) => item.example));
        }
        return;
      }

      router.push(`/one/runs/${payload.run.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach DSG.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pt-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        What do you want your agent to do?
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        DSG turns it into a plan you approve once, then proves every action matched it.
      </p>

      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(intent);
        }}
      >
        <label htmlFor="intent" className="sr-only">
          What do you want your agent to do?
        </label>
        <div className="flex gap-2">
          <input
            id="intent"
            name="intent"
            type="text"
            autoComplete="off"
            autoFocus
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            placeholder="Deploy the latest verified version to production"
            disabled={busy}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || intent.trim().length === 0}
            className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Planning…' : 'Plan'}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <div className="mt-8">
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {supported ? 'Supported today' : 'Try'}
        </p>
        <ul className="mt-3 space-y-2">
          {(supported ?? EXAMPLES).map((example) => (
            <li key={example}>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setIntent(example);
                  void submit(example);
                }}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2.5 text-left text-sm text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-900 disabled:opacity-50"
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
