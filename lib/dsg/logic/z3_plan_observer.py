from __future__ import annotations

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from z3 import Bool, Solver, Implies, And, Not, Or, sat, unsat


class GateStatus(str, Enum):
    PASS = "PASS"
    BLOCK = "BLOCK"
    REVIEW = "REVIEW"
    UNSUPPORTED = "UNSUPPORTED"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ActionType(str, Enum):
    READ_FILE = "read_file"
    WRITE_FILE = "write_file"
    RUN_COMMAND = "run_command"
    CALL_API = "call_api"
    DEPLOY = "deploy"
    CREATE_DATABASE = "create_database"
    CHANGE_PERMISSION = "change_permission"
    CHARGE_PAYMENT = "charge_payment"


@dataclass(frozen=True)
class ProposedAction:
    id: str
    type: ActionType
    risk: RiskLevel = RiskLevel.LOW
    wave: int = 0
    depends_on: List[str] = field(default_factory=list)
    reads: List[str] = field(default_factory=list)
    writes: List[str] = field(default_factory=list)
    command: Optional[str] = None
    required_secrets: List[str] = field(default_factory=list)
    approved: bool = False


@dataclass(frozen=True)
class PlanSnapshot:
    job_id: str
    workspace_id: str
    goal_locked: bool
    plan_exists: bool
    available_secrets: List[str] = field(default_factory=list)
    allowed_paths: List[str] = field(default_factory=list)
    allowed_commands: List[str] = field(default_factory=list)
    actions: List[ProposedAction] = field(default_factory=list)


@dataclass
class GateReason:
    code: str
    message: str
    action_id: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Z3PlanObserverResult:
    gate_name: str
    status: GateStatus
    pass_: bool
    reasons: List[GateReason]
    z3_check: str
    summary: Dict[str, Any]


FORBIDDEN_PATH_PREFIXES = (".env", ".git", "node_modules")

HIGH_RISK_TYPES = {
    ActionType.DEPLOY,
    ActionType.CREATE_DATABASE,
    ActionType.CHANGE_PERMISSION,
    ActionType.CHARGE_PAYMENT,
}


def _normalize_path(path: str) -> str:
    return path.strip().replace("\\", "/").lstrip("./")


def _path_is_forbidden(path: str) -> bool:
    normalized = _normalize_path(path)
    if normalized == "" or normalized == "**" or normalized.startswith("**/"):
        return True
    return any(normalized == prefix or normalized.startswith(prefix + "/") for prefix in FORBIDDEN_PATH_PREFIXES)


def _path_allowed(path: str, allowed_paths: List[str]) -> bool:
    normalized = _normalize_path(path)
    if _path_is_forbidden(normalized):
        return False

    clean_allowed = [
        _normalize_path(p).rstrip("/")
        for p in allowed_paths
        if p.strip()
    ]
    if not clean_allowed or "**" in clean_allowed:
        return False

    return any(normalized == allowed or normalized.startswith(allowed + "/") for allowed in clean_allowed)


def _collect_write_conflicts(actions: List[ProposedAction]) -> List[GateReason]:
    reasons: List[GateReason] = []
    seen: Dict[Tuple[int, str], str] = {}
    for action in actions:
        for write_path in action.writes:
            normalized = _normalize_path(write_path)
            key = (action.wave, normalized)
            if key in seen:
                reasons.append(GateReason(
                    code="WRITE_CONFLICT_IN_SAME_WAVE",
                    message="Two actions write to the same target in the same wave.",
                    action_id=action.id,
                    details={"wave": action.wave, "path": normalized, "first_action_id": seen[key], "second_action_id": action.id},
                ))
            else:
                seen[key] = action.id
    return reasons


def _collect_dependency_errors(actions: List[ProposedAction]) -> List[GateReason]:
    reasons: List[GateReason] = []
    by_id = {action.id: action for action in actions}
    for action in actions:
        for dep_id in action.depends_on:
            dep = by_id.get(dep_id)
            if dep is None:
                reasons.append(GateReason(
                    code="MISSING_DEPENDENCY",
                    message="Action depends on a missing action.",
                    action_id=action.id,
                    details={"missing_dependency": dep_id},
                ))
                continue
            if dep.wave >= action.wave:
                reasons.append(GateReason(
                    code="DEPENDENCY_ORDER_VIOLATION",
                    message="Action dependency must run in an earlier wave.",
                    action_id=action.id,
                    details={"dependency_id": dep.id, "dependency_wave": dep.wave, "action_wave": action.wave},
                ))

    cycle = _find_cycle(actions)
    if cycle:
        reasons.append(GateReason(code="CYCLIC_DEPENDENCY", message="Plan contains a cyclic dependency.", details={"cycle": cycle}))
    return reasons


def _find_cycle(actions: List[ProposedAction]) -> Optional[List[str]]:
    graph = {action.id: list(action.depends_on) for action in actions}
    visiting: Set[str] = set()
    visited: Set[str] = set()
    stack: List[str] = []

    def dfs(node: str) -> Optional[List[str]]:
        if node in visiting:
            return stack[stack.index(node):] + [node] if node in stack else [node]
        if node in visited:
            return None
        visiting.add(node)
        stack.append(node)
        for dep in graph.get(node, []):
            if dep in graph:
                found = dfs(dep)
                if found:
                    return found
        stack.pop()
        visiting.remove(node)
        visited.add(node)
        return None

    for node in graph:
        found = dfs(node)
        if found:
            return found
    return None


def observe_plan_feasibility(snapshot: PlanSnapshot) -> Z3PlanObserverResult:
    """
    Z3 ชั้น 2:
    - ไม่ execute
    - ไม่ approve
    - ไม่แทน RBAC / Risk Control / Executor
    - ดูแค่ว่า plan เป็นไปได้ไหม / ขัดกันไหม / ของครบไหม
    """
    reasons: List[GateReason] = []

    if not snapshot.goal_locked:
        reasons.append(GateReason(code="NO_GOAL_LOCK", message="Plan feasibility check requires a locked goal."))
    if not snapshot.plan_exists:
        reasons.append(GateReason(code="NO_PLAN", message="No proposed plan exists."))
    if not snapshot.actions:
        reasons.append(GateReason(code="NO_ACTIONS", message="Plan has no actions."))

    available_secrets = set(snapshot.available_secrets)
    allowed_commands = set(snapshot.allowed_commands)

    for action in snapshot.actions:
        for secret in action.required_secrets:
            if secret not in available_secrets:
                reasons.append(GateReason(
                    code="MISSING_REQUIRED_SECRET",
                    message="Action requires a secret that is not available.",
                    action_id=action.id,
                    details={"secret": secret},
                ))

        for write_path in action.writes:
            if _path_is_forbidden(write_path):
                reasons.append(GateReason(code="FORBIDDEN_WRITE_PATH", message="Action attempts to write to a forbidden path.", action_id=action.id, details={"path": write_path}))
            elif not _path_allowed(write_path, snapshot.allowed_paths):
                reasons.append(GateReason(code="WRITE_PATH_NOT_ALLOWED", message="Action writes outside allowed paths.", action_id=action.id, details={"path": write_path, "allowed_paths": snapshot.allowed_paths}))

        if action.type == ActionType.RUN_COMMAND:
            if not action.command:
                reasons.append(GateReason(code="MISSING_COMMAND", message="run_command action has no command.", action_id=action.id))
            elif action.command not in allowed_commands:
                reasons.append(GateReason(code="COMMAND_NOT_ALLOWED", message="Command is not in the allowlist.", action_id=action.id, details={"command": action.command, "allowed_commands": snapshot.allowed_commands}))

        if action.type in HIGH_RISK_TYPES and not action.approved:
            reasons.append(GateReason(
                code="HIGH_RISK_ACTION_NOT_APPROVED",
                message="High-risk action exists without approval. Z3 observer reports this, but approval is still controlled by Risk Control.",
                action_id=action.id,
                details={"action_type": action.type.value, "risk": action.risk.value},
            ))

    reasons.extend(_collect_write_conflicts(snapshot.actions))
    reasons.extend(_collect_dependency_errors(snapshot.actions))
    z3_result = _run_z3_consistency_check(snapshot, reasons)

    if z3_result == "sat" and not reasons:
        status = GateStatus.PASS
    elif z3_result == "unsat" or reasons:
        status = GateStatus.BLOCK
    else:
        status = GateStatus.REVIEW

    return Z3PlanObserverResult(
        gate_name="Z3_PLAN_FEASIBILITY_OBSERVER",
        status=status,
        pass_=status == GateStatus.PASS,
        reasons=reasons,
        z3_check=z3_result,
        summary={
            "job_id": snapshot.job_id,
            "workspace_id": snapshot.workspace_id,
            "actions": len(snapshot.actions),
            "waves": sorted({a.wave for a in snapshot.actions}),
            "blocked_reasons": len(reasons),
        },
    )


def _run_z3_consistency_check(snapshot: PlanSnapshot, reasons: List[GateReason]) -> str:
    solver = Solver()
    goal_locked = Bool("goal_locked")
    plan_exists = Bool("plan_exists")
    no_blockers = Bool("no_blockers")
    plan_feasible = Bool("plan_feasible")

    solver.add(goal_locked == snapshot.goal_locked)
    solver.add(plan_exists == snapshot.plan_exists)
    solver.add(no_blockers == (len(reasons) == 0))
    solver.add(plan_feasible == And(goal_locked, plan_exists, no_blockers))
    solver.add(Implies(Not(goal_locked), Not(plan_feasible)))
    solver.add(Implies(Not(plan_exists), Not(plan_feasible)))
    solver.add(Implies(Not(no_blockers), Not(plan_feasible)))
    solver.add(plan_feasible)

    result = solver.check()
    if result == sat:
        return "sat"
    if result == unsat:
        return "unsat"
    return "unknown"


def result_to_dict(result: Z3PlanObserverResult) -> Dict[str, Any]:
    return {
        "gate_name": result.gate_name,
        "status": result.status.value,
        "pass": result.pass_,
        "z3_check": result.z3_check,
        "summary": result.summary,
        "reasons": [asdict(reason) for reason in result.reasons],
    }


class AgentType(str, Enum):
    ORCHESTRATOR = "orchestrator"
    CODE_EVOLUTION = "code-evolution"
    TEST_COVERAGE = "test-coverage"
    DEPLOY_MONITOR = "deploy-monitor"
    BROWSER_RESEARCH = "browser-research"
    SECURITY_GATE = "security-gate"


@dataclass(frozen=True)
class AgentPlanSnapshot:
    """Input for per-agent Z3 invariant verification."""
    agent_type: AgentType
    job_id: str
    workspace_id: str
    goal_locked: bool
    gate_allow: bool
    evidence_exists: bool
    mock_state: bool
    # Code Evolution specific
    plan_approved: bool = False
    writes_code: bool = False
    is_destructive_write: bool = False
    destruction_proof: bool = False
    # Test Coverage specific
    test_run_complete: bool = False
    new_coverage_gte_prev: bool = True
    # Browser Research specific
    uses_browser_result: bool = False
    browser_evidence_hash_set: bool = False
    # Seed Engine specific
    data_needed: bool = False
    data_unknown: bool = False
    search_attempted: bool = False


@dataclass
class AgentInvariantResult:
    agent_type: str
    job_id: str
    status: GateStatus
    pass_: bool
    violations: List[GateReason]
    z3_check: str
    z3_proof_hash: str


def _sha256_hex(data: str) -> str:
    import hashlib
    return hashlib.sha256(data.encode()).hexdigest()


def verify_agent_invariants(snapshot: AgentPlanSnapshot) -> AgentInvariantResult:
    """
    Z3 formal verification of per-agent invariants.
    Called during SkillGate verify step — skill cannot be locked if this returns BLOCK.
    """
    violations: List[GateReason] = []
    solver = Solver()

    goal_locked = Bool("goal_locked")
    gate_allow = Bool("gate_allow")
    evidence_exists = Bool("evidence_exists")
    mock_state = Bool("mock_state")

    solver.add(goal_locked == snapshot.goal_locked)
    solver.add(gate_allow == snapshot.gate_allow)
    solver.add(evidence_exists == snapshot.evidence_exists)
    solver.add(mock_state == snapshot.mock_state)

    if snapshot.agent_type == AgentType.ORCHESTRATOR:
        can_dispatch = Bool("orchestrator_can_dispatch")
        sub_goal = Bool("sub_agent_goal_locked")
        solver.add(can_dispatch == snapshot.goal_locked)
        solver.add(sub_goal == snapshot.goal_locked)
        solver.add(Implies(can_dispatch, goal_locked))
        solver.add(Implies(can_dispatch, sub_goal))
        if not snapshot.goal_locked:
            violations.append(GateReason(
                code="ORCHESTRATOR_NO_GOAL_LOCK",
                message="Orchestrator cannot dispatch without a locked goal.",
            ))

    elif snapshot.agent_type == AgentType.CODE_EVOLUTION:
        writes_code = Bool("writes_code")
        plan_approved = Bool("plan_approved")
        is_destructive = Bool("is_destructive_write")
        destruction_proof = Bool("destruction_proof")
        solver.add(writes_code == snapshot.writes_code)
        solver.add(plan_approved == snapshot.plan_approved)
        solver.add(is_destructive == snapshot.is_destructive_write)
        solver.add(destruction_proof == snapshot.destruction_proof)
        solver.add(Implies(writes_code, plan_approved))
        solver.add(Implies(And(writes_code, is_destructive), destruction_proof))
        if snapshot.writes_code and not snapshot.plan_approved:
            violations.append(GateReason(
                code="CODE_WRITE_WITHOUT_APPROVED_PLAN",
                message="Code Evolution agent cannot write code without an approved plan.",
            ))
        if snapshot.writes_code and snapshot.is_destructive_write and not snapshot.destruction_proof:
            violations.append(GateReason(
                code="DESTRUCTIVE_WRITE_WITHOUT_PROOF",
                message="Destructive code write requires a destruction proof.",
            ))

    elif snapshot.agent_type == AgentType.TEST_COVERAGE:
        test_run = Bool("test_run_complete")
        coverage_gte = Bool("new_coverage_gte_prev")
        solver.add(test_run == snapshot.test_run_complete)
        solver.add(coverage_gte == snapshot.new_coverage_gte_prev)
        solver.add(Implies(test_run, coverage_gte))
        if snapshot.test_run_complete and not snapshot.new_coverage_gte_prev:
            violations.append(GateReason(
                code="COVERAGE_DECREASED",
                message="Test coverage must be monotonically non-decreasing.",
            ))

    elif snapshot.agent_type == AgentType.DEPLOY_MONITOR:
        triggers_deploy = Bool("triggers_deploy")
        solver.add(triggers_deploy == (snapshot.gate_allow and snapshot.evidence_exists and not snapshot.mock_state))
        solver.add(Implies(triggers_deploy, gate_allow))
        solver.add(Implies(triggers_deploy, evidence_exists))
        solver.add(Implies(triggers_deploy, Not(mock_state)))
        if snapshot.mock_state:
            violations.append(GateReason(
                code="DEPLOY_IN_MOCK_STATE",
                message="Deploy Monitor cannot trigger deploy when mock_state is active.",
            ))
        if not snapshot.gate_allow:
            violations.append(GateReason(
                code="DEPLOY_GATE_NOT_ALLOW",
                message="Deploy Monitor requires gate_allow before triggering deploy.",
            ))
        if not snapshot.evidence_exists:
            violations.append(GateReason(
                code="DEPLOY_NO_EVIDENCE",
                message="Deploy Monitor requires existing evidence before triggering deploy.",
            ))

    elif snapshot.agent_type == AgentType.BROWSER_RESEARCH:
        uses_result = Bool("uses_browser_result")
        hash_set = Bool("browser_evidence_hash_set")
        solver.add(uses_result == snapshot.uses_browser_result)
        solver.add(hash_set == snapshot.browser_evidence_hash_set)
        solver.add(Implies(uses_result, hash_set))
        if snapshot.uses_browser_result and not snapshot.browser_evidence_hash_set:
            violations.append(GateReason(
                code="BROWSER_RESULT_NO_EVIDENCE_HASH",
                message="Browser Research results must carry a tamper-evident evidence hash.",
            ))

    elif snapshot.agent_type == AgentType.SECURITY_GATE:
        action_attempted = Bool("action_attempted")
        solver.add(action_attempted == (not snapshot.gate_allow))
        solver.add(Implies(action_attempted, gate_allow))
        if not snapshot.gate_allow:
            violations.append(GateReason(
                code="ACTION_WITHOUT_GATE_ALLOW",
                message="Security Gate: every action requires gate_allow before execution.",
            ))

    # Seed Engine invariant applies to all agents
    if snapshot.data_needed and snapshot.data_unknown and not snapshot.search_attempted:
        violations.append(GateReason(
            code="SEED_DATA_NOT_SEARCHED",
            message="Data is needed but unknown. Agent must search via Seed Engine before proceeding.",
        ))
        data_needed = Bool("data_needed")
        data_unknown = Bool("data_unknown")
        must_search = Bool("must_search")
        solver.add(data_needed == True)
        solver.add(data_unknown == True)
        solver.add(must_search == True)
        solver.add(Implies(And(data_needed, data_unknown), must_search))

    z3_result = solver.check()
    z3_str = "sat" if z3_result == sat else ("unsat" if z3_result == unsat else "unknown")

    if violations:
        status = GateStatus.BLOCK
    elif z3_str == "unsat":
        status = GateStatus.BLOCK
    else:
        status = GateStatus.PASS

    proof_input = f"{snapshot.agent_type}:{snapshot.job_id}:{z3_str}:{len(violations)}"
    proof_hash = f"sha256:{_sha256_hex(proof_input)}"

    return AgentInvariantResult(
        agent_type=snapshot.agent_type.value,
        job_id=snapshot.job_id,
        status=status,
        pass_=status == GateStatus.PASS,
        violations=violations,
        z3_check=z3_str,
        z3_proof_hash=proof_hash,
    )


def agent_result_to_dict(result: AgentInvariantResult) -> Dict[str, Any]:
    return {
        "agent_type": result.agent_type,
        "job_id": result.job_id,
        "status": result.status.value,
        "pass": result.pass_,
        "z3_check": result.z3_check,
        "z3_proof_hash": result.z3_proof_hash,
        "violations": [asdict(v) for v in result.violations],
    }


if __name__ == "__main__":
    demo = PlanSnapshot(
        job_id="job_demo",
        workspace_id="workspace_demo",
        goal_locked=True,
        plan_exists=True,
        available_secrets=["OPENROUTER_API_KEY"],
        allowed_paths=["app", "lib", "components"],
        allowed_commands=["npm test", "npm run build"],
        actions=[
            ProposedAction(id="step_1", type=ActionType.WRITE_FILE, wave=1, writes=["lib/dsg/core.ts"]),
            ProposedAction(id="step_2", type=ActionType.WRITE_FILE, wave=1, writes=["lib/dsg/core.ts"]),
            ProposedAction(
                id="step_3",
                type=ActionType.DEPLOY,
                risk=RiskLevel.HIGH,
                wave=2,
                depends_on=["step_1"],
                required_secrets=["VERCEL_TOKEN"],
                approved=False,
            ),
        ],
    )
    print(result_to_dict(observe_plan_feasibility(demo)))
