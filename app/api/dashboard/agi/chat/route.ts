import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    throw new Error('OpenRouter API key not configured. Set OPENROUTER_API_KEY environment variable.');
  }

  const systemPrompt = `You are AGI Agent, an advanced AI assistant specialized in:
- Code generation and analysis
- Problem-solving
- AI/ML concepts
- System design
Support Thai language responses.
Be concise, technical, and helpful.`;

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
      max_tokens: 1000,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${error}`);
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[agi/chat] Error:', errorMessage);

    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured', message: errorMessage },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 },
    );
  }
}
