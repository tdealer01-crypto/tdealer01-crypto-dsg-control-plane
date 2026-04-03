import { describe, expect, it } from 'vitest';
import { buildMagicLinkEmail, escapeHtmlAttribute } from '../../lib/resend';

describe('escapeHtmlAttribute', () => {
  it('escapes &, ", \', <, and > characters', () => {
    const raw = `a&b"c'd<e>f`;
    expect(escapeHtmlAttribute(raw)).toBe('a&amp;b&quot;c&#x27;d&lt;e&gt;f');
  });
});

describe('buildMagicLinkEmail', () => {
  it('escapes magic link before interpolation into href', () => {
    const maliciousLink = 'https://example.com/continue?next="onmouseover=alert(1)&x=<tag>';
    const html = buildMagicLinkEmail(maliciousLink, 'login');

    expect(html).toContain('href="https://example.com/continue?next=&quot;onmouseover=alert(1)&amp;x=&lt;tag&gt;"');
    expect(html).not.toContain(`href="${maliciousLink}"`);
  });
});
