# DSG HPC Verification Guide

## Overview

This guide explains how to use NVIDIA HPC containers to perform **formal Z3 proof verification**, **parallel CCVS evidence generation**, and **deterministic gate validation** for the DSG Control Plane.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ DSG Control Plane (Next.js + Supabase)                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Deterministic Gate / Formal Proof Layer          │  │
│  │ - TypeScript verification                        │  │
│  │ - Policy constraints                             │  │
│  │ - Runtime governance                             │  │
│  └──────────────────────────────────────────────────┘  │
│                      ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ HPC Verification (Optional - Evidence Generation)   │
│  │ - Z3 SMT formal proof                            │  │
│  │ - CUDA-accelerated constraint solving            │  │
│  │ - CCVS L1-L5 evidence pipeline                   │  │
│  │ - Makk-8 ethical invariant verification          │  │
│  └──────────────────────────────────────────────────┘  │
│                      ↓                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ NVIDIA HPC Container                             │  │
│  │ - Z3 SMT Solver                                  │  │
│  │ - Python 3 + npm                                 │  │
│  │ - CUDA toolkit                                   │  │
│  │ - MPI libraries                                  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

Choose **one** approach based on your environment:

#### Option A: Local (Python + Z3)
```bash
pip install z3-solver
npm run verify:policy:hpc:local
```

#### Option B: Docker (No local install needed)
```bash
docker --version  # Must have Docker installed
npm run verify:policy:hpc:docker
```

#### Option C: docker-compose (Persistent environment)
```bash
docker-compose -f docker-compose.hpc.yml up
npm run verify:policy:hpc:compose
```

---

## Verification Modes

### 1. Z3 Formal Proof (Makk-8)

**What it does:** Verifies ethical invariants (Noble Eightfold Path) using SMT solver.

```bash
npm run verify:policy:hpc:local
```

**Output:**
```json
{
  "schema": "ccvs-makk8-z3-proof-v1",
  "summary": {
    "samma_verified": true,      // All 8 conditions satisfied
    "micha_detected": true,       // Violations properly detected
    "formal_proof_ok": true       // Proof mathematically valid
  }
}
```

**Use when:**
- Verifying new policy constraints
- Proving governance logic correctness
- Creating formal audit trail for compliance

---

### 2. Deterministic Module Verification

**What it does:** Validates that gate evaluation is deterministic (same input → same output).

```bash
npm run verify:deterministic
```

**Integration with HPC:**
```bash
npm run ccvs:hpc-parallel  # Includes deterministic check as L2
```

---

### 3. SMT2 Invariant Verification

**What it does:** Checks SMT2 solver invariants under load.

```bash
npm run benchmark:gateway:smt2
```

**Use when:**
- Benchmarking gate performance
- Validating invariants under concurrent requests
- Creating performance evidence for SLA claims

---

### 4. Parallel CCVS Evidence Pipeline (L1-L5)

**What it does:** Generates complete evidence chain in parallel.

```bash
npm run ccvs:hpc-parallel
```

**Evidence levels generated:**
- **L1**: Unit-level proof (Z3 baseline)
- **L2**: Integration evidence (deterministic module)
- **L3**: Adversarial/replay evidence (SMT2 invariants)
- **L4**: Proof/oversight evidence (formal Z3 constraints)
- **L5**: Provenance/build evidence (CUDA-accelerated hash verification)

**Output directory:** `evidence-output/`

**Example output:**
```
evidence-output/
├── ccvs-makk8-z3-proof.json        # L1+L4: Z3 formal proof
├── ccvs-l2-deterministic.log       # L2: Deterministic verification
├── ccvs-l3-smt2.log                # L3: SMT2 invariants
├── ccvs-l5-provenance.json         # L5: Build provenance
└── ccvs-parallel-summary-TIMESTAMP.json  # Summary
```

---

## Docker Usage

### Build HPC Container

```bash
docker build -f Dockerfile.hpc-verification -t dsg-hpc-verification:latest .
```

### Run Z3 Proof in Container

```bash
docker run --rm \
  -v $(pwd):/workspace \
  -v $(pwd)/evidence-output:/workspace/evidence-output \
  --gpus all \
  dsg-hpc-verification:latest \
  "python3 scripts/makk8-z3-proof.py --output /workspace/evidence-output/proof.json"
```

### Interactive Container

```bash
docker run -it \
  -v $(pwd):/workspace \
  --gpus all \
  dsg-hpc-verification:latest \
  bash

# Inside container:
python3 scripts/makk8-z3-proof.py
npm run ccvs:hpc-parallel
```

---

## CI/CD Integration

### GitHub Actions

The `.github/workflows/verify-hpc.yml` workflow automatically:

1. ✅ Installs Z3 + Python dependencies
2. ✅ Runs Z3 formal proof
3. ✅ Runs deterministic module verification
4. ✅ Runs SMT2 invariant checks
5. ✅ Generates parallel CCVS evidence (on push)
6. ✅ Posts results to PR comments

**Trigger events:**
- Push to `main`, `develop`, `claude/**` branches
- Pull request
- Manual workflow dispatch with verification mode selection

**View results:**
1. Go to PR → Checks tab
2. Click "HPC Formal Verification" → View logs
3. Download "hpc-verification-evidence" artifact

---

## Verification Scripts

### verify-policy-hpc.sh

Wrapper script for flexible HPC verification.

**Usage:**
```bash
./scripts/verify-policy-hpc.sh --local      # Python + Z3 locally
./scripts/verify-policy-hpc.sh --docker     # Docker container
./scripts/verify-policy-hpc.sh --compose    # docker-compose
./scripts/verify-policy-hpc.sh --ci         # CI environment
```

**Output:**
- Proof artifacts in `evidence-output/`
- JSON summary with CCVS metadata
- Exit code 0 (success) or 1 (failure)

---

## Best Practices

### 1. Local Development

```bash
# Quick verification during development
npm run verify:policy:hpc:local

# Full parallel evidence chain
npm run ccvs:hpc-parallel
```

### 2. Before Creating PR

```bash
# Verify your policy change
npm run verify:policy:hpc:docker

# Check full evidence chain
npm run ccvs:hpc-parallel

# Commit evidence artifacts for review
git add evidence-output/ccvs-*.json
```

### 3. CI/CD Integration

HPC verification runs automatically:
- On every PR (quick check)
- On merge to `main` (full parallel evidence)
- On manual trigger (select verification mode)

**No action needed** — GitHub Actions handles it.

### 4. Production Deployment

Before production go-live:

```bash
# 1. Run full HPC verification
npm run ccvs:hpc-parallel

# 2. Verify all 5 CCVS levels passed
cat evidence-output/ccvs-parallel-summary-*.json | jq '.summary'

# 3. Check no breaking changes
npm run verify:production-manifest

# 4. Run go/no-go gate
npm run go:no-go https://prod.example.com
```

---

## Troubleshooting

### Z3 Not Found (Local Mode)

```bash
# Install Z3
pip install z3-solver

# Verify installation
python3 -c "import z3; print(z3.get_version_string())"
```

### Docker Build Fails

```bash
# Clean and rebuild
docker system prune -a
docker build -f Dockerfile.hpc-verification -t dsg-hpc-verification:latest .
```

### CUDA Not Available

Container will run even without GPU:
```bash
# Remove --gpus flag if GPU not available
docker run --rm -v $(pwd):/workspace dsg-hpc-verification:latest ...
```

### Evidence Output Permissions

```bash
# Fix ownership after Docker run
sudo chown -R $USER:$USER evidence-output/
```

---

## Evidence Standards

### Proof Artifacts

All proof artifacts include:

```json
{
  "schema": "ccvs-makk8-z3-proof-v1",
  "version": "V159-DHAMMA-INTEGRITY",
  "generated_at": "2026-07-04T12:34:56Z",
  "engine": "z3-smt",
  "cases": [
    {
      "label": "SAMMA_baseline",
      "status": "SAMMA",
      "proof_hash": "...",
      "signature": "...",
      "smt_assertions": "..."
    }
  ],
  "summary": {
    "samma_verified": true,
    "micha_detected": true,
    "formal_proof_ok": true
  }
}
```

### CCVS Compliance

- ✅ L1 unit evidence: Z3 baseline proof
- ✅ L2 integration evidence: Deterministic module verification
- ✅ L3 adversarial evidence: SMT2 replay scenarios
- ✅ L4 proof evidence: Formal Z3 constraint solving
- ✅ L5 provenance evidence: Build artifact hashes

---

## Security Notes

### Secrets

- Z3 verification **does not expose** API keys or credentials
- All verification runs locally or in container
- Evidence artifacts are deterministic and reproducible
- No network calls during verification (except image pull)

### Determinism

- Z3 solver produces bit-identical results across runs
- Container image is hermetic and reproducible
- Build hash verification ensures integrity

---

## References

- [CLAUDE.md - Formal Proof Section](./CLAUDE.md#formal-proof-and-hpc-verification)
- [Dockerfile.hpc-verification](../Dockerfile.hpc-verification)
- [docker-compose.hpc.yml](../docker-compose.hpc.yml)
- [verify-policy-hpc.sh](../scripts/verify-policy-hpc.sh)
- [ccvs-parallel-evidence-hpc.mjs](../scripts/ccvs-parallel-evidence-hpc.mjs)
- [.github/workflows/verify-hpc.yml](../.github/workflows/verify-hpc.yml)

---

**Last updated:** 2026-07-04  
**Status:** Evidence-ready, pending first production run  
**Next step:** Run `npm run ccvs:hpc-parallel` to generate complete evidence chain
