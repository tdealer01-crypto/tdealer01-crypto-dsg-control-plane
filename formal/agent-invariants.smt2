; DSG Agent System Invariants — SMT-LIB 2 specification
; Covers all 6 specialized agents. Every agent skill must satisfy these
; invariants before it can be locked via SkillGate.
; Run: z3 formal/agent-invariants.smt2
; Expected: sat for base state, unsat for every pushed violation block.

(set-logic QF_Bool)

; ── Shared preconditions ──────────────────────────────────────────────────────
(declare-const goal_locked Bool)
(declare-const gate_allow Bool)
(declare-const evidence_exists Bool)
(declare-const mock_state Bool)

; ── Agent 1: Orchestrator ─────────────────────────────────────────────────────
; Invariant: orchestrator may only dispatch when goal is locked.
; Invariant: no orchestrator can dispatch to a sub-agent that lacks a locked goal.
(declare-const orchestrator_active Bool)
(declare-const orchestrator_can_dispatch Bool)
(declare-const sub_agent_goal_locked Bool)

(assert (=> orchestrator_can_dispatch goal_locked))
(assert (=> orchestrator_can_dispatch sub_agent_goal_locked))
(assert (=> (not goal_locked) (not orchestrator_can_dispatch)))

; ── Agent 2: Code Evolution ───────────────────────────────────────────────────
; Invariant: cannot write code without an approved plan.
; Invariant: destructive writes additionally require a destruction proof.
(declare-const code_writes Bool)
(declare-const plan_approved Bool)
(declare-const is_destructive_write Bool)
(declare-const destruction_proof Bool)

(assert (=> code_writes plan_approved))
(assert (=> (and code_writes is_destructive_write) destruction_proof))
(assert (=> (not plan_approved) (not code_writes)))

; ── Agent 3: Test Coverage ────────────────────────────────────────────────────
; Invariant: coverage may only increase or stay the same (monotonically non-decreasing).
; Modelled with: new_coverage_gte_prev (Bool summary of the numeric comparison)
(declare-const test_run_complete Bool)
(declare-const new_coverage_gte_prev Bool)
(declare-const coverage_pass Bool)

(assert (= coverage_pass (=> test_run_complete new_coverage_gte_prev)))
(assert coverage_pass)

; ── Agent 4: Deploy Monitor ───────────────────────────────────────────────────
; Invariant: a deploy trigger requires gate ALLOW, evidence, and no mock state.
(declare-const triggers_deploy Bool)

(assert (=> triggers_deploy gate_allow))
(assert (=> triggers_deploy evidence_exists))
(assert (=> triggers_deploy (not mock_state)))
(assert (=> mock_state (not triggers_deploy)))

; ── Agent 5: Browser Research ─────────────────────────────────────────────────
; Invariant: any result from browser research must carry an evidence hash.
; uses_browser_result may only be true when browser_evidence_hash_set is true.
(declare-const uses_browser_result Bool)
(declare-const browser_evidence_hash_set Bool)

(assert (=> uses_browser_result browser_evidence_hash_set))
(assert (=> (not browser_evidence_hash_set) (not uses_browser_result)))

; ── Agent 6: Security Gate ────────────────────────────────────────────────────
; Invariant: no action may execute without gate_allow.
(declare-const action_attempted Bool)

(assert (=> action_attempted gate_allow))
(assert (=> (not gate_allow) (not action_attempted)))

; ── Seed Engine (cross-cutting) ───────────────────────────────────────────────
; Invariant: if data is needed but unknown, agent MUST search before proceeding.
; data_needed ∧ data_unknown → must_search ∧ ¬can_proceed_without_search
(declare-const data_needed Bool)
(declare-const data_unknown Bool)
(declare-const must_search Bool)
(declare-const can_proceed_without_search Bool)

(assert (=> (and data_needed data_unknown) must_search))
(assert (=> (and data_needed data_unknown) (not can_proceed_without_search)))

; ── Base satisfiability check ─────────────────────────────────────────────────
; A valid fully-operational state must be satisfiable.
; (all gates pass, goal locked, real data available)
(push)
(assert goal_locked)
(assert gate_allow)
(assert evidence_exists)
(assert (not mock_state))
(assert orchestrator_can_dispatch)
(assert sub_agent_goal_locked)
(assert plan_approved)
(assert (not code_writes))
(assert test_run_complete)
(assert new_coverage_gte_prev)
(assert (not triggers_deploy))
(assert (not uses_browser_result))
(assert (not action_attempted))
(assert (not data_needed))
(check-sat) ; EXPECTED: sat
(pop)

; ── Violation checks (each must be UNSAT) ─────────────────────────────────────

; Code written without plan approval → UNSAT
(push)
(assert code_writes)
(assert (not plan_approved))
(check-sat) ; EXPECTED: unsat
(pop)

; Destructive write without destruction proof → UNSAT
(push)
(assert code_writes)
(assert is_destructive_write)
(assert (not destruction_proof))
(check-sat) ; EXPECTED: unsat
(pop)

; Orchestrator dispatches without goal lock → UNSAT
(push)
(assert orchestrator_can_dispatch)
(assert (not goal_locked))
(check-sat) ; EXPECTED: unsat
(pop)

; Deploy triggered in mock state → UNSAT
(push)
(assert triggers_deploy)
(assert mock_state)
(check-sat) ; EXPECTED: unsat
(pop)

; Deploy without gate allow → UNSAT
(push)
(assert triggers_deploy)
(assert (not gate_allow))
(check-sat) ; EXPECTED: unsat
(pop)

; Browser result used without evidence hash → UNSAT
(push)
(assert uses_browser_result)
(assert (not browser_evidence_hash_set))
(check-sat) ; EXPECTED: unsat
(pop)

; Action attempted without gate allow → UNSAT
(push)
(assert action_attempted)
(assert (not gate_allow))
(check-sat) ; EXPECTED: unsat
(pop)

; Data needed + unknown, but proceeds without search → UNSAT
(push)
(assert data_needed)
(assert data_unknown)
(assert can_proceed_without_search)
(check-sat) ; EXPECTED: unsat
(pop)
