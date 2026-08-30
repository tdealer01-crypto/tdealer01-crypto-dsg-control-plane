-- Canonical persistent authority store for DSG encoding proofs.
--
-- This table is service-role only. Public API access is mediated by the
-- authenticated Control Plane routes, which scope every read/write to an
-- organization and fail closed on persistence errors.

CREATE TABLE IF NOT EXISTS public.dsg_encoding_proofs (
  sequence BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  problem_id TEXT NOT NULL,
  encoding_type TEXT NOT NULL CHECK (encoding_type IN ('qubo-v1', 'ising-v1')),
  nonce TEXT NOT NULL CHECK (char_length(nonce) BETWEEN 8 AND 200),
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  encoding_hash TEXT NOT NULL CHECK (encoding_hash ~ '^[0-9a-f]{64}$'),
  proof_id TEXT NOT NULL CHECK (proof_id ~ '^epf_[0-9a-f]{32}$'),
  proof_hash TEXT NOT NULL CHECK (proof_hash ~ '^[0-9a-f]{64}$'),
  previous_proof_hash TEXT NOT NULL CHECK (previous_proof_hash ~ '^[0-9a-f]{64}$'),
  proof JSONB NOT NULL CHECK (jsonb_typeof(proof) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exact retry semantics: one canonical request per idempotency key and nonce
-- inside an organization.
CREATE UNIQUE INDEX IF NOT EXISTS dsg_encoding_proofs_org_idempotency_key_uidx
  ON public.dsg_encoding_proofs (organization_id, idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS dsg_encoding_proofs_org_nonce_uidx
  ON public.dsg_encoding_proofs (organization_id, nonce);

-- A proof id/hash identifies one persisted artifact. The API still scopes
-- lookup by organization; these global uniqueness constraints make accidental
-- cross-organization collisions fail closed rather than become ambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS dsg_encoding_proofs_proof_id_uidx
  ON public.dsg_encoding_proofs (proof_id);

CREATE UNIQUE INDEX IF NOT EXISTS dsg_encoding_proofs_proof_hash_uidx
  ON public.dsg_encoding_proofs (proof_hash);

-- Prevent concurrent children from forking the same observed chain head.
-- Genesis uses the fixed all-zero hash, so this also permits only one genesis
-- proof per organization. The runtime maps any 23505 race to fail-closed retry.
CREATE UNIQUE INDEX IF NOT EXISTS dsg_encoding_proofs_org_previous_hash_uidx
  ON public.dsg_encoding_proofs (organization_id, previous_proof_hash);

CREATE INDEX IF NOT EXISTS dsg_encoding_proofs_org_sequence_idx
  ON public.dsg_encoding_proofs (organization_id, sequence DESC);

ALTER TABLE public.dsg_encoding_proofs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.dsg_encoding_proofs FROM anon, authenticated;
GRANT ALL ON TABLE public.dsg_encoding_proofs TO service_role;

REVOKE ALL ON SEQUENCE public.dsg_encoding_proofs_sequence_seq FROM anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.dsg_encoding_proofs_sequence_seq TO service_role;

COMMENT ON TABLE public.dsg_encoding_proofs IS
  'Service-role-only persistent DSG encoding proof authority ledger with org-scoped replay and single-head hash-chain enforcement.';
