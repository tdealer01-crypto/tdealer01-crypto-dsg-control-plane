'use client';

import type { StreamConsoleMessage } from '../../lib/runtime/dashboard-contract';

const toneByKind: Record<StreamConsoleMessage['kind'], string> = {
  intent: 'border-sky-500/20 bg-sky-500/10 text-sky-200',
  approval: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
  decision: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200',
  tool_call: 'border-violet-500/20 bg-violet-500/10 text-violet-200',
  tool_result: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200',
  effect: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  memory_write: 'border-orange-500/20 bg-orange-500/10 text-orange-200',
  alert: 'border-red-500/20 bg-red-500/10 text-red-200',
};

export function StreamConsole({ items }: { items: StreamConsoleMessage[] }) {
  return (
    <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-neutral-500">
          No runtime events yet.
        </div>
      ) : null}

      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-white/10 bg-black/25 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] ${toneByKind[item.kind]}`}
                >
                  {item.kind.replace('_', ' ')}
                </span>

                {item.sequence !== undefined ? (
                  <span className="text-xs text-neutral-500">seq {item.sequence}</span>
                ) : null}

                {item.request_id ? (
                  <span className="text-xs text-neutral-500">req {item.request_id}</span>
                ) : null}
              </div>

              <div className="mt-3 text-sm font-medium text-white">{item.title}</div>

              {item.body ? (
                <div className="mt-1 text-sm text-neutral-400">{item.body}</div>
              ) : null}
            </div>

            <div className="shrink-0 text-xs text-neutral-500">
              {new Date(item.created_at).toLocaleTimeString()}
            </div>
          </div>

          {item.meta ? (
            <details className="mt-3 rounded-2xl bg-white/5 p-3">
              <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-neutral-400">
                meta
              </summary>
              <pre className="mt-3 overflow-x-auto text-xs text-neutral-300">
                {JSON.stringify(item.meta, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ))}
    </div>
  );
}
