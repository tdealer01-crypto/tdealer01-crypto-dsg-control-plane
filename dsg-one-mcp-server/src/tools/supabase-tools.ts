import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseService } from '../services/supabase-service.js';
import { SupabaseQuerySchema, SupabaseUpdateSchema } from '../schemas/index.js';
import { formatError } from '../utils/errors.js';

export interface ToolDefinition extends Tool {
  handler?: (input: any) => Promise<any>;
}

export function createSupabaseTools(supabaseService: SupabaseService): ToolDefinition[] {
  return [
    {
      name: 'dsg_query_database',
      description: 'Execute SQL queries against Supabase with row-level security applied',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'SQL query to execute' },
          params: { type: 'array', description: 'Query parameters' },
        },
        required: ['query'],
      },
      handler: async (input: any) => {
        try {
          const validated = SupabaseQuerySchema.parse(input);
          const result = await supabaseService.executeQuery(validated.query, validated.params);
          return {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'dsg_update_records',
      description: 'Update records in Supabase with audit trail logging',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' },
          data: { type: 'object', description: 'Data to update' },
          filter: { type: 'object', description: 'WHERE clause filters' },
          auditReason: { type: 'string', description: 'Reason for audit log' },
        },
        required: ['table', 'data', 'filter'],
      },
      handler: async (input: any) => {
        try {
          const validated = SupabaseUpdateSchema.parse(input);
          const result = await supabaseService.updateRecords(
            validated.table,
            validated.data,
            validated.filter,
            validated.auditReason
          );
          return {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'dsg_list_tables',
      description: 'List all available tables in Supabase schema',
      inputSchema: { type: 'object', properties: {} },
      handler: async () => {
        try {
          const tables = await supabaseService.listTables();
          return {
            type: 'text',
            text: `Available tables:\n${tables.join('\n')}`,
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'dsg_manage_rls_policies',
      description: 'View and manage row-level security policies for a table',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string', description: 'Table name' },
        },
        required: ['table'],
      },
      handler: async (input: any) => {
        try {
          const policies = await supabaseService.getRLSPolicies(input.table);
          return {
            type: 'text',
            text: JSON.stringify(policies, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'dsg_execute_migrations',
      description: 'Execute Supabase migrations',
      inputSchema: {
        type: 'object',
        properties: {
          migrationName: { type: 'string', description: 'Migration name/identifier' },
        },
        required: ['migrationName'],
      },
      handler: async (input: any) => {
        try {
          const result = await supabaseService.executeMigration(input.migrationName);
          return {
            type: 'text',
            text: `Migration result: ${result.message}`,
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
    {
      name: 'dsg_check_auth_session',
      description: 'Verify user authentication session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'Session ID to verify' },
        },
        required: ['sessionId'],
      },
      handler: async (input: any) => {
        try {
          const result = await supabaseService.checkAuthSession(input.sessionId);
          return {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          };
        } catch (error) {
          const err = formatError(error);
          return {
            type: 'text',
            text: `Error: ${err.message}`,
            isError: true,
          };
        }
      },
    },
  ];
}
