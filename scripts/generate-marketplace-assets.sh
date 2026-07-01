#!/usr/bin/env bash
set -euo pipefail

ASSET_DIR="marketplace-assets"

required_files=(
  "logo.png"
  "screenshot-1-dashboard.png"
  "screenshot-2-revenue.png"
  "screenshot-3-governance.png"
  "screenshot-4-proof.png"
  "screenshot-5-pricing.png"
)

missing=0
for file in "${required_files[@]}"; do
  if [[ ! -f "${ASSET_DIR}/${file}" ]]; then
    echo "MISSING: ${ASSET_DIR}/${file}"
    missing=1
  else
    echo "OK: ${ASSET_DIR}/${file}"
  fi
done

if [[ $missing -eq 1 ]]; then
  echo "Asset validation failed."
  exit 1
fi

echo "All marketplace assets are present."
