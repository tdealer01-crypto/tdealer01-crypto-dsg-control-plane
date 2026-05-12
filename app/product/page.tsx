import Link from 'next/link';

const monitorRows = [
  ['Agent', 'existing customer-agent', 'connected'],
  ['Action', 'payment / deploy / privilege change', 'protected'],
  ['Gate', 'ALLOW / STABILIZE / BLOCK', 'deterministic'],
  ['Evidence', 'memory + action + result hash', 'audit-ready'],
  ['Control Plane', 'dashboard + integrations + docs', 'linked'],
];

const workflowSteps = [
  ['1', 'เลือก agent เดิม', 'ลูกค้าใช้ agent/runtime เดิม ไม่ต้องย้ายระบบหรือเขียน agent ใหม่'],
  ['2', 'เลือก action ที่เสี่ยง', 'เริ่มจาก payment, deploy, privilege change หรือ external write ที่เห็นความเสี่ยงชัด'],
  ['3', 'แนบ memory packet', 'ส่ง snapshot hash, classification, ttl และ context ที่จำเป็นมากับ action'],
  ['4', 'เข้า CospinDSG gate', 'ตรวจ temporal, network, invariant, drift และ oscillation ก่อนปล่อย action'],
  ['5', 'ตัดสินผล', 'ระบบคืน ALLOW, STABILIZE หรือ BLOCK พร้อม reason ที่อ่านได้'],
  ['6', 'ส่งกลับ Control Plane', 'decision, evidence และ result receipt เชื่อมกลับ dashboard/audit flow เดิม'],
];

const usageSteps = [
  ['เปิดหน้า Product', 'เข้า /product เพื่อดูภาพรวมว่า CospinDSG วางอยู่ตรงไหนของ agent flow'],
  ['กด Connect agent', 'ไปที่ /dashboard/integrations เพื่อเริ่มต่อ agent เดิมเข้าระบบ'],
  ['เลือก protected action', 'กำหนด action แรกที่ควรถูก gate เช่น payment หรือ deploy'],
  ['ทดสอบ safe/risky action', 'ดูผล ALLOW, STABILIZE, BLOCK ใน mini monitor และ dashboard'],
  ['เปิด evidence', 'ใช้ docs/audit/dashboard ดู memory, action, decision และ result hash'],
  ['ค่อยขยาย rollout', 'เมื่อหนึ่ง action ใช้ได้จริง ค่อยเพิ่ม workflow อื่น ไม่ claim เกินหลักฐาน'],
];

const benefits = [
  'ไม่ต้องย้าย agent runtime เดิม',
  'เห็นผลทันทีว่า action ไหนผ่าน หยุด หรือถูกบล็อก',
  'มี evidence chain สำหรับ reviewer และ audit',
  'ต่อกลับ DSG Control Plane เดิมได้ทันที',
];

export default function ProductPage() {
  return (
    <main className="min-h-screen bg-[#090a0d] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="relative overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(126,16,24,0.24),rgba(9,10,13,0.9)_34%,rgba(245,197,92,0.1)_120%)] p-8">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">DSG Product Surface</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-6xl">
                CospinDSG Agent Shield
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                หน้า product ใหม่ที่ใช้ธีมเดียวกับ Control Plane: วาง CospinDSG หน้า agent เดิม เพื่อ gate action สำคัญก่อน execute จริง แล้วส่งผลกลับเข้า dashboard, integrations, docs และ audit flow เดิม.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/dashboard" className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">
                  Open Control Plane
                </Link>
                <Link href="/dashboard/integrations" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                  Connect agent
                </Link>
                <Link href="/docs/COSPIN_DSG_RUNTIME_SPINE" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                  Runtime spine docs
                </Link>
              </div>
            </div>

            <div className="border border-amber-300/20 bg-black/30 p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200">Mini monitor</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Agent → CospinDSG → Control Plane</h2>
              <div className="mt-5 space-y-3">
                {monitorRows.map(([key, value, status]) => (
                  <div key={key} className="grid gap-3 border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[120px_1fr_120px] md:items-center">
                    <p className="text-sm font-semibold text-white">{key}</p>
                    <p className="text-sm text-slate-300">{value}</p>
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-center text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="border border-white/10 bg-[#0d0f12] p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">ลำดับการทำงาน</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">จาก agent เดิม ไปถึง evidence ใน Control Plane</h2>
            <div className="mt-5 space-y-3">
              {workflowSteps.map(([step, title, body]) => (
                <div key={step} className="grid gap-4 border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[52px_180px_1fr] md:items-start">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-sm font-semibold text-amber-100">
                    {step}
                  </div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm leading-7 text-slate-300">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-amber-300/20 bg-amber-300/10 p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200">ขั้นตอนวิธีใช้</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">ใช้จริงแบบง่ายที่สุด</h2>
            <div className="mt-5 space-y-3">
              {usageSteps.map(([title, body], index) => (
                <div key={title} className="border border-amber-300/15 bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Step {index + 1}</p>
                  <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-amber-50/90">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ['ALLOW', 'ปล่อย action ให้ agent เดิม execute ต่อ เมื่อเงื่อนไขผ่านและ evidence ครบ'],
            ['STABILIZE', 'หยุดเพื่อกลับสู่จุดนิ่ง เมื่อ drift หรือ oscillation สูงเกิน policy'],
            ['BLOCK', 'บล็อกก่อนเกิดผลเสีย เมื่อเจอ invariant, memory, network หรือ temporal breach'],
          ].map(([title, body]) => (
            <article key={title} className="border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Decision</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="border border-emerald-400/20 bg-emerald-400/10 p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/80">User benefit</p>
            <h2 className="mt-2 text-2xl font-semibold text-emerald-50">เห็นประโยชน์ทันที ไม่ต้องอธิบายยาว</h2>
            <div className="mt-5 space-y-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="border border-emerald-300/15 bg-black/20 p-4 text-sm leading-7 text-emerald-50">
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-[#0d0f12] p-6">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Connect to existing plane</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">ไม่แยกระบบใหม่จนหลุดจาก DSG เดิม</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Product page นี้เป็นหน้า core ใหม่สำหรับขายและอธิบาย CospinDSG แต่เส้นทางใช้งานจริงยังกลับเข้า Control Plane เดิม: dashboard สำหรับ monitor, integrations สำหรับต่อ agent, docs สำหรับ runtime spine และ audit evidence.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Link href="/dashboard" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-100">Dashboard</Link>
              <Link href="/dashboard/integrations" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-100">Integrations</Link>
              <Link href="/docs" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-sm font-semibold text-slate-100">Docs</Link>
            </div>
          </div>
        </section>

        <section className="mt-6 border border-amber-300/25 bg-amber-300/10 p-5 text-sm leading-7 text-amber-50">
          <p className="font-semibold">Claim boundary</p>
          <p className="mt-2">
            หน้านี้เป็น product/mini-monitor surface ใหม่ ไม่ใช่หลักฐาน production-ready. การ claim production ต้องอ้างอิง test, typecheck, build, auth, database และ smoke evidence จริงเท่านั้น.
          </p>
        </section>
      </div>
    </main>
  );
}
