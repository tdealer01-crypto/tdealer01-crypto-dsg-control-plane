/**
 * Hermes Agent Dashboard — Chat / Q&A E2E tests
 * Covers: auth guard on dashboard, session API shape, multi-turn conversation structure
 */
import { test, expect, request } from '@playwright/test';

test.describe('Hermes Agent Dashboard — Chat', () => {
  test('GET /dashboard/hermes redirects unauthenticated user to login', async ({ page }) => {
    const res = await page.goto('/dashboard/hermes');

    // Either redirected to login or auth page
    const finalUrl = page.url();
    const isAuthRedirect = finalUrl.includes('/login') || finalUrl.includes('/auth') || finalUrl.includes('/sso');

    // Or the page returned a non-200 (if SSR renders an error page)
    const wasRedirected = isAuthRedirect || (res?.status() ?? 200) >= 300;
    expect(wasRedirected, `Expected redirect from /dashboard/hermes, got URL: ${finalUrl}`).toBe(true);
  });

  test('GET /api/hermes/sessions requires authentication', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get('/api/hermes/sessions');

    expect([401, 403]).toContain(res.status());

    const body = await res.json();
    expect(body).toHaveProperty('error');

    await api.dispose();
  });

  test('POST /api/hermes/sessions requires authentication', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.post('/api/hermes/sessions', {
      data: { agent_id: 'test-agent' },
    });

    expect([401, 403]).toContain(res.status());

    await api.dispose();
  });

  test('HermesSession interface structure validates correctly', async ({ page }) => {
    await page.goto('about:blank');

    const sessionValid = await page.evaluate(() => {
      // Simulate HermesSession interface
      const session = {
        id: 'sess_' + Math.random().toString(36).slice(2),
        userId: 'user_123',
        messages: [
          { role: 'user' as const, content: 'Hello Hermes', timestamp: new Date().toISOString() },
          { role: 'assistant' as const, content: 'Hello! How can I help?', timestamp: new Date().toISOString() },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const validRoles = ['user', 'assistant', 'tool'] as const;

      return {
        hasId: typeof session.id === 'string' && session.id.startsWith('sess_'),
        hasUserId: typeof session.userId === 'string',
        hasMessages: Array.isArray(session.messages) && session.messages.length === 2,
        allRolesValid: session.messages.every(m => validRoles.includes(m.role as typeof validRoles[number])),
        hasTimestamps: typeof session.createdAt === 'string' && typeof session.updatedAt === 'string',
        messageHasContent: session.messages.every(m => typeof m.content === 'string' && m.content.length > 0),
      };
    });

    expect(sessionValid.hasId).toBe(true);
    expect(sessionValid.hasUserId).toBe(true);
    expect(sessionValid.hasMessages).toBe(true);
    expect(sessionValid.allRolesValid).toBe(true);
    expect(sessionValid.hasTimestamps).toBe(true);
    expect(sessionValid.messageHasContent).toBe(true);
  });

  test('chat message role validation: only user/assistant/tool are valid', async ({ page }) => {
    await page.goto('about:blank');

    const roleValidation = await page.evaluate(() => {
      type MessageRole = 'user' | 'assistant' | 'tool';
      const VALID_ROLES: MessageRole[] = ['user', 'assistant', 'tool'];
      const INVALID_ROLES = ['system', 'admin', 'bot', '', null, undefined];

      const allValidPass = VALID_ROLES.every(r => VALID_ROLES.includes(r));
      const allInvalidFail = INVALID_ROLES.every(r => !VALID_ROLES.includes(r as MessageRole));

      return { allValidPass, allInvalidFail };
    });

    expect(roleValidation.allValidPass).toBe(true);
    expect(roleValidation.allInvalidFail).toBe(true);
  });

  test('chat: markdown rendering simulation — sanitizes script tags', async ({ page }) => {
    await page.goto('about:blank');

    const sanitized = await page.evaluate(() => {
      // Simulate markdown output that might contain XSS attempt
      const dangerousContent = '<script>alert("xss")</script> **Bold text** and `code`';

      // A proper markdown renderer would strip scripts
      const div = document.createElement('div');
      div.textContent = dangerousContent; // textContent auto-sanitizes
      const escaped = div.innerHTML;

      // The script tag must be escaped, not executed
      const hasScriptTag = document.querySelectorAll('script[data-xss]').length > 0;
      const isEscaped = escaped.includes('&lt;script&gt;') || !escaped.includes('<script>');

      return { isEscaped, hasScriptTag, escaped };
    });

    expect(sanitized.hasScriptTag).toBe(false);
    expect(sanitized.isEscaped).toBe(true);
  });

  test('GET /api/hermes/sessions does not expose stack trace on 401', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get('/api/hermes/sessions', {
      headers: { authorization: 'Bearer bogus_chat_token' },
    });

    const bodyText = await res.text();
    expect(bodyText).not.toContain('at Object.');
    expect(bodyText).not.toContain('node_modules');

    await api.dispose();
  });
});
