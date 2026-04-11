#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

# Run this script in Termux (outside proot). It installs Debian via proot-distro,
# then provisions Codex + Multica inside Debian as a non-root user setup.

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

log "Step 1/4: Prepare Termux packages"
pkg update -y
pkg upgrade -y
pkg install -y proot-distro curl

require_cmd proot-distro

log "Step 2/4: Install Debian in proot (skip if already installed)"
if ! proot-distro list | grep -q '^debian'; then
  proot-distro install debian
else
  log "Debian already present, skipping install"
fi

log "Step 3/4: Create Debian bootstrap script"
cat > "$HOME/.termux-debian-codex-multica.sh" <<'DEBIAN_EOF'
#!/usr/bin/env bash
set -euo pipefail

log() {
  printf "\n[%s] %s\n" "$(date '+%H:%M:%S')" "$*"
}

log "Debian: install base dependencies"
apt update
apt install -y curl ca-certificates git xz-utils tar nodejs npm procps

log "Debian: install Codex CLI via npm"
npm install -g @openai/codex
codex --version

log "Debian: configure Codex default settings"
mkdir -p "$HOME/.codex"
cat > "$HOME/.codex/config.toml" <<'CONFIG_EOF'
model = "gpt-5.4"
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

LATEST="$(curl -sI https://github.com/multica-ai/multica/releases/latest | awk -F'/' '/^location:/I{print $NF}' | tr -d '\r\n')"

curl -sL "https://github.com/multica-ai/multica/releases/download/${LATEST}/multica_${OS}_${ARCH}.tar.gz" -o /tmp/multica.tar.gz
tar -xzf /tmp/multica.tar.gz -C /tmp multica
mv /tmp/multica "$HOME/.local/bin/multica"
chmod +x "$HOME/.local/bin/multica"
rm -f /tmp/multica.tar.gz

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

chmod +x "$HOME/.termux-debian-codex-multica.sh"

log "Step 4/4: Execute bootstrap inside Debian"
proot-distro login debian -- /bin/bash -lc '$HOME/.termux-debian-codex-multica.sh'

log "Done. Enter Debian with: proot-distro login debian"
