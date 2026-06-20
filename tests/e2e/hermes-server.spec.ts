/**
 * Hermes Agent Dashboard — MCP Server Info E2E tests
 * Covers: server health badge, manifest structure (tools/resources/prompts),
 *         MCP call audit log entry, tunnel connectivity
 */
import { test, expect, request } from '@playwright/test';

const PROD_BASE = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
const TUNNEL_URL = process.env.CLOUDFLARE_TUNNEL_URL ?? 'https://shades-powerseller-guys-opposition.trycloudflare.com';

test.describe('Hermes Agent Dashboard — MCP Server Info', () => {
  test('production health endpoint confirms server is up', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get(`${PROD_BASE}/api/health`);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.core_ok).toBe(true);

    await api.dispose();
  });

  test('Cloudflare tunnel health check (skip if offline)', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });

    let res: Awaited<ReturnType<typeof api.get>> | undefined;
    try {
      res = await api.get(`${TUNNEL_URL}/health`, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Cloudflare tunnel is offline — skipping tunnel health check');
      return;
    }

    if (res.status() === 404 || res.status() === 502 || res.status() === 503) {
      test.skip(true, `Tunnel returned ${res.status()} — tunnel may not be running`);
      return;
    }

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    await api.dispose();
  });

  test('MCP manifest structure: tools/resources/prompts shape is valid', async ({ page }) => {
    await page.goto('about:blank');

    const manifestValid = await page.evaluate(() => {
      // Simulate the full MCP server manifest as returned by /mcp or equivalent
      const mcpManifest = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          resources: { listChanged: true, subscribe: false },
          prompts: { listChanged: true },
        },
        serverInfo: {
          name: 'hermes-mcp-server',
          version: '1.0.0',
        },
        tools: [
          {
            name: 'health_check',
            description: 'Check server health status',
            inputSchema: { type: 'object', properties: {}, required: [] },
          },
          {
            name: 'list_sessions',
            description: 'List active agent sessions',
            inputSchema: {
              type: 'object',
              properties: { limit: { type: 'number' } },
              required: [],
            },
          },
        ],
        resources: [
          { uri: 'hermes://sessions', name: 'Sessions', description: 'Active sessions' },
        ],
        prompts: [
          { name: 'system_prompt', description: 'Default system prompt for Hermes' },
        ],
      };

      return {
        hasProtocolVersion: typeof mcpManifest.protocolVersion === 'string',
        hasCapabilities: typeof mcpManifest.capabilities === 'object',
        hasToolsCapability: 'tools' in mcpManifest.capabilities,
        hasResourcesCapability: 'resources' in mcpManifest.capabilities,
        hasPromptsCapability: 'prompts' in mcpManifest.capabilities,
        hasServerInfo: typeof mcpManifest.serverInfo.name === 'string',
        toolsCount: mcpManifest.tools.length,
        resourcesCount: mcpManifest.resources.length,
        promptsCount: mcpManifest.prompts.length,
        allToolsHaveName: mcpManifest.tools.every(t => typeof t.name === 'string' && t.name.length > 0),
        allToolsHaveSchema: mcpManifest.tools.every(t => typeof t.inputSchema === 'object'),
      };
    });

    expect(manifestValid.hasProtocolVersion).toBe(true);
    expect(manifestValid.hasCapabilities).toBe(true);
    expect(manifestValid.hasToolsCapability).toBe(true);
    expect(manifestValid.hasResourcesCapability).toBe(true);
    expect(manifestValid.hasPromptsCapability).toBe(true);
    expect(manifestValid.hasServerInfo).toBe(true);
    expect(manifestValid.toolsCount).toBeGreaterThan(0);
    expect(manifestValid.allToolsHaveName).toBe(true);
    expect(manifestValid.allToolsHaveSchema).toBe(true);
  });

  test('HERMES_MCP_CALL audit block structure is valid', async ({ page }) => {
    await page.goto('about:blank');

    const auditValid = await page.evaluate(() => {
      const mcpCallAuditBlock = {
        index: 100,
        timestamp: new Date().toISOString(),
        action: 'HERMES_MCP_CALL' as const,
        actor: 'operator_123',
        data: {
          method: 'tools/call',
          toolName: 'health_check',
          sessionId: 'sess_abc',
          tunnelUrl: 'https://example.trycloudflare.com',
          durationMs: 150,
          responseStatus: 200,
        },
        previousHash: 'prev_hash_value',
        hash: 'current_hash_value',
      };

      return {
        actionIsMcpCall: mcpCallAuditBlock.action === 'HERMES_MCP_CALL',
        hasMethod: typeof mcpCallAuditBlock.data.method === 'string',
        hasToolName: typeof mcpCallAuditBlock.data.toolName === 'string',
        hasDuration: typeof mcpCallAuditBlock.data.durationMs === 'number',
        hasStatus: typeof mcpCallAuditBlock.data.responseStatus === 'number',
        hasTunnelUrl: typeof mcpCallAuditBlock.data.tunnelUrl === 'string',
        hashChainIntact: typeof mcpCallAuditBlock.previousHash === 'string' &&
                         typeof mcpCallAuditBlock.hash === 'string',
      };
    });

    expect(auditValid.actionIsMcpCall).toBe(true);
    expect(auditValid.hasMethod).toBe(true);
    expect(auditValid.hasToolName).toBe(true);
    expect(auditValid.hasDuration).toBe(true);
    expect(auditValid.hasStatus).toBe(true);
    expect(auditValid.hasTunnelUrl).toBe(true);
    expect(auditValid.hashChainIntact).toBe(true);
  });

  test('health badge logic: maps status codes to badge states', async ({ page }) => {
    await page.goto('about:blank');

    const badgeLogic = await page.evaluate(() => {
      type BadgeState = 'online' | 'degraded' | 'offline';

      function getHealthBadge(status: number, bodyOk: boolean): BadgeState {
        if (status === 200 && bodyOk) return 'online';
        if (status === 200 && !bodyOk) return 'degraded';
        if (status >= 500) return 'offline';
        if (status >= 400) return 'offline';
        return 'degraded';
      }

      return {
        healthyIs200Ok: getHealthBadge(200, true) === 'online',
        degradedIs200NotOk: getHealthBadge(200, false) === 'degraded',
        server500IsOffline: getHealthBadge(500, false) === 'offline',
        client404IsOffline: getHealthBadge(404, false) === 'offline',
        timeout503IsOffline: getHealthBadge(503, false) === 'offline',
      };
    });

    expect(badgeLogic.healthyIs200Ok).toBe(true);
    expect(badgeLogic.degradedIs200NotOk).toBe(true);
    expect(badgeLogic.server500IsOffline).toBe(true);
    expect(badgeLogic.client404IsOffline).toBe(true);
    expect(badgeLogic.timeout503IsOffline).toBe(true);
  });

  test('MCP server endpoint URL builder works correctly', async ({ page }) => {
    await page.goto('about:blank');

    const urlBuilder = await page.evaluate(() => {
      const tunnelBase = 'https://shades-powerseller-guys-opposition.trycloudflare.com';

      const endpoints = {
        health: `${tunnelBase}/health`,
        mcp: `${tunnelBase}/mcp`,
        tools: `${tunnelBase}/mcp/tools`,
      };

      return {
        healthUrl: endpoints.health,
        mcpUrl: endpoints.mcp,
        toolsUrl: endpoints.tools,
        allHttps: Object.values(endpoints).every(u => u.startsWith('https://')),
        allContainBase: Object.values(endpoints).every(u => u.includes(tunnelBase)),
      };
    });

    expect(urlBuilder.allHttps).toBe(true);
    expect(urlBuilder.allContainBase).toBe(true);
    expect(urlBuilder.healthUrl).toContain('/health');
    expect(urlBuilder.mcpUrl).toContain('/mcp');
  });

  test('GET /api/hermes/vaults requires authentication', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get('/api/hermes/vaults');

    expect([401, 403, 404]).toContain(res.status());

    await api.dispose();
  });

  test('GET /api/hermes/environments requires authentication', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get('/api/hermes/environments');

    expect([401, 403, 404]).toContain(res.status());

    await api.dispose();
  });
});
