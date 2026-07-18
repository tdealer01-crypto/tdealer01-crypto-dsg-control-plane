import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearEnvResolverCache, resolveEnv } from '../../lib/dsg/agent-os/env-resolver';

const TEST_VAR = 'AGENT_OS_ENV_RESOLVER_TEST_VAR';
const MISSING_VAR = 'AGENT_OS_ENV_RESOLVER_MISSING_VAR';

describe('resolveEnv', () => {
  beforeEach(() => {
    clearEnvResolverCache();
    delete process.env[TEST_VAR];
    delete process.env[MISSING_VAR];
  });

  afterEach(() => {
    clearEnvResolverCache();
    delete process.env[TEST_VAR];
  });

  it('resolves from process.env first and reports the source', async () => {
    process.env[TEST_VAR] = 'from-env';

    const { values, report } = await resolveEnv([TEST_VAR]);

    expect(values[TEST_VAR]).toBe('from-env');
    expect(report).toEqual([{ name: TEST_VAR, source: 'process.env' }]);
  });

  it('marks unresolvable names as missing without throwing', async () => {
    const { values, report } = await resolveEnv([MISSING_VAR]);

    expect(values[MISSING_VAR]).toBeUndefined();
    expect(report).toEqual([{ name: MISSING_VAR, source: 'missing' }]);
  });

  it('keeps report order aligned with the requested names', async () => {
    process.env[TEST_VAR] = 'v';

    const { report } = await resolveEnv([MISSING_VAR, TEST_VAR]);

    expect(report.map((r) => r.name)).toEqual([MISSING_VAR, TEST_VAR]);
    expect(report[0].source).toBe('missing');
    expect(report[1].source).toBe('process.env');
  });

  it('serves cached values on subsequent calls', async () => {
    process.env[TEST_VAR] = 'first';
    await resolveEnv([TEST_VAR]);

    process.env[TEST_VAR] = 'changed';
    const { values, report } = await resolveEnv([TEST_VAR]);

    expect(values[TEST_VAR]).toBe('first');
    expect(report[0].source).toBe('process.env');
  });

  it('never puts secret values into the report', async () => {
    process.env[TEST_VAR] = 'super-secret-value';

    const { report } = await resolveEnv([TEST_VAR]);

    expect(JSON.stringify(report)).not.toContain('super-secret-value');
  });
});
