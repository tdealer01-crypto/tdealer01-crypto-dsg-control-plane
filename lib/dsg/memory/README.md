# DSG Memory Package

This package contains the Step 16C governed memory primitives.

## Files

- `types.ts`: shared memory event, scope, gate, context pack, and permission types.
- `memory-gate.ts`: deterministic gate logic for deciding whether memory can be used.
- `context-pack.ts`: deterministic context pack builder and SHA-256 context hash.

## Non-negotiable invariant

Memory is never the production source of truth.

Memory can help planning and operator review, but the runtime must verify current evidence before executing actions or making completion, deployable, or production claims.
