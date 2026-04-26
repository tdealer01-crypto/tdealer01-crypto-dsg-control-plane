import { NextResponse } from 'next/server';

const SUGGESTIONS = [
  'ดู pricing และเลือกแพ็กเกจ',
  'ขอ demo หรือ request access',
  'อธิบาย DSG Agent และ runtime approval',
  'เข้าสู่ระบบเพื่อใช้ dashboard และ agent execution',
];

function publicReply(message: string) {
  const lower = message.toLowerCase();

  if (/price|pricing|ราคา|แพ็ก|แพค|plan/.test(lower)) {
    return 'ดูราคาและแพ็กเกจได้ที่ /pricing ครับ ถ้าต้องการใช้งานจริง แนะนำเริ่มจาก request access แล้วค่อยเปิด dashboard หลังล็อกอิน';
  }

  if (/demo|access|สมัคร|เริ่ม|start|signup|sign up/.test(lower)) {
    return 'เริ่มได้ที่ /request-access หรือ /signup ครับ ถ้าคุณมีบัญชีแล้วให้เข้า /login เพื่อเปิด dashboard และใช้ DSG Agent แบบมี audit/approval';
  }

  if (/agent|chatbot|bot|แชท|บอท|เอเจนต์/.test(lower)) {
    return 'DSG Agent ช่วยวางแผน ตรวจ readiness และจัดการ agent workflow ได้ แต่ action จริง เช่น สร้าง agent หรือ execute runtime ต้องล็อกอินและผ่าน approval gate ก่อน เพื่อมี audit/ledger ครบ';
  }

  if (/readiness|health|status|สถานะ/.test(lower)) {
    return 'หน้า public ตรวจ health/readiness พื้นฐานได้ แต่ข้อมูล runtime ลึก ๆ ต้องล็อกอิน dashboard ก่อน เพื่อป้องกันข้อมูลภายในและรักษา audit trail';
  }

  return 'สวัสดีครับ ผมคือ DSG public assistant ถามเรื่อง DSG Agent, pricing, demo, request access หรือวิธีเข้า dashboard ได้เลยครับ';
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = String(body?.message || '').trim();

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    mode: 'public_chat',
    reply: publicReply(message),
    safety: {
      authenticated_actions: false,
      execution_allowed: false,
      login_required_for_runtime: true,
    },
    suggestions: SUGGESTIONS,
  });
}
