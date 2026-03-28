export const VERIFIED_FORMAL_CORE = {
  verified: true,
  solver: "Z3",
  artifact_format: "SMT-LIB v2",
  expected_result: "sat",
  properties: [
    "Determinism",
    "Safety Invariance",
    "Constant-Time Bound",
  ],
  scope_boundary: [
    "Formal gate core only",
    "Does not by itself verify runtime orchestration",
    "Does not by itself verify monitor pipelines",
    "Does not by itself verify billing or organization flows",
    "Does not by itself verify multi-repo product assembly",
  ],
} as const;

export const SOURCE_OF_TRUTH_MAP = {
  product_shell: {
    repo: "tdealer01-crypto/tdealer01-crypto-dsg-control-plane",
    role: "Dashboard, auth, usage, billing, and public product shell",
  },
  canonical_gate: {
    repo: "tdealer01-crypto/DSG-Deterministic-Safety-Gate",
    role: "Canonical DSG gate core and formal artifacts",
  },
  runtime: {
    repo: "tdealer01-crypto/DSG-ONE",
    role: "Runtime execution, decision routing, proof, ledger, and replay plane",
  },
  audit: {
    repo: "tdealer01-crypto/dsg-deterministic-audit",
    role: "Audit dashboard and determinism monitoring surface",
  },
} as const;

export const KNOWN_GAPS = [
  "Control-plane core contract is richer than the canonical gate contract currently visible in the gate repo.",
  "Runtime, audit, and canonical gate are split across multiple repositories.",
  "Cross-repo contract alignment still needs implementation verification before it can be treated as a single unified product path.",
] as const;
