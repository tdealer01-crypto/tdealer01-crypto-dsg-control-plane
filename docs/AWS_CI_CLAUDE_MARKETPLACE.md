# DSG Claude Marketplace — AWS SSM package CI

**Current execution path:** AWS Systems Manager `AWS-RunShellScript` on the existing isolated `dsg-linux-desktop` instance. This is **manually/agent-triggered AWS SSM CI**, **not** a configured CodeBuild or CodePipeline service. Do not call it an automatically triggered PR CI pipeline.

## Scope

Validate the public six-plugin Marketplace Manifest and scoped AWS Spacetime client package without GitHub Actions. Use the pinned, exact commit SHA so results cannot accidentally be attributed to a newer or older revision.

- Region: `us-east-1`.
- Existing eligible isolated host at validation time (2026-11-16): `i-04fed6400afc741b2` (`dsg-linux-desktop`, Ubuntu 24.04).
- **Do not use** the production Spacetime host (`i-01a2ee90890a558c3`) for this CI task.
- Keep output in AWS SSM Command Invocation (status, exit code, stdout, stderr, command ID). Do not upload secrets, modify runtime state, install packages globally, or declare production PASS.

## Repeatable invocation

The caller/agent first verifies the intended GitHub commit SHA with the GitHub connector. On the isolated SSM-managed host, run a short bootstrap using `AWS-RunShellScript` with an explicit `SOURCE_SHA`:

```sh
set -eu
SOURCE_SHA='<full 40-character Git commit SHA from GitHub>'
TMP="$(mktemp -d /tmp/dsg-aws-ci-bootstrap-XXXXXXXX)"
trap 'rm -rf "$TMP"' 0
cd "$TMP"
git init -q
git -c http.version=HTTP/1.1 fetch --quiet --depth 1 \
  https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git "$SOURCE_SHA"
git checkout --quiet --detach FETCH_HEAD
test "$(git rev-parse HEAD)" = "$SOURCE_SHA"
sh scripts/aws-ci/verify-claude-marketplace.sh "$SOURCE_SHA"
```

The nested script uses a different temporary directory and always removes its own temporary checkout. It downloads an official Linux x64 Node.js release into its temporary directory, checks SHA-256 against the official `SHASUMS256.txt`, fetches the exact source commit, and runs:

```sh
node scripts/verify-claude-marketplace.mjs
node scripts/verify-dsg-governance-plugin.mjs
```

The main script uses no `npm install`, writes no repository secrets, and leaves no persistent runtime code on the host.

## PASS gate

A valid SSM execution record must contain all of:

1. `Status=Success` and `ResponseCode=0`.
2. Exact `SOURCE_SHA=<expected_sha>` printed by the nested script.
3. `node-v22.16.0-linux-x64.tar.xz: OK` after SHA-256 validation.
4. Both checked Node scripts emit their actual `PASS` outputs.
5. `AWS_SSM_CI_RESULT=PASS`.

If the command, fetch, checksum, or tests fail, report **FAIL** with the SSM Command ID and the observed stderr. A pending/unavailable SSM run is **BLOCKED** (not PASS). Never claim that a previous commit validates the current commit without re-checking changed inputs.

## Truth boundary and next gates

This workflow proves **offline packaging checks only**. It **does not** test the Claude CLI clean install, marketplace provider re-sync, the OAuth principal, permission delegation, owner approval, live execution, or verified production receipts. For those use the separate authorized runtime validation route and preserve its exact Evidence ID, source SHA and decision.

Github Actions failures, Vercel deployment-blocked checks and an SSM package PASS are distinct facts. Do not infer any production deployment or end-to-end success from this CI run.

**Cost boundary:** Uses existing SSM/EC2 only; creates no new CodeBuild/CodePipeline/EC2 project or machine and schedules no recurring jobs. Existing EC2 runtime charges still apply.
