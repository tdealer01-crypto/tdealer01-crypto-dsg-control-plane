import Link from 'next/link';

const TRIAL_FEATURES = [
  {
    icon: '🛂',
    title: 'AI Agent Gate',
    desc: 'ประกาศสิทธิ์ล่วงหน้า — DSG ตรวจทุก action ก่อนผ่าน ประทับตราเวลาและบันทึก',
  },
  {
    icon: '📋',
    title: 'Audit Trail จริง',
    desc: 'ทุก decision มี hash, timestamp, และ reason — export PDF ให้ audit ได้ทันที',
  },
  {
    icon: '🔑',
    title: 'API Key พร้อมใช้',
    desc: 'รับ API key ทันทีหลัง signup — ต่อกับ agent ได้ใน 5 นาที',
  },
  {
    icon: '👥',
    title: 'Team Management',
    desc: 'เพิ่มทีม กำหนด role OWNER / ADMIN / OPERATOR / VIEWER ควบคุมว่าใครทำอะไรได้',
  },
  {
    icon: '🔔',
    title: 'Webhook & Notifications',
    desc: 'ส่ง event ไปยัง Slack, PagerDuty, หรือ endpoint ของคุณเมื่อ gate block หรืออนุมัติ',
  },
  {
    icon: '📊',
    title: 'Finance Governance',
    desc: 'Approval workflow, case tracking, และ PDF audit report สำหรับ AI agent ด้านการเงิน',
  },
];

const WHAT_YOU_GET = [
  '✓ ใช้ได้เต็มรูปแบบ 15 วัน — ไม่มีฟีเจอร์ที่ถูก lock',
  '✓ ไม่ต้องใส่ข้อมูลบัตรเครดิต',
  '✓ API key สำหรับ production ทันที',
  '✓ Audit trail จริง — ไม่ใช่ sandbox',
  '✓ Setup เสร็จใน 5 นาที',
  '✓ Support ตรงจาก founder ตลอด 15 วัน',
];

const STEPS = [
  { num: '1', title: 'สร้างบัญชี', desc: 'กรอก email + workspace name — ใช้เวลา 30 วินาที' },
  { num: '2', title: 'รับ API Key', desc: 'ได้ key ทันทีหลัง verify email — พร้อมใช้กับ agent' },
  { num: '3', title: 'ประกาศ Policy', desc: 'บอก DSG ว่า agent ของคุณทำอะไรได้บ้าง' },
  { num: '4', title: 'เห็น Audit Trail', desc: 'ทุก action มี stamp, reason, และ proof — real-time' },
];

const PLANS_AFTER_TRIAL = [
  {
    name: 'Pro',
    price: '$99',
    per: '/เดือน',
    highlight: false,
    features: ['Gate evaluation ไม่จำกัด', 'Audit trail 90 วัน', 'API key 3 ชุด', 'Email support'],
  },
  {
    name: 'Business',
    price: '$299',
    per: '/เดือน',
    highlight: true,
    features: ['ทุกอย่างใน Pro', 'Team management', 'Webhook & Notifications', 'PDF export', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: '$999',
    per: '/เดือน',
    highlight: false,
    features: ['ทุกอย่างใน Business', 'Custom policy engine', 'SLA 99.9%', 'Dedicated onboarding', 'Custom audit report'],
  },
];

export default function TryPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      {/* Nav */}
      <nav className="border-b border-white/5 bg-slate-900/60 px-6 py-4 sticky top-0 z-10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-black text-white">DSG</Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block">Pricing</Link>
            <Link href="/auth/login" className="text-sm text-slate-400 hover:text-white transition-colors">เข้าสู่ระบบ</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 pt-20 pb-16 text-center">
        <div className="mx-auto max-w-3xl">
          <span className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-bold text-emerald-300 uppercase tracking-widest mb-6">
            ทดลองฟรี 15 วัน · ไม่ต้องใส่บัตรเครดิต
          </span>
          <h1 className="text-5xl font-black tracking-tight leading-tight md:text-6xl">
            ควบคุม AI Agent<br />
            <span className="text-emerald-400">ก่อนมันทำให้คุณเดือดร้อน</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-8 max-w-2xl mx-auto">
            DSG นั่งระหว่าง AI agent กับระบบของคุณ — ตรวจทุก action ประทับตราเวลา บันทึก audit trail
            และบล็อกสิ่งที่ไม่ได้รับอนุญาต ก่อนที่จะสายเกินไป
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-2xl bg-emerald-500 px-10 py-4 text-base font-black text-slate-950 hover:bg-emerald-400 transition-all hover:scale-105 shadow-lg shadow-emerald-500/25"
            >
              เริ่มทดลองฟรี 15 วัน →
            </Link>
            <Link
              href="/demo"
              className="rounded-2xl border border-white/15 px-8 py-4 text-base font-bold text-slate-300 hover:text-white hover:border-white/30 transition-colors"
            >
              ดู demo ก่อน
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
            {WHAT_YOU_GET.slice(0, 3).map(w => <span key={w}>{w}</span>)}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-8 md:p-12">
            <div className="grid gap-10 lg:grid-cols-2 items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">สิ่งที่ได้รับทันที</p>
                <h2 className="text-3xl font-black text-white mb-6">ใช้งานเต็มรูปแบบ<br />ตั้งแต่วันแรก</h2>
                <ul className="space-y-3">
                  {WHAT_YOU_GET.map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                      <span className="text-emerald-400">{item.slice(0, 1)}</span>
                      <span>{item.slice(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Simulated audit log */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400 font-bold">DSG Gate — Live Audit Trail</span>
                </div>
                {[
                  { time: '09:14:22', action: 'read invoice #INV-4821', decision: 'ALLOW', stamp: 'DSG-A3F8E2C1' },
                  { time: '09:14:35', action: 'send payment notification', decision: 'ALLOW', stamp: 'DSG-B7D4F1A9' },
                  { time: '09:14:51', action: 'delete all records', decision: 'BLOCK', stamp: null },
                  { time: '09:15:03', action: 'approve invoice $850', decision: 'ALLOW', stamp: 'DSG-C2E9D5B3' },
                  { time: '09:15:22', action: 'transfer $50,000 external', decision: 'BLOCK', stamp: null },
                ].map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-slate-600 shrink-0">{log.time}</span>
                    <span className={`shrink-0 font-bold ${log.decision === 'ALLOW' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {log.decision === 'ALLOW' ? '[ALLOW]' : '[BLOCK]'}
                    </span>
                    <span className="text-slate-400 truncate">{log.action}</span>
                    {log.stamp && <span className="shrink-0 text-slate-600">{log.stamp}</span>}
                  </div>
                ))}
                <div className="border-t border-white/5 pt-3 text-slate-600">
                  decisions: 5 · allowed: 3 · blocked: 2 · pdf ready ↓
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">ฟีเจอร์ที่ได้รับในช่วงทดลอง</p>
            <h2 className="text-3xl font-black text-white">ครบทุกอย่างที่ production ต้องการ</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TRIAL_FEATURES.map(f => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-black text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-6">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup steps */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white">Setup ใน 4 ขั้นตอน</h2>
            <p className="mt-3 text-slate-400">จาก signup ถึง production-ready ใน 5 นาที</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px bg-white/10 z-0" />
                )}
                <div className="relative z-10 rounded-2xl border border-white/10 bg-slate-900 p-5 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-black text-emerald-400">
                    {s.num}
                  </div>
                  <h3 className="font-black text-white text-sm mb-1">{s.title}</h3>
                  <p className="text-xs text-slate-400 leading-5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing after trial */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">หลังครบ 15 วัน</p>
            <h2 className="text-3xl font-black text-white">เลือก plan ที่เหมาะกับทีม</h2>
            <p className="mt-3 text-slate-400">ยกเลิกได้ทุกเมื่อ ไม่มีค่าใช้จ่ายแอบแฝง</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {PLANS_AFTER_TRIAL.map(plan => (
              <div
                key={plan.name}
                className={`rounded-3xl border p-7 ${
                  plan.highlight
                    ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                {plan.highlight && (
                  <div className="mb-3 inline-block rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold text-emerald-300">
                    แนะนำ
                  </div>
                )}
                <h3 className="text-xl font-black text-white">{plan.name}</h3>
                <div className="mt-2 mb-5">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.per}</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-3xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,23,42,0.95)_50%)] p-12">
            <h2 className="text-4xl font-black text-white">เริ่มได้เลยวันนี้</h2>
            <p className="mt-4 text-slate-400 leading-7">
              ไม่ต้องใส่บัตรเครดิต ไม่มีสัญญาผูกมัด<br />
              ถ้าหลัง 15 วันแล้วไม่ถูกใจ — ยกเลิกและลบ account ได้ทันที
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-block rounded-2xl bg-emerald-500 px-12 py-4 text-lg font-black text-slate-950 hover:bg-emerald-400 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20"
            >
              เริ่มทดลองฟรี 15 วัน →
            </Link>
            <p className="mt-4 text-xs text-slate-500">
              มีคำถาม? ติดต่อ founder โดยตรง — ตอบภายใน 4 ชั่วโมง
            </p>
          </div>
        </div>
      </section>

    </main>
  );
}
