# MRDR-100 v1.1 — Multi-Region Deterministic Replica Architecture

> Status: **Working Architecture Spec** integrated from user-provided blueprint and aligned with current DSG terminology.
>
> Evidence boundary:
> - Formal gate-core properties (Determinism, Safety Invariance, Constant-Time Bound with SMT-LIB v2 + Z3) are treated as verified artifact facts.
> - Cross-repo runtime/monitor/product-assembly claims remain subject to repository-truth verification.

## 0) นิยามฟันธง

MRDR-100 คือสถาปัตยกรรม Geo-distributed deterministic state machine ที่หลาย region ทำงานพร้อมกันได้ แต่มีความจริงหนึ่งเดียว ผ่านกฎเดียวกัน, ลำดับเดียวกัน, state transition เดียวกัน, execute จริงเพียงครั้งเดียว, และ deterministic replay ได้ทุก region.

## 1) เป้าหมายระบบ

หลาย region ต้องได้ผลลัพธ์เดียวกันภายใต้เงื่อนไขเดียวกัน:

\[
\forall r_i, r_j,\quad S_t^{r_i} = S_t^{r_j}
\]

โดยความเท่ากันต้องเป็น **canonical deterministic state equivalence**.

## 2) หลักคณิตศาสตร์

### 2.1 Global State Model

\[
S_t^{global} = \langle S_t^{r_1}, S_t^{r_2}, \dots, S_t^{r_n} \rangle
\]

Production transition function:

\[
\delta := f(
\text{canonical\_state},
\text{canonical\_input},
\text{canonical\_code},
\text{canonical\_solver},
\text{canonical\_env}
)
\]

### 2.2 Deterministic Ordering

ใช้ Global Logical Clock:

\[
L_t = \langle epoch, sequence \rangle
\]

- `epoch` = governance / rule-set version
- `sequence` = global monotonic order

### 2.3 Canonical Determinism Constraint

1. input ต้อง canonicalized  
2. state ต้อง canonicalized  
3. serialization ต้อง deterministic  
4. runtime artifact ต้อง pin version  
5. solver/config ต้อง hash ได้  
6. ห้าม hidden nondeterminism จาก thread/map ordering/float drift/retry timing

## 3) System Architecture

### 3.1 Global Blueprint

- Global Governance (Invariants, Epoch, Config Hash)
- Regional Full Replicas (Orchestrator, Generator, Entropy, Gate+Z3, Executor, Reward, Local State, State Hasher)
- Global Log/Ledger (Append-Only, Totally Ordered, Replayable)

### 3.2 Functional Roles

- Global Governance: invariant + epoch + policy evolution
- Regional Replica: full deterministic stack per region
- Global Log/Ledger: deterministic backbone และ source-of-truth ของ transition order

## 4) Deterministic Replication Rules

- **Rule 1 — No Local Commit**: commit ได้เมื่อ log entry ถูกยอมรับเท่านั้น
- **Rule 2 — Same Input, Same Gate, Same Result**: ALLOW/STABILIZE/BLOCK ต้องเหมือนกันภายใต้เงื่อนไข canonical เดียวกัน
- **Rule 3 — Action Happens Once**: execute จริงเกิดที่ designated region เท่านั้น
- **Rule 4 — External Effect Must Be Journaled**: decide → append intent → execute → append effect result → mirrors validate
- **Rule 5 — Drift Is Detectable**: state hash mismatch = `DRIFT_DETECTED` + `STABILIZE`

## 5) Global Log Specification

### 5.1 Properties

append-only, totally ordered, deterministic replay, audit-grade, hash-verifiable, single source of truth

### 5.2 Canonical Log Entry Schema

\[
e_k = \langle
k, epoch, input\_hash, prev\_state\_hash, decision, decision\_hash,
executor, effect\_id, next\_state\_hash
\rangle
\]

### 5.3 Allowed Backends

- Allowed: Raft log, etcd (raft-based), Kafka single partition with strict failover, Spanner with strict commit discipline, on-prem raft cluster
- Not allowed: multi-leader truth source, eventually-consistent DB as primary truth

## 6) Exactly-Once Effect Discipline

\[
effect\_id = H(epoch, sequence, action, payload\_hash)
\]

- effect consumed แล้วห้าม re-execute
- execute สำเร็จแต่ ACK หาย ต้อง recover จาก effect journal
- mirrors ห้ามยิงซ้ำเอง

## 7) Deterministic Runtime Contract

- Canonical input/state serialization
- Pinned runtime image + dependencies + solver + config hash + build provenance
- Numeric safety: prefer integer/fixed-point on critical decision path

## 8) Epoch Transition Protocol

- epoch transition ต้องเป็น ordered log event
- ห้าม mixed-epoch decision
- migration ต้อง deterministic
- replay ของ old epoch ต้อง valid จน cutover

## 9) Deterministic Convergence Theorem

Given:
1) initial state เท่ากัน
2) consume log prefix เดียวกัน
3) deterministic transition บน canonicalized state/input/code/solver/env
4) external effect journaled + bound to effect_id
5) epoch transition ordered via log

Then:

\[
\forall r_i, r_j,\quad Replay(S_0, L[1..t]) = S_t^{r_i} = S_t^{r_j}
\]

## 10) Failure Model

- Region down → recover by replay
- Network partition → stop commit
- Solver failure → BLOCK all regions
- Drift detection → STABILIZE all regions
- Executor failure / lost ACK → resolve via effect journal + effect_id
- Epoch mismatch → BLOCK / refuse transition
- Log unavailable → read-only or halt (no commit)

### 10.1 Safety Position

**Consistency > Availability**

## 11) Deployment Pattern

- 1 global governance plane
- 1 global ordered log
- N regional full replicas
- designated executor per action class/policy

## 12) Terraform / Ops Blueprint (Normative Example)

```hcl
module "global_governance" {
  source                = "./global"
  epoch_id              = "GEN5-EPOCH-001"
  entropy_threshold     = 0.72
  config_hash           = "sha256:governance-config-hash"
  solver_version        = "z3-4.12.x"
  runtime_image_digest  = "sha256:deterministic-runtime-image"
}
```

Regional modules must inherit same deterministic invariants (`epoch_id`, `config_hash`, `solver_version`, `runtime_image_digest`).

## 13) Execution Flow

1. รับ input  
2. canonicalize input  
3. read previous canonical state hash  
4. evaluate gate + Z3  
5. produce decision  
6. append ordered log intent  
7. designated region executes external action  
8. append effect result  
9. compute next state  
10. compute `state_hash_t`  
11. compare across regions  
12. commit mirrored state

## 14) What This Is / Is Not

It is: deterministic replication, global truth machine, replayable distributed state machine, audit-friendly control architecture.

It is not: best-effort active-active, eventual-consistency mesh, local-autonomy-first, multi-leader availability-first topology.

## 15) Final Definition

MRDR-100 v1.1 คือ:

> Geo-distributed deterministic state machine with a single global ordering, canonical execution environment, and journaled external effects.

## Appendices

### A) Mapping to DSG terms used in this repo

- `ALLOW | STABILIZE | BLOCK` decision triad aligns with existing control-plane decision model.
- Formal gate verification artifact remains bounded to gate core properties only.

### B) Verification Boundary Notes

- จุดนี้ยังยืนยันไม่ได้จากไฟล์และข้อมูลที่มองเห็นอยู่
- มองไม่เห็น repo/file/config ที่จำเป็นต่อการสรุปจุดนี้
- ไม่มีหลักฐานพอจะสรุปเป็น fact
- จะไม่เดาต่อ
