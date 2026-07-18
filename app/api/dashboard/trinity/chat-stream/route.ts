/**
 * Streaming chat endpoint for Trinity agents
 * Streams tool results and LLM responses in real-time using Server-Sent Events (SSE)
 */

import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import {
  discoverJobsReal,
  executeJobReal,
  verifyDeliverableReal,
  settlePaymentReal,
  validateGovernanceReal,
} from '@/lib/trinity/real-jobs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const dynamic = 'force-dynamic';

// MCP Tools
const tools = [
  {
    name: 'discover_jobs',
    description: 'Discover available jobs across real platforms (Mind Agent)',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Job category filter' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        min_reward: { type: 'number', description: 'Minimum reward in SOL' },
      },
      required: ['category'],
    },
  },
  {
    name: 'execute_job',
    description: 'Execute a job with real tracking (Hand Agent)',
    input_schema: {
      type: 'object',
      properties: {
        job_id: { type: 'string' },
        deliverable: { type: 'string' },
        execution_time_target: { type: 'number' },
      },
      required: ['job_id', 'deliverable'],
    },
  },
  {
    name: 'verify_deliverable',
    description: 'Verify deliverable quality (Eye Agent)',
    input_schema: {
      type: 'object',
      properties: {
        deliverable_id: { type: 'string' },
        quality_criteria: { type: 'string' },
      },
      required: ['deliverable_id'],
    },
  },
  {
    name: 'settle_payment',
    description: 'Settle payment with real tracking (Nerve Agent)',
    input_schema: {
      type: 'object',
      properties: {
        execution_id: { type: 'string' },
        amount_sol: { type: 'number' },
      },
      required: ['execution_id', 'amount_sol'],
    },
  },
  {
    name: 'validate_governance',
    description: 'Validate against real DSG policies (Spine Agent)',
    input_schema: {
      type: 'object',
      properties: {
        policy_name: { type: 'string' },
        constraints: { type: 'object' },
      },
      required: ['policy_name'],
    },
  },
  {
    name: 'read_dsg_documentation',
    description: 'Read DSG.md documentation',
    input_schema: {
      type: 'object',
      properties: {
        section: { type: 'string' },
      },
    },
  },
];

async function processToolCall(toolName: string, toolInput: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case 'discover_jobs':
      return JSON.stringify(
        await discoverJobsReal(
          toolInput.category as string | undefined,
          toolInput.difficulty as string | undefined,
          toolInput.min_reward as number | undefined
        )
      );
    case 'execute_job':
      return JSON.stringify(
        await executeJobReal(toolInput.job_id as string, toolInput.deliverable as string, toolInput.execution_time_target as number | undefined)
      );
    case 'verify_deliverable':
      return JSON.stringify(
        await verifyDeliverableReal(toolInput.deliverable_id as string, toolInput.quality_criteria as string | undefined)
      );
    case 'settle_payment':
      return JSON.stringify(await settlePaymentReal(toolInput.execution_id as string, toolInput.amount_sol as number));
    case 'validate_governance':
      return JSON.stringify(
        await validateGovernanceReal(toolInput.policy_name as string, toolInput.constraints as Record<string, any> | undefined)
      );
    case 'read_dsg_documentation':
      try {
        const dsgPath = path.join(process.cwd(), 'DSG.md');
        const dsgContent = fs.readFileSync(dsgPath, 'utf-8');
        const section = toolInput.section as string;
        if (section) {
          const sectionRegex = new RegExp(`## ${section}[\\s\\S]*?(?=##|$)`, 'i');
          const match = dsgContent.match(sectionRegex);
          return JSON.stringify({
            section,
            found: !!match,
            content: match ? match[0].slice(0, 2000) : `Section "${section}" not found`,
          });
        }
        return JSON.stringify({
          section: 'overview',
          content: dsgContent.slice(0, 2000),
        });
      } catch (error) {
        return JSON.stringify({ error: 'Failed to read DSG.md' });
      }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
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
    const body = await request.json();
    const userMessage = body.message as string;
    const selectedAgent = body.agent as string || 'All';
    const language = body.language as string || 'en';
    const useStreaming = body.streaming !== false; // Default to streaming

    if (!userMessage) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

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

              const toolResult = await processToolCall(toolUseBlock.name, toolUseBlock.input);
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
            sendEvent('error', {
              message: error instanceof Error ? error.message : 'Unknown error',
            });
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

      const toolResult = await processToolCall(toolUseBlock.name, toolUseBlock.input);
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
