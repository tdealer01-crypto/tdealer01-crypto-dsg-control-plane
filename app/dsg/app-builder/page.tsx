import { AppBuilderConsoleClient } from '@/components/dsg/app-builder/AppBuilderConsoleClient';
import { DSG_APP_TEMPLATES } from '@/lib/dsg/app-builder/templates/template-registry';
import type { DsgAppBuilderPrd } from '@/lib/dsg/app-builder/types/prd';

const demoPrd: DsgAppBuilderPrd = {
  title: 'Market-Ready Agent App Builder',
  summary:
    'A governed app-builder workspace that turns a plain-language goal into a PRD, execution plan, approval gate, runtime evidence, and generated-app proof without claiming production readiness before evidence exists.',
  useCase: 'Enterprise Agent Builder Workspace',
  userProblem:
    'Users want to describe the outcome they need, see a realistic preview, approve the plan, and verify proof without navigating scattered tools or trusting black-box AI claims.',
  targetUsers: ['founder', 'operator', 'SMB owner', 'enterprise reviewer', 'developer'],
  coreFeatures: [
    'Outcome-first app request',
    'Prompt to PRD preview',
    'Template and risk registry',
    'Z3 feasibility observer boundary',
    'Approval and runtime proof gate',
    'Visible next action for every blocked state',
  ],
  nonGoals: [
    'No hidden autonomous execution',
    'No direct model-to-secret access',
    'No production-ready claim without build, deploy, database, auth, and proof evidence',
    'No mock data presented as production evidence',
  ],
  acceptanceCriteria: [
    'User can state the app outcome in plain language',
    'User can see PRD and plan before approval',
    'User can inspect risk, proof, and blocked reasons',
    'User can open a generated app preview when available',
    'Production claim remains blocked until runtime evidence exists',
  ],
  frontend: ['Next.js App Router', 'React', 'Tailwind'],
  backend: ['Next API routes', 'DSG controlled executor', 'Governed tool boundary'],
  database: ['Supabase Postgres', 'Evidence-first persistence boundary'],
  deployment: ['Vercel', 'GitHub PR flow', 'CI and deployment proof required'],
};

const marketPillars = [
  {
    label: 'Intent first',
    title: 'ผู้ใช้บอกผลลัพธ์ ไม่ต้องบอกขั้นตอนทั้งหมด',
    body: 'เริ่มจาก goal และ success criteria แล้วให้ระบบแตกเป็น PRD, plan, approval, runtime gate และ evidence trail.',
  },
  {
    label: 'Visible work',
    title: 'เห็นแอป เห็นแผน เห็นหลักฐาน',
    body: 'ลดความเสี่ยงจาก AI black box ด้วยหน้าพรีวิว, proof panel, blocked reasons และ next action ที่อ่านออกทันที.',
  },
  {
    label: 'Enterprise safe',
    title: 'เร็วขึ้น แต่ยังไม่ข้าม governance',
    body: 'ทุก output ต้องผ่าน claim boundary: อะไรยังไม่มี build/deploy/database/auth proof ต้องค้างเป็น review หรือ blocked.',
  },
];

const outcomeCards = [
  { value: '1', label: 'Goal', detail: 'พิมพ์แอปที่ต้องการแบบภาษาคน' },
  { value: '2', label: 'Plan', detail: 'เห็น PRD, flow, risk และ template' },
  { value: '3', label: 'Proof', detail: 'อนุมัติ/บล็อกด้วยหลักฐานก่อนอ้าง production' },
];

const builderStages = [
  { stage: 'Capture', text: 'รับเป้าหมายผู้ใช้และ success criteria' },
  { stage: 'Design', text: 'สร้าง PRD และเลือก template ที่เหมาะกับงาน' },
  { stage: 'Observe', text: 'ตรวจ feasibility, Z3 boundary, risk และ missing proof' },
  { stage: 'Ship', text: 'ส่งต่อ runtime gate พร้อมหลักฐานและ next action' },
];

export default function DsgAppBuilderPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#090b0f] text-[#eef3f8]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(242,202,80,0.20),transparent_30%),radial-gradient(circle_at_90%_18%,rgba(56,189,248,0.16),transparent_28%),linear-gradient(135deg,#090b0f_0%,#111827_48%,#050608_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.028)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-[2rem] border border-white/10 bg-white/[0.045] px-4 py-3 shadow-[0_0_38px_rgba(242,202,80,0.12)] backdrop-blur-xl">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#f2ca50]/75">DSG Agent Builder</p>
            <h1 className="mt-1 font-serif text-xl font-bold tracking-tight text-white sm:text-3xl">Build useful apps from outcomes</h1>
          </div>
          <a
            href="/dsg/action-layer"
            className="rounded-full border border-[#f2ca50]/35 bg-[#f2ca50]/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-[#ffe8a3] transition hover:bg-[#f2ca50]/20"
          >
            Action Layer
          </a>
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1.05fr)_420px]">
          <div className="rounded-[2.6rem] border border-white/10 bg-[#0f151f]/82 p-6 shadow-[0_0_52px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-[#f2ca50]/30 bg-[#f2ca50]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#ffe8a3]">Evidence-first</span>
              <span className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-100">Intent → App</span>
              <span className="rounded-full border border-rose-200/25 bg-rose-200/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-rose-100">No false production claim</span>
            </div>

            <div className="mt-8 max-w-4xl">
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-slate-400">For users who want speed, clarity, and real output</p>
              <h2 className="mt-4 font-serif text-5xl font-bold leading-[0.94] tracking-[-0.055em] text-white sm:text-7xl">
                Agent builder ที่ทำให้ผู้ใช้เห็นผลลัพธ์เร็ว และตรวจได้จริง
              </h2>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                รีมิกหน้านี้ให้ตลาดปัจจุบัน: ผู้ใช้ไม่ต้องเรียน workflow ซับซ้อน แค่ระบุเป้าหมาย เห็น PRD/แผน/พรีวิว/หลักฐานในที่เดียว แล้วรู้ทันทีว่าขั้นต่อไปคืออะไร
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {outcomeCards.map((card) => (
                <article key={card.label} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f2ca50] font-mono text-sm font-black text-[#241a00]">{card.value}</div>
                  <h3 className="mt-4 text-xl font-black text-white">{card.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-4 rounded-[2.6rem] border border-[#f2ca50]/18 bg-[#151107]/78 p-6 shadow-[0_0_42px_rgba(242,202,80,0.10)] backdrop-blur-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#ffe8a3]">Z3 decision frame</p>
            <h2 className="font-serif text-3xl font-bold text-white">Verify before claim</h2>
            <p className="text-sm leading-7 text-[#ffe8a3]/80">
              โครงนี้ไม่ขายฝันว่าเสร็จแล้วถ้ายังไม่มีหลักฐานจริง ทุกขั้นต้องเห็น state, proof, blocked reason และ next action
            </p>
            <div className="mt-5 space-y-3">
              {builderStages.map((item, index) => (
                <div key={item.stage} className="rounded-3xl border border-[#f2ca50]/15 bg-[#f2ca50]/[0.055] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#f2ca50] font-mono text-xs font-black text-[#241a00]">{index + 1}</span>
                    <h3 className="font-bold text-white">{item.stage}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#ffe8a3]/82">{item.text}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="mb-8 grid gap-4 lg:grid-cols-3">
          {marketPillars.map((pillar) => (
            <article key={pillar.label} className="rounded-[2rem] border border-white/10 bg-[#0f151f]/72 p-5 backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#f2ca50]/35">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#f2ca50]">{pillar.label}</p>
              <h3 className="mt-4 text-xl font-black text-white">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{pillar.body}</p>
            </article>
          ))}
        </section>

        <AppBuilderConsoleClient initialPrd={demoPrd} />

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#0f151f]/78 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Template Registry</p>
              <h2 className="mt-2 text-2xl font-black text-white">Governed starting points</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-400">Templates help users start faster, but every generated app still needs runtime proof before any production-ready claim.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DSG_APP_TEMPLATES.map((template) => (
              <article key={template.id} className="rounded-2xl border border-white/10 bg-[#090b0f] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wide text-cyan-200">{template.category}</p>
                    <h3 className="mt-2 text-lg font-black text-white">{template.name}</h3>
                  </div>
                  <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-200">{template.risk}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{template.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {template.requiredCapabilities.map((capability) => (
                    <span key={capability} className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">{capability}</span>
                  ))}
                </div>
                <ul className="mt-4 space-y-2 text-xs text-slate-400">
                  {template.productionNotes.map((note) => (
                    <li key={note}>• {note}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#0f151f]/78 p-6 backdrop-blur-xl">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Claim Boundary</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <h3 className="font-black text-emerald-200">Allowed now</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">User goal capture, PRD draft, template selection, plan observer, and visible review workflow.</p>
            </div>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <h3 className="font-black text-amber-200">Needs proof</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">Live build, database persistence, auth/RBAC, deployment URL, smoke test, and CI evidence.</p>
            </div>
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
              <h3 className="font-black text-rose-200">Blocked claim</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">No production-ready or autonomous-complete claim until the proof bundle is complete and visible.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
