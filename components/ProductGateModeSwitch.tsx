'use client';

import { useEffect, useMemo, useState } from 'react';

type GateMode = 'audit_only' | 'enforce_gate';

type GateModeResponse = {
  gate_mode?: GateMode;
  persisted?: boolean;
  updated_at?: string | null;
  error?: string;
};

const OPTIONS: Array<{ mode: GateMode; label: string; helper: string }> = [
  {
    mode: 'audit_only',
    label: 'Audit only',
    helper: 'Records decision/evidence but does not block real actions yet',
  },
  {
    mode: 'enforce_gate',
    label: 'Enforce gate',
    helper: 'Actively inspects and halts actions when the gate does not return ALLOW',
  },
];

function formatTime(value?: string | null) {
  if (!value) return 'not saved yet';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ProductGateModeSwitch() {
  const [mode, setMode] = useState<GateMode>('audit_only');
  const [persisted, setPersisted] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<GateMode | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function loadMode() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/product/gate-mode', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as GateModeResponse;
        if (!alive) return;

        if (!response.ok) {
          setError(payload.error || 'Unable to load gate mode');
          return;
        }

        if (payload.gate_mode === 'audit_only' || payload.gate_mode === 'enforce_gate') {
          setMode(payload.gate_mode);
        }
        setPersisted(Boolean(payload.persisted));
        setUpdatedAt(payload.updated_at || null);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Unable to load gate mode');
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadMode();
    return () => {
      alive = false;
    };
  }, []);

  const activeOption = useMemo(() => OPTIONS.find((option) => option.mode === mode), [mode]);

  async function saveMode(nextMode: GateMode) {
    if (saving || nextMode === mode) return;

    const previousMode = mode;
    setMode(nextMode);
    setSaving(nextMode);
    setError('');

    try {
      const response = await fetch('/api/product/gate-mode', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gate_mode: nextMode }),
      });
      const payload = (await response.json().catch(() => ({}))) as GateModeResponse;

      if (!response.ok) {
        setMode(previousMode);
        setError(payload.error || 'Unable to save gate mode');
        return;
      }

      if (payload.gate_mode === 'audit_only' || payload.gate_mode === 'enforce_gate') {
        setMode(payload.gate_mode);
      }
      setPersisted(Boolean(payload.persisted));
      setUpdatedAt(payload.updated_at || null);
    } catch (err) {
      setMode(previousMode);
      setError(err instanceof Error ? err.message : 'Unable to save gate mode');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="border border-white/10 bg-[#0d0f12] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Step 4 live backend switch</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Customer choice: Audit only or Enforce gate</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            This value is read/saved via <code className="rounded bg-black/30 px-1 py-0.5 text-amber-100">/api/product/gate-mode</code> and is bound to the logged-in user&apos;s org.
          </p>
        </div>

        <div className="flex rounded-full border border-white/10 bg-black/30 p-1">
          {OPTIONS.map((option) => {
            const active = option.mode === mode;
            return (
              <button
                key={option.mode}
                type="button"
                disabled={loading || Boolean(saving)}
                onClick={() => saveMode(option.mode)}
                className={[
                  'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition',
                  active
                    ? option.mode === 'audit_only'
                      ? 'bg-amber-300 text-slate-950'
                      : 'bg-emerald-300 text-slate-950'
                    : 'text-slate-300 hover:text-white',
                  loading || saving ? 'cursor-wait opacity-70' : '',
                ].join(' ')}
              >
                {saving === option.mode ? 'Saving...' : option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {OPTIONS.map((option) => (
          <div
            key={option.mode}
            className={[
              'border p-4 text-sm leading-7',
              option.mode === mode
                ? option.mode === 'audit_only'
                  ? 'border-amber-300/30 bg-amber-300/10 text-amber-50'
                  : 'border-emerald-300/30 bg-emerald-400/10 text-emerald-50'
                : 'border-white/10 bg-black/20 text-slate-300',
            ].join(' ')}
          >
            <p className="font-semibold text-white">{option.label}</p>
            <p className="mt-2">{option.helper}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 border border-white/10 bg-black/20 p-3 text-xs leading-6 text-slate-400">
        Current mode: <span className="font-semibold text-white">{activeOption?.label || mode}</span> · saved:{' '}
        <span className={persisted ? 'text-emerald-200' : 'text-amber-200'}>{persisted ? 'yes' : 'fallback/default'}</span> · updated:{' '}
        <span className="text-slate-200">{formatTime(updatedAt)}</span>
      </div>

      {error ? (
        <div className="mt-4 border border-red-400/25 bg-red-500/10 p-3 text-sm leading-7 text-red-100">
          {error === 'database_migration_required'
            ? 'Database migration has not been applied in Supabase: run the agent_gate_settings migration first before the switch can be saved'
            : error}
        </div>
      ) : null}
    </div>
  );
}
