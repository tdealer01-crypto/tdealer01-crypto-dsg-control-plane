import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { handleApiError } from '@/lib/security/api-error';
import { requireOrgRole } from '@/lib/authz';
import { executeToolSafely } from '@/lib/agent/executor';
import { DSG_TOOLS } from '@/lib/agent/tools';
import type { AgentContext } from '@/lib/agent/context';
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

// MCP Tools available to agents
const tools = [
  {
    name: 'discover_jobs',
    description: 'Discover available jobs across real platforms (Mind Agent)',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Job category filter (e.g., smart-contract-audit, backend-dev)' },
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
        job_id: { type: 'string', description: 'Job ID to execute' },
        deliverable: { type: 'string', description: 'Deliverable content' },
        execution_time_target: { type: 'number', description: 'Target execution time in ms' },
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
        deliverable_id: { type: 'string', description: 'Deliverable ID to verify' },
        quality_criteria: { type: 'string', description: 'Quality criteria to check' },
      },
      required: ['deliverable_id'],
    },
  },
  {
    name: 'settle_payment',
    description: 'Record a settlement request for manual review — fail-closed, no on-chain transfer (Nerve Agent)',
    input_schema: {
      type: 'object',
      properties: {
        execution_id: { type: 'string', description: 'Execution ID to settle' },
        amount_sol: { type: 'number', description: 'Amount in SOL' },
      },
      required: ['execution_id', 'amount_sol'],
    },
  },
  {
    name: 'validate_governance',
    description: 'Validate against real DSG governance policies (Spine Agent)',
    input_schema: {
      type: 'object',
      properties: {
        policy_name: { type: 'string', description: 'DSG policy to validate against' },
        constraints: { type: 'object', description: 'Constraints to verify' },
      },
      required: ['policy_name'],
    },
  },
  {
    name: 'read_dsg_documentation',
    description: 'Read DSG.md documentation for governance and policy reference',
    input_schema: {
      type: 'object',
      properties: {
        section: { type: 'string', description: 'Section of DSG.md to read (e.g., truth-boundary, runtime-spine)' },
      },
    },
  },
  // DSG platform skills (code sandbox, terminal, browser, web search, agent CRUD).
  // Executed exclusively through executeToolSafely — Hermes + DSG gate, and
  // write/critical tools require an approvalToken per the Autonomy Dial.
  ...DSG_TOOLS.map((tool) => ({
    name: tool.id,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(tool.parameters).map(([key, param]) => [
          key,
          { type: param.type, description: param.description },
        ]),
      ),
      required: Object.entries(tool.parameters)
        .filter(([, param]) => param.required)
        .map(([key]) => key),
    },
  })),
];

// Real implementation using live data sources and Supabase
async function processToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: AgentContext,
): Promise<string> {
  switch (toolName) {
    case 'discover_jobs': {
      const result = await discoverJobsReal(
        toolInput.category as string | undefined,
        toolInput.difficulty as string | undefined,
        toolInput.min_reward as number | undefined
      );
      return JSON.stringify(result);
    }

    case 'execute_job': {
      const result = await executeJobReal(
        toolInput.job_id as string,
        toolInput.deliverable as string,
        toolInput.execution_time_target as number | undefined
      );
      return JSON.stringify(result);
    }

    case 'verify_deliverable': {
      const result = await verifyDeliverableReal(
        toolInput.deliverable_id as string,
        toolInput.quality_criteria as string | undefined
      );
      return JSON.stringify(result);
    }

    case 'settle_payment': {
      const result = await settlePaymentReal(
        toolInput.execution_id as string,
        toolInput.amount_sol as number
      );
      return JSON.stringify(result);
    }

    case 'validate_governance': {
      const result = await validateGovernanceReal(
        toolInput.policy_name as string,
        toolInput.constraints as Record<string, any> | undefined
      );
      return JSON.stringify(result);
    }

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
            total_lines: dsgContent.split('\n').length,
          });
        }

        return JSON.stringify({
          section: 'overview',
          content: dsgContent.slice(0, 2000),
          total_size: dsgContent.length,
          total_lines: dsgContent.split('\n').length,
        });
      } catch (error) {
        return JSON.stringify({
          error: 'Failed to read DSG.md',
          available: false,
        });
      }

    default: {
      // DSG platform skills — always through executeToolSafely so the Hermes
      // preflight, DSG gate (ALLOW/STABILIZE/BLOCK), and approval-token rules apply.
      const dsgTool = DSG_TOOLS.find((tool) => tool.id === toolName);
      if (!dsgTool) {
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
      }
      const result = await executeToolSafely(dsgTool, toolInput, context);
      return JSON.stringify(result);
    }
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireOrgRole(['operator', 'org_admin'], request);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const userMessage = body.message as string;
    const selectedAgent = body.agent as string || 'All';
    const language = body.language as string || 'en';
    const modelProvider = (body.model || 'anthropic') as 'anthropic' | 'nvidia';

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

    if (!userMessage || userMessage.trim().length === 0) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
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

You also have DSG platform skills (write_code_file, run_code, terminal sandbox, browser_navigate, fetch_url, realtime_web_search, agent CRUD, execute_action). Write/critical skills run through the DSG gate and may return requiresApproval — report that honestly instead of claiming the action ran.

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
