import type { StreamConsoleMessage } from '../../lib/runtime/dashboard-contract';

type StreamConsoleProps = {
  messages: StreamConsoleMessage[];
};

const kindClass: Record<StreamConsoleMessage['kind'], string> = {
  intent: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
  approval: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100',
  decision: 'border-violet-500/30 bg-violet-500/10 text-violet-100',
  tool_call: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  tool_result: 'border-orange-500/30 bg-orange-500/10 text-orange-100',
  effect: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  memory_write: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-100',
  alert: 'border-red-500/30 bg-red-500/10 text-red-100',
};

export default function StreamConsole({ messages }: StreamConsoleProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-lg font-semibold text-slate-100">Stream Console</h2>
      <p className="mt-1 text-sm text-slate-400">Recent runtime events from approvals, effects, and ledger.</p>
      <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">No events yet.</div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={`rounded-xl border p-3 ${kindClass[message.kind]}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
                <span>{message.kind}</span>
                <span>•</span>
                <span>{new Date(message.created_at).toLocaleString()}</span>
                {message.request_id ? (
                  <>
                    <span>•</span>
                    <span>{message.request_id}</span>
                  </>
                ) : null}
              </div>
              <h3 className="mt-1 text-sm font-semibold">{message.title}</h3>
              {message.body ? <p className="mt-1 text-xs opacity-90">{message.body}</p> : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
