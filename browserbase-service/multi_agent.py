#!/usr/bin/env python3
"""
Multi-Agent Parallel Coordinator
- 3 agents run in parallel
- Combined monitoring to prevent failure
- Idempotent retries with circuit breaker
"""

import asyncio
import time
import hashlib
import json
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Awaitable, Union
from enum import Enum
from pathlib import Path

class AgentStatus(Enum):
    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CIRCUIT_OPEN = "circuit_open"

class CircuitBreaker:
    """ prevent cascade failures """
    def __init__(self, threshold: int = 3, cooldown: float = 10.0):
        self.threshold = threshold
        self.cooldown = cooldown
        self.failures = 0
        self.last_fail = 0.0
        self.state = AgentStatus.IDLE

    def allow(self) -> bool:
        if self.state == AgentStatus.CIRCUIT_OPEN:
            if time.time() - self.last_fail > self.cooldown:
                self.state = AgentStatus.IDLE
                self.failures = 0
                return True
            return False
        return True

    def record_success(self):
        self.failures = 0
        self.state = AgentStatus.SUCCESS

    def record_failure(self):
        self.failures += 1
        self.last_fail = time.time()
        if self.failures >= self.threshold:
            self.state = AgentStatus.CIRCUIT_OPEN
            return False  # circuit opened
        return True

@dataclass
class AgentResult:
    agent_id: str
    status: AgentStatus
    output: Any = None
    error: str = ""
    duration_ms: float = 0.0
    attempt: int = 1
    timestamp: str = ""

@dataclass
class Agent:
    id: str
    fn: Callable[[Any], Awaitable[Any]]
    circuit: CircuitBreaker = field(default_factory=CircuitBreaker)
    retries: int = 2
    timeout: float = 15.0
    priority: int = 1  # 1=high, 2=medium, 3=low

class MultiAgentOrchestrator:
    def __init__(self, max_parallel: int = 3):
        self.agents: list[Agent] = []
        self.max_parallel = max_parallel
        self.results: list[Union[AgentResult, BaseException]] = []
        self.lock = asyncio.Lock()
        self._log_path = Path("./multi_agent_runs.jsonl")
    
    def register(self, agent: Agent):
        self.agents.append(agent)
        # sort by priority (1 runs first)
        self.agents.sort(key=lambda a: a.priority)

    async def _execute_agent(self, agent: Agent, payload: Any) -> AgentResult:
        started = time.time()
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        for attempt in range(1, agent.retries + 1):
            if not agent.circuit.allow():
                return AgentResult(
                    agent_id=agent.id,
                    status=AgentStatus.CIRCUIT_OPEN,
                    error="circuit breaker open",
                    timestamp=ts
                )
            
            agent.circuit.state = AgentStatus.RUNNING
            try:
                result = await asyncio.wait_for(agent.fn(payload), timeout=agent.timeout)
                agent.circuit.record_success()
                return AgentResult(
                    agent_id=agent.id,
                    status=AgentStatus.SUCCESS,
                    output=result,
                    duration_ms=round((time.time() - started) * 1000, 2),
                    attempt=attempt,
                    timestamp=ts
                )
            except asyncio.TimeoutError:
                agent.circuit.record_failure()
                if attempt == agent.retries:
                    return AgentResult(
                        agent_id=agent.id,
                        status=AgentStatus.FAILED,
                        error=f"timeout after {agent.timeout}s",
                        duration_ms=round((time.time() - started) * 1000, 2),
                        attempt=attempt,
                        timestamp=ts
                    )
            except Exception as e:
                agent.circuit.record_failure()
                if attempt == agent.retries:
                    return AgentResult(
                        agent_id=agent.id,
                        status=AgentStatus.FAILED,
                        error=str(e),
                        duration_ms=round((time.time() - started) * 1000, 2),
                        attempt=attempt,
                        timestamp=ts
                    )

    async def run(self, payload: Any) -> list[AgentResult]:
        """ run 3 agents in parallel, gather results """
        semaphore = asyncio.Semaphore(self.max_parallel)
        
        async def guarded_run(agent: Agent):
            async with semaphore:
                return await self._execute_agent(agent, payload)
        
        start = time.time()
        tasks = [guarded_run(a) for a in self.agents]
        self.results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # normalize any unexpected exceptions
        normalized: list[AgentResult] = []
        for i, r in enumerate(self.results):
            exc = r if isinstance(r, Exception) else None
            if exc is not None:
                normalized.append(AgentResult(
                    agent_id=self.agents[i].id,
                    status=AgentStatus.FAILED,
                    error=str(exc),
                    duration_ms=0,
                    timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                ))
            else:
                # at this point, exc is None and r is not Exception
                normalized.append(r)  # type: ignore[arg-type]
        
        # log run
        self._log_run(normalized, payload)
        return normalized

    def _log_run(self, results: list[AgentResult], payload: Any):
        entry = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "agents": [asdict(r) for r in results],
            "payload_hash": hashlib.sha256(str(payload).encode()).hexdigest()[:16]
        }
        with open(self._log_path, "a") as f:
            f.write(json.dumps(entry, default=str) + "\n")

    def health_check(self) -> dict:
        return {
            a.id: {
                "status": a.circuit.state.value,
                "failures": a.circuit.failures,
                "allowed": a.circuit.allow()
            }
            for a in self.agents
        }


# ── Example: 3 real agents ─────────────────────────────────────
# Agent 1: data fetch
async def fetch_data(payload):
    await asyncio.sleep(0.1)
    return {"source": "primary", "data": payload, "fetched_at": time.time()}

# Agent 2: validation / transform
async def validate_data(payload):
    await asyncio.sleep(0.15)
    if not payload:
        raise ValueError("empty payload")
    return {"valid": True, "normalized": str(payload).upper()}

# Agent 3: enrichment / side-effect
async def enrich_data(payload):
    await asyncio.sleep(0.2)
    return {"enriched": True, "meta": {"agents": 3, "round": 1}}


async def main():
    orchestrator = MultiAgentOrchestrator(max_parallel=3)
    
    orchestrator.register(Agent(id="fetcher",  fn=fetch_data,    priority=1, timeout=5))
    orchestrator.register(Agent(id="validator",fn=validate_data, priority=2, timeout=5))
    orchestrator.register(Agent(id="enricher", fn=enrich_data,   priority=3, timeout=5))

    print("=== 3-Agent Parallel Run ===")
    print("Health before:", json.dumps(orchestrator.health_check(), indent=2))
    
    results = await orchestrator.run(payload="dsg-control-plane")
    
    print("\nResults:")
    for r in results:
        status_icon = {"success":"✓", "failed":"✗", "circuit_open":"⊘"}.get(r.status.value, "?")
        print(f"  [{status_icon}] {r.agent_id:10s} {r.status.value:12s} "
              f"{r.duration_ms:6.1f}ms  attempt={r.attempt}"
              + (f"  err={r.error}" if r.error else ""))
    
    print("\nHealth after:", json.dumps(orchestrator.health_check(), indent=2))
    
    # retry with failure simulation
    print("\n=== Retry with failing agent ===")
    
    fail_state = {"count": 0}
    async def flaky_agent(payload):
        fail_state["count"] += 1
        if fail_state["count"] < 3:
            raise RuntimeError(f"simulated failure #{fail_state['count']}")
        return {"recovered": True, "after": fail_state["count"]}
    
    bad_orch = MultiAgentOrchestrator(max_parallel=3)
    bad_orch.register(Agent(id="flaky", fn=flaky_agent, retries=3, timeout=3))
    bad_orch.register(Agent(id="others", fn=enrich_data,  retries=1, timeout=5))
    bad_orch.register(Agent(id="other2", fn=fetch_data,   retries=1, timeout=5))
    
    results2 = await bad_orch.run("retry-test")
    for r in results2:
        icon = {"success":"✓", "failed":"✗", "circuit_open":"⊘"}.get(r.status.value, "?")
        print(f"  [{icon}] {r.agent_id:10s} {r.status.value:12s} attempt={r.attempt} {r.error or r.output}")

    print("\nLog path:", bad_orch._log_path)

if __name__ == "__main__":
    asyncio.run(main())
