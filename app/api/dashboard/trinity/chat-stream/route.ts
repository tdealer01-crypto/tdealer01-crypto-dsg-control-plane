/**
 * Streaming chat endpoint for Trinity agents
 * Streams tool results and LLM responses in real-time using Server-Sent Events (SSE)
 */

import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { requireOrgRole } from '@/lib/authz';
import { executeToolSafely } from '@/lib/agent/executor';
import type { AgentContext } from '@/lib/agent/context';
import { DSG_TOOLS } from '@/lib/agent/tools';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const dynamic = 'force-dynamic';

const tools = DSG_TOOLS.map((tool) => ({
  name: tool.id,
  description: tool.description,
  input_schema: {
    type: 'object' as const,
    properties: Object.fromEntries(
      Object.entries(tool.parameters).map(([k, p]) => [
        k,
        {
          type: p.type,
          description: p.description,
          required: p.required,
        },
      ]),
    ),
    required: Object.entries(tool.parameters)
      .filter(([, p]) => p.required)
      .map(([k]) => k),
  },
}));

async function processToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: AgentContext,
): Promise<string> {
  const tool = DSG_TOOLS.find((t) => t.id === toolName);
  if (!tool) {
    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
  try {
    const result = await executeToolSafely(tool, toolInput, context);
    return JSON.stringify(result);
  } catch (err) {
    return JSON.stringify({
      error: `Tool execution failed: ${toolName}`,
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

function createSSEStream(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        const encoder = new TextEncoder();

        const sendEvent = (data: unknown) => {
          const json = JSON.stringify(data);
          const message = `data: ${json}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Parse request body from POST
        // Note: This is a workaround; in a real streaming handler, we'd get the body from the request
        sendEvent({ type: 'connected', message: 'Trinity chat stream ready' });
        sendEvent({ type: 'status', message: 'Streaming mode active' });

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function POST(request: Request) {
  try {
    const access = await requireOrgRole(['operator', 'org_admin']);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const userMessage = body.message as string;
    const selectedAgent = body.agent as string || 'All';
    const language = body.language as string || 'en';
    const useStreaming = body.streaming !== false; // Default to streaming

    if (!userMessage) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const context: AgentContext = {
      orgId: access.orgId,
      role: access.grantedRoles.includes('org_admin') ? 'org_admin' : 'operator',
      origin: new URL(request.url).origin,
      authHeader: request.headers.get('authorization') || '',
      cookieHeader: request.headers.get('cookie') || '',
      approvalToken: typeof body?.approvalToken === 'string' ? body.approvalToken : undefined,
    };

    // Load DSG.md for context
    let dsgContext = '';
    try {
      const dsgPath = path.join(process.cwd(), 'DSG.md');
      const dsgContent = fs.readFileSync(dsgPath, 'utf-8');
      dsgContext = `\n\nDSG.md (${dsgContent.length} bytes)`;
    } catch (error) {
      dsgContext = '\n\n(DSG.md not available)';
    }

    // Agent-specific prompts
    const agentPrompts: Record<string, string> = {
      Mind: 'You are the Mind Agent - Job Discovery Expert.',
      Hand: 'You are the Hand Agent - Execution Expert.',
      Eye: 'You are the Eye Agent - Quality Verification Expert.',
      Nerve: 'You are the Nerve Agent - Payment & Reputation Expert.',
      Spine: 'You are the Spine Agent - DSG Governance Expert.',
      All: 'You are Trinity - complete AI orchestration system.',
    };

    const systemPrompt = `${agentPrompts[selectedAgent] || agentPrompts['All']}

Trinity: 5-Agent AI Orchestration
- 🧠 Mind: Job discovery across platforms
- ✋ Hand: Task execution & deliverables
- 👁️ Eye: Quality verification
- ⚡ Nerve: Payment & reputation
- 🦴 Spine: DSG governance

All tools are connected to real platforms and Supabase. Use them proactively.

Language: ${language === 'th' ? 'Thai' : 'English'}
Agent: ${selectedAgent}${dsgContext}`;

    const messages: Array<{ role: string; content: unknown }> = [
      { role: 'user', content: userMessage },
    ];

    // For streaming, return SSE stream immediately
    if (useStreaming) {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          const sendEvent = (type: string, data: any) => {
            const message = `data: ${JSON.stringify({ type, data })}\n\n`;
            controller.enqueue(encoder.encode(message));
          };

          try {
            sendEvent('status', { message: 'Processing with real MCP tools...' });

            let response = await anthropic.messages.create({
              model: 'claude-opus-4-8',
              max_tokens: 1024,
              system: systemPrompt,
              tools: tools as never,
              messages: messages as never,
            });

            const toolCalls: string[] = [];

            // Agentic loop with streaming
            while (response.stop_reason === 'tool_use') {
              const toolUseBlock = response.content.find((block: any) => block.type === 'tool_use') as any;
              if (!toolUseBlock || toolUseBlock.type !== 'tool_use') break;

              sendEvent('tool_start', {
                tool: toolUseBlock.name,
                timestamp: new Date().toISOString(),
              });

              const toolResult = await processToolCall(toolUseBlock.name, toolUseBlock.input, context);
              toolCalls.push(toolUseBlock.name);

              sendEvent('tool_result', {
                tool: toolUseBlock.name,
                result: JSON.parse(toolResult),
              });

              messages.push({ role: 'assistant', content: response.content });
              messages.push({
                role: 'user',
                content: [
                  {
                    type: 'tool_result',
                    tool_use_id: toolUseBlock.id,
                    content: toolResult,
                  },
                ],
              });

              response = await anthropic.messages.create({
                model: 'claude-opus-4-8',
                max_tokens: 1024,
                system: systemPrompt,
                tools: tools as never,
                messages: messages as never,
              });
            }

            const finalResponse = response.content
              .filter((block: any) => block.type === 'text')
              .map((block: any) => block.text)
              .join('\n');

            sendEvent('response', {
              text: finalResponse,
              toolCalls: [...new Set(toolCalls)],
              source: 'production-streaming',
              timestamp: new Date().toISOString(),
            });

            sendEvent('done', { message: 'Chat completed' });
            controller.close();
          } catch (error) {
            console.error('[TRINITY-CHAT-STREAM] stream error:', error);
            sendEvent('error', { message: 'Internal server error' });
            controller.close();
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Fallback to non-streaming JSON response
    let response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: systemPrompt,
      tools: tools as never,
      messages: messages as never,
    });

    const toolCalls: string[] = [];

    while (response.stop_reason === 'tool_use') {
      const toolUseBlock = response.content.find((block: any) => block.type === 'tool_use') as any;
      if (!toolUseBlock || toolUseBlock.type !== 'tool_use') break;

      const toolResult = await processToolCall(toolUseBlock.name, toolUseBlock.input, context);
      toolCalls.push(toolUseBlock.name);

      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUseBlock.id,
            content: toolResult,
          },
        ],
      });

      response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        system: systemPrompt,
        tools: tools as never,
        messages: messages as never,
      });
    }

    const finalResponse = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    return NextResponse.json({
      response: finalResponse || 'No response generated',
      toolCalls: [...new Set(toolCalls)],
      source: 'production',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Trinity Chat Stream] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
