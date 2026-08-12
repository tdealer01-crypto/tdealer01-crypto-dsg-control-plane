; ============================================================
; DSG Deterministic State Gate — safety proof (SMT-LIB v2)
;
; Proof method: REFUTATION.
; Each property is checked by asserting its NEGATION inside a
; push/pop block. `unsat` means the property is entailed by the
; model (i.e. proven). `sat` on a negation block means a
; counterexample exists and the property is NOT proven.
;
; This is the same convention already used by
; formal/agent-invariants.smt2 in this repository.
;
; IMPORTANT: asserting a safety property as an axiom and reading
; `sat` does NOT prove it. `sat` only shows the axiom set is
; self-consistent, and lets the solver pick an interpretation
; that makes the property true. An under-specified gate then
; produces a false pass. See docs/formal/PROOF_METHOD.md.
; ============================================================

(set-logic ALL)
(set-option :produce-models true)

; ------------------------------------------------------------
; 1. Sorts and state identifiers
; ------------------------------------------------------------
(declare-sort State 0)

(declare-fun IDLE      () State)
(declare-fun AUTH      () State)
(declare-fun EXEC      () State)
(declare-fun FORBIDDEN () State)

; Required: without this the solver may collapse distinct states
; into one and satisfy the model vacuously.
(assert (distinct IDLE AUTH EXEC FORBIDDEN))

; ------------------------------------------------------------
; 2. Forbidden predicate
; ------------------------------------------------------------
(declare-fun forbidden (State) Bool)

(assert (forbidden FORBIDDEN))
(assert (not (forbidden IDLE)))
(assert (not (forbidden AUTH)))
(assert (not (forbidden EXEC)))

; Closed-world: the four named states are the only states.
; Without this, the solver may invent an unnamed state and the
; range/totality theorems below become unprovable.
(assert (forall ((s State))
  (or (= s IDLE) (= s AUTH) (= s EXEC) (= s FORBIDDEN))))

; ------------------------------------------------------------
; 3. Gate decision: 0 = ALLOW, 1 = BLOCK, 2 = STAY
; ------------------------------------------------------------
(declare-fun gate (State State) Int)

; R1: a forbidden target is always blocked.
(assert (forall ((s State) (s2 State))
  (=> (forbidden s2) (= (gate s s2) 1))))

; R2: the only allowed transitions.
(assert (= (gate IDLE AUTH) 0))
(assert (= (gate AUTH EXEC) 0))

; R3: every other safe transition stabilizes (stay in place).
(assert (forall ((s State) (s2 State))
  (=> (and (not (forbidden s2))
           (not (and (= s IDLE) (= s2 AUTH)))
           (not (and (= s AUTH) (= s2 EXEC))))
      (= (gate s s2) 2))))

; ------------------------------------------------------------
; 4. Transition function
; ------------------------------------------------------------
(declare-fun delta (State State) State)

(assert (forall ((s State) (s2 State))
  (ite (= (gate s s2) 0)
       (= (delta s s2) s2)
       (= (delta s s2) s))))

; ============================================================
; BASE: the model itself must be consistent.
; EXPECTED: sat
; ============================================================
(push)
(check-sat) ; EXPECTED: sat
(pop)

; ============================================================
; T1 — SAFETY INVARIANCE
; From any non-forbidden state, no proposed target drives the
; system into a forbidden state.
; EXPECTED: unsat
; ============================================================
(push)
(assert (not (forall ((s State) (s2 State))
  (=> (not (forbidden s))
      (not (forbidden (delta s s2)))))))
(check-sat) ; EXPECTED: unsat
(pop)

; ============================================================
; T2 — GATE TOTALITY / RANGE
; gate is declared Int; prove it can never return a value
; outside the decision set {0,1,2}.
; EXPECTED: unsat
; ============================================================
(push)
(assert (not (forall ((s State) (s2 State))
  (or (= (gate s s2) 0)
      (= (gate s s2) 1)
      (= (gate s s2) 2)))))
(check-sat) ; EXPECTED: unsat
(pop)

; ============================================================
; T3 — NO ALLOW INTO FORBIDDEN
; Stronger than T1: the gate never emits ALLOW for a forbidden
; target, regardless of source state.
; EXPECTED: unsat
; ============================================================
(push)
(assert (not (forall ((s State) (s2 State))
  (=> (forbidden s2) (not (= (gate s s2) 0))))))
(check-sat) ; EXPECTED: unsat
(pop)

; ============================================================
; T4 — FORBIDDEN IS A TRAP (absorbing)
; If the system is already forbidden it cannot be steered out.
; This documents that the gate is NOT a recovery mechanism.
; EXPECTED: unsat
; ============================================================
(push)
(assert (not (forall ((s2 State))
  (= (delta FORBIDDEN s2) FORBIDDEN))))
(check-sat) ; EXPECTED: unsat
(pop)

; ============================================================
; L1 — LIVENESS SANITY: the happy path is actually reachable.
; IDLE --AUTH--> AUTH --EXEC--> EXEC
; Asserted positively; a `sat` here proves the gate is not
; trivially blocking everything.
; EXPECTED: sat
; ============================================================
(push)
(assert (= (delta IDLE AUTH) AUTH))
(assert (= (delta (delta IDLE AUTH) EXEC) EXEC))
(check-sat) ; EXPECTED: sat
(pop)

; ============================================================
; L2 — EXEC IS TERMINAL (design finding, not a safety bug)
; Once in EXEC no proposed target changes state: there is no
; modelled path back to IDLE. If the product needs a completion
; or reset edge, R2 must be extended.
; EXPECTED: unsat  (i.e. no escape exists)
; ============================================================
(push)
(assert (not (forall ((s2 State))
  (= (delta EXEC s2) EXEC))))
(check-sat) ; EXPECTED: unsat
(pop)
