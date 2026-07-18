import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// MCP Tools available to agents
const tools = [
  {
    name: 'discover_jobs',
    description: 'Discover available jobs across platforms (Mind Agent)',
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
    description: 'Execute a job with deliverables (Hand Agent)',
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
    description: 'Settle payment and manage reputation (Nerve Agent)',
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
    description: 'Validate against DSG governance policies (Spine Agent)',
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
];

// Mock implementation of tool calls
function processToolCall(toolName: string, toolInput: Record<string, unknown>): string {
  switch (toolName) {
    case 'discover_jobs':
      return JSON.stringify({
        jobs: [
          { id: '1', title: 'Smart Contract Audit', category: toolInput.category, reward: 5.0 },
          { id: '2', title: 'Security Review', category: toolInput.category, reward: 3.5 },
        ],
      });

    case 'execute_job':
      return JSON.stringify({
        execution_id: `exec-${Date.now()}`,
        job_id: toolInput.job_id,
        status: 'success',
        quality_score: 85,
        execution_time_ms: 2500,
      });

    case 'verify_deliverable':
      return JSON.stringify({
        deliverable_id: toolInput.deliverable_id,
        verification_status: 'passed',
        quality_score: 90,
        issues: [],
      });

    case 'settle_payment':
      return JSON.stringify({
        execution_id: toolInput.execution_id,
        amount_sol: toolInput.amount_sol,
        transaction_hash: `0x${Math.random().toString(16).slice(2)}`,
        status: 'completed',
        reputation_change: 2,
      });

    case 'validate_governance':
      return JSON.stringify({
        policy_name: toolInput.policy_name,
        validation_status: 'approved',
        constraints_satisfied: true,
        audit_trail_id: `audit-${Date.now()}`,
      });

    case 'read_dsg_documentation':
      try {
        const dsgPath = path.join(process.cwd(), 'DSG.md');
        const dsgContent = fs.readFileSync(dsgPath, 'utf-8');

        // Return first 2000 chars or requested section
        const section = toolInput.section as string;
        if (section) {
          const sectionRegex = new RegExp(`## ${section}[\\s\\S]*?(?=##|$)`, 'i');
          const match = dsgContent.match(sectionRegex);
          return JSON.stringify({
            section,
            content: match ? match[0].slice(0, 1500) : 'Section not found',
          });
        }

        return JSON.stringify({
          section: 'full',
          content: dsgContent.slice(0, 2000),
          total_size: dsgContent.length,
        });
      } catch (error) {
        return JSON.stringify({
          error: 'Failed to read DSG.md',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userMessage = body.message as string;

    if (!userMessage) {
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

    const systemPrompt = `You are Trinity, a multi-agent AI orchestration system with 5 specialized agents:
- Mind Agent: Job discovery (🧠)
- Hand Agent: Task execution (✋)
- Eye Agent: Quality verification (👁️)
- Nerve Agent: Payment & reputation (⚡)
- Spine Agent: DSG governance (🦴)

You have access to MCP tools that these agents can use. When users ask about jobs, execution, verification, or governance, use the appropriate tools to provide accurate information.

DSG Framework Overview:
- Deterministic governance with formal Z3 verification
- Evidence-driven decision making (CCVS L1-L5)
- Immutable audit trails with SHA-256 hashing
- Policy-as-code in natural language (Thai/English)${dsgContext}

Always explain your actions and tool calls. Be helpful and proactive in using tools to answer questions.`;

    const messages: Array<{ role: string; content: unknown }> = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

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

      const toolResult = processToolCall(toolUseBlock.name, toolUseBlock.input);

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

    return NextResponse.json({
      response: finalResponse || 'No response generated',
    });
  } catch (error) {
    console.error('[Trinity Chat] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
