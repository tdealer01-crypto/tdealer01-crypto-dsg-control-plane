#!/usr/bin/env python3
"""
DSG ONE Z3 Native Solver Microservice
HTTP wrapper around z3-solver for deterministic proof verification.
Deployment: Google Cloud Run (scale-to-zero)
"""

import os
import json
import time
import logging
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import z3

# ============================================================================
# Configuration
# ============================================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Z3_TIMEOUT_MS = int(os.getenv("Z3_TIMEOUT_MS", "5000"))
MAX_MODEL_SIZE = int(os.getenv("MAX_MODEL_SIZE", "10000"))
SOLVER_VERSION = f"z3-{z3.get_version_string()}"
PORT = int(os.getenv("PORT", "8080"))
SERVICE_NAME = "dsg-z3-solver"

# ============================================================================
# Models
# ============================================================================


class SolveRequest(BaseModel):
    """SMT-LIB2 verification request."""

    smt2: str = Field(
        ...,
        description="SMT-LIB v2 format assertion (set-logic, declare-const, assert, check-sat)",
        max_length=100000,
    )
    timeout_ms: Optional[int] = Field(
        default=Z3_TIMEOUT_MS,
        description="Solver timeout in milliseconds",
        ge=100,
        le=30000,
    )
    nonce: Optional[str] = Field(
        default=None, description="Request nonce for idempotency/tracking"
    )


class ModelEntry(BaseModel):
    """Single variable assignment in Z3 model."""

    name: str
    value: str


class SolveResult(BaseModel):
    """SMT-LIB2 verification result."""

    status: str  # "sat", "unsat", "unknown"
    satisfiable: bool
    model: Optional[list[ModelEntry]] = None
    unsatisfiable_core: Optional[list[str]] = None
    solver_version: str
    time_ms: float
    smt2_hash: str
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""

    ok: bool
    service: str
    solver_version: str
    uptime_s: float


# ============================================================================
# Global State
# ============================================================================

start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown handler."""
    logger.info(f"Starting {SERVICE_NAME}")
    logger.info(f"Z3 version: {SOLVER_VERSION}")
    logger.info(f"Solver timeout: {Z3_TIMEOUT_MS}ms")
    yield
    logger.info(f"Shutting down {SERVICE_NAME}")


# ============================================================================
# Helper Functions
# ============================================================================


def hash_smt2(smt2: str) -> str:
    """SHA256 hash of SMT-LIB2 input."""
    import hashlib

    return hashlib.sha256(smt2.encode()).hexdigest()


def solve_smt2(smt2: str, timeout_ms: int = Z3_TIMEOUT_MS) -> dict:
    """
    Solve SMT-LIB2 formula using z3.
    Returns: {"status": "sat|unsat|unknown", "model": [...], "error": str|None}
    """
    try:
        # Parse SMT-LIB2 input
        z3_ctx = z3.Context()
        z3_solver = z3.Solver(ctx=z3_ctx)
        z3_solver.set("timeout", timeout_ms)

        # Parse via Z3's SMT-LIB parser
        statements = z3.parse_smt2_string(smt2, ctx=z3_ctx)
        for stmt in statements:
            z3_solver.add(stmt)

        # Check satisfiability
        status = z3_solver.check()

        result = {
            "status": str(status),
            "satisfiable": status == z3.sat,
            "model": None,
            "unsatisfiable_core": None,
            "error": None,
        }

        if status == z3.sat:
            model = z3_solver.model()
            model_entries = []
            for decl in model.decls():
                try:
                    value_str = str(model[decl])
                    model_entries.append({"name": decl.name(), "value": value_str})
                except Exception as e:
                    logger.warning(
                        f"Failed to extract model value for {decl.name()}: {e}"
                    )

            if len(str(model_entries)) <= MAX_MODEL_SIZE:
                result["model"] = model_entries
            else:
                result["model"] = [{"name": "(model too large)", "value": "..."}]

        elif status == z3.unsat:
            try:
                core = z3_solver.unsat_core()
                result["unsatisfiable_core"] = [str(c) for c in core]
            except Exception as e:
                logger.warning(f"Failed to extract unsat core: {e}")

        return result

    except z3.Z3Exception as e:
        return {
            "status": "unknown",
            "satisfiable": False,
            "model": None,
            "unsatisfiable_core": None,
            "error": f"Z3Exception: {str(e)}",
        }
    except Exception as e:
        return {
            "status": "unknown",
            "satisfiable": False,
            "model": None,
            "unsatisfiable_core": None,
            "error": f"ParseError: {str(e)}",
        }


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="DSG Z3 Solver",
    description="Native Z3 theorem prover endpoint for deterministic proof verification",
    version="1.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    Returns service status, Z3 version, uptime.
    """
    uptime = time.time() - start_time
    return HealthResponse(
        ok=True, service=SERVICE_NAME, solver_version=SOLVER_VERSION, uptime_s=uptime
    )


@app.post("/solve", response_model=SolveResult)
async def solve(request: SolveRequest):
    """
    Solve SMT-LIB v2 formula.

    **Request body:**
    ```json
    {
      "smt2": "(set-logic QF_UFLIA)\\n(declare-const x Int)\\n(assert (= x 5))\\n(check-sat)",
      "timeout_ms": 5000,
      "nonce": "optional-request-id"
    }
    ```

    **Response:**
    - `status`: "sat", "unsat", or "unknown"
    - `satisfiable`: boolean
    - `model`: variable assignments (if sat)
    - `unsatisfiable_core`: conflicting assertions (if unsat)
    - `solver_version`: Z3 version
    - `time_ms`: solver runtime
    - `smt2_hash`: SHA256(input)
    - `error`: error message if parsing failed

    **Example sat response:**
    ```json
    {
      "status": "sat",
      "satisfiable": true,
      "model": [{"name": "x", "value": "5"}],
      "solver_version": "z3 4.13.0",
      "time_ms": 12.5,
      "smt2_hash": "abc123...",
      "error": null
    }
    ```
    """
    smt2_hash = hash_smt2(request.smt2)

    try:
        start = time.time()
        result = solve_smt2(request.smt2, request.timeout_ms)
        elapsed_ms = (time.time() - start) * 1000

        if result["error"]:
            logger.error(f"Solver error [nonce={request.nonce}]: {result['error']}")
            raise HTTPException(status_code=400, detail=result["error"])

        logger.info(
            f"Solved [status={result['status']} time={elapsed_ms:.1f}ms nonce={request.nonce}]"
        )

        return SolveResult(
            status=result["status"],
            satisfiable=result["satisfiable"],
            model=result["model"],
            unsatisfiable_core=result["unsatisfiable_core"],
            solver_version=SOLVER_VERSION,
            time_ms=elapsed_ms,
            smt2_hash=smt2_hash,
            error=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error [nonce={request.nonce}]")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """API documentation."""
    return {
        "service": SERVICE_NAME,
        "version": "1.0",
        "endpoints": {"/health": "GET", "/solve": "POST"},
        "docs": "/docs",
    }


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests."""
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start
    logger.info(f"{request.method} {request.url.path} {response.status_code} {elapsed*1000:.1f}ms")
    return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        log_level="info",
    )
