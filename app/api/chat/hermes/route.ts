/**
 * Hermes AI Chat API endpoint
 * Connects to Claude for natural language conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChatResponse, ChatContext } from '@/types/chat';

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-opus-4-8';

interface HermesRequest {
  messages: Array<{ role: string; content: string }>;
  systemPrompt: string;
  context?: ChatContext;
}

/**
 * POST /api/chat/hermes
 * Send a message to Hermes AI agent
 */
export async function POST(request: NextRequest) {
  try {
    const body: HermesRequest = await request.json();

    if (!body.messages || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    if (!CLAUDE_API_KEY) {
      console.error('[Hermes API] Missing ANTHROPIC_API_KEY');
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        system: body.systemPrompt,
        messages: body.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Hermes API] Claude API error:', error);
      return NextResponse.json(
        { error: 'Failed to get response from AI' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reply =
      data.content?.[0]?.type === 'text' ? data.content[0].text : 'No response';

    // Parse action from response
    const action = parseActionFromReply(reply);

    const chatResponse: ChatResponse = {
      reply,
      action,
      confidence: 0.95,
      actionData: body.context ? { execution: body.context.executionId } : undefined,
    };

    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error('[Hermes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Parse action suggestion from AI response
 */
function parseActionFromReply(reply: string): 'allow' | 'deny' | 'escalate' | 'info' {
  const lower = reply.toLowerCase();

  // Thai and English keywords
  if (
    lower.includes('ยืนยัน') ||
    lower.includes('allow') ||
    lower.includes('approve') ||
    lower.includes('go ahead') ||
    lower.includes('okay')
  ) {
    return 'allow';
  }

  if (
    lower.includes('ปฏิเสธ') ||
    lower.includes('deny') ||
    lower.includes('reject') ||
    lower.includes('stop') ||
    lower.includes('cannot')
  ) {
    return 'deny';
  }

  if (
    lower.includes('ขึ้นไป') ||
    lower.includes('escalate') ||
    lower.includes('urgent') ||
    lower.includes('administrator')
  ) {
    return 'escalate';
  }

  return 'info';
}
