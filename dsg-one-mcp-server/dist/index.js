// @ts-nocheck
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SupabaseService } from './services/supabase-service.js';
import { VercelService } from './services/vercel-service.js';
import { SpineService } from './services/spine-service.js';
import { DSGBrainService } from './services/dsg-brain-service.js';
import { ComplianceService } from './services/compliance-service.js';
import { ToolRegistry, setupSupabaseTools, setupVercelTools, setupGovernanceTools, setupZ3Tools } from './tools/index.js';
async function main() {
    const server = new Server({
        name: 'dsg-one-mcp-server',
        version: '1.0.0',
    });
    const registry = new ToolRegistry();
    const services = {};
    // Initialize Supabase (required)
    try {
        services.supabase = new SupabaseService({
            url: process.env.SUPABASE_URL || '',
            anonKey: process.env.SUPABASE_ANON_KEY || '',
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        });
        setupSupabaseTools(registry, services.supabase);
        console.error('[DSG MCP] Supabase initialized with 2 tools');
    }
    catch (error) {
        console.error('[DSG MCP] Supabase init failed:', error);
        process.exit(1);
    }
    // Initialize Vercel (optional)
    if (process.env.VERCEL_API_TOKEN) {
        try {
            services.vercel = new VercelService({
                apiToken: process.env.VERCEL_API_TOKEN,
                teamId: process.env.VERCEL_TEAM_ID,
            });
            setupVercelTools(registry, services.vercel);
            console.error('[DSG MCP] Vercel initialized with 2 tools');
        }
        catch (error) {
            console.error('[DSG MCP] Vercel init failed:', error);
        }
    }
    // Initialize Governance services (optional)
    let spine;
    let brain;
    let compliance;
    if (process.env.SPINE_BASE_URL) {
        try {
            spine = new SpineService({ baseUrl: process.env.SPINE_BASE_URL, apiKey: process.env.SPINE_API_KEY || '' });
            console.error('[DSG MCP] Spine initialized');
        }
        catch (error) {
            console.error('[DSG MCP] Spine init failed:', error);
        }
    }
    if (process.env.DSG_BRAIN_BASE_URL) {
        try {
            brain = new DSGBrainService({ baseUrl: process.env.DSG_BRAIN_BASE_URL, apiKey: process.env.DSG_BRAIN_API_KEY || '' });
            console.error('[DSG MCP] DSG Brain initialized');
        }
        catch (error) {
            console.error('[DSG MCP] DSG Brain init failed:', error);
        }
    }
    if (process.env.COMPLIANCE_BASE_URL) {
        try {
            compliance = new ComplianceService({ baseUrl: process.env.COMPLIANCE_BASE_URL, apiKey: process.env.COMPLIANCE_API_KEY || '' });
            console.error('[DSG MCP] Compliance initialized');
        }
        catch (error) {
            console.error('[DSG MCP] Compliance init failed:', error);
        }
    }
    setupGovernanceTools(registry, spine, brain, compliance);
    setupZ3Tools(registry);
    console.error('[DSG MCP] Z3 Formal Proof tools initialized with 3 tools');
    // Handle tools/list request
    server.setRequestHandler('tools/list', async () => {
        const tools = [
            { name: 'dsg_query_database', description: 'Execute SQL queries against Supabase with RLS', inputSchema: {} },
            { name: 'dsg_list_tables', description: 'List all tables in Supabase', inputSchema: {} },
        ];
        if (services.vercel) {
            tools.push({ name: 'vercel_list_deployments', description: 'List Vercel deployments', inputSchema: {} });
            tools.push({ name: 'vercel_get_project_status', description: 'Get project status', inputSchema: {} });
        }
        if (spine) {
            tools.push({ name: 'spine_check_quota', description: 'Check agent quota', inputSchema: {} });
        }
        if (brain) {
            tools.push({ name: 'dsg_propose_plan', description: 'Propose execution plan', inputSchema: {} });
        }
        if (compliance) {
            tools.push({ name: 'ccvs_list_audit_logs', description: 'List audit logs', inputSchema: {} });
        }
        // Z3 Formal Proof tools
        tools.push({ name: 'dsg_solve_ising_qubo', description: 'Solve regulatory policy optimization using Ising model + QUBO energy minimization', inputSchema: {} });
        tools.push({ name: 'dsg_verify_z3_constraints', description: 'Verify that a policy solution satisfies all Z3 formal constraints', inputSchema: {} });
        tools.push({ name: 'dsg_verify_audit_chain', description: 'Cryptographically verify integrity of audit chain using SHA-256 hash chain validation', inputSchema: {} });
        return { tools };
    });
    // Handle tools/call request
    server.setRequestHandler('tools/call', async (request) => {
        const toolName = request.params.name;
        const toolInput = request.params.arguments || {};
        try {
            const result = await registry.execute(toolName, toolInput);
            return { content: [{ type: 'text', text: result }] };
        }
        catch (error) {
            return { isError: true, content: [{ type: 'text', text: `Error: ${String(error)}` }] };
        }
    });
    // Handle resources/list request
    server.setRequestHandler('resources/list', async () => ({
        resources: [
            {
                uri: 'dsg-control-plane://status',
                name: 'DSG ONE MCP Server',
                description: 'Control plane integration for DSG ONE',
                mimeType: 'text/plain',
            },
        ],
    }));
    // Handle resources/read request
    server.setRequestHandler('resources/read', async (request) => {
        if (request.params.uri === 'dsg-control-plane://status') {
            return {
                contents: [
                    {
                        uri: request.params.uri,
                        mimeType: 'text/plain',
                        text: `DSG ONE MCP Server
================
Status: Ready
Services: ${Object.keys(services).join(', ')}
Tools: 10+ (includes Z3 Formal Proof)
Phase: 3 (Testing) & 4 (Evaluation) & 5 (Optimization)`,
                    },
                ],
            };
        }
        return { isError: true, contents: [{ uri: request.params.uri, mimeType: 'text/plain', text: 'Not found' }] };
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[DSG MCP] Server started successfully');
}
main().catch((error) => {
    console.error('[DSG MCP] Fatal error:', error);
    process.exit(1);
});
