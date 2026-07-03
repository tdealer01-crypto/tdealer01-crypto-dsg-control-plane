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

  it('pricing page renders tier cards with checkout links fetched from pricing APIs', () => {
    const source = read('app/pricing/page.tsx');
    expect(source).toContain('checkoutLink');
    expect(source).toContain('/api/delivery-proof/pricing');
    expect(source).toContain('/api/dsg/v1/pricing');
    expect(source).toContain('tier.cta');
  });

  it('login includes approval-required, sso-required, and not-allowed banners', () => {
    const source = read('app/login/page.tsx');
    expect(source).toContain('error === "approval-required"');
    expect(source).toContain('ต้องได้รับอนุมัติจากผู้ดูแล');
    expect(source).toContain('error === "sso-required"');
    expect(source).toContain('SSO');
    expect(source).toContain('error === "not-allowed"');
    expect(source).toContain('ขอสิทธิ์เข้าถึง');
    expect(source).toContain('เข้าสู่ระบบผ่าน SSO');
    expect(source).toContain('error === "invalid-email"');
  });
});
