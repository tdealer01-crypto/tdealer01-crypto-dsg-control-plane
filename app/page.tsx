import Link from 'next/link';

const trustBar = [
  'Policy-enforced approval routing',
  'Maker-checker and exception controls',
  'Exportable audit evidence bundles',
];

const painCards = [
  {
    title: 'Approvals are scattered',
    body: 'Finance decisions still happen across email, chat, spreadsheets, ERP notes, and shared folders. That makes policy enforcement inconsistent and hard to prove.',
  },
  {
    title: 'Audit evidence is rebuilt by hand',
    body: 'When audit asks who approved a payment, why it was approved, and what evidence was reviewed, teams often reconstruct the story after the fact.',
  },
  {
    title: 'Exceptions are risky and invisible',
    body: 'Urgent payments, missing documents, high-risk vendors, and threshold overrides need controlled escalation before money moves.',
  },
];

const howSteps = [
  'Submit an invoice, payment, vendor, or finance exception into a governed case.',
  'DSG resolves the approval route from policy, threshold, role, and maker-checker context.',
  'Approvers decide with visible policy, exception, and evidence context.',
  'The system records decisions, exceptions, and evidence bundles for audit review.',
];

const launchLinks = [
  {
    title: 'Finance Governance Workspace',
    body: 'See the approval queue, case detail, exception posture, and evidence bundle path.',
    cta: 'Open finance workspace',
    href: '/finance-governance/app',
  },
  {
    title: 'Enterprise Pilot',
    body: 'Start with one invoice or payment approval workflow and prove audit readiness before broad rollout.',
    cta: 'Request access',
    href: '/request-access',
  },
  {
    title: 'Readiness Gate',
    body: 'Use health and readiness contracts to prove the deployment is safe before production launch.',
    cta: 'View docs',
    href: '/docs',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080a] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(181,18,27,0.3),transparent_26%),radial-gradient(circle_at_82%_10%,rgba(245,197,92,0.17),transparent_30%),linear-gradient(180deg,#090a0d_0%,#0b0d10_55%,#0a0c0f_100%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[44%] border-l border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] lg:block" />

        <div className="relative mx-auto grid min-h-[calc(100svh-73px)] max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">
              Audit-Ready Approval Governance
            </p>
            <h1 className="mt-7 max-w-5xl text-5xl font-bold leading-[1.02] text-white md:text-7xl">
              Govern every payment decision before it becomes an audit problem.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              DSG gives finance teams one operational layer for policy-routed approvals, maker-checker controls,
              exception handling, and evidence bundles that are ready when auditors ask.
            </p>

            <div className="mt-8 rounded-3xl border border-emerald-300/25 bg-emerald-400/10 p-5 shadow-2xl shadow-emerald-950/30">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">Try before login</p>
              <p className="mt-2 text-sm leading-7 text-emerald-50">
                เคยใช้ AI แล้วพังใช่ไหม? ดู proof/demo และถาม DSG ได้ก่อน โดย public mode ไม่ execute action และยังไม่ต้องย้ายข้อมูล.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/enterprise-proof/demo"
                  className="rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
                >
                  ดูเดโม่ / View demo
                </Link>
                <a
                  href="#public-chat"
                  className="rounded-2xl border border-emerald-200/40 bg-black/20 px-5 py-3 text-sm font-bold text-emerald-100 transition hover:border-emerald-100"
                >
                  ถาม DSG
                </a>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/finance-governance/app" className="rounded-2xl bg-amber-300 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-amber-200">
                Open finance workspace
              </Link>
              <Link href="/request-access" className="rounded-2xl border border-red-300/35 bg-red-500/10 px-6 py-4 font-semibold text-red-100 transition hover:border-red-200/50 hover:bg-red-500/15">
                Request enterprise pilot
              </Link>
              <Link href="/docs" className="rounded-2xl border border-white/15 bg-white/[0.03] px-6 py-4 font-semibold text-slate-100 transition hover:border-amber-300/30">
                Review launch docs
              </Link>
            </div>

            <div className="mt-12 grid gap-3 md:grid-cols-3">
              {trustBar.map((item) => (
                <div key={item} className="border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="border border-amber-300/20 bg-black/30 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Finance Mission Room</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Approval Control Stack</h2>
                </div>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
                  Ready
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {howSteps.map((step, index) => (
                  <div key={step} className="grid grid-cols-[42px_1fr] gap-4 border-l border-amber-300/25 bg-white/[0.02] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/25 bg-amber-300/10 text-sm font-semibold text-amber-100">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-slate-200">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="border border-white/10 bg-[#111317] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Policy</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">Route by threshold</p>
                </div>
                <div className="border border-white/10 bg-[#111317] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Evidence</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">Bundle at decision time</p>
                </div>
                <div className="border border-white/10 bg-[#111317] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Exceptions</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">Escalate with controls</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="public-chat" className="border-b border-emerald-300/15 bg-[#07110f]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-300">Public DSG Assistant</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">ถามก่อนล็อกอินได้ ไม่ execute action</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              ใช้ปุ่มแชทมุมขวาล่างหรือเริ่มจากหน้าเดโม่ เพื่อเช็กว่า DSG เหมาะกับ workflow ของคุณไหม ก่อน request access หรือย้ายข้อมูลจริง.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/enterprise-proof/demo" className="rounded-2xl bg-emerald-300 px-6 py-4 font-bold text-slate-950 hover:bg-emerald-200">
              ดูเดโม่ตอนนี้
            </Link>
            <Link href="/request-access" className="rounded-2xl border border-emerald-300/40 px-6 py-4 font-bold text-emerald-100 hover:bg-emerald-300/10">
              ขอสิทธิ์ทดลอง
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-5 lg:grid-cols-3">
          {painCards.map((card) => (
            <article key={card.title} className="border-t border-red-400/30 bg-white/[0.02] px-0 py-0">
              <div className="p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Risk Signal</p>
                <h2 className="mt-4 text-2xl font-semibold text-amber-50">{card.title}</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300">{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b0d10]">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Launch Paths</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">Move from one governed workflow to a real operating surface.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
              Start with a single invoice or payment path, prove control quality in a bounded pilot, then expand into the daily approval workspace with shared evidence and runtime checks.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {launchLinks.map((item) => (
              <article key={item.title} className="border border-white/10 bg-white/[0.03] p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Path</p>
                <h3 className="mt-4 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 min-h-[110px] text-sm leading-7 text-slate-300">{item.body}</p>
                <Link href={item.href} className="mt-5 inline-flex border-b border-amber-300 pb-1 text-sm font-semibold text-amber-100">
                  {item.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
