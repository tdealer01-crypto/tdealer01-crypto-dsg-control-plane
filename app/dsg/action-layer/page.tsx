import { getDsgActionLayerSnapshot } from '@/lib/dsg/action-layer/multi-flow-orchestrator';

const navItems = [
  { icon: '⌘', label: 'Command Center', active: true },
  { icon: 'ψ', label: 'Live Reasoning', active: false },
  { icon: '⚖', label: 'Governance Vault', active: false },
  { icon: '⌁', label: 'Telemetry', active: false },
];

const quickActions = [
  {
    title: 'Force Protocol Resync',
    body: 'Realigns all lanes to the current governance baseline.',
  },
  {
    title: 'Generate Audit Path',
    body: 'Compiles the current proof stream into a short review path.',
  },
];

export default function DsgActionLayerPage() {
  const snapshot = getDsgActionLayerSnapshot();
  const recentActions = snapshot.recentActions.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#121414] text-[#e2e2e2] selection:bg-[#d4af37] selection:text-[#554300]">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#4d4635] bg-[#121414] px-5 md:px-16">
        <h1 className="font-serif text-2xl font-black uppercase tracking-tight text-[#f2ca50] md:text-[32px]">
          Aegis Governance
        </h1>
        <div className="flex items-center gap-4 text-[#d0c5af]" aria-label="system actions">
          <span aria-label="notifications" className="transition hover:text-[#f2ca50]">◉</span>
          <span aria-label="settings" className="transition hover:text-[#f2ca50]">⚙</span>
          <span aria-label="account" className="transition hover:text-[#f2ca50]">◎</span>
        </div>
      </header>

      <nav className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-64px)] w-64 flex-col justify-between border-r border-[#4d4635] bg-[#1e2020] py-6 md:flex">
        <div>
          <div className="px-6 pb-8">
            <h2 className="font-serif text-2xl font-semibold text-[#f2ca50]">Agent Nexus</h2>
            <p className="mt-1 text-base text-[#d0c5af]">Precision Execution</p>
          </div>
          <div className="flex flex-col gap-2 px-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center gap-3 px-4 py-3 text-base transition-all duration-200 hover:translate-x-1 hover:bg-[#383939] ${
                  item.active
                    ? 'rounded-l-lg border-r-2 border-[#f2ca50] bg-[#333535]/50 text-[#f2ca50]'
                    : 'rounded-lg text-[#d0c5af] hover:text-[#e2e2e2]'
                }`}
              >
                <span className="font-mono text-lg">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <div className="mt-auto border-t border-[#4d4635] px-4 pt-6">
          <a className="flex items-center gap-3 rounded-lg px-4 py-3 text-[#d0c5af] transition-all duration-200 hover:translate-x-1 hover:bg-[#383939] hover:text-[#e2e2e2]" href="#">
            <span className="font-mono">▤</span>
            System Status
          </a>
        </div>
      </nav>

      <nav className="fixed bottom-0 z-50 flex w-full justify-center bg-[#121414]/20 px-5 pb-8 backdrop-blur-md md:hidden">
        <button className="flex items-center gap-2 rounded-full bg-[#f2ca50] px-6 py-3 font-mono text-xs uppercase text-[#3c2f00] shadow-xl transition-transform duration-300 hover:scale-105">
          <span>ϟ</span>
          <span>Command Bar</span>
        </button>
      </nav>

      <section className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 gap-6 px-5 pb-24 pt-24 md:grid-cols-12 md:pl-[280px] md:pr-16">
        <section className="flex flex-col gap-6 md:col-span-8">
          <div className="mb-4 flex flex-col gap-4">
            <h2 className="font-serif text-5xl font-bold leading-[56px] tracking-[-0.02em] text-[#e2e2e2]">
              Command Center
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded border border-[#f2ca50] bg-[#121414] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.05em] text-[#f2ca50]">
                {snapshot.claim}
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-[#d0c5af]">
                | UPTIME: 99.999%
              </span>
            </div>
          </div>

          <div className="relative flex min-h-[500px] flex-1 flex-col overflow-hidden rounded-lg border border-[#4d4635] bg-[#121414]">
            <div className="flex items-center justify-between border-b border-[#4d4635] bg-[#1e2020] px-4 py-2">
              <span className="font-mono text-xs uppercase tracking-[0.05em] text-[#d0c5af]">root@dsg-one-v1:~# exec_core</span>
              <span className="text-[#d0c5af]">⌘</span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto p-6 pb-28 font-mono text-xs tracking-[0.05em] text-[#d0c5af]">
              <p className="text-[#f2ca50]">[SYS] Initializing DSG governance protocols...</p>
              <p>[AUTH] Verified runtime snapshot. Access granted.</p>
              <p className="mt-4">[EXEC] Commencing directive parsing engine.</p>
              <p>[LOG] Evaluating governance constraints against current action layer.</p>
              <p className="text-[#ffb4ab]">[WARN] Design input must remain reviewable until verified.</p>
              <p>[LOG] Production runtime preserved. Web design layer updated only.</p>
              <p className="mt-4 text-[#f2ca50]">&gt; Awaiting command input...</p>

              <div className="mt-8 border-t border-[#4d4635]/50 pt-4">
                <p className="mb-2 uppercase tracking-wider text-[#e2e2e2]">Active Execution Thread</p>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[#1e2020]">
                  <div className="h-full w-3/4 bg-gradient-to-r from-[#ffb4ab] to-[#f2ca50]" />
                </div>
              </div>

              <div className="mt-6 rounded border border-[#4d4635] bg-[#1a1c1c] p-4">
                <p className="mb-3 text-[#f2ca50]">[PROOF] Recent action stream</p>
                <div className="space-y-2">
                  {recentActions.map((action) => (
                    <p key={action.actionId}>
                      [{action.flow}] {action.intent} → {action.status}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 w-full border-t border-[#4d4635] bg-[#1e2020]/90 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-[#f2ca50]">&gt;</span>
                <input
                  className="w-full border-0 border-b border-[#4d4635] bg-transparent px-0 py-2 font-mono text-xs tracking-[0.05em] text-[#e2e2e2] outline-none transition-colors placeholder:text-[#99907c] focus:border-[#f2ca50] focus:ring-0"
                  placeholder="Enter high-speed directive..."
                  type="text"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {quickActions.map((action) => (
              <button key={action.title} className="group rounded-lg border border-[#4d4635] bg-[#1e2020] p-4 text-left transition-colors hover:border-[#f2ca50]">
                <h3 className="mb-1 text-base text-[#e2e2e2] transition-colors group-hover:text-[#f2ca50]">{action.title}</h3>
                <p className="font-mono text-xs leading-5 tracking-[0.05em] text-[#d0c5af]">{action.body}</p>
              </button>
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-6 md:col-span-4">
          <div className="flex h-full flex-col rounded-lg border border-[#4d4635] border-t-2 border-t-[#f2ca50] bg-[#1e2020]">
            <div className="flex items-center justify-between border-b border-[#4d4635] p-6">
              <div>
                <h3 className="font-serif text-2xl text-[#f2ca50]">Aegis AI</h3>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.05em] text-[#d0c5af]">Real-time Reasoning</p>
              </div>
              <span className="text-2xl text-[#f2ca50]">ψ</span>
            </div>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="mt-2 size-2 rounded-full bg-[#f2ca50]" />
                  <div className="mt-2 h-full w-px bg-[#4d4635]" />
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-[0.05em] text-[#f2ca50]">Analysis Complete</p>
                  <p className="text-base leading-relaxed text-[#e2e2e2]">
                    Runtime snapshot reports {snapshot.claim}. The visible page is safe to redesign without changing action-layer logic.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="mt-2 size-2 rounded-full bg-[#f2ca50]" />
                  <div className="mt-2 h-full w-px bg-[#4d4635]" />
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-[0.05em] text-[#f2ca50]">Action Formulated</p>
                  <p className="text-base leading-relaxed text-[#e2e2e2]">
                    Command Center layout now prioritizes terminal status, proof stream, quick actions, and reasoning review.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="mt-2 size-2 animate-pulse rounded-full border border-[#f2ca50] bg-transparent" />
                </div>
                <div>
                  <p className="mb-1 font-mono text-xs uppercase tracking-[0.05em] text-[#99907c]">Awaiting Confirmation</p>
                  <p className="text-base leading-relaxed text-[#d0c5af]">
                    Review PR preview and merge only after CI or Vercel confirms the page renders cleanly.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#4d4635] p-4">
              <button className="w-full rounded bg-[#f2ca50] py-3 text-base text-[#3c2f00] shadow-lg transition-colors hover:bg-[#d4af37]">
                Acknowledge Reasoning
              </button>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
