import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { handleApiError } from '@/lib/security/api-error';
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
    const modelProvider = (body.model || 'anthropic') as 'anthropic' | 'nvidia';

    if (!userMessage || userMessage.trim().length === 0) {
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

    // Validate API key for selected model
    if (modelProvider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      console.error('[Trinity Chat] ANTHROPIC_API_KEY not set in environment');
      return NextResponse.json(
        { error: 'API configuration error: ANTHROPIC_API_KEY not configured' },
        { status: 503 }
      );
    }

    if (modelProvider === 'nvidia' && !process.env.NVIDIA_API_KEY) {
      console.error('[Trinity Chat] NVIDIA_API_KEY not set in environment');
      return NextResponse.json(
        { error: 'API configuration error: NVIDIA_API_KEY not configured' },
        { status: 503 }
      );
    }

    // Load DSG.md for context
    let dsgContext = '';
    try {
      const dsgPath = path.join(process.cwd(), 'DSG.md');
      const dsgContent = fs.readFileSync(dsgPath, 'utf-8');
      dsgContext = `\n\nAvailable DSG Documentation:\n${dsgContent.slice(0, 3000)}...`;
    } catch (error) {
      dsgContext = '\n\n(DSG.md documentation not available)';
    }

    // Agent-specific system prompts
    const agentPrompts: Record<string, string> = {
      Mind: 'You are the Mind Agent - Job Discovery Expert. Focus on finding and filtering jobs across platforms.',
      Hand: 'You are the Hand Agent - Execution Expert. Help execute tasks and track deliverables.',
      Eye: 'You are the Eye Agent - Quality Verification Expert. Verify deliverables and detect issues.',
      Nerve: 'You are the Nerve Agent - Payment & Reputation Expert. Handle SOL settlements and reputation.',
      Spine: 'You are the Spine Agent - DSG Governance Expert. Validate policies and maintain audit trails.',
      All: 'You are Trinity - the complete AI orchestration system with all 5 agents.',
    };

    const systemPrompt = `${agentPrompts[selectedAgent] || agentPrompts['All']}

You are part of Trinity, a multi-agent AI orchestration system:
- 🧠 Mind Agent: Job discovery across 6 platforms
- ✋ Hand Agent: Task execution and deliverables
- 👁️ Eye Agent: Quality verification and validation
- ⚡ Nerve Agent: Payment settlement and reputation
- 🦴 Spine Agent: DSG governance and audit trail

You have access to MCP tools. Use them proactively to answer questions.

DSG Framework:
- Deterministic governance with Z3 formal verification
- Evidence-driven (CCVS L1-L5) decision making
- Immutable SHA-256 audit trails
- Natural language policy (Thai/English)${dsgContext}

Language: ${language === 'th' ? 'Thai' : 'English'}
Current Agent: ${selectedAgent}

Always explain tool usage. Be helpful and efficient.`;

    const messages: Array<{ role: string; content: unknown }> = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    const toolCalls: string[] = [];

    // Get initial response from Anthropic Claude
    let response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: systemPrompt,
      tools: tools as never,
      messages: messages as never,
    });

    // Handle tool use in agentic loop
    while (response.stop_reason === 'tool_use') {
      const toolUseBlock = response.content.find((block: any) => block.type === 'tool_use') as any;

      if (!toolUseBlock || toolUseBlock.type !== 'tool_use') break;

      const toolResult = await processToolCall(toolUseBlock.name, toolUseBlock.input, context);
      toolCalls.push(toolUseBlock.name);

      // Add assistant response and tool result to messages
      messages.push({
        role: 'assistant',
        content: response.content,
      });

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

      // Get next response
      response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        system: systemPrompt,
        tools: tools as never,
        messages: messages as never,
      });
    }

    // Extract final text response
    const finalResponse = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    // Return with streaming-ready format
    return NextResponse.json({
      response: finalResponse || 'No response generated',
      toolCalls: [...new Set(toolCalls)], // unique
      source: 'production',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError('api/dashboard/trinity/chat', error, {
      details: {
        hasAntropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasNvidiaKey: !!process.env.NVIDIA_API_KEY,
      },
    });
  }
}
