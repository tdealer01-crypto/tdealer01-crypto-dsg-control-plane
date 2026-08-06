# Termux + Codex + Multica: Status and Planning (Practical Path)

Last updated: 2026-04-11

## Current status

- Recommended architecture is confirmed as:
  - **Termux host** → `proot-distro` → **Debian guest** → install **Codex CLI** + **Multica CLI/daemon**.
- A runnable bootstrap script is now available at:
  - `scripts/termux-proot-codex-multica-setup.sh`
- Script scope:
  - prepares Termux packages
  - installs Debian if missing
  - installs Codex (npm) and Multica (release tarball) inside Debian
  - writes baseline `~/.codex/config.toml`
  - prints next-step login/daemon commands

## Execution plan (talk-through before production rollout)

### Phase 1 — Environment bootstrap (owner: operator)

1. Run from Termux:

```bash
bash scripts/termux-proot-codex-multica-setup.sh
```

2. Success criteria:
   - `codex --version` returns version in Debian
   - `multica version` returns version in Debian

### Phase 2 — Authentication and runtime wiring

1. In Debian:

```bash
codex login --device-auth
multica login --token
multica daemon start
multica daemon status
```

2. If Codex is not detected by daemon:

```bash
export MULTICA_CODEX_PATH="$(which codex)"
multica daemon start --foreground
```

3. Success criteria:
   - daemon status reports healthy runtime
   - Codex runtime appears in detected/registered agents

### Phase 3 — Functional smoke test

1. Create test project and run Codex task:

```bash
mkdir -p ~/work/test-agent
cd ~/work/test-agent
git init
printf 'def add(a,b):\n    return a-b\n' > app.py
codex
```

2. Prompt:

```text
Fix the bug in app.py and add a simple test.
```

3. Success criteria:
   - generated patch changes subtraction to addition
   - basic test added and passes locally

## Risk register and fallback

1. **npm/node too old in Debian image**
   - fallback: install Codex binary release into `~/.local/bin/codex`
2. **OAuth callback issues in headless environment**
   - fallback: `codex login --device-auth` and `multica login --token`
3. **daemon cannot find codex on PATH**
   - fallback: set `MULTICA_CODEX_PATH`

## Operational notes

- Keep installs in user space (`~/.local/bin`) to avoid `sudo` assumptions.
- Re-run script safely: Debian install is skipped if already present.
- Use `multica daemon start --foreground` when collecting logs for troubleshooting.

## Merge decision (current recommendation)

**Recommendation: ยังไม่ merge ทันที** จนกว่าจะผ่าน "device validation" บนมือถือจริงอย่างน้อย 1 เครื่อง (Android ARM64 + Termux + Debian proot) ตามเกณฑ์ด้านล่าง

### Merge gate (ต้องผ่านก่อน merge)

1. Bootstrap ผ่านครบโดยไม่แก้สคริปต์หน้างาน
   - `bash scripts/termux-proot-codex-multica-setup.sh`
2. Auth ผ่านทั้งสองฝั่ง
   - `codex login --device-auth` สำเร็จ
   - `multica login --token` สำเร็จ
3. Runtime พร้อมใช้งาน
   - `multica daemon status` ต้องเห็น runtime สุขภาพปกติ
4. End-to-end smoke task สำเร็จ
   - Codex แก้ bug ตัวอย่าง + เพิ่ม test ได้จริง

ถ้ายังไม่ผ่านครบ 4 ข้อนี้ ให้ถือเป็น **No-Go** และค้างที่สถานะ review/iterate ก่อน
