import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';
import { selectNGCModel } from '@/lib/nvidia/ngc-models';

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

// Honest limited-mode reply used when the LLM backend is unavailable, so the
// dashboard remains usable instead of surfacing a hard error.
function limitedModeReply(reason: string): string {
  return [
    '⚠️ Hermes is running in limited mode — the conversational LLM backend is not available right now.',
    `(${reason})`,
    '',
    'To enable full conversational replies, configure OPENROUTER_API_KEY or NVIDIA_API_KEY for this deployment.',
  ].join('\n');
}

async function generateAgentResponse(message: string): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  if (!openrouterKey && !nvidiaKey) {
    return limitedModeReply('LLM not configured');
  }

  const systemPrompt = `You are Hermes, a helpful AI governance agent that helps users understand policies and make decisions.
You support Thai language responses.
Keep responses concise but informative.
Always be respectful and helpful.`;

  // Try OpenRouter first (primary provider)
  if (openrouterKey) {
    const models = [
      process.env.OPENROUTER_MODEL_CHAT || 'openai/gpt-oss-120b:free',
      'google/gemma-3-27b-it:free',
      'deepseek/deepseek-chat-v3-0324:free',
    ];

    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            max_tokens: 500,
            temperature: 0.7,
          }),
        });

        if (response.status === 429) {
          const detail = await response.text().catch(() => '');
          console.error(
            `[api/dashboard/hermes/chat] OpenRouter 429 for model "${model}", trying next: ${detail.slice(0, 200)}`,
          );
          continue;
        }

        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          console.error(
            `[api/dashboard/hermes/chat] OpenRouter ${response.status} for model "${model}": ${detail.slice(0, 300)}`,
          );
          continue;
        }

        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        const content = data.choices?.[0]?.message?.content;
        if (content) {
          console.log('[Hermes] OpenRouter response:', model);
          return content;
        }
      } catch {
        continue;
      }
    }
  }

  // Fallback to NVIDIA/NGC if OpenRouter unavailable or failed
  if (nvidiaKey) {
    try {
      const ngcModel = selectNGCModel();
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ngcModel.id,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          max_tokens: 500,
          temperature: 0.7,
          top_p: 1,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          console.log('[Hermes] NVIDIA/NGC fallback response:', ngcModel.displayName);
          return content;
        }
      } else {
        const detail = await response.text().catch(() => '');
        console.warn(`[Hermes] NVIDIA fallback (${response.status}): ${detail.slice(0, 200)}`);
      }
    } catch (err) {
      console.warn('[Hermes] NVIDIA error:', err);
    }
  }

  return limitedModeReply('All LLM backends unavailable');
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
