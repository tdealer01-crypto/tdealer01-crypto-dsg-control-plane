# NIST AI RMF Alignment Matrix

DSG positioning: AI risk and action governance control layer.

Boundary: this document describes workflow alignment support. It is not a NIST certification claim.

Source basis: NIST AI RMF is a voluntary framework for managing AI risk and improving trustworthy AI. The NIST AI RMF Playbook is organized around Govern, Map, Measure, and Manage functions.

Official sources:

- https://www.nist.gov/itl/ai-risk-management-framework
- https://airc.nist.gov/AI_RMF_Knowledge_Base/Playbook

## Function mapping

| NIST AI RMF function | DSG support | Current evidence | Status |
|---|---|---|---|
| Govern | Defines execution control boundaries, roles, approval expectations, and evidence requirements | role/plan/risk checks, governance docs, audit flow | Implemented |
| Map | Captures action context before execution, including actor, organization, tool, action, planId, and input hash | plan-check and requestHash | Implemented |
| Measure | Produces measurable evidence: pass/fail gates, latency, invariant pass rate, benchmark score, audit records | benchmark evidence, SMT2 runtime evidence, audit export | Implemented |
| Manage | Allows, blocks, or routes actions for review before execution; commits final results into audit evidence | Gateway Mode, Monitor Mode, audit commit | Implemented |

## DSG control mapping

| DSG capability | NIST AI RMF workflow support | Current evidence | Status |
|---|---|---|---|
| Deterministic gate | Reduces reliance on probabilistic judgment at the execution boundary | production gateway benchmark | Implemented |
| Policy/risk/approval checks | Supports AI risk treatment before action execution | plan-check and execute APIs | Implemented |
| Invariant checks | Supports repeatable safety checks | SMT2-compatible runtime invariant evidence | Implemented |
| Audit proof | Supports evidence collection and traceability | requestHash, recordHash, audit export | Implemented |
| Monitor Mode | Supports governance without customer key custody | plan-check and audit commit | Implemented |
| GitHub deploy gate | Supports software delivery risk control | Marketplace Action v1.0.2 | Implemented |
| Signed evidence bundle | Supports portable review packages | signed bundle output | Planned |
| Control templates | Supports repeatable governance workflow adoption | reusable control library | Planned |

## Safe wording

DSG helps operationalize NIST AI RMF-style AI risk management workflows by placing deterministic controls, invariant checks, and audit evidence at the AI action execution boundary.
