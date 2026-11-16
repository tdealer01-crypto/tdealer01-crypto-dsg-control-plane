#!/bin/sh
# Reproducible, scoped AWS SSM CI for public DSG Claude Code packaging.
# Requires one exact 40-character Git SHA and an isolated Linux runner.
# Does NOT deploy production, authenticate as an end user or create AWS resources.
set -eu

SOURCE_SHA="${1:-}"
case "$SOURCE_SHA" in
  ''|*[!0-9a-f]*) echo "FAIL: supply a lowercase full 40-character Git commit SHA" >&2; exit 2 ;;
esac
if [ "${#SOURCE_SHA}" -ne 40 ]; then
  echo "FAIL: expected a full 40-character Git commit SHA" >&2
  exit 2
fi

for dependency in git curl tar sha256sum grep mktemp; do
  command -v "$dependency" >/dev/null 2>&1 || {
    echo "BLOCKED: missing $dependency" >&2
    exit 3
  }
done

WORKDIR="$(mktemp -d /tmp/dsg-aws-claude-ci-XXXXXXXX)"
trap 'rm -rf "$WORKDIR"' 0
trap 'exit 130' 1 2 3 15
cd "$WORKDIR"

NODE_VERSION=v22.16.0
NODE_TARBALL="node-${NODE_VERSION}-linux-x64.tar.xz"
NODE_DIST="https://nodejs.org/dist/${NODE_VERSION}"
curl -fLsS --retry 2 --max-time 60 "${NODE_DIST}/SHASUMS256.txt" -o SHASUMS256.txt
grep " ${NODE_TARBALL}$" SHASUMS256.txt > SELECTED_SHA256
test -s SELECTED_SHA256
curl -fLsS --retry 2 --max-time 120 "${NODE_DIST}/${NODE_TARBALL}" -o "${NODE_TARBALL}"
sha256sum -c SELECTED_SHA256
tar -xJf "${NODE_TARBALL}"
NODE="$WORKDIR/node-${NODE_VERSION}-linux-x64/bin/node"
"$NODE" --version

mkdir src
cd src
git init -q
git -c http.version=HTTP/1.1 fetch --quiet --depth 1 \
  https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git "$SOURCE_SHA"
git checkout --quiet --detach FETCH_HEAD
ACTUAL_SHA="$(git rev-parse HEAD)"
printf 'SOURCE_SHA=%s\n' "$ACTUAL_SHA"
test "$ACTUAL_SHA" = "$SOURCE_SHA"

printf 'CHECK=claude-marketplace\n'
"$NODE" scripts/verify-claude-marketplace.mjs

printf 'CHECK=dsg-governance-scoped-package\n'
"$NODE" scripts/verify-dsg-governance-plugin.mjs

printf 'AWS_SSM_CI_RESULT=PASS\n'
printf 'EVIDENCE_SCOPE=offline-package-only\n'
printf 'NOT_TESTED=Claude-CLI-install,OAuth,approvals,governed-execute,production-evidence\n'
