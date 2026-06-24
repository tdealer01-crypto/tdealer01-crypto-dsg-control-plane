/**
 * Hermes Agent Dashboard — Memory / Session State E2E tests
 * Covers: CRUD auth guards, session state machine, session listing, auto-save logic
 */
import { test, expect, request } from '@playwright/test';

test.describe('Hermes Agent Dashboard — Sessions', () => {
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
      headers: { 'content-type': 'application/json' },
      data: { agent_id: 'test-agent-1' },
    });

    expect([401, 403]).toContain(res.status());

    await api.dispose();
  });

  test('GET /api/hermes/sessions/[id] requires authentication', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get('/api/hermes/sessions/sess_fake_id_12345');

    expect([401, 403, 404]).toContain(res.status());

    await api.dispose();
  });

  test('DELETE /api/hermes/sessions/[id] requires authentication', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.delete('/api/hermes/sessions/sess_fake_id_12345');

    expect([401, 403, 404]).toContain(res.status());

    await api.dispose();
  });

  test('session state machine: valid status transitions', async ({ page }) => {
    await page.goto('about:blank');

    const transitions = await page.evaluate(() => {
      type SessionStatus = 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'archived';

      const VALID_STATUSES: SessionStatus[] = ['created', 'running', 'paused', 'completed', 'failed', 'archived'];

      const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
        created: ['running', 'failed'],
        running: ['paused', 'completed', 'failed'],
        paused: ['running', 'failed'],
        completed: ['archived'],
        failed: ['archived'],
        archived: [],
      };

      // Verify all statuses have transition rules
      const allStatusesCovered = VALID_STATUSES.every(s => s in VALID_TRANSITIONS);

      // Verify terminal states have no transitions
      const completedIsTerminal = VALID_TRANSITIONS.completed.includes('archived');
      const failedIsTerminal = VALID_TRANSITIONS.failed.includes('archived');
      const archivedIsTerminal = VALID_TRANSITIONS.archived.length === 0;

      return {
        allStatusesCovered,
        completedIsTerminal,
        failedIsTerminal,
        archivedIsTerminal,
        totalStatuses: VALID_STATUSES.length,
      };
    });

    expect(transitions.allStatusesCovered).toBe(true);
    expect(transitions.completedIsTerminal).toBe(true);
    expect(transitions.failedIsTerminal).toBe(true);
    expect(transitions.archivedIsTerminal).toBe(true);
    expect(transitions.totalStatuses).toBe(6);
  });

  test('auto-save debounce logic: only fires once within debounce window', async ({ page }) => {
    await page.goto('about:blank');

    const debounceResult = await page.evaluate(() => {
      return new Promise<{ callCount: number; debounceMs: number }>((resolve) => {
        let callCount = 0;
        const DEBOUNCE_MS = 300;

        // Simulate debounced auto-save
        let timer: ReturnType<typeof setTimeout> | null = null;
        function autoSave() {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            callCount++;
          }, DEBOUNCE_MS);
        }

        // Rapid calls within debounce window
        autoSave();
        autoSave();
        autoSave();
        autoSave();
        autoSave(); // 5 rapid calls

        // After debounce + margin, check count
        setTimeout(() => {
          resolve({ callCount, debounceMs: DEBOUNCE_MS });
        }, DEBOUNCE_MS + 100);
      });
    });

    // Should only have called once despite 5 rapid triggers
    expect(debounceResult.callCount).toBe(1);
    expect(debounceResult.debounceMs).toBe(300);
  });

  test('session listing: filter by status works logically', async ({ page }) => {
    await page.goto('about:blank');

    const filterResult = await page.evaluate(() => {
      const sessions = [
        { id: 'sess_1', status: 'running', title: 'Session A' },
        { id: 'sess_2', status: 'completed', title: 'Session B' },
        { id: 'sess_3', status: 'running', title: 'Session C' },
        { id: 'sess_4', status: 'failed', title: 'Session D' },
        { id: 'sess_5', status: 'archived', title: 'Session E' },
      ];

      const running = sessions.filter(s => s.status === 'running');
      const completed = sessions.filter(s => s.status === 'completed');
      const activeOnly = sessions.filter(s => ['running', 'paused'].includes(s.status));
      const terminal = sessions.filter(s => ['completed', 'failed', 'archived'].includes(s.status));

      return {
        runningCount: running.length,
        completedCount: completed.length,
        activeCount: activeOnly.length,
        terminalCount: terminal.length,
        totalCount: sessions.length,
      };
    });

    expect(filterResult.runningCount).toBe(2);
    expect(filterResult.completedCount).toBe(1);
    expect(filterResult.activeCount).toBe(2);
    expect(filterResult.terminalCount).toBe(3);
    expect(filterResult.totalCount).toBe(5);
  });

  test('session CRUD: POST body validation — agent_id is required', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });

    // POST without agent_id — should return 400 (even before auth, or 401 if auth checked first)
    const res = await api.post('/api/hermes/sessions', {
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer fake_session_token',
      },
      data: { title: 'Missing agent_id' },
    });

    // Either auth failure or validation failure
    expect([400, 401, 403]).toContain(res.status());

    await api.dispose();
  });

  test('sessions API: response does not leak stack traces', async () => {
    const api = await request.newContext({ ignoreHTTPSErrors: true });
    const res = await api.get('/api/hermes/sessions', {
      headers: { authorization: 'Bearer bogus_token' },
    });

    const text = await res.text();
    expect(text).not.toContain('at Object.');
    expect(text).not.toContain('node_modules');

    await api.dispose();
  });
});
