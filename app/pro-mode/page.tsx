import Link from 'next/link';

const metrics = [
  { label: 'Best-Mass Tests', value: '38/38', note: '100% pass rate evidence pack' },
  { label: 'Success Rate', value: '98.2%', note: 'heavy-load benchmark claim' },
  { label: 'Average Latency', value: '45.2ms', note: 'benchmark summary' },
  { label: 'Throughput', value: '1,429', note: 'requests/min sustained' },
  { label: 'Uptime Target', value: '99.99%', note: 'production-grade posture' },
  { label: 'Transaction Loss', value: '0', note: 'spike scenario claim' },
];

const agentStages = [
  'Intake & validation',
  'Policy evaluation',
  'Risk & decision',
  'Execution orchestration',
  'Verification & settlement',
];

const proofCards = [
  {
    title: 'Inclusion Proof',
    body: 'Merkle-style proof path for showing that an event is included in the evidence bundle.',
    tag: 'Verified path',
  },
  {
    title: 'Consistency Proof',
    body: 'Chain-link continuity check between control-plane and core-ledger evidence.',
    tag: 'No silent rewrite',
  },
  {
    title: 'Execution Proof',
    body: 'State-root evidence for the decision, route, approval posture, and runtime checkpoint.',
    tag: 'Replayable decision',
  },
];

const research = [
  {
    title: 'Engineering Grade Blueprint for Attested AI Systems',
    doi: '10.5281/zenodo.18244246',
    href: 'https://doi.org/10.5281/zenodo.18244246',
  },
  {
    title: 'DSG Awareness Gate System',
    doi: '10.5281/zenodo.18225586',
    href: 'https://doi.org/10.5281/zenodo.18225586',
  },
  {
    title: 'Deterministic Cognitive System Architecture',
    doi: '10.5281/zenodo.18212854',
    href: 'https://doi.org/10.5281/zenodo.18212854',
  },
];

export default function ProModePage() {
  return (
    <main className="min-h-screen bg-[#040814] text-slate-50">
      <section className="relative overflow-hidden border-b border-cyan-300/20 px-6 py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(20,220,255,0.22),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(68,255,122,0.15),transparent_26%),linear-gradient(180deg,#061222,#040814)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.92fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
              PRO MODE • PROOF-FIRST RELEASE SURFACE
            </p>
            <h1 className="mt-7 max-w-5xl text-5xl font-black leading-[0.98] tracking-[-0.04em] md:text-7xl">
              DSG Cryptographic Proof & Multi-Agent Audit Trail
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-cyan-50/80">
              หน้าโปรโหมดสำหรับลูกค้า enterprise: รวม Best-Mass evidence, multi-agent runtime stages,
              dual-chain proof model, security posture, และ research references ไว้ในจุดเดียวเพื่อช่วยตัดสินใจภายใน 2 นาที.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/enterprise-proof/demo" className="rounded-2xl bg-cyan-300 px-6 py-4 font-black text-slate-950 shadow-2xl shadow-cyan-500/20">
                View live proof demo
              </Link>
              <Link href="/request-access" className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-6 py-4 font-black text-emerald-100">
                Request Pro access
              </Link>
              <Link href="/" className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 font-bold text-slate-200">
                Back to home
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-cyan-300/25 bg-black/35 p-5 shadow-2xl shadow-cyan-950/50">
            <div className="rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-cyan-500/10 to-emerald-400/10 p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200">Overall Health</p>
                  <p className="mt-2 text-6xl font-black text-emerald-300">100%</p>
                </div>
                <div className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                  Audit Ready
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {['Data integrity verified', 'Audit trail complete', 'Non-repudiation enabled', 'Compliance posture visible'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-100">
                    <span className="text-emerald-300">✓</span> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">{metric.label}</p>
              <p className="mt-3 text-3xl font-black text-emerald-300">{metric.value}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{metric.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#07111f] px-6 py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.26em] text-emerald-300">Multi-Agent Parallel Processing</p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-white">5-stage runtime pipeline with visible gate points</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              ใช้สำหรับ demo ที่ลูกค้าต้องเห็นว่า AI ไม่ได้ execute เอง: ทุก action ต้องผ่าน policy, decision,
              orchestration, verification, settlement และ audit record.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {agentStages.map((stage, index) => (
              <div key={stage} className="rounded-3xl border border-cyan-300/20 bg-black/30 p-4 text-center">
                <p className="text-xs font-black text-cyan-300">STAGE {index + 1}</p>
                <div className="my-4 h-16 rounded-2xl border border-emerald-300/25 bg-emerald-300/10" />
                <p className="text-sm font-black text-white">{stage}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 lg:grid-cols-3">
          {proofCards.map((proof) => (
            <article key={proof.title} className="rounded-[2rem] border border-cyan-300/20 bg-white/[0.035] p-6 shadow-2xl shadow-cyan-950/20">
              <p className="inline-flex rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">{proof.tag}</p>
              <h3 className="mt-5 text-2xl font-black text-white">{proof.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{proof.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/30 px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-cyan-300">Supporting Research</p>
          <h2 className="mt-3 text-4xl font-black tracking-[-0.03em] text-white">Academic & technical validation links</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            ลิงก์เหล่านี้เป็น reference ที่ควรใช้ตรวจสอบประกอบก่อนประกาศเชิง certification ภายนอก.
            หน้าโปรโหมดจึงแยก “evidence pack” ออกจาก “third-party certification” เพื่อความถูกต้องของข้อมูล.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {research.map((item) => (
              <a key={item.doi} href={item.href} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-cyan-300/40">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">DOI {item.doi}</p>
                <h3 className="mt-3 text-xl font-black text-white">{item.title}</h3>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="rounded-[2rem] border border-emerald-300/25 bg-emerald-300/10 p-8 text-center">
          <h2 className="text-4xl font-black tracking-[-0.03em] text-white">Ready for a Pro proof walkthrough?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-emerald-50/80">
            ใช้หน้านี้เป็น landing page สำหรับ PR, marketplace, sales demo และ investor/customer validation.
            ขั้นถัดไปคือเชื่อม screenshot จริงจาก production audit หลังล็อกอินเมื่อ Auto-Setup ผ่านครบทุก gate.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/request-access" className="rounded-2xl bg-emerald-300 px-6 py-4 font-black text-slate-950">Request Pro access</Link>
            <Link href="/enterprise-proof/demo" className="rounded-2xl border border-emerald-300/40 px-6 py-4 font-black text-emerald-100">Open proof demo</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
