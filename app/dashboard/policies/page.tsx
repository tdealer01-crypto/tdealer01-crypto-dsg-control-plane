export default function PoliciesPage() {
  const policyNavItems: [string, string, boolean][] = [
    ["dashboard", "Overview", false],
    ["hub", "Policy Graph", true],
    ["sync_alt", "Execution Loops", false],
    ["gavel", "Audit Evidence", false],
    ["verified_user", "Verification", false],
  ];

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#0d0e11] text-[#f7f6f9]">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-[#0d0e11] px-6 shadow-[0_0_8px_rgba(0,229,255,0.15)]">
        <div className="flex items-center gap-6">
          <span className="font-headline text-xl font-bold uppercase tracking-tighter text-[#00E5FF]">DSG ONE</span>
          <nav className="hidden h-full items-center gap-8 md:flex">
            <a className="font-['Chakra_Petch'] text-sm uppercase tracking-widest text-slate-400 transition-colors hover:bg-[#1e2023] hover:text-[#00E5FF]" href="#">Overview</a>
            <a className="font-['Chakra_Petch'] text-sm font-bold uppercase tracking-widest text-[#00fe66]" href="#">Policy Graph</a>
            <a className="font-['Chakra_Petch'] text-sm uppercase tracking-widest text-slate-400 transition-colors hover:bg-[#1e2023] hover:text-[#00E5FF]" href="#">Execution Loops</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="border-l-2 border-[#81ecff] bg-[#181a1d] px-3 py-1 font-mono text-[10px] tracking-tighter text-[#81ecff]">ENV: STAGING</div>
          <div className="flex gap-2">
            <button className="p-2 text-slate-400 transition-colors duration-75 hover:text-[#81ecff] active:scale-95" aria-label="notifications">
              <span className="material-symbols-outlined">notifications_active</span>
            </button>
            <button className="p-2 text-slate-400 transition-colors duration-75 hover:text-[#81ecff] active:scale-95" aria-label="settings">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 z-40 flex h-full w-64 flex-col border-r border-[#47484b]/10 bg-[#0d0e11] pb-4 pt-20">
        <div className="mb-8 px-6">
          <div className="font-headline text-lg font-black tracking-widest text-[#00E5FF]">OPERATOR_01</div>
          <div className="font-label text-[0.6875rem] uppercase tracking-[0.1em] text-[#ababae]">LEVEL_4_ACCESS</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {policyNavItems.map(([icon, label, active]) => (
            <div
              key={label}
              className={[
                "group flex cursor-pointer items-center px-6 py-3 font-['Space_Grotesk'] text-[0.6875rem] uppercase tracking-[0.1em] transition-all duration-200",
                active
                  ? "border-l-4 border-[#00fe66] bg-[#1e2023] text-[#00E5FF] shadow-[inset_0_0_10px_rgba(0,229,255,0.1)]"
                  : "text-slate-500 hover:bg-[#1e2023] hover:text-[#00E5FF] active:bg-[#00E5FF]/10",
              ].join(" ")}
            >
              <span className="material-symbols-outlined mr-4">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <section className="fixed right-0 top-16 bottom-0 z-40 flex w-96 flex-col border-l border-[#47484b]/10 bg-[#121316]">
        <div className="border-b border-[#47484b]/10 p-6">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-headline text-sm font-bold uppercase tracking-widest">Inspector</h2>
            <span className="bg-[#242629] px-2 py-0.5 font-mono text-[10px] text-[#ababae]">ID: 0xFD21</span>
          </div>
          <p className="text-[10px] uppercase tracking-tighter text-[#ababae]">Properties and logic override for active selection</p>
        </div>
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <div className="space-y-4">
            <h3 className="border-b border-[#81ecff]/20 pb-1 font-headline text-[9px] uppercase tracking-widest text-[#81ecff]">General_Settings</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-[#ababae]">Node_Name</label>
                <input className="border-0 border-b border-[#47484b] bg-black p-1 font-mono text-xs text-[#81ecff] focus:border-[#81ecff] focus:ring-0" type="text" defaultValue="AUTH_VALIDATION" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase text-[#ababae]">Execution_Priority</label>
                <select className="border-0 border-b border-[#47484b] bg-black p-1 font-mono text-xs text-[#f7f6f9] focus:border-[#81ecff] focus:ring-0" defaultValue="HIGH (1)">
                  <option>CRITICAL (0)</option>
                  <option>HIGH (1)</option>
                  <option>STANDARD (2)</option>
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#81ecff]/20 pb-1">
              <h3 className="font-headline text-[9px] uppercase tracking-widest text-[#81ecff]">Logic_Manifest</h3>
              <span className="font-mono text-[8px] text-[#ababae]">READ/WRITE</span>
            </div>
            <pre className="overflow-hidden bg-black p-4 font-mono text-[11px] leading-relaxed text-[#ababae]">{`{
  "condition": {
    "field": "operator.scope",
    "op": "EQ",
    "value": "LEVEL_4"
  },
  "timeout": 500
}`}</pre>
          </div>
          <div className="space-y-4">
            <h3 className="border-b border-[#81ecff]/20 pb-1 font-headline text-[9px] uppercase tracking-widest text-[#81ecff]">Preview_Model</h3>
            <div className="group relative aspect-video overflow-hidden bg-black">
              <img
                alt="A tactical cybernetic visualization of data flow nodes connecting in 3D space with teal light traces"
                className="h-full w-full object-cover opacity-30 transition-opacity group-hover:opacity-50"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuALs-hf0UAc5kH6dNx5Shw7I7GRytO7QNeMJJlLoX1SINa5aAvNtXNTFBFy_yJxnG0QHzS2owoG9k53KUTkaAEO4amXIvXbJIR8b9KsP7l41zMe9kXtOb6AeUvX8FPaiSHqLIghkVT4QZjZHoOmZ2UF4kBRK_gglskn30lE0fQ-V15MsQ8JhULdi2mqU8hinOu5HkpyC90iVXHB_yRPePTMD6wlPdzzqAAmZk--TM4EaSsOXXbXt8YJZSQedYHKl4VNWk43osBly0rs"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="pl-64 pr-96 pt-16">
        <div className="flex h-12 items-center justify-between border-b border-[#47484b]/10 bg-[#1e2023] px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#00fe66]">●</span>
              <span className="font-headline text-xs uppercase tracking-widest">Live_Policy_Engine.v4</span>
            </div>
          </div>
          <button className="bg-[#81ecff] px-4 py-1 font-headline text-[10px] font-bold uppercase tracking-widest text-[#005762]">Deploy Update</button>
        </div>

        <div className="relative h-[calc(100vh-7rem)] overflow-hidden bg-[#0d0e11] [background-image:radial-gradient(circle,_#242629_1px,_transparent_1px)] [background-size:32px_32px]">
          <div className="absolute left-20 top-40 w-[200px] border-l-4 border-[#81ecff] bg-[#242629] p-3 shadow-lg">
            <div className="mb-2 flex items-start justify-between">
              <span className="font-headline text-[9px] uppercase tracking-widest text-[#00d4ec]">Logic_Trigger</span>
              <span className="material-symbols-outlined text-xs text-[#ababae]">drag_handle</span>
            </div>
            <div className="mb-3 font-headline text-xs font-bold uppercase">INGRESS_REQUEST</div>
          </div>
          <div className="absolute left-[420px] top-10 w-[200px] border-l-4 border-[#00fe66] bg-[#242629] p-3 shadow-lg">
            <div className="mb-2 flex items-start justify-between">
              <span className="font-headline text-[9px] uppercase tracking-widest text-[#00fe66]">Condition_Check</span>
              <span className="material-symbols-outlined text-xs text-[#ababae]">drag_handle</span>
            </div>
            <div className="mb-3 font-headline text-xs font-bold uppercase">AUTH_VALIDATION</div>
          </div>
          <div className="absolute left-[760px] top-40 w-[200px] border-l-4 border-[#81ecff] bg-[#242629] p-3 shadow-lg">
            <div className="mb-2 flex items-start justify-between">
              <span className="font-headline text-[9px] uppercase tracking-widest text-[#81ecff]">Terminal_State</span>
              <span className="material-symbols-outlined text-xs text-[#ababae]">drag_handle</span>
            </div>
            <div className="mb-3 font-headline text-xs font-bold uppercase">POLICY_ENFORCED</div>
          </div>
        </div>
      </div>
    </main>
  );
}
