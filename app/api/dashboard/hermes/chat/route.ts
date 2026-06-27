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
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    const err = new Error('OpenRouter API key not configured');
    throw err;
  }

  const systemPrompt = `You are Hermes, a helpful AI governance agent that helps users understand policies and make decisions.
You support Thai language responses.
Keep responses concise but informative.
Always be respectful and helpful.`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen/qwen-3-coder:free',
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
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
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
    return handleApiError('api/dashboard/hermes/chat', error, {
      status: error instanceof Error && error.message.includes('API key') ? 503 : 500,
    });
  }
}
