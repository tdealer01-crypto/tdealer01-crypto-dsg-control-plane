import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EU AI Act Compliance for AI Agents — DSG ONE',
  description:
    'EU AI Act บังคับใช้แล้ว AI agent ต้องมี audit trail, human oversight และ real-time intervention. DSG ONE ต่อ 1 บรรทัด ผ่าน compliance ได้เลย ไม่รื้อระบบเดิม',
};

const COMPARISON = [
  { tool: 'LangSmith', audit: true, block: false, art14: false, math: false },
  { tool: 'Langfuse', audit: true, block: false, art14: false, math: false },
  { tool: 'DataDog / Log tools', audit: true, block: false, art14: false, math: false },
  { tool: 'DSG ONE', audit: true, block: true, art14: true, math: true, highlight: true },
];

const ARTICLES = [
  {
    id: 'Art. 9',
    title: 'Risk Management',
    requirement: 'ต้องมีระบบป้องกันความเสี่ยงก่อนเกิดเหตุ ไม่ใช่แค่ log หลังเกิด',
    dsg: 'Gate ทุก action ก่อน execute — บล็อกทันทีถ้า risk สูง',
  },
  {
    id: 'Art. 12',
    title: 'Record Keeping',
    requirement: 'บันทึกทุก action ของ AI พร้อม timestamp และ context',
    dsg: 'Cryptographic audit trail — ทุก action มี hash พิสูจน์ได้ว่าไม่ถูกแก้ไข',
  },
  {
    id: 'Art. 14',
    title: 'Human Oversight',
    requirement: 'มนุษย์ต้องสามารถ intervene และหยุด AI ได้ทันที',
    dsg: 'BLOCK response + approval workflow — หยุด agent ได้ก่อนเกิดความเสียหาย',
  },
];

const FRAMEWORKS = [
  { name: 'LangChain', code: `from dsg_one import DSGGate\nchain = DSGGate(chain)` },
  { name: 'OpenAI Agents SDK', code: `import { DSGGate } from "@dsg-one/sdk"\nconst agent = DSGGate(agent)` },
  { name: 'CrewAI', code: `from dsg_one import DSGGate\ncrew = DSGGate(crew)` },
];

export default function EUAIActPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      {/* Hero */}
      <section className="border-b border-red-500/20 bg-gradient-to-b from-red-950/40 to-slate-950 px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-4 inline-block rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-sm font-semibold text-red-300">
            EU AI Act บังคับใช้แล้ว — องค์กรของคุณพร้อมหรือยัง?
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            AI agent ของคุณ<br />
            <span className="text-red-400">ทำอะไรอยู่ — คุณรู้มั้ย?</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            เครื่องมืออื่นบอกหลังเกิดเหตุ<br />
            <strong className="text-white">DSG ONE บล็อกก่อนเกิดความเสียหาย</strong> พร้อม audit trail ที่พิสูจน์ได้ทางคณิตศาสตร์
          </p>
          <p className="mt-3 text-slate-400">ต่อ 1 บรรทัด ผ่าน EU AI Act Articles 9, 12, 14 ได้เลย — ไม่รื้อระบบเดิม</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/request-access"
              className="rounded-xl bg-emerald-400 px-8 py-3.5 font-bold text-black hover:bg-emerald-300"
            >
              ขอ Free Access →
            </Link>
            <Link
              href="/ai-compliance"
              className="rounded-xl border border-slate-600 px-8 py-3.5 font-bold text-slate-200 hover:border-slate-400"
            >
              ดู Compliance Evidence
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-black">เปรียบเทียบกับเครื่องมืออื่น</h2>
          <p className="mb-10 text-center text-slate-400">
            กล้องวงจรปิด = รู้ว่าโจรเข้ามาแล้ว &nbsp;|&nbsp; DSG ONE = ยาม + กล้อง — หยุดก่อนเข้า พร้อมหลักฐาน
          </p>
          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700 bg-slate-800 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-4">เครื่องมือ</th>
                  <th className="px-5 py-4 text-center">Audit Trail</th>
                  <th className="px-5 py-4 text-center">บล็อกก่อนทำ</th>
                  <th className="px-5 py-4 text-center">ผ่าน Art.14</th>
                  <th className="px-5 py-4 text-center">พิสูจน์ทางคณิตฯ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {COMPARISON.map((row) => (
                  <tr
                    key={row.tool}
                    className={row.highlight ? 'bg-emerald-950/40' : 'hover:bg-slate-800/40'}
                  >
                    <td className={`px-5 py-4 font-semibold ${row.highlight ? 'text-emerald-300' : 'text-slate-200'}`}>
                      {row.highlight && <span className="mr-2 text-emerald-400">★</span>}
                      {row.tool}
                    </td>
                    {(['audit', 'block', 'art14', 'math'] as const).map((key) => (
                      <td key={key} className="px-5 py-4 text-center text-lg">
                        {row[key] ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-slate-600">✗</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* EU AI Act Articles */}
      <section className="bg-slate-900/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-black">DSG ONE ครอบคลุมทุก Article</h2>
          <p className="mb-12 text-center text-slate-400">ต่อ DSG ONE 1 บรรทัด — ผ่านข้อกำหนดหลักทั้ง 3 ของ EU AI Act</p>
          <div className="grid gap-6 md:grid-cols-3">
            {ARTICLES.map((a) => (
              <div key={a.id} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
                <div className="mb-3 inline-block rounded-lg bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  {a.id}
                </div>
                <h3 className="mb-2 text-lg font-bold">{a.title}</h3>
                <p className="mb-4 text-sm text-slate-400">{a.requirement}</p>
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm font-medium text-emerald-300">DSG ONE: {a.dsg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prevention vs Detection */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-black">Prevention ≠ Detection</h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="mb-1 text-sm font-bold text-red-400">เครื่องมืออื่น — Detection</div>
                  <p className="text-sm text-slate-300">รู้ว่า agent ลบ production database ไปแล้ว<br />แต่ข้อมูลหายไปแล้ว ไม่สามารถย้อนกลับได้</p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="mb-1 text-sm font-bold text-emerald-400">DSG ONE — Prevention</div>
                  <p className="text-sm text-slate-300">บล็อก action ก่อนที่ agent จะลบ<br />แจ้งเตือน + บันทึกหลักฐาน ในเวลาเดียวกัน</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
              <div className="mb-4 text-sm font-bold text-slate-400">CRYPTOGRAPHIC PROOF</div>
              <div className="space-y-2 font-mono text-xs text-emerald-300">
                <div>action: &quot;delete_table&quot;</div>
                <div>decision: <span className="text-red-400">BLOCK</span></div>
                <div>timestamp: 2026-05-18T04:32:00Z</div>
                <div>requestHash: <span className="text-slate-400">sha256:8f3a2b...</span></div>
                <div>recordHash: <span className="text-slate-400">sha256:1c9d4e...</span></div>
                <div className="pt-2 text-slate-400"># ไม่มีใครแก้ย้อนหลังได้</div>
                <div className="text-slate-400"># พิสูจน์ได้ทางคณิตศาสตร์</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Code — 1 line setup */}
      <section className="bg-slate-900/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center text-3xl font-black">ต่อ 1 บรรทัด ไม่รื้อระบบเดิม</h2>
          <p className="mb-10 text-center text-slate-400">ระบบ AI agent ที่มีอยู่ยังทำงานเหมือนเดิม — DSG ONE เพิ่มชั้นป้องกันเข้าไปเท่านั้น</p>
          <div className="grid gap-6 md:grid-cols-3">
            {FRAMEWORKS.map((fw) => (
              <div key={fw.name} className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
                <div className="mb-3 text-sm font-bold text-slate-300">{fw.name}</div>
                <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">{fw.code}</pre>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ICP */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-10 text-center text-3xl font-black">ใครต้องใช้ DSG ONE บ้าง</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: '🏦', title: 'Fintech / ธนาคาร', desc: 'AI agent จัดการธุรกรรม — ต้องมี audit trail + block unauthorized actions ตาม BOT / SEC' },
              { icon: '📋', title: 'กำลัง Audit SOC 2 / ISO 42001', desc: 'Auditor ต้องการหลักฐานว่า AI ทำอะไรและถูกควบคุมอย่างไร — DSG ONE ให้ evidence package ได้เลย' },
              { icon: '🇹🇭', title: 'บริษัทไทยกับ PDPA', desc: 'AI agent ที่จัดการข้อมูลส่วนตัว — ต้องบันทึกว่าใครเข้าถึงอะไร เมื่อไหร่ ทำไม' },
            ].map((icp) => (
              <div key={icp.title} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
                <div className="mb-3 text-3xl">{icp.icon}</div>
                <h3 className="mb-2 font-bold">{icp.title}</h3>
                <p className="text-sm text-slate-400">{icp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-emerald-500/20 bg-emerald-950/20 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-black">พร้อม compliance ใน 5 นาที</h2>
          <p className="mb-8 text-slate-300">
            ทีมเราจะช่วย setup และ verify ว่าระบบของคุณผ่าน EU AI Act Article 9, 12, 14<br />
            ฟรี ไม่มีค่าใช้จ่าย ทดลองใช้ได้เลย
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/request-access"
              className="rounded-xl bg-emerald-400 px-8 py-4 text-lg font-bold text-black hover:bg-emerald-300"
            >
              ขอ Free Access →
            </Link>
            <Link
              href="/ai-compliance"
              className="rounded-xl border border-slate-600 px-8 py-4 text-lg font-bold text-slate-200 hover:border-slate-400"
            >
              ดู Compliance Evidence
            </Link>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            ไม่ต้องใส่บัตรเครดิต · Setup ใน 5 นาที · ไม่รื้อระบบเดิม
          </p>
        </div>
      </section>

    </main>
  );
}
