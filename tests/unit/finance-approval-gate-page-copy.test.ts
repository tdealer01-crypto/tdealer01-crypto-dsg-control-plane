import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pagePath = join(process.cwd(), 'app/finance-approval-gate/page.tsx');
const page = readFileSync(pagePath, 'utf8');

describe('finance approval gate landing page copy', () => {
  it('exposes the finance approval gate route with the required pilot CTA', () => {
    expect(page).toContain('Finance Approval Gate');
    expect(page).toContain('href="/request-access?pilot=finance-approval-gate"');
    expect(page.match(/Request Finance Gate Pilot/g)).toHaveLength(1);
  });

  it('explains the concrete finance approval workflow', () => {
    expect(page).toContain('AI or automation requests a finance action');
    expect(page).toContain('DSG evaluates the request boundary');
    expect(page).toContain('DSG returns a bounded decision');
    expect(page).toContain('DSG records decision-time evidence');
    expect(page).toContain('policy, risk, entitlement, and evidence');
  });

  it('includes all required decision outcomes', () => {
    expect(page).toContain('ALLOW');
    expect(page).toContain('BLOCK');
    expect(page).toContain('REVIEW');
    expect(page).toContain('UNSUPPORTED');
  });

  it('includes all five required demo scenarios', () => {
    expect(page).toContain('Low-risk payment allowed');
    expect(page).toContain('High-value payment requires review');
    expect(page).toContain('Missing invoice evidence requires review');
    expect(page).toContain('Destructive action blocked');
    expect(page).toContain('Unsupported action returned as unsupported');
  });

  it('keeps the evidence and claim boundary visible and limited', () => {
    expect(page).toContain('Pre-audit evidence only. No independent certification claimed.');
    expect(page).toContain('does not claim independent certification, WORM-certified storage, external Z3 production invocation, or enterprise readiness');
    expect(page).not.toContain('independently certified');
    expect(page).not.toContain('completed WORM-certified storage');
    expect(page).not.toContain('enterprise-ready proof system');
  });
});
