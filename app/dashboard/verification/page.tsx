const EDGE_CASES = Array.from({ length: 20 }, (_, index) => {
  const id = (index + 1).toString().padStart(2, '0');
  const isFailure = id === '07';

  return { id, isFailure };
});

export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-[#0d0e11] text-[#f7f6f9]">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-cyan-400/20 bg-[#0d0e11] px-6 shadow-[0_0_8px_rgba(0,229,255,0.15)]">
        <div className="flex items-center gap-8">
          <span className="font-mono text-xl font-bold tracking-tight text-[#00E5FF]">DSG ONE</span>
          <nav className="hidden items-center gap-6 md:flex">
            <span className="cursor-pointer px-3 py-1 font-mono text-sm uppercase tracking-widest text-slate-400 hover:bg-[#1e2023] hover:text-[#00E5FF]">
              Overview
            </span>
            <span className="cursor-pointer px-3 py-1 font-mono text-sm uppercase tracking-widest text-slate-400 hover:bg-[#1e2023] hover:text-[#00E5FF]">
              Analysis
            </span>
            <span className="px-3 py-1 font-mono text-sm font-bold uppercase tracking-widest text-[#00fe66]">Verification</span>
          </nav>
        </div>
        <span className="font-mono text-sm uppercase tracking-widest text-slate-400">ENV: STAGING</span>
      </header>

      <section className="grid grid-cols-1 gap-4 border-b border-slate-800/80 p-6 md:grid-cols-4">
        <Tile label="Test Sequence" value="RUN_ID: 99x-A7" tone="text-[#81ecff]" />
        <Tile label="Success Rate" value="98.2%" tone="text-[#00fe66]" />
        <Tile label="Critical Fails" value="01" tone="text-[#ff6e85] animate-pulse" />
        <Tile label="Uptime" value="342:12:09" tone="text-[#f7f6f9]" />
      </section>

      <section className="grid grid-cols-12 gap-6 p-6">
        <aside className="col-span-12 space-y-6 lg:col-span-3">
          <div className="border-t-2 border-[#81ecff]/40 bg-[#1e2023] p-6">
            <h2 className="mb-6 font-mono text-lg uppercase tracking-tight text-[#81ecff]">Simulation Config</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block font-mono text-[0.6875rem] uppercase tracking-widest text-slate-400">Stress Level</label>
                <input type="range" className="h-1 w-full cursor-pointer accent-[#81ecff]" />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[0.6875rem] uppercase tracking-widest text-slate-400">Agent Cluster</label>
                <select className="w-full border-b border-slate-700 bg-black/40 py-2 font-mono text-sm">
                  <option>CLUSTER_ALPHA_01</option>
                  <option>CLUSTER_BRAVO_02</option>
                  <option>CLUSTER_GHOST_09</option>
                </select>
              </div>
              <button className="mt-4 w-full bg-[#81ecff] py-3 font-mono font-bold uppercase tracking-tight text-[#005762]">
                Run Simulator
              </button>
            </div>
          </div>
        </aside>

        <div className="col-span-12 space-y-6 lg:col-span-9">
          <div className="grid grid-cols-2 gap-1 md:grid-cols-10">
            {EDGE_CASES.map((edgeCase) => (
              <div
                key={edgeCase.id}
                className={`flex h-8 items-center justify-center border font-mono text-[8px] ${
                  edgeCase.isFailure
                    ? 'border-[#ff6e85]/40 bg-[#ff6e85]/20 text-[#ff6e85] animate-pulse'
                    : 'border-[#00fe66]/40 bg-[#00fe66]/20 text-[#00fe66]'
                }`}
              >
                {edgeCase.id}
              </div>
            ))}
            <div className="col-span-2 bg-[#242629] p-2 text-center font-mono text-[0.6rem] uppercase tracking-[0.3em] text-slate-400 md:col-span-10">
              ... EDGE_CASE_MATRIX_021_TO_050 ...
            </div>
          </div>

          <div className="relative border border-slate-700/50 bg-black/40">
            <div className="h-10 border-b border-slate-700/40 bg-[#1e2023] px-4 py-3 font-mono text-[10px] uppercase text-slate-400">
              Operator Terminal v4.2.1
            </div>
            <div className="space-y-2 p-6 font-mono text-xs leading-relaxed text-[#00fe66]/90">
              <p className="text-[#81ecff]">[SYSTEM] AUTHENTICATION SECURE. LOADING DSG_ONE_CORE...</p>
              <p>[INFO] INITIALIZING SIMULATION ENGINE ALPHA-09</p>
              <p>[INFO] MAPPING POLICY GRAPH TO EXECUTION LOOPS</p>
              <p>[SCAN] DETECTING POTENTIAL RACE CONDITIONS IN MODULE_A</p>
              <p>[WARN] LATENCY SPIKE DETECTED IN NODE_SYDNEY: 45ms</p>
              <p>[OK] NODE_SYDNEY STABILIZED</p>
              <p className="font-bold text-[#ff6e85]">[CRITICAL] EDGE_CASE_07: PROTOCOL_BREACH_BYPASS_V4... FAIL</p>
              <p className="text-slate-400">&gt;&gt; Exception: IllegalAccessError at runtime</p>
              <p className="animate-pulse">_</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border-l-2 border-slate-600 bg-[#121316] p-4">
      <p className="font-mono text-[0.6875rem] uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`font-mono text-2xl ${tone}`}>{value}</p>
    </div>
  );
}
