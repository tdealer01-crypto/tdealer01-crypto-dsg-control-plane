import { getDsgActionLayerSnapshot } from '@/lib/dsg/action-layer/multi-flow-orchestrator';

const navItems = [
  { icon: '▣', label: 'Command Center', active: true },
  { icon: '◌', label: 'Live Reasoning', active: false },
  { icon: '⚖', label: 'Governance Vault', active: false },
  { icon: '⌁', label: 'Telemetry', active: false },
];

const quickActions = [
  {
    icon: '⬟',
    title: 'Governance Audit',
    body: 'Run comprehensive compliance check across all active DSG nodes.',
  },
  {
    icon: '⌁',
    title: 'Market Analysis',
    body: 'Deploy deterministic agent for real-time sector volatility assessment.',
  },
  {
    icon: '▦',
    title: 'Process Automation',
    body: 'Generate executable workflows for pending operational tasks.',
  },
];

export default function DsgActionLayerPage() {
  const snapshot = getDsgActionLayerSnapshot();
  const guardrails = snapshot.lanes.slice(0, 4);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#121414] text-[#e2e2e2]">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#4d4635] bg-[#121414] px-5 md:px-16">
        <span className="font-serif text-2xl font-black uppercase tracking-tight text-[#f2ca50] md:text-[32px]">DSG Governance</span>
        <div className="flex items-center gap-6 text-[#d0c5af]" aria-label="system actions">
          <span aria-label="notifications">♧</span>
          <span aria-label="settings">⚙</span>
          <span aria-label="account">◎</span>
        </div>
      </header>

      <nav className="fixed left-0 top-16 hidden h-[calc(100vh-64px)] w-64 flex-col border-r border-[#4d4635] bg-[#1e2020] md:flex">
        <div className="p-6">
          <h2 className="font-serif text-2xl font-bold text-[#f2ca50]">Agent Nexus</h2>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.22em] text-[#d0c5af]">Precision Execution</p>
        </div>
        <ul className="mt-4 flex flex-grow flex-col gap-2 px-4">
          {navItems.map((item) => (
            <li key={item.label}>
              <div
                className={`flex items-center gap-3 rounded px-3 py-3 transition-all duration-200 ${
                  item.active
                    ? 'border-r-2 border-[#f2ca50] bg-[#333535]/50 text-[#f2ca50]'
                    : 'text-[#d0c5af] hover:translate-x-1 hover:bg-[#383939] hover:text-[#e2e2e2]'
                }`}
              >
                <span className="font-mono text-lg">{item.icon}</span>
                <span className="text-base">{item.label}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-[#4d4635] p-4">
          <div className="flex items-center gap-3 rounded p-3 text-[#d0c5af] transition-all duration-200 hover:translate-x-1 hover:bg-[#383939] hover:text-[#e2e2e2]">
            <span className="font-mono">▤</span>
            <span>System Status</span>
          </div>
        </div>
      </nav>

      <section className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto px-5 pt-16 md:pl-64 md:pr-16">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-2 flex items-center gap-2">
            <div className="size-2 animate-pulse rounded-full bg-[#a40213]" />
            <span className="font-mono text-xs uppercase tracking-[0.28em] text-[#ffb3ac]">Live Execution Capacity</span>
          </div>
          <div className="font-serif text-5xl font-black tracking-tighter text-[#e2e2e2] md:text-[64px]">
            {snapshot.liveExecutionCapacity.slice(0, 5)}<span className="text-[#99907c]">.00</span>
          </div>
          <div className="relative mt-4 h-1 w-48 overflow-hidden rounded-full bg-[#333535]">
            <div className="absolute left-0 top-0 h-full w-full animate-pulse bg-gradient-to-r from-[#a40213] to-[#d4af37]" />
          </div>
        </div>

        <div className="relative mb-16 w-full max-w-3xl">
          <h1 className="mb-4 font-serif text-2xl font-semibold text-[#e2e2e2] md:text-[32px]">Assign Enterprise Task</h1>
          <div className="relative rounded-lg border border-[#4d4635] bg-[#121414] p-1 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-colors duration-300 focus-within:border-[#d4af37]">
            <div className="pointer-events-none absolute inset-0 rounded-lg bg-white/5 backdrop-blur-md" />
            <textarea
              className="relative z-10 h-32 w-full resize-none border-0 bg-transparent p-4 text-lg leading-7 text-[#e2e2e2] placeholder:text-[#d0c5af]/50 focus:ring-0"
              placeholder="Enter command parameters for deterministic multi-flow execution..."
            />
            <div className="relative z-10 mt-2 flex items-center justify-between border-t border-[#4d4635]/50 p-2">
              <div className="flex gap-2">
                <button className="p-2 text-[#d0c5af] transition-colors hover:text-[#f2ca50]" aria-label="Attach file">⌕</button>
                <button className="p-2 text-[#d0c5af] transition-colors hover:text-[#f2ca50]" aria-label="Voice input">♬</button>
              </div>
              <button className="flex items-center gap-2 rounded border border-transparent bg-[#d4af37] px-6 py-2 font-mono text-xs uppercase tracking-[0.16em] text-[#554300] shadow-[0_0_10px_rgba(212,175,55,0.2)] transition-all hover:brightness-110">
                <span>Execute</span>
                <span>▷</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid w-full max-w-4xl grid-cols-1 gap-1 rounded-xl bg-[#4d4635]/30 p-1 md:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-lg border border-transparent bg-[#121414] p-6 text-left transition-all hover:border-[#d4af37]/50"
            >
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-[#f2ca50]/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div>
                <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-[#333535] text-[#f2ca50] transition-colors group-hover:bg-[#f2ca50]/10">
                  {action.icon}
                </div>
                <h3 className="mb-2 text-lg text-[#e2e2e2]">{action.title}</h3>
                <p className="line-clamp-2 font-mono text-xs leading-5 tracking-[0.08em] text-[#d0c5af]">{action.body}</p>
              </div>
              <div className="mt-4 flex translate-y-2 items-center gap-2 text-[#f2ca50] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <span className="font-mono text-xs uppercase tracking-[0.14em]">Initiate</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 grid w-full max-w-4xl gap-4 pb-24 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-[#4d4635] bg-[#1a1c1c] p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[#4d4635] pb-3">
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#f2ca50]">Live Stream</span>
              <span className="font-mono text-xs text-[#d0c5af]">{snapshot.claim}</span>
            </div>
            <div className="space-y-3 font-mono text-xs leading-6 text-[#d0c5af]">
              {snapshot.recentActions.map((action) => (
                <p key={action.actionId}>
                  <span className="text-[#f2ca50]">[{action.flow}]</span> {action.intent} → {action.status} · {action.proofHash.slice(0, 14)}...
                </p>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-[#4d4635] bg-[#1a1c1c] p-5">
              <div className="font-mono text-xs uppercase tracking-[0.22em] text-[#f2ca50]">Policy Guardrails</div>
              <div className="mt-5 space-y-4">
                {guardrails.map((lane) => (
                  <div key={lane.id} className="rounded border border-[#4d4635] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-xs uppercase tracking-[0.14em]">{lane.label}</span>
                      <span className="rounded border border-[#d4af37] px-2 py-1 font-mono text-[10px] text-[#f2ca50]">{lane.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-[#d0c5af]">{lane.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#4d4635] bg-[#1a1c1c] p-5">
              <div className="font-mono text-xs uppercase tracking-[0.22em] text-[#f2ca50]">Build Authorization</div>
              <p className="mt-4 text-sm leading-6 text-[#d0c5af]">
                Review deterministic multi-flow proof, route status, and generated action timeline before promotion.
              </p>
              <button className="mt-5 w-full rounded bg-[#a40213] px-5 py-3 font-mono text-xs uppercase tracking-[0.16em] text-white transition-all hover:brightness-110">
                Final Approval
              </button>
              <button className="mt-3 w-full rounded border border-[#4d4635] px-5 py-3 font-mono text-xs uppercase tracking-[0.16em] text-[#d0c5af] transition-all hover:border-[#d4af37] hover:text-[#f2ca50]">
                Reject & Log Notes
              </button>
            </div>
          </aside>
        </div>

        <nav className="fixed bottom-8 z-50 flex justify-center bg-transparent px-5 md:hidden">
          <div className="flex items-center gap-2 rounded-full bg-[#f2ca50] px-6 py-3 font-mono text-xs uppercase tracking-[0.14em] text-[#3c2f00] shadow-xl transition-transform hover:scale-105">
            <span>ϟ</span>
            <span>Command Bar</span>
          </div>
        </nav>
      </section>
    </main>
  );
}
