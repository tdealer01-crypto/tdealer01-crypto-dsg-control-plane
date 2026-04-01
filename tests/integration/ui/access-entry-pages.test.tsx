import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('public access entry pages', () => {
  it('homepage primary CTA points to /login', () => {
    const source = read('app/page.tsx');
    expect(source).toContain('href="/login"');
    expect(source).toContain('Continue with email');
  });

  it('pricing trial CTA points to /login', () => {
    const source = read('app/pricing/page.tsx');
    expect(source).toContain('href="/login"');
    expect(source).toContain('Start Trial');
  });

  it('login includes approval-required, sso-required, and not-allowed banners', () => {
    const source = read('app/login/page.tsx');
    expect(source).toContain("error === 'approval-required'");
    expect(source).toContain('requires admin approval');
    expect(source).toContain("error === 'sso-required'");
    expect(source).toContain('requires single sign-on');
    expect(source).toContain("error === 'not-allowed'");
    expect(source).toContain('Request access');
    expect(source).toContain('Continue with SSO');
    expect(source).toContain("error === 'invalid-email'");
  });
});
