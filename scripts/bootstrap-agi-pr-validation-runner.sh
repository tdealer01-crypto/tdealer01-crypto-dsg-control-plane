#!/usr/bin/env bash
set -euo pipefail

required() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "::error::${name}_REQUIRED" >&2
    exit 1
  fi
}

required DSG_GITHUB_AUTOMATION_TOKEN
required AZURE_RESOURCE_GROUP
required TARGET_REPO
required TARGET_BRANCH
required RUNNER_VM_NAME

RUNNER_VM_SIZE="${RUNNER_VM_SIZE:-Standard_B2s}"
RUNNER_ADMIN_USER="${RUNNER_ADMIN_USER:-dsgadmin}"
RUNNER_LABELS="${RUNNER_LABELS:-azure,dsg-pr-validation}"
RUNNER_TTL_MINUTES="${RUNNER_TTL_MINUTES:-120}"

if ! [[ "$TARGET_REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]]; then
  echo '::error::TARGET_REPO_INVALID' >&2
  exit 1
fi
if ! [[ "$TARGET_BRANCH" =~ ^[A-Za-z0-9._/-]+$ ]] || [[ "$TARGET_BRANCH" == *'..'* ]]; then
  echo '::error::TARGET_BRANCH_INVALID' >&2
  exit 1
fi
if ! [[ "$RUNNER_VM_NAME" =~ ^[A-Za-z0-9-]{1,64}$ ]]; then
  echo '::error::RUNNER_VM_NAME_INVALID' >&2
  exit 1
fi
if ! [[ "$RUNNER_TTL_MINUTES" =~ ^[0-9]+$ ]] || (( RUNNER_TTL_MINUTES < 30 || RUNNER_TTL_MINUTES > 360 )); then
  echo '::error::RUNNER_TTL_MINUTES_INVALID' >&2
  exit 1
fi

api() {
  curl --fail --silent --show-error \
    -H "Authorization: Bearer ${DSG_GITHUB_AUTOMATION_TOKEN}" \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    "$@"
}

echo "Resolving target branch ${TARGET_REPO}@${TARGET_BRANCH}..."
ref_json="$(api "https://api.github.com/repos/${TARGET_REPO}/git/ref/heads/${TARGET_BRANCH}")"
TARGET_SHA="$(jq -er '.object.sha' <<<"$ref_json")"
if ! [[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo '::error::TARGET_SHA_INVALID' >&2
  exit 1
fi

echo 'Requesting short-lived repository runner registration token...'
registration_json="$(api -X POST "https://api.github.com/repos/${TARGET_REPO}/actions/runners/registration-token")"
RUNNER_REGISTRATION_TOKEN="$(jq -er '.token' <<<"$registration_json")"
if [[ ${#RUNNER_REGISTRATION_TOKEN} -lt 20 ]]; then
  echo '::error::RUNNER_REGISTRATION_TOKEN_INVALID' >&2
  exit 1
fi

echo 'Resolving official GitHub Actions runner release and digest...'
release_json="$(curl --fail --silent --show-error \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  https://api.github.com/repos/actions/runner/releases/latest)"
asset_json="$(jq -cer '[.assets[] | select(.name | test("^actions-runner-linux-x64-[0-9.]+\\.tar\\.gz$"))][0]' <<<"$release_json")"
RUNNER_ASSET_URL="$(jq -er '.browser_download_url' <<<"$asset_json")"
RUNNER_ASSET_DIGEST="$(jq -er '.digest' <<<"$asset_json")"
if [[ "$RUNNER_ASSET_DIGEST" != sha256:* ]]; then
  echo '::error::RUNNER_ASSET_SHA256_DIGEST_MISSING' >&2
  exit 1
fi
RUNNER_ASSET_SHA256="${RUNNER_ASSET_DIGEST#sha256:}"
if ! [[ "$RUNNER_ASSET_SHA256" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo '::error::RUNNER_ASSET_SHA256_INVALID' >&2
  exit 1
fi

location="$(az group show --name "$AZURE_RESOURCE_GROUP" --query location --output tsv)"
if [[ -z "$location" ]]; then
  echo '::error::AZURE_RESOURCE_GROUP_LOCATION_MISSING' >&2
  exit 1
fi

nic_name="${RUNNER_VM_NAME}-nic"
pip_name="${RUNNER_VM_NAME}-pip"
nsg_name="${RUNNER_VM_NAME}-nsg"

if az vm show --resource-group "$AZURE_RESOURCE_GROUP" --name "$RUNNER_VM_NAME" --only-show-errors --output none 2>/dev/null; then
  purpose="$(az vm show --resource-group "$AZURE_RESOURCE_GROUP" --name "$RUNNER_VM_NAME" --query 'tags.dsgPurpose' --output tsv)"
  target="$(az vm show --resource-group "$AZURE_RESOURCE_GROUP" --name "$RUNNER_VM_NAME" --query 'tags.dsgTargetRepo' --output tsv)"
  if [[ "$purpose" != 'pr-validation' || "$target" != "$TARGET_REPO" ]]; then
    echo '::error::EXISTING_VM_TAG_MISMATCH' >&2
    exit 1
  fi
  echo 'Removing previous governed PR runner VM before deterministic reprovision...'
  az vm delete --resource-group "$AZURE_RESOURCE_GROUP" --name "$RUNNER_VM_NAME" --yes --force-deletion true --only-show-errors
  az network nic delete --resource-group "$AZURE_RESOURCE_GROUP" --name "$nic_name" --only-show-errors 2>/dev/null || true
  az network public-ip delete --resource-group "$AZURE_RESOURCE_GROUP" --name "$pip_name" --only-show-errors 2>/dev/null || true
  az network nsg delete --resource-group "$AZURE_RESOURCE_GROUP" --name "$nsg_name" --only-show-errors 2>/dev/null || true
fi

cloud_init="$(mktemp)"
chmod 600 "$cloud_init"
cat >"$cloud_init" <<EOF
#cloud-config
write_files:
  - path: /usr/local/sbin/dsg-bootstrap-github-runner.sh
    owner: root:root
    permissions: '0700'
    content: |
      #!/usr/bin/env bash
      set -euo pipefail
      export DEBIAN_FRONTEND=noninteractive
      apt-get update
      apt-get install -y --no-install-recommends ca-certificates curl git jq tar docker.io
      systemctl enable --now docker
      id -u ghrunner >/dev/null 2>&1 || useradd --create-home --shell /bin/bash ghrunner
      usermod -aG docker ghrunner
      install -d -o ghrunner -g ghrunner /opt/actions-runner
      cd /opt/actions-runner
      curl --fail --location --silent --show-error '${RUNNER_ASSET_URL}' --output runner.tar.gz
      echo '${RUNNER_ASSET_SHA256}  runner.tar.gz' | sha256sum -c -
      tar xzf runner.tar.gz
      rm -f runner.tar.gz
      ./bin/installdependencies.sh
      chown -R ghrunner:ghrunner /opt/actions-runner
      sudo -u ghrunner ./config.sh --unattended \
        --url 'https://github.com/${TARGET_REPO}' \
        --token '${RUNNER_REGISTRATION_TOKEN}' \
        --name '${RUNNER_VM_NAME}' \
        --labels '${RUNNER_LABELS}' \
        --work '_work' \
        --replace \
        --disableupdate
      ./svc.sh install ghrunner
      ./svc.sh start
      systemctl is-active --quiet "actions.runner.*" || true
      find /var/lib/cloud/instances -maxdepth 2 -type f -name user-data.txt -exec sh -c ': > "\$1"' sh {} \; || true
runcmd:
  - [ bash, /usr/local/sbin/dsg-bootstrap-github-runner.sh ]
EOF

cleanup_local() {
  rm -f "$cloud_init"
}
trap cleanup_local EXIT

echo "Provisioning ${RUNNER_VM_NAME} in ${AZURE_RESOURCE_GROUP}/${location} (${RUNNER_VM_SIZE})..."
az vm create \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$RUNNER_VM_NAME" \
  --location "$location" \
  --image 'Canonical:0001-com-ubuntu-server-jammy:22_04-lts-gen2:latest' \
  --size "$RUNNER_VM_SIZE" \
  --admin-username "$RUNNER_ADMIN_USER" \
  --generate-ssh-keys \
  --public-ip-address "$pip_name" \
  --public-ip-sku Standard \
  --nsg "$nsg_name" \
  --nsg-rule NONE \
  --nic-delete-option Delete \
  --os-disk-delete-option Delete \
  --custom-data "$cloud_init" \
  --tags \
    dsgPurpose=pr-validation \
    dsgTargetRepo="$TARGET_REPO" \
    dsgTargetBranch="$TARGET_BRANCH" \
    dsgHeadSha="$TARGET_SHA" \
    dsgTrustBoundary=pr-validation-no-managed-identity \
  --only-show-errors \
  --output none

# Explicitly prove that no managed identity was attached.
identity_type="$(az vm show --resource-group "$AZURE_RESOURCE_GROUP" --name "$RUNNER_VM_NAME" --query 'identity.type' --output tsv 2>/dev/null || true)"
if [[ -n "$identity_type" && "$identity_type" != 'None' ]]; then
  echo "::error::RUNNER_VM_MANAGED_IDENTITY_PRESENT:${identity_type}" >&2
  exit 1
fi

auto_shutdown="$(date -u -d "+${RUNNER_TTL_MINUTES} minutes" +%H%M)"
az vm auto-shutdown \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$RUNNER_VM_NAME" \
  --time "$auto_shutdown" \
  --only-show-errors \
  --output none

echo "Waiting for GitHub to report runner ${RUNNER_VM_NAME} online..."
deadline=$((SECONDS + 600))
runner_id=''
runner_status=''
while (( SECONDS < deadline )); do
  runners_json="$(api "https://api.github.com/repos/${TARGET_REPO}/actions/runners?per_page=100")"
  runner_id="$(jq -r --arg name "$RUNNER_VM_NAME" '.runners[]? | select(.name == $name) | .id' <<<"$runners_json" | head -n1)"
  runner_status="$(jq -r --arg name "$RUNNER_VM_NAME" '.runners[]? | select(.name == $name) | .status' <<<"$runners_json" | head -n1)"
  if [[ -n "$runner_id" && "$runner_status" == 'online' ]]; then
    break
  fi
  sleep 10
done

if [[ -z "$runner_id" || "$runner_status" != 'online' ]]; then
  echo "::error::RUNNER_ALLOCATION_NOT_ONLINE:name=${RUNNER_VM_NAME},status=${runner_status:-missing}" >&2
  exit 1
fi

echo "RUNNER_REGISTRATION_ONLINE name=${RUNNER_VM_NAME} id=${runner_id} targetSha=${TARGET_SHA} labels=${RUNNER_LABELS}"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "runner_id=${runner_id}"
    echo "runner_name=${RUNNER_VM_NAME}"
    echo "target_sha=${TARGET_SHA}"
    echo "auto_shutdown_utc=${auto_shutdown}"
  } >> "$GITHUB_OUTPUT"
fi
