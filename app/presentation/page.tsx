"use client";

import { useState } from 'react';

const SLIDES = [
  {
    id: 'problem',
    title: '🔴 ปัญหาที่ลูกค้าเจอ',
    subtitle: 'ก่อนเคยใช้ DSG ONE',
    bullets: [
      '🔄 งานตอบลูกค้าช้า (เฉลี่ย 4-6 ชั่วโมง)',
      '📂 ข้อมูลกระจัดกระจายหลายระบบ',
      '🔗 ต้องใช้ 5-7 เครื่องมือต่างกัน',
      '👥 คนทำงานซ้ำ ๆ (Copy-Paste 50%)',
      '📊 ติดตามงานไม่ได้ว่าใครทำอะไร',
      '💰 ต้นทุนไม่ชัดเจน',
    ],
  },
  {
    id: 'what-is',
    title: '🟢 DSG ONE คืออะไร',
    subtitle: 'AI Control Plane สำหรับองค์กร',
    bullets: [
      '🌐 เป็น "ศูนย์ควบคุม" AI Agent ทุกตัว',
      '🔗 เชื่อมข้อมูล เครื่องมือ Workflow เข้าไว้ด้วยกัน',
      '🛡️ ตรวจสอบทุกการกระทำก่อนทำ (Policy Gate)',
      '📋 บันทึกทุกอย่างอัตโนมัติ (Audit Trail)',
      '💰 ดูต้นทุนได้ชัดเจน',
      '✨ ทำงานได้ 24/7 ไม่ต้องนอน',
    ],
    highlight: 'ไม่ต้องพูดเทคเครื่องก่อน — แค่ใช้งานได้',
  },
  {
    id: 'architecture',
    title: '🏗 Architecture ภาพรวม',
    subtitle: 'ระบบทำงานอย่างไร',
    diagram: `
┌─────────────────────────────────────────────────┐
│              ผู้ใช้งาน (ลูกค้า)                  │
├─────────────────────────────────────────────────┤
│              DSG ONE Control Plane              │
│  ┌─────────────────────────────────────────┐    │
│  │  🤖 AI Chat  │  🛡 Policy Gate  │  📊 Dashboard  │    │
│  ├─────────────────────────────────────────┤    │
│  │         🔐 Authentication Layer          │    │
│  │         📋 Audit Log (Immutable)         │    │
│  ├─────────────────────────────────────────┤    │
│  │  ☁️ Supabase  │  🗄 Redis  │  💳 Stripe  │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
    `,
  },
  {
    id: 'capabilities',
    title: '⚡ ระบบทำอะไรได้บ้าง',
    subtitle: '4 ความสามารถหลัก',
    boxes: [
      { icon: '💬', title: 'AI Chat', desc: 'ถามข้อมูลธุรกิจ · สั่งงาน AI ภาษาคน' },
      { icon: '🤖', title: 'AI Agent', desc: 'ทำงานแทนคน · ตรวจข้อมูล · สรุปรายงาน' },
      { icon: '⚙️', title: 'Workflow', desc: 'เชื่อมหลายระบบ · ทำงานอัตโนมัติ' },
      { icon: '📊', title: 'Monitoring', desc: 'ดูสถานะ · ดูต้นทุน · ดู Log' },
    ],
  },
  {
    id: 'demo',
    title: '🎬 Demo ของจริง',
    subtitle: 'ลองใช้เลย',
    steps: [
      '1. ถาม AI Chat → บอกสถานะระบบทันที',
      '2. ดู Agents → เห็น AI ตัวไหน Active',
      '3. ดู Executions → ดู log ล่าสุด',
      '4. ลองสั่งงานผิดกฎ → ระบบบอกทันที',
      '5. ดูผลลัพธ์ → ทุกอย่างถูกบันทึก',
    ],
  },
  {
    id: 'roi',
    title: '💰 ผลลัพธ์ทางธุรกิจ',
    subtitle: 'ลงทุนได้คืนในเร็วๆ นี้',
    metrics: [
      { before: '4-6 ชม', after: '15 นาที', label: 'เวลาตอบลูกค้า' },
      { before: 'คน 3 คน', after: 'คน 1 คน + AI', label: 'ทีมรองรับงาน' },
      { before: 'ซ้ำ ๆ 50%', after: '5%', label: 'งานซ้ำ' },
      { before: 'ตามไม่ได้', after: 'เรียลไทม์', label: 'ติดตามงาน' },
      { before: 'ไม่เจาะจง', after: 'คิดค่าเฉพาะ task', label: 'ต้นทุน AI' },
    ],
  },
  {
    id: 'summary',
    title: '✅ สรุป',
    subtitle: 'DSG ONE = AI Control Plane',
    bullets: [
      'รันบน Cloud (Vercel) ไม่ต้องติดตั้ง',
      'เชื่อม Supabase + Stripe เลย',
      'ทำงานได้ตั้งแต่วันนี้',
      'จ่ายยิ่งใช้ยิ่งคุ้ม',
    ],
  },
];

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = SLIDES[currentSlide];

  return (
    <div className="flex h-screen flex-col bg-[#07080b] text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-xs font-bold text-black">
            DSG
          </div>
          <span className="text-sm font-medium text-slate-400">Presentation Mode</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            {currentSlide + 1} / {SLIDES.length}
          </span>
          <button
            onClick={() => window.close()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Slide Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">{slide.title}</h1>
        <p className="mt-3 text-lg text-slate-400">{slide.subtitle}</p>

        {/* Problem bullets */}
        {slide.bullets && (
          <ul className="mt-8 space-y-4 text-left text-lg">
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Highlight */}
        {slide.highlight && (
          <div className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-6 py-3 text-sm text-emerald-200">
            {slide.highlight}
          </div>
        )}

        {/* Architecture diagram */}
        {slide.diagram && (
          <pre className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-6 text-left text-sm font-mono text-emerald-300 whitespace-pre">
            {slide.diagram}
          </pre>
        )}

        {/* Capability boxes */}
        {slide.boxes && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {slide.boxes.map((box, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-3xl">{box.icon}</div>
                <h3 className="mt-3 text-base font-semibold">{box.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{box.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Demo steps */}
        {slide.steps && (
          <ol className="mt-8 space-y-3 text-left text-base">
            {slide.steps.map((step, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-4 py-3">
                <span className="text-slate-300">{step}</span>
              </li>
            ))}
          </ol>
        )}

        {/* ROI metrics */}
        {slide.metrics && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3 md:grid-cols-5">
            {slide.metrics.map((m, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="text-xs text-slate-500">{m.label}</div>
                <div className="mt-2 line-through text-sm text-rose-400">{m.before}</div>
                <div className="text-lg font-bold text-emerald-400">{m.after}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Navigation */}
      <footer className="flex items-center justify-between border-t border-white/10 px-6 py-3">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
        >
          ← ก่อนหน้า
        </button>
        {/* Slide dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 w-2 rounded-full transition ${
                i === currentSlide ? 'bg-emerald-400' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrentSlide(Math.min(SLIDES.length - 1, currentSlide + 1))}
          disabled={currentSlide === SLIDES.length - 1}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-30"
        >
          ถัดไป →
        </button>
      </footer>
    </div>
  );
}
