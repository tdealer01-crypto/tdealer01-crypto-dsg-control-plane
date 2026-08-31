import { SupabaseService } from '../services/supabase-service.js';
import { AnthropicService } from '../services/anthropic-service.js';
import { StripeService } from '../services/stripe-service.js';
import { SpineService } from '../services/spine-service.js';
import { DSGBrainService } from '../services/dsg-brain-service.js';
import { ComplianceService } from '../services/compliance-service.js';
import { formatError } from '../utils/errors.js';

export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (input: any) => Promise<{ type: string; text: string; isError?: boolean }>;
}

export function createSupabaseTools(supabaseService: SupabaseService): ToolHandler[] {
  return [
    {
      name: 'dsg_query_database',
      description: 'Execute SQL queries against Supabase with RLS',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'SQL query' },
          params: { type: 'array', description: 'Query parameters' },
        },
        required: ['query'],
      },
      handler: async (input: any) => {
        try {
          const result = await supabaseService.executeQuery(input.query, input.params);
          return { type: 'text', text: JSON.stringify(result, null, 2) };
        } catch (error) {
          const err = formatError(error);
          return { type: 'text', text: `Error: ${err.message}`, isError: true };
        }
      },
    },
    {
      name: 'dsg_update_records',
      description: 'Update records with audit trail',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          data: { type: 'object' },
          filter: { type: 'object' },
          auditReason: { type: 'string' },
        },
        required: ['table', 'data', 'filter'],
      },
      handler: async (input: any) => {
        try {
          const result = await supabaseService.updateRecords(
            input.table,
            input.data,
            input.filter,
            input.auditReason
          );
          return { type: 'text', text: JSON.stringify(result, null, 2) };
        } catch (error) {
          const err = formatError(error);
          return { type: 'text', text: `Error: ${err.message}`, isError: true };
        }
      },
    },
    {
      name: 'dsg_list_tables',
      description: 'List all tables in Supabase',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        try {
          const tables = await supabaseService.listTables();
          return { type: 'text', text: `Tables:\n${tables.join('\n')}` };
        } catch (error) {
          const err = formatError(error);
          return { type: 'text', text: `Error: ${err.message}`, isError: true };
        }
      },
    },
    {
      name: 'dsg_manage_rls_policies',
      description: 'View RLS policies',
      inputSchema: { type: 'object', properties: { table: { type: 'string' } }, required: ['table'] },
      handler: async (input: any) => {
        try {
          const policies = await supabaseService.getRLSPolicies(input.table);
          return { type: 'text', text: JSON.stringify(policies, null, 2) };
        } catch (error) {
          const err = formatError(error);
          return { type: 'text', text: `Error: ${err.message}`, isError: true };
        }
      },
    },
    {
      name: 'dsg_execute_migrations',
      description: 'Execute Supabase migrations',
      inputSchema: { type: 'object', properties: { migrationName: { type: 'string' } }, required: ['migrationName'] },
      handler: async (input: any) => {
        try {
          const result = await supabaseService.executeMigration(input.migrationName);
          return { type: 'text', text: `Migration: ${result.message}` };
        } catch (error) {
          const err = formatError(error);
          return { type: 'text', text: `Error: ${err.message}`, isError: true };
        }
      },
    },
    {
      name: 'dsg_check_auth_session',
      description: 'Verify authentication session',
      inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] },
      handler: async (input: any) => {
        try {
          const result = await supabaseService.checkAuthSession(input.sessionId);
          return { type: 'text', text: JSON.stringify(result, null, 2) };
        } catch (error) {
          const err = formatError(error);
          return { type: 'text', text: `Error: ${err.message}`, isError: true };
        }
      },
    },
  ];
}

export function createGovernanceTools(
  spineService?: SpineService,
  dsgBrainService?: DSGBrainService,
  complianceService?: ComplianceService
): ToolHandler[] {
  const tools: ToolHandler[] = [];

  if (spineService) {
    tools.push({
      name: 'spine_execute_governed',
      description: 'Execute governed operation',
      inputSchema: { type: 'object', properties: { agentId: { type: 'string' }, intent: { type: 'object' }, approve: { type: 'boolean' } }, required: ['agentId', 'intent'] },
      handler: async (input: any) => {
        try {
          const result = await spineService.executeGoverned(input.agentId, input.intent, input.approve);
          return { type: 'text', text: JSON.stringify(result, null, 2) };
        } catch (error) {
          const err = formatError(error);
          return { type: 'text', text: `Error: ${err.message}`, isError: true };
        }
      },
    });
  }

  if (dsgBrainService) {
    tools.push({
      name: 'dsg_propose_plan',
      description: 'Propose execution plan',
      inputSchema: { type: 'object', properties: { objective: { type: 'string' }, context: { type: 'object' }, constraints: { type: 'array' } }, required: ['objective'] },
      handler: async (input: any) => {
        try {
          const plan = await dsgBrainService.proposePlan(input.objective, input.context, input.constraints);
          return { type: 'text', text: JSON.stringify(plan, null, 2) };
        } catch (error) {
          const err = formatError(error);
          return { type: 'text', text: `Error: ${err.message}`, isError: true };
        }
      },
    });
  }

  if (complianceService) {
    tools.push({
      name: 'ccvs_collect_evidence',
      description: 'Collect compliance evidence',
      inputSchema: { type: 'object', properties: { executionId: { type: 'string' }, level: { type: 'string', enum: ['L1', 'L2', 'L3', 'L4', 'L5'] }, metadata: { type: 'object' } }, required: ['executionId', 'level'] },
      handler: async (input: any) => {
        try {
          const evidence = await complianceService.collectEvidence(input.executionId, input.level, input.metadata);
          return { type: 'text', text: `Evidence: ${evidence.level} (${evidence.hash})` };
        } catch (error) {
          const err = formatError(error);
          return { type: 'text', text: `Error: ${err.message}`, isError: true };
        }
      },
    });
  }

  return tools;
}

export type ExternalToolService = AnthropicService | StripeService;
