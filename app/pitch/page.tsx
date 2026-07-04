"use client";

import { useState } from "react";
import Link from "next/link";

const SLIDES = [
  {
    id: "cover",
    title: "DSG ONE: AI Control Plane",
    subtitle: "Deterministic Governance for Enterprise AI",
    accent: "Accenture Thailand — July 2026",
    logo: true,
  },
  {
    id: "problem",
    title: "ปัญหา: AI Governance Gap",
    subtitle: "องค์กรใช้ AI เยอะขึ้น แต่การควบคุมตามไม่ทัน",
    metrics: [
      { label: "AI Adoption", value: "85%", desc: "องค์กรใช้ AI อย่างน้อย 1 ระบบ" },
      { label: "Governance Ready", value: "12%", desc: "มีระบบควบคุม AI จริง" },
      { label: "Compliance Risk", value: "High", desc: "EU AI Act, ISO 42001, NIST AI RMF" },
      { label: "Audit Trail", value: "Missing", desc: "ไม่มีหลักฐานการตัดสินใจ AI" },
    ],
  },
  {
    id: "solution",
    title: "DSG ONE = AI Control Plane",
    subtitle: "ศูนย์ควบคุม AI แบบ Deterministic — เดียวกันทั้งองค์กร",
    pillars: [
      { icon: "🛡️", title: "Policy Gate", desc: "ตรวจสอบทุกการกระทำ AI ก่อน execute" },
      { icon: "🔗", title: "Replay Protection", desc: "Same input → Same decision ทุกครั้ง" },
      { icon: "📋", title: "Immutable Audit", desc: "Hash-chained evidence ต่อการตัดสินใจ" },
      { icon: "💰", title: "Cost Governance", desc: "ดูต้นทุน AI ต่อ task/decision แบบ Real-time" },
      { icon: "🔐", title: "Credential Broker", desc: "จัดการ secrets/API keys แบบปลอดภัย" },
      { icon: "⚡", title: "Skills Marketplace", desc: "Governance workflows สำเร็จรูป (Finance, Dev, Compliance, Ops)" },
    ],
  },
  {
    id: "architecture",
    title: "Architecture: Enterprise-Grade",
    subtitle: "รันบน Vercel + Supabase + Stripe — Zero Ops",
    diagram: `
┌─────────────────────────────────────────────────────────────┐
│                      Accenture Client                        │
├─────────────────────────────────────────────────────────────┤
│                    DSG ONE Control Plane                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  AI Chat     │  │ Policy Gate  │  │  Dashboard       │   │
│  │  (Mind)      │  │  (Z3 SMT)    │  │  (Real-time)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              🔐 Auth │ 📋 Audit Log (WORM)             │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  ☁️ Supabase (PostgreSQL + pgvector)  │  💳 Stripe    │   │
│  │  🔴 Upstash Redis (Rate Limit)       │  🌐 Vercel    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
    `,
  },
  {
    id: "compliance",
    title: "Compliance Ready: Day 1",
    subtitle: "รองรับ Framework หลัก 3 ตัวแบบ Built-in",
    frameworks: [
      { name: "EU AI Act", status: "Article 12/14 + Annex IV", color: "blue", features: ["Risk classification", "Conformity assessment", "Post-market monitoring", "Technical documentation"] },
      { name: "ISO 42001", status: "AI Management System", color: "violet", features: ["AI policy framework", "Risk treatment", "Performance evaluation", "Continual improvement"] },
      { name: "NIST AI RMF", status: "Govern, Map, Measure, Manage", color: "emerald", features: ["Govern: Culture & policy", "Map: Context & risks", "Measure: Metrics & testing", "Manage: Prioritization & action"] },
    ],
  },
  {
    id: "evidence",
    title: "Evidence Chain: Cryptographic Proof",
    subtitle: "ทุก Decision มีหลักฐานที่ Verify ได้ — ไม่ต้องเชื่อ ให้ Check เอง",
    evidence: [
      { label: "Input Hash", value: "SHA-256(request)", desc: "คำสั่งที่ส่งเข้าไป — ไม่ปลอมแปลงได้" },
      { label: "Constraint Hash", value: "SHA-256(policies)", desc: "กฎที่ใช้ตัดสิน — versioned & immutable" },
      { label: "Proof Hash", value: "SHA-256(Z3 proof)", desc: "Formal verification output" },
      { label: "Record Hash", value: "SHA-256(decision)", desc: "ผลลัพธ์ + audit_id" },
      { label: "Bundle Hash", value: "SHA-256(chain)", desc: "Hash chain ทั้งหมด — tamper-evident" },
    ],
  },
  {
    id: "roi",
    title: "Business Impact: Measurable",
    subtitle: "ตัวเลขจาก Production Deployment (Jun 2026)",
    metrics: [
      { label: "Gate Evaluations", value: "1,672+/sec", desc: "TypeScript strict, 0 errors" },
      { label: "Test Coverage", value: "100% unit", desc: "1,672 passing, 64 skipped" },
      { label: "CCVS Mutation", value: "72.08%", desc: "Compliance verification suite" },
      { label: "Marketplace", value: "DEPLOYED", desc: "Stripe Connect v2 live" },
      { label: "Uptime", value: "99.9%+", desc: "Vercel Edge + Supabase" },
      { label: "Time to Value", value: "< 1 hour", desc: "API key → First governed decision" },
    ],
  },
  {
    id: "pricing",
    title: "Pricing: Transparent & Scalable",
    subtitle: "จ่ายตามใช้ ไม่มีค่าแอบแฝง",
    tiers: [
      { name: "Free", price: "$0", period: "/mo", desc: "1,000 eval/mo, 7-day audit, Community", cta: "Start Free" },
      { name: "Pro", price: "$99", period: "/mo", desc: "100K eval/mo, 90-day audit, Team (5), SSO, 14-day trial", cta: "Start Trial", highlight: true },
      { name: "Business", price: "$199", period: "/mo", desc: "Unlimited Delivery Proof, White-label, Team (5), 14-day trial", cta: "Start Trial" },
      { name: "Enterprise", price: "$499", period: "/mo", desc: "Unlimited eval, 365-day audit, 24/7 support, On-prem option, Custom SLA", cta: "Contact Sales" },
    ],
  },
  {
    id: "next-steps",
    title: "Next Steps for Accenture",
    subtitle: "เริ่มได้วันนี้ — ไม่ต้องรอ",
    steps: [
      "1. สร้าง API Key ที่ /dashboard/api-keys (ฟรี 1,000 eval/เดือน)",
      "2. ลอง Policy Gate: POST /api/dsg/v1/gates/evaluate",
      "3. ดู Audit Trail: GET /api/dsg/v1/proofs/prove",
      "4. ทดสอบ Compliance: /compliance-evidence-pack",
      "5. Upgrade เป็น Pro/Enterprise เมื่อพร้อม Scale",
    ],
    cta: "Live Demo: https://tdealer01-crypto-dsg-control-plane.vercel.app",
  },
];

export default function PitchPage() {
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
          <span className="text-sm font-medium text-slate-400">Accenture Pitch — Confidential</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            {currentSlide + 1} / {SLIDES.length}
          </span>
        </div>
      </header>

      {/* Slide Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center overflow-y-auto">
        {slide.logo && (
          <div className="mb-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 mx-auto text-2xl font-bold text-black">
              DSG ONE
            </div>
          </div>
        )}

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{slide.title}</h1>
        <p className="text-lg text-slate-400 max-w-2xl mb-8">{slide.subtitle}</p>

        {/* Metrics Grid (Problem slide) */}
        {slide.metrics && !slide.evidence && !slide.frameworks && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 max-w-5xl w-full">
            {slide.metrics.map((m, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-xs text-slate-500 uppercase tracking-wide">{m.label}</div>
                <div className="mt-2 text-3xl font-bold text-emerald-400">{m.value}</div>
                <div className="mt-1 text-sm text-slate-400">{m.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pillars Grid (Solution slide) */}
        {slide.pillars && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 max-w-5xl w-full">
            {slide.pillars.map((p, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left">
                <div className="text-3xl">{p.icon}</div>
                <h3 className="mt-3 text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{p.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Architecture Diagram */}
        {slide.diagram && (
          <pre className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-6 text-left text-sm font-mono text-emerald-300 whitespace-pre max-w-4xl w-full">
            {slide.diagram}
          </pre>
        )}

        {/* Compliance Frameworks */}
        {slide.frameworks && (
          <div className="grid gap-4 md:grid-cols-3 max-w-5xl w-full">
            {slide.frameworks.map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{f.color === "blue" ? "🇪🇺" : f.color === "violet" ? "📐" : "🇺🇸"}</span>
                  <span className="text-lg font-bold text-white">{f.name}</span>
                </div>
                <div className="text-xs text-slate-400 mb-3">{f.status}</div>
                <ul className="space-y-1 text-sm text-slate-300">
                  {f.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Evidence Chain */}
        {slide.evidence && (
          <div className="space-y-3 max-w-3xl w-full">
            {slide.evidence.map((e, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-emerald-400">{e.label}</span>
                  <span className="font-mono text-sm text-slate-300">{e.value}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 ml-10">{e.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* ROI Metrics */}
        {slide.metrics && slide.evidence === undefined && slide.frameworks === undefined && slide.pillars === undefined && (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 max-w-5xl w-full">
            {slide.metrics.map((m, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="text-xs text-slate-500 uppercase tracking-wide">{m.label}</div>
                <div className="mt-2 text-3xl font-bold text-emerald-400">{m.value}</div>
                <div className="mt-1 text-sm text-slate-400">{m.desc}</div>
              </div>
            ))}
          </div>
        )}

        {/* Pricing Tiers */}
        {slide.tiers && (
          <div className="grid gap-4 md:grid-cols-4 max-w-6xl w-full">
            {slide.tiers.map((t, i) => (
              <div key={i} className={`rounded-2xl transition-all p-6 ${
                t.highlight
                  ? 'border-emerald-400/50 bg-emerald-400/10 ring-1 ring-emerald-400/30'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}>
                {t.highlight && (
                  <div className="mb-4 text-center">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider bg-emerald-400/20 px-2 py-0.5 rounded">MOST POPULAR</span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-white">{t.name}</h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-white">{t.price}</span>
                  <span className="text-lg text-slate-400">{t.period}</span>
                </div>
                <p className="mt-4 text-sm text-slate-400 text-center">{t.desc}</p>
                <button className={`mt-6 w-full py-3 rounded-xl font-bold transition ${
                  t.highlight
                    ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}>
                  {t.cta}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Next Steps */}
        {slide.steps && (
          <div className="mt-8 space-y-3 text-left max-w-2xl w-full">
            {slide.steps.map((step, i) => (
              <div key={i} className="rounded-xl bg-white/[0.02] px-4 py-3 border border-white/10">
                <span className="text-slate-300">{step}</span>
              </div>
            ))}
            {slide.cta && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 text-center font-mono text-sm">
                {slide.cta}
              </div>
            )}
          </div>
        )}

        {/* Footer accent */}
        {slide.accent && (
          <div className="mt-12 text-xs text-slate-500">
            {slide.accent}
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