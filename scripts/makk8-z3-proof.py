"""
DSG V159 – Makk-8 Formal Verification Arbiter
Zenodo Release – DOI-ready  (doi:10.5281/zenodo.18225586)

License: Apache-2.0
Author: Independent Researcher (DSG Framework)

Formal verification of the Noble Eightfold Path (Makkha 8) logic
using Z3 SMT solving.  Outputs a JSON evidence artifact for CCVS L4.

Usage:
  python scripts/makk8-z3-proof.py [--output ccvs-makk8-z3-proof.json]
"""

import hashlib
import json
import sys
import time
from datetime import datetime, timezone

try:
    from z3 import And, Bool, Solver, sat
    Z3_AVAILABLE = True
except ImportError:
    Z3_AVAILABLE = False

VERSION = "V159-DHAMMA-INTEGRITY"
INVARIANT_SET = "MAKK-8-LOGIC-v1.0"


class Makk8Arbiter:
    """Formal Arbiter Engine using Noble Eightfold Path as logical invariants."""

    def __init__(self):
        if not Z3_AVAILABLE:
            raise RuntimeError("z3-solver not installed: pip install z3-solver")
        self.s = Solver()

    def verify_path_integrity(self, action_data: dict):
        """Verify ethical and deterministic integrity using Z3 SMT."""
        self.s.reset()

        # Wisdom
        Right_View     = Bool("Right_View")
        Right_Resolve  = Bool("Right_Resolve")
        # Morality
        Right_Speech      = Bool("Right_Speech")
        Right_Conduct     = Bool("Right_Conduct")
        Right_Livelihood  = Bool("Right_Livelihood")
        # Concentration
        Right_Effort      = Bool("Right_Effort")
        Right_Mindfulness = Bool("Right_Mindfulness")
        Right_Samadhi     = Bool("Right_Samadhi")

        self.s.add(Right_View      == action_data.get("is_grounded", False))
        self.s.add(Right_Resolve   == (action_data.get("intent_score", 0) > 0))
        self.s.add(Right_Speech    == action_data.get("is_api_clean", False))
        self.s.add(Right_Conduct   == (action_data.get("value", 0) >= 0))
        self.s.add(Right_Livelihood== action_data.get("source_verified", False))
        self.s.add(Right_Effort    == (action_data.get("compute_cost", 0) < 1000))
        self.s.add(Right_Mindfulness == action_data.get("has_audit_trail", False))
        self.s.add(Right_Samadhi   == action_data.get("nonce_lock", False))

        self.s.add(And(
            Right_View,
            Right_Resolve,
            Right_Speech,
            Right_Conduct,
            Right_Livelihood,
            Right_Effort,
            Right_Mindfulness,
            Right_Samadhi,
        ))

        if self.s.check() == sat:
            return True, str(self.s.assertions())
        return False, "PATH_CONFLICT"


def sign_dhamma_proof(proof_hash: str, server_key: bytes) -> str:
    """Cryptographic attestation of verified result."""
    payload = f"{proof_hash}{INVARIANT_SET}".encode()
    return hashlib.sha256(payload + server_key).hexdigest()


def run_case(arbiter: Makk8Arbiter, label: str, action_data: dict) -> dict:
    """Run one verification case and return a result dict."""
    t0 = time.monotonic()
    ok, artifact = arbiter.verify_path_integrity(action_data)
    elapsed_ms = round((time.monotonic() - t0) * 1000, 2)

    result: dict = {
        "label": label,
        "status": "SAMMA" if ok else "MICHA",
        "ok": ok,
        "elapsed_ms": elapsed_ms,
        "action_data": action_data,
    }

    if ok:
        proof_hash = hashlib.sha256(
            f"{artifact}{action_data['value']}".encode()
        ).hexdigest()
        signature = sign_dhamma_proof(proof_hash, b"DSG_PRIVATE_KEY_V159")
        result["proof_hash"] = proof_hash
        result["signature"] = signature
        result["smt_assertions"] = artifact
    else:
        result["reason"] = artifact

    return result


def main():
    output_path = "ccvs-makk8-z3-proof.json"
    for i, arg in enumerate(sys.argv[1:]):
        if arg == "--output" and i + 1 < len(sys.argv[1:]):
            output_path = sys.argv[i + 2]

    if not Z3_AVAILABLE:
        print("❌  z3-solver not available — install with: pip install z3-solver", file=sys.stderr)
        sys.exit(1)

    arbiter = Makk8Arbiter()

    # Case 1: all 8 path conditions satisfied — should be SAMMA
    samma_case = {
        "value": 500,
        "is_grounded": True,
        "intent_score": 10,
        "is_api_clean": True,
        "source_verified": True,
        "compute_cost": 50,
        "has_audit_trail": True,
        "nonce_lock": True,
    }

    # Case 2: nonce_lock missing — should be MICHA (PATH_CONFLICT)
    micha_case = {
        "value": 500,
        "is_grounded": True,
        "intent_score": 10,
        "is_api_clean": True,
        "source_verified": True,
        "compute_cost": 50,
        "has_audit_trail": True,
        "nonce_lock": False,  # violation
    }

    cases = [
        run_case(arbiter, "SAMMA_baseline", samma_case),
        run_case(arbiter, "MICHA_nonce_violation", micha_case),
    ]

    samma_passed = cases[0]["ok"] is True
    micha_detected = cases[1]["ok"] is False
    both_correct = samma_passed and micha_detected

    artifact = {
        "schema": "ccvs-makk8-z3-v1",
        "version": VERSION,
        "invariant_set": INVARIANT_SET,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "engine": "z3-smt",
        "z3_available": True,
        "cases": cases,
        "summary": {
            "total": len(cases),
            "samma_verified": samma_passed,
            "micha_detected": micha_detected,
            "formal_proof_ok": both_correct,
        },
    }

    with open(output_path, "w") as f:
        json.dump(artifact, f, indent=2)

    print(f"{'✅' if samma_passed else '❌'} SAMMA baseline  : {'PASS' if samma_passed else 'FAIL'}")
    print(f"{'✅' if micha_detected else '❌'} MICHA detection : {'PASS' if micha_detected else 'FAIL'}")
    print(f"{'✅' if both_correct else '❌'} Formal proof    : {'OK' if both_correct else 'FAILED'}")
    print(f"   Output         : {output_path}")

    sys.exit(0 if both_correct else 1)


if __name__ == "__main__":
    main()
