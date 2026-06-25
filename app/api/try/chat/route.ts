// AI Chat trial endpoint — no auth required for demo.
// Returns structured response showing AI agent reasoning.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEMO_RESPONSES: Record<string, string> = {
  'default': `สวัสดีครับ ผมคือ DSG Agent สามารถช่วยคุณได้ดังนี้:

1. 🔍 ตรวจสอบความพร้อมของระบบ (readiness check)
2. 👥 ดูรายชื่อ AI Agents ที่ลงทะเบียนไว้
3. 📊 ดูประวัติการดำเนินการล่าสุด
4. 💰 ตรวจสอบความจุและการใช้งาน
5. 🔧 ปรับแต่ง workflow rules

ลองถามคำถามเกี่ยวกับระบบ เช่น "ระบบทำงานอย่างไร" หรือ "ตรวจสอบความพร้อม"`,

  'readiness': `✅ ระบบพร้อมทำงาน

📊 สถานะระบบ:
   • Core Service: ✅ Online
   • Database: ✅ Connected (Supabase PostgreSQL)
   • AI Engine: ✅ OW Alpha model active
   • Rate Limiter: ✅ Operational

⏱  Uptime: 99.97%
📈 Requests today: 1,247
⚡ Avg latency: 420ms`,

  'agents': `👥 AI Agents ที่ลงทะเบียนไว้:

1. 🤖 DSG Agent v2
   สถานะ: Active | Model: OWL Alpha
   หน้าที่: ประสานงานหลัก

2. 🛡 Gate Agent
   สถานะ: Active | Model: deepseek-r1
   หน้าที่: ตรวจสอบ policy + อนุมัติ actions

3. 🔍 Audit Agent
   สถานะ: Active | Model: OWL Alpha
   หน้าที่: บันทึกและตรวจสอบ audit trail

4. 💬 Chat Agent  
   สถานะ: Active | Model: fusion
   หน้าที่: ตอบคำถามและสนับสนุนผู้ใช้`,

  'executions': `📊 การดำเนินการล่าสุด (Last 5):

⏰ 08:32 | ✅ ALLOW | Agent v2: สร้างรายงานประจำวัน
⏰ 08:30 | ✅ ALLOW | Chat Agent: ตอบคำถามลูกค้า
⏰ 08:28 | ❌ BLOCK | Agent v2: ลบข้อมูลทั้งหมด (policy violation)
⏰ 08:25 | ✅ ALLOW | Audit Agent: สรุป log รายวัน
⏰ 08:20 | ✅ ALLOW | Gate Agent: อนุมัติ workflow restart

📈 Stats today:
   • Total: 247 actions
   • ALLOW: 231 (93.5%)
   • BLOCK: 16 (6.5%)
   • Success rate: 93.5%`,

  'capacity': `💰 ความจุและการใช้งาน:

📊 Current Plan: Trial
   • Executions: 247 / unlimited (trial)
   • Executions left: unlimited
   • Rate limit: 60 req/min
   • Active sessions: 3

🔋 Resource Usage:
   • Compute: 12% utilized
   • Storage: 850 MB / 5 GB
   • Bandwidth: 2.1 GB / unlimited

💡 Tip: Upgrade to Production สำหรับ API key, unlimited rate, และ SLA guarantee`,
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = String(body.message || '').trim();

    if (!message) {
      return NextResponse.json({
        error: 'message is required',
        hint: 'Try: readiness, agents, executions, capacity',
      }, { status: 400 });
    }

    const lower = message.toLowerCase();

    let response: string;
    if (lower.includes('readiness') || lower.includes('สถานะ') || lower.includes('พร้อม') || lower.includes('ตรวจสอบ')) {
      response = DEMO_RESPONSES.readiness;
    } else if (lower.includes('agent') || lower.includes('ตัวแทน') || lower.includes('ชื่อ')) {
      response = DEMO_RESPONSES.agents;
    } else if (lower.includes('execution') || lower.includes('การดำเนินการ') || lower.includes('log') || lower.includes('ประวัติ')) {
      response = DEMO_RESPONSES.executions;
    } else if (lower.includes('capacity') || lower.includes('ความจุ') || lower.includes('usage') || lower.includes('การใช้งาน')) {
      response = DEMO_RESPONSES.capacity;
    } else {
      response = DEMO_RESPONSES.default;
    }

    return NextResponse.json({
      ok: true,
      response,
      timestamp: new Date().toISOString(),
      meta: {
        model: 'OWL Alpha',
        mode: 'demo',
        note: 'นี่คือ demo response — production จะใช้ LLM จริง',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}
