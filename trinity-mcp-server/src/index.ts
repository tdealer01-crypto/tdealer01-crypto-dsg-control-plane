#!/usr/bin/env node

/**
 * Trinity DSG API MCP Server
 * Provides Claude and other LLMs with access to Trinity Backend API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TrinityClient } from './client.js';

const TRINITY_API_URL = process.env.TRINITY_API_URL || 'http://localhost:3001';
const TRINITY_JWT_TOKEN = process.env.TRINITY_JWT_TOKEN;

const client = new TrinityClient({
  apiUrl: TRINITY_API_URL,
  jwtToken: TRINITY_JWT_TOKEN,
});

const server = new Server(
  {
    name: 'trinity-dsg-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools = [
  {
    name: 'trinity_health_check',
    description:
      'Check Trinity API server and database connection status. Use this to verify the system is running and responsive.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'trinity_get_agents',
    description:
      'Get status of all DSG agents from the Trinity Backend API, including role, status, reliability, jobs processed, CPU usage, and mode when provided by the backend.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'trinity_set_agent_mode',
    description:
      'Request an agent mode change through the Trinity Backend API.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID or agent name',
        },
        mode: {
          type: 'string',
          enum: ['sandbox', 'live'],
          description: 'Target mode: sandbox or live',
        },
      },
      required: ['agentId', 'mode'],
    },
  },
  {
    name: 'trinity_execute_task',
    description:
      'Execute a task on a specific agent through the Trinity Backend API and return the backend result and duration.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID or agent name',
        },
        task: {
          type: 'string',
          description: 'Task description or command to execute',
        },
      },
      required: ['agentId', 'task'],
    },
  },
  {
    name: 'trinity_chat_agent',
    description:
      'Send a message to an agent through the Trinity Backend API and return the backend response.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID or agent name',
        },
        message: {
          type: 'string',
          description: 'Message to send to the agent',
        },
      },
      required: ['agentId', 'message'],
    },
  },
  {
    name: 'trinity_get_costs',
    description:
      'Get cost tracking information from the Trinity Backend API for a selected period.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['1h', '24h', '7d'],
          description: 'Time period for cost tracking (default: 24h)',
        },
      },
      required: [],
    },
  },
  {
    name: 'trinity_get_audit_logs',
    description:
      'Get security audit logs from the Trinity Backend API.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of audit log entries to return (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'trinity_get_state',
    description:
      'Get current system state and continuity metrics from the Trinity Backend API.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'trinity_health_check': {
        const result = await client.health();
        const dbStatus = result.database ? `Database: ${result.database}` : 'Database: Unknown';
        const status = result.status === 'healthy' ? '✅ Healthy' : '⚠️ Unhealthy';

        return {
          content: [
            {
              type: 'text',
              text: `🏥 Trinity API Health\n\nStatus: ${status}\nVersion: ${result.version}\n${dbStatus}\nUptime: ${result.uptime.toFixed(1)}s\nChecked: ${result.timestamp}`,
            },
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }

      case 'trinity_get_agents': {
        const result = await client.getAgentStatus();
        return {
          content: [
            {
              type: 'text',
              text: `## Trinity Agents Status\n\nTotal Agents: ${result.total}\nHealthy (Running): ${result.healthy}\n\n### Agents:\n${result.agents
                .map((agent) => {
                  const reliability =
                    typeof agent.reliability === 'number'
                      ? `${(agent.reliability * 100).toFixed(1)}%`
                      : 'Unknown';
                  const cpuUsage =
                    typeof agent.cpuUsage === 'number'
                      ? `${agent.cpuUsage.toFixed(1)}%`
                      : 'Unknown';
                  return `- **${agent.name}** (${agent.role})\n  - Status: ${agent.status}\n  - Reliability: ${reliability}\n  - Jobs: ${agent.jobsProcessed}\n  - CPU: ${cpuUsage}\n  - Mode: ${agent.mode}\n  - Uptime: ${agent.uptime}`;
                })
                .join('\n\n')}`,
            },
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }

      case 'trinity_set_agent_mode': {
        const { agentId, mode } = args as { agentId: string; mode: string };
        const result = await client.setAgentMode(agentId, mode as 'sandbox' | 'live');
        return {
          content: [
            {
              type: 'text',
              text: `✅ Agent Mode Switch Successful\n\nAgent: ${agentId}\nPrevious Mode: ${result.previousMode}\nNew Mode: ${result.newMode}`,
            },
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }

      case 'trinity_execute_task': {
        const { agentId, task } = args as { agentId: string; task: string };
        const result = await client.executeTask(agentId, task);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Task Execution Complete\n\nAgent: ${agentId}\nResult: ${result.result}\nDuration: ${result.duration}ms`,
            },
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }

      case 'trinity_chat_agent': {
        const { agentId, message } = args as { agentId: string; message: string };
        const result = await client.chatWithAgent(agentId, message);
        return {
          content: [
            {
              type: 'text',
              text: `💬 Agent Response\n\nAgent: ${result.agentId}\nResponse: ${result.response}\nTime: ${result.timestamp}`,
            },
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }

      case 'trinity_get_costs': {
        const period = (args as { period?: string }).period || '24h';
        const result = await client.getCostTracker(period as '1h' | '24h' | '7d');

        const costTable = result.by_agent
          .map((entry) => `- ${entry.agent}: $${entry.cost.toFixed(4)}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `💰 Cost Tracking (${period})\n\nTotal Cost: $${result.total_usd.toFixed(2)}\nBudget Remaining: $${result.budget.remaining_usd.toFixed(2)}\nBudget Used: ${result.budget.used_percent.toFixed(1)}%\n\n### Cost by Agent:\n${costTable}`,
            },
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }

      case 'trinity_get_audit_logs': {
        const limit = (args as { limit?: number }).limit || 10;
        const result = await client.getSecurityAudit(limit);

        const logTable = result.entries
          .map(
            (entry) =>
              `- [${entry.status}] ${entry.event} (Agent: ${entry.agent}, Risk: ${entry.risk_score.toFixed(1)}, Time: ${entry.timestamp})`
          )
          .join('\n');

        const chainStatus = result.chain_valid ? '✅ Valid' : '⚠️ Invalid';

        return {
          content: [
            {
              type: 'text',
              text: `🔐 Security Audit Logs\n\nChain Valid: ${chainStatus}\n\n### Recent Events:\n${logTable}`,
            },
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }

      case 'trinity_get_state': {
        const result = await client.getStateContinuity();

        return {
          content: [
            {
              type: 'text',
              text: `📊 System State & Continuity\n\nAll Agents Running: ${result.all_agents_running ? '✅ Yes' : '❌ No'}\nContext Sharing: ${result.context_sharing.toFixed(1)}%\nFragmentation Risk: ${result.fragmentation_risk.toFixed(1)}%\nCost per Hour: $${parseFloat(String(result.cost_per_hour)).toFixed(2)}`,
            },
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
              mimeType: 'application/json',
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[Trinity MCP Server] Connected to ${TRINITY_API_URL} (JWT: ${TRINITY_JWT_TOKEN ? 'Yes' : 'No'})`
  );
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
