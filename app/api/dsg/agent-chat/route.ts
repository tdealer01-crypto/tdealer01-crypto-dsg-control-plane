import { NextResponse } from 'next/server';
import { runOpenAIAdapter, type OpenAIChatMessage } from '@/lib/dsg/ai/openai-adapter';

export const runtime = 'nodejs';

type ChatBody = {
  message?: string;
  context?: {
    stage?: string;
    idea?: string;
    features?: string[];
    notes?: string[];
  };
};

function buildMessages(body: ChatBody): OpenAIChatMessage[] {
  const message = body.message?.trim();
  if (!message) throw new Error('AGENT_CHAT_MESSAGE_REQUIRED');

  return [
    {
      role: 'developer',
      content: [
        'You are DSG ONE V1 Agent, an enterprise governed app-builder assistant.',
        'Answer the user directly and specifically. Do not repeat a fixed script.',
        'Use concise Thai unless the user asks for English.',
        'When the user wants to build something, ask at most one useful follow-up or propose concrete features.',
        'Respect the DSG truth boundary: do not claim deploy, production verification, audit proof, or PR evidence unless the UI/API has produced it.',
        'Prefer actionable next steps the user can click or verify in the app.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        userMessage: message,
        appBuilderContext: body.context ?? {},
      }),
    },
  ];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as ChatBody | null;
    if (!body?.message?.trim()) {
      return NextResponse.json({ ok: false, error: { message: 'AGENT_CHAT_MESSAGE_REQUIRED' } }, { status: 400 });
    }

    const result = await runOpenAIAdapter({
      messages: buildMessages(body),
      maxOutputTokens: 700,
      temperature: 0.25,
    });

    return NextResponse.json({
      ok: true,
      data: {
        reply: result.outputText || 'ผมยังตอบไม่ได้จากโมเดลในรอบนี้ ลองพิมพ์รายละเอียดเพิ่มอีกครั้งครับ',
        model: result.model,
        responseId: result.responseId,
        usage: result.usage,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: { message: error instanceof Error ? error.message : 'AGENT_CHAT_FAILED' },
    }, { status: 400 });
  }
}
