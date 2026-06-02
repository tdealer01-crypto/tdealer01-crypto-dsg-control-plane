import Link from 'next/link';
import type { Metadata } from 'next';
import ScanForm from './ScanForm';

export const metadata: Metadata = {
  title: 'AI Delivery Proof — DSG ONE',
  description:
    'ออก Delivery Proof Report ให้ลูกค้าก่อนส่งงาน — ยืนยันว่าโค้ด/AI agent ผ่านอะไรแล้ว ขาดอะไร และ production claim ขอบเขตอยู่ที่ไหน สำหรับ agency, SaaS, dev team ที่ใช้ AI tools.',
};

const STEPS = [
  {
    n: '1',
    title: 'Connect repo หรือ paste URL',
    body: 'ใส่ GitHub repo URL หรือ production URL ของ project ที่ต้องการ proof',
    icon: '🔗',
  },
  {
    n: '2',
    title: 'DSG รัน Proof Check',
    body: 'ระบบตรวจ build, test, dependency, auth gate, evidence chain และ production claim boundary โดยอัตโนมัติ',
    icon: '⚡',
  },
  {
    n: '3',
    title: 'รับ Report — ส่งลูกค้าได้เลย',
    body: 'ได้ link report ที่ share ได้ + PDF/JSON export พร้อม claim result: DEPLOYABLE / EVIDENCE COMPLETE / PRODUCTION BLOCKED',
    icon: '📋',
  },
];

const REPORT_CONTENTS = [
  { label: 'Build & test status', detail: 'pass rate, mutation score, CI result', icon: '✅' },
  { label: 'Dependency risk', detail: 'CVE scan, npm audit, SBOM summary', icon: '🔐' },
  { label: 'Auth gate posture', detail: 'protected routes ตอบ 401/403 ถูกต้อง', icon: '🛡️' },
  { label: 'Evidence chain hash', detail: 'SHA-256 tamper-evident chain L1–L5', icon: '🔗' },
  { label: 'Production claim boundary', detail: 'ระบุชัดว่า claim อะไรได้ / ไม่ได้', icon: '📌' },
  { label: 'Remediation checklist', detail: 'สิ่งที่ต้องแก้ก่อน deploy จริง', icon: '📝' },
];

const CLAIM_RESULTS = [
  {
    label: 'EVIDENCE COMPLETE',
    color: 'emerald',
    desc: 'ครบทุก check — ส่งลูกค้าหรือ deploy ได้พร้อม report',
  },
  {
    label: 'PARTIAL — REVIEW REQUIRED',
    color: 'amber',
    desc: 'ผ่านบางส่วน — report ระบุว่าต้องแก้อะไรก่อน',
  },
  {
    label: 'PRODUCTION BLOCKED',
    color: 'red',
    desc: 'ยังไม่พร้อม — มี critical gap ที่ต้องปิดก่อน claim production',
  },
];

const WHO_NEEDS = [
  {
    role: 'Software / AI Agency',
    pain: 'ส่งงานเร็วขึ้นด้วย AI แต่ลูกค้าถามว่า "พร้อม production ไหม?"',
    value: 'ออก Delivery Proof Report แนบใบเสร็จ — ปิดงานได้เร็วขึ้น',
    icon: '🏢',
  },
  {
    role: 'SaaS Startup ขาย Enterprise',
    pain: 'ลูกค้าใหญ่ถาม security, audit log, compliance ก่อนซื้อ',
    value: 'ส่ง Pre-Sales Trust Pack พร้อม evidence ก่อน procurement review',
    icon: '🚀',
  },
  {
    role: 'Dev Team ใช้ Cursor / Claude Code',
    pain: 'Security team review ไม่ทัน AI code ที่ generate มาเร็วมาก',
    value: 'Gate ทุก merge ด้วย DSG — มีหลักฐานว่า AI code ผ่านอะไรแล้ว',
    icon: '👨‍💻',
  },
];

const colorMap: Record<string, string> = {
  emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  amber:   'border-amber-400/30 bg-amber-400/10 text-amber-200',
  red:     'border-red-400/30 bg-red-400/10 text-red-200',
};

export default function DeliveryProofPage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-white">

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.25),transparent_28%),radial-gradient(circle_at_85%_8%,rgba(245,197,92,0.18),transparent_32%),linear-gradient(180deg,#08090c_0%,#0b0d10_60%,#07080a_100%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center">
          <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
            AI Delivery Proof — สำหรับ agency, SaaS, dev team
          </p>
          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-bold leading-[1.05] md:text-7xl">
            ส่งงานได้เร็วขึ้น<br />
            <span className="text-amber-300">มีหลักฐานว่าพร้อม</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            รัน Proof Check → รับ Report → ส่งลูกค้า<br />
            ยืนยันว่าโค้ด / AI agent ผ่านอะไรแล้ว ขาดอะไร และ production claim ขอบเขตอยู่ที่ไหน
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-2xl bg-emerald-300 px-8 py-4 text-base font-bold text-slate-950 transition hover:bg-emerald-200"
            >
              เริ่มฟรี — ไม่ต้องใส่บัตรเครดิต →
            </Link>
            <Link
              href="/readiness-report"
              className="rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-slate-100 transition hover:border-emerald-300/40"
            >
              ดู Readiness Report ตัวอย่าง
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            certificationClaim = false · independentAuditClaim = false · pre-audit evidence mapping only
          </p>
          <ScanForm />
        </div>
      </section>

      {/* 3-step flow */}
      <section className="border-b border-white/10 bg-[#0b0d10]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-center text-[11px] uppercase tracking-[0.3em] text-slate-500">Flow</p>
          <h2 className="mt-3 text-center text-3xl font-semibold text-white">3 ขั้นตอน — จาก repo ถึงมือลูกค้า</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="relative border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-lg">
                    {step.icon}
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Step {step.n}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{step.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's in the report */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Report ประกอบด้วย</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">ทุกอย่างที่ลูกค้าถาม — อยู่ใน report เดียว</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {REPORT_CONTENTS.map((item) => (
            <div key={item.label} className="flex gap-4 border border-white/10 bg-white/[0.03] p-5">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Claim result badges */}
      <section className="border-y border-white/10 bg-[#0b0d10]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Claim Result</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">3 ผลลัพธ์ที่ชัดเจน — ไม่ใช่แค่ green badge</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CLAIM_RESULTS.map((r) => (
              <div key={r.label} className={`rounded-2xl border px-6 py-5 ${colorMap[r.color]}`}>
                <p className="font-bold uppercase tracking-wide">{r.label}</p>
                <p className="mt-2 text-sm leading-6 opacity-80">{r.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-500">
            * EVIDENCE COMPLETE ไม่ใช่ third-party certification หรือ legal compliance — เป็น pre-audit evidence mapping สำหรับ internal use
          </p>
        </div>
      </section>

      {/* Who needs this */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">สำหรับใคร</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">ใช้ AI สร้างซอฟต์แวร์ แล้วต้องส่งมอบหรือขาย</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {WHO_NEEDS.map((w) => (
            <article key={w.role} className="border-t border-amber-300/30 bg-white/[0.02] p-6">
              <span className="text-3xl">{w.icon}</span>
              <h3 className="mt-4 text-xl font-semibold text-amber-50">{w.role}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                <span className="font-medium text-slate-300">Pain: </span>{w.pain}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                <span className="font-medium text-emerald-300">Value: </span>{w.value}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Proof tech — DOI + CCVS */}
      <section className="border-t border-white/10 bg-[#0b0d10]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Methodology</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">ทำไม Proof ของ DSG ถึงน่าเชื่อถือ</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="border border-white/10 bg-white/[0.03] p-6">
              <p className="font-bold text-white">CCVS v1.2 — Cryptographic Evidence Chain</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                SHA-256 chain L1 (unit) → L2 (integration) → L3 (adversarial) → L4 (mutation/Z3) → L5 (provenance)
                ทุก level tamper-evident โดย construction ไม่ใช่แค่ policy
              </p>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-6">
              <p className="font-bold text-white">24 Z3 Formal Theorems · 998 Tests · 72.08% Mutation</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Policy invariants proved UNSAT — ไม่ใช่แค่ functional test
                Stryker mutation score ≥70% gate ก่อน compliance claim ใดๆ
              </p>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-6">
              <p className="font-bold text-white">Zenodo DOI — Academic Reference</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                <code className="text-amber-300">10.5281/zenodo.18225586</code><br />
                Deterministic State Gate: Formally Verified Control Primitive for Safety-Critical AI Systems
              </p>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-6">
              <p className="font-bold text-white">MCP Server — AI Agent Integration</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Connect ผ่าน <code className="text-amber-300">GET /api/mcp-server</code> — ให้ Claude / Cursor / Copilot
                gate ทุก action ก่อน execute โดยตรงผ่าน MCP protocol
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">เริ่มต้นฟรี — อัพเกรดเมื่อต้องการ export หรือ share</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Trial plan รัน proof check ได้ทันที ไม่ต้องใส่บัตรเครดิต
            Agency plan เพิ่ม white-label report, share link, และหลาย project
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-2xl bg-amber-300 px-8 py-4 font-bold text-slate-950 transition hover:bg-amber-200"
            >
              เริ่มฟรี →
            </Link>
            <Link
              href="/pricing"
              className="rounded-2xl border border-white/20 px-8 py-4 font-semibold text-slate-100 transition hover:border-amber-300/40"
            >
              ดู Pricing
            </Link>
            <Link
              href="/compliance-evidence-pack"
              className="rounded-2xl border border-amber-300/30 bg-amber-300/10 px-8 py-4 font-semibold text-amber-100 transition hover:border-amber-300/60"
            >
              Evidence Pack
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
