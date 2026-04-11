# Deterministic Execution Protocol (10x Throughput, Same Output)

Date: 2026-04-11
Objective: เร่งเวลา execution 10x โดยไม่เปลี่ยนผลลัพธ์สุดท้าย

## 1) โครงสร้างงาน (task graph)

T0 Input Lock
- freeze input snapshot (schema, code, config, test fixtures)
- produce immutable run-id

T1 Dependency Graph Build
- parse tasks into DAG
- classify: independent / dependent / write-conflict domain

T2 Parallel Execute (stateless workers)
- run independent nodes in parallel
- isolate write scopes per worker

T3 Deterministic Merge
- merge outputs by stable ordering key: `(stage, topo_index, task_id)`
- reject non-deterministic artifacts

T4 Verification Gate
- deterministic replay check
- dependency/order validation
- output hash comparison with expected baseline

## 2) งานที่ทำขนานได้

Parallel set P1 (no shared writes):
- read-only analysis
- test generation from fixed fixtures
- policy/static checks
- documentation assembly from locked inputs

Parallel set P2 (partitioned writes):
- per-module codegen/patch in isolated paths
- per-domain migration drafts in non-overlapping files

Serial-only set S (strict dependency):
- schema finalization before route binding
- route binding before integration assertion
- integration assertion before release decision

## 3) dependency

Hard dependencies:
1. T0 -> T1 -> T2 -> T3 -> T4
2. schema tasks -> repository tasks -> API tasks -> dashboard binding -> acceptance tests
3. acceptance tests -> release gate

No task may skip upstream hard dependency.

## 4) วิธีรวมผลแบบ deterministic

1. Normalize outputs (line endings, sorted keys, fixed locale/timezone)
2. Sort artifacts with stable comparator `(stage, topo_index, task_id)`
3. Merge with conflict policy: upstream-wins + explicit conflict log
4. Compute manifest hash for merged output
5. Replay merge once; hash must match exactly

If hash mismatch => fail fast, no release.

## 5) ผลลัพธ์สุดท้าย

Expected deterministic final output:
- same input snapshot => same merged artifacts
- same dependency order => same test outcomes
- same release decision for identical evidence

Target speedup method:
- maximize P1/P2 parallel width
- keep serial chain minimal and fixed
- eliminate redundant recomputation via content-hash cache (deterministic key)

## 6) สรุปการตรวจสอบ

Pre-merge checks:
1. logic unchanged (no algorithmic approximation)
2. dependency order valid (topological validation pass)
3. deterministic merge pass (replay hash identical)
4. correctness pass (tests + migration checks + policy checks)

All 4 checks must pass.

## 7) ความเสี่ยง

1. hidden shared state in tools/scripts
2. non-deterministic iteration order in runtime/library
3. wall-clock/timezone leakage into artifacts
4. parallel write collision in same file/domain
5. flaky tests interpreted as logic drift

Mitigation:
- force UTC + fixed locale
- disable nondeterministic seeds
- file/domain write locks
- deterministic retry policy (fixed retry count + backoff schedule)
