#!/usr/bin/env bash
set -euo pipefail

REGISTRY="https://registry.npmjs.org/"

ensure_node() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "[SETUP] Installing nodejs..."
    pkg update -y
    pkg install -y nodejs
  fi
}

verify_package() {
  if [ ! -f package.json ]; then
    echo "[BLOCK] package.json not found"
    echo "Run this from the package directory, for example:"
    echo "cd packages/dsg-one-sdk"
    exit 1
  fi

  node <<'NODE'
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
const issues = [];
if (!p.name) issues.push("missing name");
if (!p.version) issues.push("missing version");
if (p.private === true) issues.push("private=true");
if (issues.length) {
  console.error("[BLOCK] package.json is not publishable:", issues.join(", "));
  process.exit(1);
}
console.log(`[OK] Package: ${p.name}@${p.version}`);
NODE
}

print_ci_path() {
  cat <<'EOF'
[INFO] Canonical production release path:
  GitHub Actions -> npm Trusted Publishing (OIDC)
  .github/workflows/publish-dsg-one-sdk.yml

This Termux script is only for first-publish bootstrap or emergency manual publishing.
It does not create or store a dedicated CI publish token.
EOF
}

login_interactive() {
  echo "[LOGIN] Opening npm browser authentication for ${REGISTRY}"
  npm login --auth-type=web --registry="$REGISTRY"
  echo "[CHECK] npm identity:"
  npm whoami --registry="$REGISTRY"
}

verify_release() {
  verify_package
  echo "[TEST] Running package tests"
  npm test
  echo "[BUILD] Building package"
  npm run build
  echo "[DRY RUN] Inspecting npm package contents"
  npm pack --dry-run
}

publish_package() {
  verify_release

  if ! npm whoami --registry="$REGISTRY" >/dev/null 2>&1; then
    echo "[BLOCK] No npm session is available."
    echo "Run option 2 (npm browser login) first."
    exit 1
  fi

  PACKAGE_NAME="$(node -p "require('./package.json').name")"
  PACKAGE_VERSION="$(node -p "require('./package.json').version")"

  if npm view "${PACKAGE_NAME}@${PACKAGE_VERSION}" version --json >/dev/null 2>&1; then
    echo "[BLOCK] ${PACKAGE_NAME}@${PACKAGE_VERSION} already exists on npm."
    echo "Bump package.json version before publishing."
    exit 1
  fi

  echo
  echo "[MANUAL RELEASE] ${PACKAGE_NAME}@${PACKAGE_VERSION}"
  echo "For normal releases, use GitHub Actions OIDC instead."
  echo "npm will handle any required 2FA/security-key challenge itself."
  echo "Do not enter old token names such as tar or dsg as OTP values."
  read -r -p "Type YES to publish manually: " CONFIRM
  if [ "$CONFIRM" != "YES" ]; then
    echo "[CANCEL] Publish cancelled"
    exit 0
  fi

  # Do not pass --otp here. npm must select the account's configured
  # second-factor method (including security-key/WebAuthn) itself.
  npm publish --access public
}

logout_interactive() {
  npm logout --registry="$REGISTRY" || true
  echo "[OK] npm interactive session removed where supported by npm."
}

main() {
  ensure_node
  verify_package

  echo "Node: $(node -v)"
  echo "npm:  $(npm -v)"
  echo
  echo "1) Show canonical GitHub Actions OIDC release path"
  echo "2) npm browser login (security key / WebAuthn)"
  echo "3) Check npm whoami"
  echo "4) Test + build + npm pack --dry-run"
  echo "5) Manual publish (bootstrap/fallback only)"
  echo "6) npm logout"
  echo

  read -r -p "Choose: " CHOICE

  case "$CHOICE" in
    1) print_ci_path ;;
    2) login_interactive ;;
    3) npm whoami --registry="$REGISTRY" ;;
    4) verify_release ;;
    5) publish_package ;;
    6) logout_interactive ;;
    *) echo "[BLOCK] Invalid choice"; exit 1 ;;
  esac
}

main "$@"
