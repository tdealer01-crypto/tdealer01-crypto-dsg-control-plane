# Quantus Audit Invariants

Use these as review hypotheses, not as claims. A finding is only valid after local reproduction, scope confirmation, demonstrated impact, and a runnable PoC.

## Dilithium / ML-DSA

- A signature produced for one message must not verify for a different message.
- Verification must reject malformed or non-canonical encodings that should be invalid.
- Public key, signature, parameter-set, and message/domain bindings must not be interchangeable across contexts.
- Key/signature parsing must fail closed on invalid lengths and invalid encoded values.

## HD Wallet

- The same seed/path/parameter set must derive deterministically.
- Different derivation paths must not silently alias the same child key through parsing/canonicalization mistakes.
- Serialization/deserialization must preserve the intended key identity and network/context binding.
- Invalid seed/path/input encodings must fail closed.

## ZK Circuits

- Invalid witnesses must not satisfy the intended statement.
- Public inputs must be bound to the proof statement actually verified by the application.
- Recursive/aggregation boundaries must not drop or substitute required constraints.
- Serialization/deserialization must not alter the statement being proven.
- Exclude the voting module and unmodified upstream Plonky2 from finding claims.

## Poseidon2

- Input encoding must be unambiguous for the intended domain.
- Parameters/constants used by prover/verifier/application paths must agree.
- Hash state/domain separation must match the protocol use-site.
- Any suspected implementation mismatch must be tied to an in-scope protocol impact.

## Chain / Runtime / QPoW

- Invalid transactions must not become valid through Quantus-specific validation paths.
- State transitions must preserve supply and authorization invariants.
- Consensus-relevant Quantus modifications must behave deterministically across honest nodes for the same valid input.
- Runtime/pallet authorization must not permit effects beyond the caller's intended privileges.
- Reports must isolate Quantus-owned code/modifications rather than unmodified upstream Substrate/dependencies.

## Evidence rule

For every candidate, record: frozen commit SHA, affected path/function, precondition, local reproduction command, expected result, actual result, impact mapping, PoC location, and whether any out-of-scope component is required.
