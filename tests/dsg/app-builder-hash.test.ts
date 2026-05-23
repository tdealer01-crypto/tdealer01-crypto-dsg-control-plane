import { describe, it, expect } from 'vitest';
import { hashAppBuilderObject } from '../../lib/dsg/app-builder/hash';

describe('hashAppBuilderObject', () => {
  it('returns the same hash for identical objects called twice (stability)', () => {
    const val = { a: 1, b: 'hello', c: [1, 2, 3] };
    expect(hashAppBuilderObject(val)).toBe(hashAppBuilderObject(val));
  });

  it('returns different hashes for objects with different values', () => {
    const h1 = hashAppBuilderObject({ a: 1, b: 2 });
    const h2 = hashAppBuilderObject({ a: 1, b: 3 });
    expect(h1).not.toBe(h2);
  });

  it('preserves array ordering: [1,2] and [2,1] produce different hashes', () => {
    expect(hashAppBuilderObject([1, 2])).not.toBe(hashAppBuilderObject([2, 1]));
  });

  it('returns a non-empty hex string', () => {
    const hash = hashAppBuilderObject({ x: 42 });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes nested objects stably', () => {
    const nested = { outer: { inner: { value: 99 } } };
    expect(hashAppBuilderObject(nested)).toBe(hashAppBuilderObject(nested));
  });

  it('null produces a valid hash string', () => {
    expect(hashAppBuilderObject(null)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('empty object and empty array produce different hashes', () => {
    expect(hashAppBuilderObject({})).not.toBe(hashAppBuilderObject([]));
  });
});
