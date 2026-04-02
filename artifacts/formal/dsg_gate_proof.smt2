; DSG gate core toy proof artifact (SMT-LIB v2)
; Goal: provide independently reproducible SAT check via Z3.
; This is a bounded model that encodes three expected properties:
; 1) Determinism (same input => same output)
; 2) Safety invariance (BLOCK when risk >= threshold)
; 3) Constant-time bound (latency upper bound is fixed)

(set-logic ALL)

; ------- Domain -------
(declare-sort Input 0)
(declare-fun risk (Input) Int)
(declare-fun action (Input) Int)
(declare-fun decision (Input) Int) ; 0=ALLOW, 1=STABILIZE, 2=BLOCK
(declare-fun latency_ms (Input) Int)

(define-fun THRESHOLD () Int 70)
(define-fun MAX_LATENCY () Int 25)

; ------- Gate contract -------
(assert (forall ((x Input))
  (=> (>= (risk x) THRESHOLD)
      (= (decision x) 2))))

(assert (forall ((x Input))
  (=> (< (risk x) THRESHOLD)
      (or (= (decision x) 0) (= (decision x) 1)))))

(assert (forall ((x Input))
  (and (>= (latency_ms x) 0)
       (<= (latency_ms x) MAX_LATENCY))))

; ------- Determinism -------
(assert (forall ((x Input) (y Input))
  (=> (and (= (risk x) (risk y))
           (= (action x) (action y)))
      (= (decision x) (decision y)))))

; ------- Witness -------
; Show model is satisfiable with at least one high-risk and one low-risk sample.
(declare-const i_low Input)
(declare-const i_high Input)
(assert (= (risk i_low) 10))
(assert (= (risk i_high) 95))
(assert (= (action i_low) 1))
(assert (= (action i_high) 1))
(assert (= (decision i_high) 2))

(check-sat)
(get-model)
