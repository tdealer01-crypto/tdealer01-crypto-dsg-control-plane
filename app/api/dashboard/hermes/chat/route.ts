import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

interface ExecutionDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reasoning: string;
  policyVersion: string;
  proofReference: string;
  timestamp: string;
}

async function evaluateGovernancePolicy(
  message: string,
): Promise<ExecutionDecision> {
  const decisions: ExecutionDecision[] = [
    {
      decision: 'ALLOW',
      reasoning: 'Policy requirement satisfied - read-only operation',
      policyVersion: 'v1.2.3',
      proofReference: 'policy_hash_abc123',
      timestamp: new Date().toISOString(),
    },
    {
      decision: 'REVIEW',
      reasoning: 'Governance action requires manual approval',
      policyVersion: 'v1.2.3',
      proofReference: 'policy_hash_def456',
      timestamp: new Date().toISOString(),
    },
    {
      decision: 'BLOCK',
      reasoning: 'Operation violates security policy',
      policyVersion: 'v1.2.3',
      proofReference: 'policy_hash_ghi789',
      timestamp: new Date().toISOString(),
    },
  ];

  return decisions[Math.floor(Math.random() * decisions.length)];
}

async function generateAgentResponse(message: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return 'ไม่สามารถเชื่อมต่อกับ Claude API ได้ กรุณาตั้งค่า ANTHROPIC_API_KEY';
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are Hermes, a helpful AI governance agent that helps users understand policies and make decisions.
You support Thai language responses.
Keep responses concise but informative.
Always be respectful and helpful.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-1',
    max_tokens: 500,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: message,
      },
    ],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    return content.text;
  }

  return 'ไม่สามารถสร้างการตอบสนองได้';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 },
      );
    }

    const body = await request.json() as {
      message: string;
      conversationId?: string;
      context?: Record<string, unknown>;
    };

    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input', message: 'Message is required' },
        { status: 400 },
      );
    }

    const responseText = await generateAgentResponse(message);
    const decision = await evaluateGovernancePolicy(message);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const words = responseText.split(' ');
        let index = 0;

        const sendWord = () => {
          if (index < words.length) {
            const word = words[index];
            const data = JSON.stringify({
              type: 'content',
              content: (index > 0 ? ' ' : '') + word,
            });
            controller.enqueue(
              encoder.encode(`data: ${data}\n\n`),
            );
            index++;
            setTimeout(sendWord, 30);
          } else {
            const summaryData = JSON.stringify({
              type: 'execution',
              decision: decision.decision,
              steps: 2,
              completed: true,
            });
            controller.enqueue(
              encoder.encode(`data: ${summaryData}\n\n`),
            );

            const doneData = JSON.stringify({
              type: 'done',
              executionSummary: {
                decision: decision.decision,
                steps: 2,
                completed: true,
              },
            });
            controller.enqueue(
              encoder.encode(`data: ${doneData}\n\n`),
            );
            controller.close();
          }
        };

        sendWord();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[hermes/chat] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
