import Link from 'next/link';

const setupSteps = [
  ['1. เลือกระบบเดิม', 'เริ่มจาก REST, Webhook, Zapier, Make, n8n, ERP, GitHub หรือ Vercel โดยไม่ต้องย้ายระบบก่อน'],
  ['2. วาง endpoint เดียว', 'ใช้ URL หรือ API route เดียวก่อน แล้วให้ DSG ครอบด้วย policy, approval, replay check และ evidence'],
  ['3. รัน proof แรก', 'ระบบแสดง PASS, REVIEW, BLOCK หรือ UNSUPPORTED พร้อม next action ที่ต้องแก้'],
  ['4. ส่ง evidence ให้ทีมงาน', 'แชร์ proof trail ให้ IT, risk, finance หรือ audit ก่อนขยาย rollout'],
];

const connectors = [
  ['REST API', 'เหมาะกับ internal apps, ERP wrappers, CRM, finance ops และ custom services'],
  ['Webhook', 'ทางเร็วสุดสำหรับ pilot ด้วย inbound event และ callback'],
  ['Zapier / Make', 'สะพาน no-code สำหรับ workflow ที่ลูกค้าใช้อยู่แล้ว'],
  ['n8n / Workato', 'ใช้ DSG เป็น governance layer หน้า workflow engine เดิม'],
  ['GitHub / Vercel', 'คุม release และ deployment ด้วย proof checks'],
  ['CSV / SFTP', 'รองรับลูกค้าที่ legacy หรือยังไม่ API-first'],
];

const controls = [
  'SSO/JWKS readiness surface',
  'RBAC and app restrictions',
  'Approval routing',
  'Audit log and evidence export',
  'Replay protection',
  'Rate-limit posture',
  'Go/no-go checklist',
  'Truth boundary against false claims',
];

type JourneyPhase = 'discovery' | 'signup' | 'onboarding' | 'proof';

type JourneyStep = {
  num: string;
  phase: JourneyPhase;
  path: string;
  title: string;
  body: string;
  href?: string;
  outcome?: string;
};

const journeySteps: JourneyStep[] = [
  {
    num: '01',
    phase: 'discovery',
    path: '/enterprise-ready',
    title: 'Visitor reads the product',
    body: 'Understands governance, connectors, and proof model. No login required.',
    href: '/enterprise-ready',
    outcome: 'Decision: start trial',
  },
  {
    num: '02',
    phase: 'signup',
    path: '/signup',
    title: 'Create workspace trial',
    body: 'Enter work email and workspace name. No card required. Trial starts immediately.',
    href: '/signup',
    outcome: 'Magic link sent to email',
  },
  {
    num: '03',
    phase: 'signup',
    path: 'Email inbox',
    title: 'Email confirmation',
    body: 'Click the magic link in the trial email. One click — no password.',
    outcome: 'Link opens /auth/confirm',
  },
  {
    num: '04',
    phase: 'signup',
    path: '/auth/confirm',
    title: 'Identity confirmed',
    body: 'DSG creates the org, activates the trial subscription, and bootstraps the workspace.',
    outcome: 'Redirected to dashboard',
  },
  {
    num: '05',
    phase: 'onboarding',
    path: '/dashboard/welcome',
    title: 'One-click auto setup',
    body: 'Click "ติดตั้งเลย" — DSG creates the starter agent, policy, API key, and first execution in one step.',
    href: '/dashboard/welcome',
    outcome: 'API key shown once — copy it',
  },
  {
    num: '06',
    phase: 'onboarding',
    path: '/dashboard/api-keys',
    title: 'Manage API keys',
    body: 'View, create, or revoke scoped keys. Paste the key into your agent code.',
    href: '/dashboard/api-keys',
    outcome: 'Key ready for agent',
  },
  {
    num: '07',
    phase: 'onboarding',
    path: '/dashboard/integrations',
    title: 'Connect your agent',
    body: 'Copy the curl / Python / JS snippet. Drop DSG gate() before every agent action. No SDK needed.',
    href: '/dashboard/integrations',
    outcome: 'Agent calling gate()',
  },
  {
    num: '08',
    phase: 'proof',
    path: '/api/try/gate',
    title: 'First proof issued',
    body: 'Gate evaluates the action: ALLOW → cryptographic stamp issued. BLOCK → reason + guidance returned.',
    outcome: 'Decision: ALLOW or BLOCK',
  },
  {
    num: '09',
    phase: 'proof',
    path: '/dashboard/audit',
    title: 'Audit packet ready',
    body: 'Every decision is signed and stored. Download JSON or CSV — hash, signature, and evidence — send to compliance.',
    href: '/dashboard/audit',
    outcome: 'Compliance-ready proof',
  },
];

const phaseLabel: Record<JourneyPhase, string> = {
  discovery: 'Discovery',
  signup: 'Sign up',
  onboarding: 'Onboarding',
  proof: 'Proof',
};

const phaseColor: Record<JourneyPhase, string> = {
  discovery: 'border-slate-500/40 bg-slate-500/10 text-slate-300',
  signup: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  onboarding: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  proof: 'border-sky-400/40 bg-sky-400/10 text-sky-300',
};

const phaseConnector: Record<JourneyPhase, string> = {
  discovery: 'bg-slate-500/30',
  signup: 'bg-emerald-400/30',
  onboarding: 'bg-amber-400/30',
  proof: 'bg-sky-400/40',
};

export default function EnterpriseReadyPage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-slate-100">
      <section className="border-b border-white/10 bg-[linear-gradient(135deg,#07080a,#10131a_55%,#07080a)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-100">Enterprise Ready Autopilot</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-white md:text-7xl">Connect DSG to the systems customers already use.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">User-first setup for governed AI, workflow, finance, and deployment operations. Start with one proof, then expand safely.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/integrations" className="rounded-2xl bg-amber-300 px-6 py-4 text-sm font-black text-slate-950 hover:bg-amber-200">Start setup</Link>
              <Link href="/enterprise-proof/demo" className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 text-sm font-bold text-white hover:border-emerald-300/40">Run proof demo</Link>
              <Link href="/docs" className="rounded-2xl border border-white/15 px-6 py-4 text-sm font-bold text-slate-200 hover:border-amber-300/40">Launch docs</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-2xl shadow-black/40">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">User benefit</p>
            <div className="mt-5 space-y-3">
              {['One-page setup', 'Copy-paste API commands', 'No-code bridge options', 'Visible proof status', 'No false production claim'].map((item) => (
                <div key={item} className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-50">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Real User Journey Flow ─────────────────────────────────────── */}
      <section className="border-b border-white/10 bg-[#0a0c10]">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">Real user journey</p>
          <h2 className="mt-3 text-4xl font-black text-white">From visitor to compliance proof — step by step</h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">Every step a real customer takes: read → sign up → confirm → set up → integrate → get proof.</p>

          {/* Phase legend */}
          <div className="mt-6 flex flex-wrap gap-2">
            {(Object.entries(phaseLabel) as [JourneyPhase, string][]).map(([phase, label]) => (
              <span key={phase} className={`rounded-full border px-3 py-1 text-xs font-bold ${phaseColor[phase]}`}>{label}</span>
            ))}
          </div>

          {/* Journey steps — two-column layout on large screens */}
          <div className="mt-8 lg:grid lg:grid-cols-[1fr_2px_1fr] lg:gap-x-0">

            {/* Left column steps: 01, 03, 05, 07, 09 */}
            <div className="hidden lg:block">
              {journeySteps.filter((_, i) => i % 2 === 0).map((step) => (
                <div key={step.num} className="relative mb-0 flex min-h-[140px] flex-col justify-center pb-4 pr-8">
                  <div className={`rounded-2xl border p-5 ${phaseColor[step.phase].replace('text-', 'border-').split(' ')[0]} bg-white/[0.03]`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${phaseColor[step.phase]}`}>{phaseLabel[step.phase]}</span>
                          {step.href ? (
                            <Link href={step.href} className="font-mono text-xs text-slate-400 hover:text-white">{step.path}</Link>
                          ) : (
                            <span className="font-mono text-xs text-slate-500">{step.path}</span>
                          )}
                        </div>
                        <h3 className="mt-2 text-base font-bold text-white">{step.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{step.body}</p>
                        {step.outcome && (
                          <p className="mt-2 text-[11px] font-semibold text-emerald-400">→ {step.outcome}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-3xl font-black text-white/10">{step.num}</span>
                    </div>
                  </div>
                  {/* Connector line down (except last in column) */}
                  {step.num !== '09' && (
                    <div className={`mx-8 h-4 w-0.5 ${phaseConnector[step.phase]}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Center spine */}
            <div className="relative hidden lg:flex lg:flex-col lg:items-center">
              <div className="absolute inset-0 flex flex-col items-center">
                <div className="h-full w-0.5 bg-gradient-to-b from-slate-500/30 via-emerald-400/30 via-40% via-amber-400/30 via-70% to-sky-400/40" />
              </div>
              {journeySteps.map((step, i) => (
                <div
                  key={step.num}
                  className="relative z-10 flex h-[140px] items-center"
                  style={{ marginTop: i === 0 ? 0 : 16 }}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-[#0a0c10] text-xs font-black ${
                    step.phase === 'discovery' ? 'border-slate-500/60 text-slate-400' :
                    step.phase === 'signup' ? 'border-emerald-400/60 text-emerald-400' :
                    step.phase === 'onboarding' ? 'border-amber-400/60 text-amber-400' :
                    'border-sky-400/60 text-sky-400'
                  }`}>
                    {step.num}
                  </div>
                </div>
              ))}
            </div>

            {/* Right column steps: 02, 04, 06, 08 */}
            <div className="hidden lg:block">
              {/* Offset by half a step height to stagger */}
              <div className="h-[70px]" />
              {journeySteps.filter((_, i) => i % 2 === 1).map((step) => (
                <div key={step.num} className="relative mb-0 flex min-h-[140px] flex-col justify-center pb-4 pl-8">
                  <div className={`rounded-2xl border p-5 ${phaseColor[step.phase].replace('text-', 'border-').split(' ')[0]} bg-white/[0.03]`}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="shrink-0 text-3xl font-black text-white/10">{step.num}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {step.href ? (
                            <Link href={step.href} className="font-mono text-xs text-slate-400 hover:text-white">{step.path}</Link>
                          ) : (
                            <span className="font-mono text-xs text-slate-500">{step.path}</span>
                          )}
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${phaseColor[step.phase]}`}>{phaseLabel[step.phase]}</span>
                        </div>
                        <h3 className="mt-2 text-base font-bold text-white">{step.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-400">{step.body}</p>
                        {step.outcome && (
                          <p className="mt-2 text-[11px] font-semibold text-emerald-400">→ {step.outcome}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {step.num !== '08' && (
                    <div className={`mx-8 h-4 w-0.5 ${phaseConnector[step.phase]}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile: single column */}
            <div className="lg:hidden col-span-3">
              {journeySteps.map((step, i) => (
                <div key={step.num} className="flex gap-4">
                  {/* Spine */}
                  <div className="flex flex-col items-center">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 bg-[#0a0c10] text-xs font-black ${
                      step.phase === 'discovery' ? 'border-slate-500/60 text-slate-400' :
                      step.phase === 'signup' ? 'border-emerald-400/60 text-emerald-400' :
                      step.phase === 'onboarding' ? 'border-amber-400/60 text-amber-400' :
                      'border-sky-400/60 text-sky-400'
                    }`}>
                      {step.num}
                    </div>
                    {i < journeySteps.length - 1 && (
                      <div className={`w-0.5 flex-1 ${phaseConnector[step.phase]} my-1`} style={{ minHeight: 24 }} />
                    )}
                  </div>
                  {/* Card */}
                  <div className="mb-4 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${phaseColor[step.phase]}`}>{phaseLabel[step.phase]}</span>
                      {step.href ? (
                        <Link href={step.href} className="font-mono text-xs text-slate-400 hover:text-white">{step.path}</Link>
                      ) : (
                        <span className="font-mono text-xs text-slate-500">{step.path}</span>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-white">{step.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{step.body}</p>
                    {step.outcome && (
                      <p className="mt-2 text-[11px] font-semibold text-emerald-400">→ {step.outcome}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-black text-slate-950 hover:bg-emerald-300">
              Start journey →
            </Link>
            <Link href="/dashboard/audit" className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white hover:border-sky-300/40">
              See audit proof
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">Setup flow</p>
        <h2 className="mt-3 text-4xl font-black text-white">Four steps to first governed proof</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {setupSteps.map(([title, body]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="text-lg font-black text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-300">{body}</p></article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b0d10]"><div className="mx-auto max-w-7xl px-6 py-14"><p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300">Connector catalog</p><h2 className="mt-3 text-4xl font-black text-white">Meet customers where their stack already is</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{connectors.map(([name, body]) => (<article key={name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="text-2xl font-black text-white">{name}</h3><p className="mt-4 text-sm leading-7 text-slate-300">{body}</p></article>))}</div></div></section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Enterprise controls</p><h2 className="mt-3 text-4xl font-black text-white">Control without slowing the first pilot.</h2><p className="mt-4 text-sm leading-7 text-slate-300">Missing proof becomes a visible next action, not hidden risk.</p></div><div className="grid gap-3 md:grid-cols-2">{controls.map((item) => (<div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-semibold text-slate-200">{item}</div>))}</div></section>

      <section className="mx-auto max-w-7xl px-6 pb-14"><div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-sm leading-7 text-amber-50"><p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">Truth boundary</p><p className="mt-2">Enterprise-ready here means setup-ready, governance-ready, and evidence-ready for a controlled pilot. Certification, independent audit, and production go-live still require recorded proof.</p></div></section>
    </main>
  );
}

