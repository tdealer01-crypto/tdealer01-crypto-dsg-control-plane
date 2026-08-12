import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Pro overage runtime bootstrap boundary', () => {
  const repoRoot = process.cwd();
  const script = readFileSync(
    join(repoRoot, 'scripts/bootstrap-pro-overage.mjs'),
    'utf8',
  );
  const dockerfile = readFileSync(join(repoRoot, 'Dockerfile'), 'utf8');

  it('creates only the Stripe Meter and metered Price needed for overage', () => {
    expect(script).toContain("stripe.billing.meters.create");
    expect(script).toContain("stripe.prices.create");
    expect(script).toContain("event_name: EXPECTED_EVENT_NAME");
    expect(script).toContain("unit_amount_decimal: UNIT_AMOUNT_DECIMAL_CENTS");
    expect(script).toContain("rate_usd: '0.001'");

    expect(script).not.toMatch(/customers\.create/);
    expect(script).not.toMatch(/subscriptions\.create/);
    expect(script).not.toMatch(/checkout\.sessions\.create/);
    expect(script).not.toMatch(/paymentIntents\.create/);
    expect(script).not.toMatch(/charges\.create/);
  });

  it('runs only behind the explicit one-shot runtime flag', () => {
    expect(script).toContain('DSG_BOOTSTRAP_OVERAGE_ON_START');
    expect(dockerfile).toContain('DSG_BOOTSTRAP_OVERAGE_ON_START');
    expect(dockerfile).toContain('node ./scripts/bootstrap-pro-overage.mjs');
    expect(dockerfile).toContain('&& npx next start');
  });

  it('keeps the source-of-truth event name and rate exact', () => {
    expect(script).toContain("const EXPECTED_EVENT_NAME = 'dsg_execution_overage'");
    expect(script).toContain("const UNIT_AMOUNT_DECIMAL_CENTS = '0.1'");
  });
});
