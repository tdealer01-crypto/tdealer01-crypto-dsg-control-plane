#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"

if [[ -z "$target" ]]; then
  echo "Usage: ./scripts/submit-to-marketplace.sh [github|stripe]"
  exit 1
fi

case "$target" in
  github)
    echo "Open: https://github.com/settings/apps"
    echo "Then: https://github.com/marketplace/new"
    echo "Use template: MARKETPLACE_SUBMISSION_GITHUB.md"
    ;;
  stripe)
    echo "Open: https://dashboard.stripe.com/apps"
    echo "Use template: MARKETPLACE_SUBMISSION_STRIPE.md"
    ;;
  *)
    echo "Unknown target: $target"
    echo "Valid targets: github, stripe"
    exit 1
    ;;
esac
