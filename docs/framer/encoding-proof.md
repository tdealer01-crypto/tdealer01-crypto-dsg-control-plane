# DSG Encoding Proof Gate

Validate QUBO/Ising encodings before optimization or execution.

## What it checks

- Encoding structure and type consistency
- Variable bounds and coefficient format
- Deterministic encoding hash
- PASS / REVIEW / BLOCK result
- Proof identifier for audit and replay

## How it works

1. Submit a QUBO or Ising encoding.
2. DSG authenticates the caller and checks entitlement/quota.
3. The Encoding Proof Gate validates the finite encoding deterministically.
4. The service returns a proof ID, encoding hash, and PASS / REVIEW / BLOCK result.
5. Usage is written to the existing DSG audit and metering pipeline.

## Pro plan

$99/month with the existing DSG Pro subscription and trial terms configured by the billing system.

## Important proof boundary

Encoding Proof validates the encoded QUBO/Ising model. It does not by itself prove that a natural-language problem was formalized semantically correctly, and it is not a claim that quantum hardware was used.

## Product flow

Framer product page → DSG login → Stripe Checkout → DSG entitlement → Encoding Proof API → audit/evidence.
