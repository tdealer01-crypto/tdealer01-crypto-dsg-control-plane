#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# Run in Termux (outside proot).
# Provisions Debian + Codex + Multica with optional fast-path toggles.
#
# Speed toggles:
# - TERMUX_SETUP_SKIP_UPGRADE=1 (default): skip `pkg upgrade` for faster bootstrap
# - TERMUX_SETUP_FORCE_UPGRADE=1: run `pkg upgrade -y`
# - TERMUX_SETUP_FORCE_REINSTALL=1: reinstall Codex/Multica even if present

log() {
  printf "\n[%s] %s\n" "$(date '+%H:%M:%S')" "$*"
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || {
    printf "ERROR: missing command: %s\n" "$cmd" >&2
    exit 1
  }
}

TERMUX_SETUP_SKIP_UPGRADE="${TERMUX_SETUP_SKIP_UPGRADE:-1}"
TERMUX_SETUP_FORCE_UPGRADE="${TERMUX_SETUP_FORCE_UPGRADE:-0}"
TERMUX_SETUP_FORCE_REINSTALL="${TERMUX_SETUP_FORCE_REINSTALL:-0}"

log "Step 1/4: Prepare Termux packages"
pkg update -y
if [[ "$TERMUX_SETUP_FORCE_UPGRADE" == "1" || "$TERMUX_SETUP_SKIP_UPGRADE" != "1" ]]; then
  log "Running pkg upgrade (forced)"
  pkg upgrade -y
else
  log "Skipping pkg upgrade for faster bootstrap (set TERMUX_SETUP_FORCE_UPGRADE=1 to enable)"
fi
pkg install -y proot-distro curl

require_cmd proot-distro

log "Step 2/4: Install Debian in proot (skip if already installed)"
if ! proot-distro list | grep -q '^debian'; then
  proot-distro install debian
else
  log "Debian already present, skipping install"
fi

DEBIAN_SCRIPT="$HOME/.termux-debian-codex-multica.sh"

log "Step 3/4: Create Debian bootstrap script at $DEBIAN_SCRIPT"
cat > "$DEBIAN_SCRIPT" <<'DEBIAN_EOF'
#!/usr/bin/env bash
set -euo pipefail

log() {
  printf "\n[%s] %s\n" "$(date '+%H:%M:%S')" "$*"
}

FORCE_REINSTALL="${TERMUX_SETUP_FORCE_REINSTALL:-0}"
export DEBIAN_FRONTEND=noninteractive

log "Debian: install base dependencies"
apt update
apt install -y --no-install-recommends curl ca-certificates git xz-utils tar nodejs npm procps

log "Debian: install Codex CLI"
if command -v codex >/dev/null 2>&1 && [[ "$FORCE_REINSTALL" != "1" ]]; then
  log "Codex already installed, skipping (set TERMUX_SETUP_FORCE_REINSTALL=1 to reinstall)"
else
  npm install -g @openai/codex
fi
codex --version

log "Debian: configure Codex default settings"
mkdir -p "$HOME/.codex"
cat > "$HOME/.codex/config.toml" <<'CONFIG_EOF'
model = "gpt-5.3-codex"
approval_policy = "on-request"
CONFIG_EOF

log "Debian: install Multica CLI to ~/.local/bin"
mkdir -p "$HOME/.local/bin"
OS=linux
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64) ARCH="arm64" ;;
  *)
    printf "Unsupported architecture: %s\n" "$ARCH" >&2
    exit 1
    ;;
esac

if command -v multica >/dev/null 2>&1 && [[ "$FORCE_REINSTALL" != "1" ]]; then
  log "Multica already installed, skipping download (set TERMUX_SETUP_FORCE_REINSTALL=1 to reinstall)"
else
  LATEST="$(
    curl -fsSLI https://github.com/multica-ai/multica/releases/latest \
      | awk -F'/' '/^location:/I{print $NF}' \
      | tr -d '\r\n'
  )"

  if [[ -z "$LATEST" ]]; then
    printf "ERROR: failed to resolve latest Multica release tag\n" >&2
    exit 1
  fi

  curl -fsSL "https://github.com/multica-ai/multica/releases/download/${LATEST}/multica_${OS}_${ARCH}.tar.gz" -o /tmp/multica.tar.gz
  tar -xzf /tmp/multica.tar.gz -C /tmp multica
  install -m 0755 /tmp/multica "$HOME/.local/bin/multica"
  rm -f /tmp/multica /tmp/multica.tar.gz
fi

grep -q 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc" || \
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"

export PATH="$HOME/.local/bin:$PATH"
multica version

cat <<'NEXT_STEPS'

Setup complete.
Next steps (run manually in Debian):
  1) codex login --device-auth
  2) multica login --token
  3) multica daemon start
  4) multica daemon status

If Codex is not detected:
  export MULTICA_CODEX_PATH="$(which codex)"
  multica daemon start --foreground
NEXT_STEPS
DEBIAN_EOF

chmod +x "$DEBIAN_SCRIPT"

log "Step 4/4: Execute bootstrap inside Debian"
proot-distro login debian -- /bin/bash -lc "TERMUX_SETUP_FORCE_REINSTALL='${TERMUX_SETUP_FORCE_REINSTALL}' '$DEBIAN_SCRIPT'"

log "Done. Enter Debian with: proot-distro login debian"
