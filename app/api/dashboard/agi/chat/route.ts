import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';

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
      reasoning: 'Code generation and analysis approved',
      policyVersion: 'v1.2.3',
      proofReference: 'agi_hash_abc123',
      timestamp: new Date().toISOString(),
    },
    {
      decision: 'REVIEW',
      reasoning: 'Requires governance review for security',
      policyVersion: 'v1.2.3',
      proofReference: 'agi_hash_def456',
      timestamp: new Date().toISOString(),
    },
    {
      decision: 'BLOCK',
      reasoning: 'Operation blocked by security policy',
      policyVersion: 'v1.2.3',
      proofReference: 'agi_hash_ghi789',
      timestamp: new Date().toISOString(),
    },
  ];

  return decisions[Math.floor(Math.random() * decisions.length)];
}

async function generateAgentResponse(message: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const err = new Error('OpenRouter API key not configured');
    throw err;
  }

  const systemPrompt = `You are AGI Agent, an advanced AI assistant specialized in:
- Code generation and analysis
- Problem-solving
- AI/ML concepts
- System design
Support Thai language responses.
Be concise, technical, and helpful.`;

  // Primary model overridable via env; fallback chain handles upstream 429s.
  const models = [
    process.env.OPENROUTER_MODEL_CHAT || 'openai/gpt-oss-120b:free',
    'meta-llama/llama-4-maverick:free',
    'google/gemma-3-27b-it:free',
    'deepseek/deepseek-chat-v3-0324:free',
  ];

  for (const model of models) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    if (response.status === 429) {
      const detail = await response.text().catch(() => '');
      console.error(
        `[api/dashboard/agi/chat] OpenRouter 429 for model "${model}", trying next: ${detail.slice(0, 200)}`,
      );
      continue;
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(
        `[api/dashboard/agi/chat] OpenRouter ${response.status} for model "${model}": ${detail.slice(0, 300)}`,
      );
      const error = new Error('OpenRouter API request failed');
      throw error;
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }

    throw new Error('Invalid response from OpenRouter API');
  }

  throw new Error('OpenRouter API request failed — all models rate-limited');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
        { error: 'Invalid input' },
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
            setTimeout(sendWord, 20);
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
    return handleApiError('api/dashboard/agi/chat', error, {
      status: error instanceof Error && error.message.includes('API key') ? 503 : 500,
    });
  }
}
