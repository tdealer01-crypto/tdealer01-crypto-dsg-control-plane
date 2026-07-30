import { formatError } from '../utils/errors.js';
export class ToolRegistry {
    constructor() {
        this.handlers = new Map();
        this.schemas = new Map();
    }
    registerTool(name, description, schema, handler) {
        this.handlers.set(name, handler);
        this.schemas.set(name, schema);
    }
    getTools() {
        const tools = [];
        // Implementation would return registered tools
        return tools;
    }
    async execute(name, input) {
        const handler = this.handlers.get(name);
        if (!handler)
            throw new Error(`Tool not found: ${name}`);
        return handler(input);
    }
}
export function setupSupabaseTools(registry, service) {
    registry.registerTool('dsg_query_database', 'Execute SQL queries against Supabase with RLS', { type: 'object', properties: { query: { type: 'string' } } }, async (input) => {
        try {
            const result = await service.executeQuery(input.query, input.params);
            return JSON.stringify(result, null, 2);
        }
        catch (error) {
            const err = formatError(error);
            throw new Error(`Query error: ${err.message}`);
        }
    });
    registry.registerTool('dsg_list_tables', 'List all tables in Supabase', { type: 'object', properties: {} }, async () => {
        try {
            const tables = await service.listTables();
            return `Tables:\n${tables.join('\n')}`;
        }
        catch (error) {
            const err = formatError(error);
            throw new Error(`List tables error: ${err.message}`);
        }
    });
}
export function setupVercelTools(registry, service) {
    registry.registerTool('vercel_list_deployments', 'List Vercel deployments', { type: 'object', properties: { projectId: { type: 'string' } } }, async (input) => {
        try {
            const deployments = await service.listDeployments(input.projectId, input.limit || 10);
            return JSON.stringify(deployments, null, 2);
        }
        catch (error) {
            const err = formatError(error);
            throw new Error(`Deployments error: ${err.message}`);
        }
    });
    registry.registerTool('vercel_get_project_status', 'Get project status', { type: 'object', properties: { projectId: { type: 'string' } } }, async (input) => {
        try {
            const status = await service.getProjectStatus(input.projectId);
            return JSON.stringify(status, null, 2);
        }
        catch (error) {
            const err = formatError(error);
            throw new Error(`Status error: ${err.message}`);
        }
    });
}
export function setupGovernanceTools(registry, spine, brain, compliance) {
    if (spine) {
        registry.registerTool('spine_check_quota', 'Check agent quota', { type: 'object', properties: { agentId: { type: 'string' } } }, async (input) => {
            try {
                const quota = await spine.checkQuota(input.agentId);
                return `Quota: ${quota.available}/${quota.limit} available (${quota.percentUsed.toFixed(1)}% used)`;
            }
            catch (error) {
                const err = formatError(error);
                throw new Error(`Quota error: ${err.message}`);
            }
        });
    }
    if (brain) {
        registry.registerTool('dsg_propose_plan', 'Propose execution plan', { type: 'object', properties: { objective: { type: 'string' } } }, async (input) => {
            try {
                const plan = await brain.proposePlan(input.objective, input.context, input.constraints);
                return JSON.stringify(plan, null, 2);
            }
            catch (error) {
                const err = formatError(error);
                throw new Error(`Plan error: ${err.message}`);
            }
        });
    }
    if (compliance) {
        registry.registerTool('ccvs_list_audit_logs', 'List audit logs', { type: 'object', properties: { agentId: { type: 'string' } } }, async (input) => {
            try {
                const logs = await compliance.listAuditLogs(input.agentId, input.limit || 100);
                return JSON.stringify(logs, null, 2);
            }
            catch (error) {
                const err = formatError(error);
                throw new Error(`Audit logs error: ${err.message}`);
            }
        });
    }
}
