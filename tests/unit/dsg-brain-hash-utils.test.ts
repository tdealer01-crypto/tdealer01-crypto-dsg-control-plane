import { describe, it, expect } from "vitest";
import {
  stableJsonSort,
  canonicalJsonStringify,
  sha256Hash,
  sha256Raw,
} from "../../lib/dsg/brain/hash-utils";

describe("DSG Brain Hash Utilities", () => {
  it("stableJsonSort sorts object keys recursively", () => {
    const input = { z: 1, a: 2, m: { b: 3, a: 4 } };
    const sorted = stableJsonSort(input);
    expect(JSON.stringify(sorted)).toBe('{"a":2,"m":{"a":4,"b":3},"z":1}');
  });

  it("stableJsonSort preserves array order", () => {
    const input = { items: [3, 1, 2] };
    const sorted = stableJsonSort(input);
    expect((sorted as any).items).toEqual([3, 1, 2]);
  });

  it("canonicalJsonStringify produces identical output regardless of key order", () => {
    const a = { z: 1, a: 2 };
    const b = { a: 2, z: 1 };
    expect(canonicalJsonStringify(a)).toBe(canonicalJsonStringify(b));
  });

  it("sha256Hash is deterministic for same content", () => {
    const obj = { b: 2, a: 1 };
    const hash1 = sha256Hash(obj);
    const hash2 = sha256Hash({ a: 1, b: 2 });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // hex sha256
  });

  it("sha256Hash differs for different content", () => {
    const hash1 = sha256Hash({ a: 1 });
    const hash2 = sha256Hash({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });

  it("sha256Raw hashes string content", () => {
    const hash = sha256Raw("hello");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(sha256Raw("hello"));
    expect(hash).not.toBe(sha256Raw("world"));
  });

  it("handles nested objects with mixed types", () => {
    const complex = {
      config: {
        enabled: true,
        retries: 3,
        nested: {
          z: "last",
          a: "first",
          arr: [1, 2, { z: 9, a: 8 }],
        },
      },
      name: "test",
    };
    const hash1 = sha256Hash(complex);
    // Reorder top-level and nested keys
    const reordered = {
      name: "test",
      config: {
        retries: 3,
        enabled: true,
        nested: {
          a: "first",
          z: "last",
          arr: [1, 2, { a: 8, z: 9 }],
        },
      },
    };
    const hash2 = sha256Hash(reordered);
    expect(hash1).toBe(hash2);
  });

  it("handles null and undefined values consistently", () => {
    const withNull = { a: null, b: 1 };
    const hash1 = sha256Hash(withNull);
    const withUndefined = { a: undefined, b: 1 };
    const hash2 = sha256Hash(withUndefined);
    // undefined keys are dropped by JSON.stringify, null is kept
    expect(hash1).not.toBe(hash2);
  });
});
