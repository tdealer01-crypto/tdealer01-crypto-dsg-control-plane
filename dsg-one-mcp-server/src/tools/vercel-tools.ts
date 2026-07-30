import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { VercelService } from '../services/vercel-service.js';
import { VercelDeploySchema, VercelBuildLogsSchema } from '../schemas/index.js';
import { formatError } from '../utils/errors.js';

export function createVercelTools(vercelService: VercelService): Tool[] {
  return [
    {
      name: 'vercel_list_deployments',
      description: 'List recent deployments for a Vercel project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Vercel project ID' },
          limit: { type: 'number', description: 'Number of deployments to list', default: 10 },
        },
        required: ['projectId'],
      },
      handler: async (input: any) => {
        try {
          const deployments = await vercelService.listDeployments(input.projectId, input.limit || 10);
          return {
            type: 'text',
            text: JSON.stringify(deployments, null, 2),
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
      name: 'vercel_trigger_deploy',
      description: 'Trigger a new deployment on Vercel',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Vercel project ID' },
          environment: {
            type: 'string',
            enum: ['preview', 'production'],
            description: 'Deployment environment',
            default: 'preview',
          },
          ref: { type: 'string', description: 'Git ref (branch/commit)' },
        },
        required: ['projectId'],
      },
      handler: async (input: any) => {
        try {
          const validated = VercelDeploySchema.parse(input);
          const result = await vercelService.triggerDeploy(
            validated.projectId,
            validated.ref,
            validated.environment
          );
          return {
            type: 'text',
            text: `Deployment triggered:\nURL: ${result.deploymentUrl}\nID: ${result.deploymentId}`,
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
      name: 'vercel_get_build_logs',
      description: 'Get build logs for a Vercel deployment',
      inputSchema: {
        type: 'object',
        properties: {
          deploymentId: { type: 'string', description: 'Vercel deployment ID' },
          lines: { type: 'number', description: 'Number of log lines', default: 100 },
        },
        required: ['deploymentId'],
      },
      handler: async (input: any) => {
        try {
          const validated = VercelBuildLogsSchema.parse(input);
          const logs = await vercelService.getBuildLogs(validated.deploymentId, validated.lines);
          return {
            type: 'text',
            text: logs,
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
      name: 'vercel_get_project_status',
      description: 'Check the current status and health of a Vercel project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Vercel project ID' },
        },
        required: ['projectId'],
      },
      handler: async (input: any) => {
        try {
          const status = await vercelService.getProjectStatus(input.projectId);
          return {
            type: 'text',
            text: JSON.stringify(status, null, 2),
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
      name: 'vercel_manage_env_vars',
      description: 'Set or delete environment variables in a Vercel project',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Vercel project ID' },
          key: { type: 'string', description: 'Environment variable key' },
          value: { type: 'string', description: 'Environment variable value' },
          action: { type: 'string', enum: ['set', 'delete'], default: 'set' },
        },
        required: ['projectId', 'key'],
      },
      handler: async (input: any) => {
        try {
          const result = await vercelService.manageEnvVar(
            input.projectId,
            input.key,
            input.value,
            input.action || 'set'
          );
          return {
            type: 'text',
            text: result.message,
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
