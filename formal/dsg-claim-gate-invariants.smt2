; DSG claim gate invariants
; This is a specification artifact. It is not a solver result until a Z3/SMT run is attached as evidence.

(set-logic QF_Bool)

(declare-const evidence Bool)
(declare-const auditExport Bool)
(declare-const replayProof Bool)
(declare-const authRbacProof Bool)
(declare-const deploymentProof Bool)
(declare-const productionFlowProof Bool)
(declare-const mockState Bool)
(declare-const devOrSmokeOnly Bool)

(declare-const claimCompleted Bool)
(declare-const claimVerified Bool)
(declare-const claimDeployable Bool)
(declare-const claimProduction Bool)

; Completion requires evidence, audit export, and replay proof.
(assert (= claimCompleted (and evidence auditExport replayProof)))

; Verified requires completion and auth/RBAC proof.
(assert (= claimVerified (and claimCompleted authRbacProof)))

; Deployable requires verified state and deployment proof.
(assert (= claimDeployable (and claimVerified deploymentProof)))

; Production requires deployable state, real production user-flow proof, and no mock/dev-only source.
(assert (= claimProduction (and claimDeployable productionFlowProof (not mockState) (not devOrSmokeOnly))))

; Safety checks: these bad states must be unsatisfiable.
(push)
(assert (and claimCompleted (not evidence)))
(check-sat)
(pop)

(push)
(assert (and claimCompleted (not auditExport)))
(check-sat)
(pop)

(push)
(assert (and claimCompleted (not replayProof)))
(check-sat)
(pop)

(push)
(assert (and claimProduction mockState))
(check-sat)
(pop)

(push)
(assert (and claimProduction devOrSmokeOnly))
(check-sat)
(pop)
