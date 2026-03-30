'use client';

import type { StreamConsoleMessage } from '../../lib/runtime/dashboard-contract';

type StreamConsoleProps = {
  items: StreamConsoleMessage[];
};

export function StreamConsole({ items }: StreamConsoleProps) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-neutral-500">
        No live stream events yet.
      </div>
    );
  }

  return (
    <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-neutral-100">{item.title}</div>
            <div className="text-xs text-neutral-500">{new Date(item.created_at).toLocaleTimeString()}</div>
          </div>
          <div className="mt-2 text-sm text-neutral-300">{item.body}</div>
          {item.request_id ? <div className="mt-2 text-xs text-neutral-500">request: {item.request_id}</div> : null}
        </div>
      ))}
    </div>
  );
}
