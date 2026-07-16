// AI Chat trial endpoint — no auth required for demo.
// Uses real LLM models: OpenRouter (primary) → NVIDIA (fallback)

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are DSG Assistant, a helpful AI that explains DSG ONE / ProofGate AI control plane.
Be concise, factual, and helpful. Support Thai language responses.
Explain product features, governance, security, and how to get started.`;

const FALLBACK_RESPONSE = `สวัสดีครับ ผมคือ DSG Assistant สามารถช่วยคุณได้ดังนี้:

1. 🔍 ตรวจสอบความพร้อมของระบบ (readiness check)
2. 👥 ดูรายชื่อ AI Agents ที่ลงทะเบียนไว้
3. 📊 ดูประวัติการดำเนินการล่าสุด
4. 💰 ตรวจสอบความจุและการใช้งาน
5. 🔧 ปรับแต่ง workflow rules

ลองถามคำถามเกี่ยวกับระบบ เช่น "ระบบทำงานอย่างไร" หรือ "ตรวจสอบความพร้อม"`;

async function callOpenRouter(message: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL_CHAT || 'openai/gpt-oss-120b:free';
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
        'X-Title': 'DSG ONE Assistant',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 700,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.warn(`[try/chat] OpenRouter ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log('[try/chat] OpenRouter response:', model);
      return content;
    }
  } catch (err) {
    console.warn('[try/chat] OpenRouter error:', err);
  }
  return null;
}

async function callNvidia(message: string): Promise<string | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  const model = process.env.NVIDIA_MODEL_CHAT || 'nvidia/nemotron-3-ultra-550b-a55b';
  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
        max_tokens: 700,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.warn(`[try/chat] NVIDIA ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (content) {
      console.log('[try/chat] NVIDIA/Nemotron response:', model);
      return content;
    }
  } catch (err) {
    console.warn('[try/chat] NVIDIA error:', err);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = String(body.message || '').trim();

    if (!message) {
      return NextResponse.json({
        error: 'message is required',
        reply: 'ให้กรุณาพิมพ์คำถามหรือข้อความ',
      }, { status: 400 });
    }

    // Try OpenRouter first
    let response = await callOpenRouter(message);

    // Fallback to NVIDIA if OpenRouter unavailable
    if (!response) {
      response = await callNvidia(message);
    }

    // Fallback to hardcoded response if all LLM backends unavailable
    if (!response) {
      response = FALLBACK_RESPONSE;
    }

    return NextResponse.json({
      ok: true,
      reply: response,
      timestamp: new Date().toISOString(),
      meta: {
        provider: process.env.OPENROUTER_API_KEY ? 'openrouter' : (process.env.NVIDIA_API_KEY ? 'nvidia' : 'fallback'),
        mode: 'llm',
      },
    });
  } catch (err) {
    console.error('[try/chat] Error:', err);
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }
}
