#!/usr/bin/env bash
# evidence-guard: advisory PostToolUse hook for the DSG ONE / ProofGate repo.
#
# Reads the PostToolUse event JSON on stdin, scans the written/edited content
# for forbidden readiness claims (CLAUDE.md section 1), and prints an advisory
# to stderr when one is found. This hook is ADVISORY ONLY: it always exits 0 so
# it never blocks a legitimate edit. It reminds the author to attach fresh
# evidence or downgrade the claim (verified fact / inference / pending /
# blocked / not verified).
#
# No external dependencies beyond a POSIX shell and grep. Safe to no-op if
# stdin is empty or grep is unavailable.

set -u

payload="$(cat 2>/dev/null || true)"

if [ -z "${payload}" ]; then
  exit 0
fi

if ! command -v grep >/dev/null 2>&1; then
  exit 0
fi

# Forbidden claims that require fresh evidence before use.
patterns='production-ready|marketplace-ready|enterprise-ready 100%|full customer production go-live|certified compliance|guaranteed compliance|third-party audited|WORM-certified storage|JWT/JWKS auth complete|real cryptographic signing complete|external production Z3 solver invocation|mainnet launched'

matches="$(printf '%s' "${payload}" | grep -ioE "${patterns}" 2>/dev/null | sort -u || true)"

if [ -n "${matches}" ]; then
  {
    echo "evidence-guard: advisory — forbidden readiness claim(s) detected in this change:"
    printf '%s\n' "${matches}" | sed 's/^/  - /'
    echo "These claims require fresh evidence (CLAUDE.md section 1)."
    echo "Either attach current evidence or downgrade to: verified fact / inference / pending / blocked / not verified."
    echo "This is advisory only; the edit was not blocked."
  } 1>&2
fi

exit 0
