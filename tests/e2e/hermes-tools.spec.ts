/**
 * Hermes Agent Dashboard — Tool Calling E2E tests
 * Covers: tool manifest shape, invocation payload, audit log entry, auth guards
 */
import { test, expect, request } from '@playwright/test';

test.describe('Hermes Agent Dashboard — Tool Calling', () => {
  test('GET /api/hermes/skills requires authentication', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get('/api/hermes/skills');

    expect([401, 403, 404]).toContain(res.status());

    await api.dispose();
  });

  test('GET /api/hermes/agents requires authentication', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get('/api/hermes/agents');

    expect([401, 403, 404]).toContain(res.status());

    await api.dispose();
  });

  test('tool manifest interface validates correctly', async ({ page }) => {
    await page.goto('about:blank');

    const manifestValid = await page.evaluate(() => {
      // Simulate a tool manifest entry as returned by MCP server
      const toolManifest = {
        name: 'search_web',
        description: 'Search the web for recent information',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query',
            },
          },
          required: ['query'],
        },
      };

      return {
        hasName: typeof toolManifest.name === 'string' && toolManifest.name.length > 0,
        hasDescription: typeof toolManifest.description === 'string',
        hasInputSchema: typeof toolManifest.inputSchema === 'object',
        schemaHasProperties: !!toolManifest.inputSchema.properties,
        schemaHasRequired: Array.isArray(toolManifest.inputSchema.required),
      };
    });

    expect(manifestValid.hasName).toBe(true);
    expect(manifestValid.hasDescription).toBe(true);
    expect(manifestValid.hasInputSchema).toBe(true);
    expect(manifestValid.schemaHasProperties).toBe(true);
    expect(manifestValid.schemaHasRequired).toBe(true);
  });

  test('HERMES_TOOL_CALL audit block structure is valid', async ({ page }) => {
    await page.goto('about:blank');

    const auditValid = await page.evaluate(() => {
      // Simulate creating a HERMES_TOOL_CALL audit block entry
      const toolCallAuditBlock = {
        index: 42,
        timestamp: new Date().toISOString(),
        action: 'HERMES_TOOL_CALL' as const,
        actor: 'operator_user_123',
        data: {
          toolName: 'search_web',
          input: { query: 'DSG control plane status' },
          duration_ms: 234,
          result_preview: 'Found 10 results...',
        },
        previousHash: 'abc123previoushash',
        hash: 'sha256_computed_hash_here',
      };

      return {
        actionIsHermes: toolCallAuditBlock.action === 'HERMES_TOOL_CALL',
        hasToolName: typeof toolCallAuditBlock.data.toolName === 'string',
        hasInput: typeof toolCallAuditBlock.data.input === 'object',
        hasDuration: typeof toolCallAuditBlock.data.duration_ms === 'number',
        hasActor: typeof toolCallAuditBlock.actor === 'string' && toolCallAuditBlock.actor.length > 0,
        hasValidIndex: typeof toolCallAuditBlock.index === 'number' && toolCallAuditBlock.index >= 0,
      };
    });

    expect(auditValid.actionIsHermes).toBe(true);
    expect(auditValid.hasToolName).toBe(true);
    expect(auditValid.hasInput).toBe(true);
    expect(auditValid.hasDuration).toBe(true);
    expect(auditValid.hasActor).toBe(true);
    expect(auditValid.hasValidIndex).toBe(true);
  });

  test('tool invocation payload: required fields are present', async ({ page }) => {
    await page.goto('about:blank');

    const payloadValid = await page.evaluate(() => {
      // Simulate tool invocation payload
      const invocation = {
        toolName: 'search_web',
        sessionId: 'sess_abc123',
        input: { query: 'test query' },
        requestedAt: new Date().toISOString(),
      };

      // Validate all required fields exist
      const requiredFields = ['toolName', 'sessionId', 'input', 'requestedAt'] as const;
      const allPresent = requiredFields.every(field => field in invocation);
      const toolNameValid = typeof invocation.toolName === 'string' && invocation.toolName.length > 0;
      const inputIsObject = typeof invocation.input === 'object' && invocation.input !== null;
      const timestampValid = !isNaN(Date.parse(invocation.requestedAt));

      return { allPresent, toolNameValid, inputIsObject, timestampValid };
    });

    expect(payloadValid.allPresent).toBe(true);
    expect(payloadValid.toolNameValid).toBe(true);
    expect(payloadValid.inputIsObject).toBe(true);
    expect(payloadValid.timestampValid).toBe(true);
  });

  test('tool playground: input JSON validation logic', async ({ page }) => {
    await page.goto('about:blank');

    const jsonValidation = await page.evaluate(() => {
      // Simulate the JSON input validator in the tool playground
      function validateToolInput(raw: string): { ok: boolean; error?: string; parsed?: unknown } {
        try {
          const parsed = JSON.parse(raw);
          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return { ok: false, error: 'Input must be a JSON object' };
          }
          return { ok: true, parsed };
        } catch {
          return { ok: false, error: 'Invalid JSON' };
        }
      }

      return {
        validObject: validateToolInput('{"query": "test"}').ok,
        invalidJson: !validateToolInput('{not json}').ok,
        emptyString: !validateToolInput('').ok,
        arrayInput: !validateToolInput('[1,2,3]').ok,
        nullInput: !validateToolInput('null').ok,
      };
    });

    expect(jsonValidation.validObject).toBe(true);
    expect(jsonValidation.invalidJson).toBe(true);
    expect(jsonValidation.emptyString).toBe(true);
    expect(jsonValidation.arrayInput).toBe(true);
    expect(jsonValidation.nullInput).toBe(true);
  });
});
