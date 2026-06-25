import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('paid workspace bootstrap wiring', () => {
  it('adds the auth bootstrap endpoint', () => {
    const route = readFileSync(join(process.cwd(), 'app/api/auth/bootstrap/route.ts'), 'utf8');
    expect(route).toContain('ensureUserWorkspace');
    expect(route).toContain('supabase.auth.getUser');
    expect(route).not.toContain('request.json');
  });

  it('billing checkout bootstraps workspace before Stripe checkout', () => {
    const route = readFileSync(join(process.cwd(), 'app/api/billing/checkout/route.ts'), 'utf8');
    expect(route).toContain('ensureUserWorkspace');
    expect(route).toContain('client_reference_id: resolvedOrgId');
    expect(route).toContain('auth_user_id: user.id');
    expect(route).not.toContain("return NextResponse.json({ error: 'Missing organization' }");
    expect(route).not.toContain('!profile?.is_active || !profile?.org_id');
  });

  it('dashboard startup calls bootstrap before org-scoped setup', () => {
    const component = readFileSync(join(process.cwd(), 'components/AutoSetupTrigger.tsx'), 'utf8');
    expect(component).toContain('/api/auth/bootstrap');
    expect(component.indexOf('/api/auth/bootstrap')).toBeLessThan(component.indexOf('/api/onboarding/state'));
  });
});
