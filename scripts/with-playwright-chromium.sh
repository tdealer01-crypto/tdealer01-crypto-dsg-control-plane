#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH:-}" ]]; then
  for candidate in /usr/bin/chromium /usr/bin/google-chrome /usr/bin/google-chrome-stable /usr/bin/chromium-browser; do
    if [[ -x "$candidate" ]] && "$candidate" --version >/dev/null 2>&1; then
      export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$candidate"
      break
    fi
  done
fi

exec "$@"
