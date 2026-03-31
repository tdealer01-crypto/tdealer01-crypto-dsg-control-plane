import { canonicalHash, canonicalJson } from '../../../lib/runtime/canonical';

describe('runtime canonical', () => {
  it('normalizes object key order', () => {
    const a = canonicalJson({ b: 1, a: 2 });
    const b = canonicalJson({ a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it('hashes equivalent payloads consistently', () => {
    expect(canonicalHash({ x: { b: 2, a: 1 } })).toBe(canonicalHash({ x: { a: 1, b: 2 } }));
  });
});
