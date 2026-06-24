#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

AUDIT_TOKEN="${1:?auditToken required (gat_...)}"
ORG_ID="${2:?orgId required}"
DOMAIN="${3:-https://tdealer01-crypto-dsg-control-plane.vercel.app}"
REVIEWER_ID="${4:-cli-reviewer-001}"
REVIEWER_ROLE="${5:-finance_approver}"

echo "=== Pending approvals ==="
curl -s -H "x-org-id:${ORG_ID}" "${DOMAIN}/api/gateway/approvals?orgId=${ORG_ID}" | head -c 600 || true
echo ""

echo "=== Approving ${AUDIT_TOKEN} ==="
APPROVAL_RESPONSE=$(curl -s -X POST "${DOMAIN}/api/gateway/approvals" \
  -H "Content-Type: application/json" \
  -H "x-org-id: ${ORG_ID}" \
  -H "x-reviewer-id: ${REVIEWER_ID}" \
  -H "x-reviewer-role: ${REVIEWER_ROLE}" \
  -d "{\"orgId\":\"${ORG_ID}\",\"auditToken\":\"${AUDIT_TOKEN}\",\"decision\":\"approved\",\"note\":\"approved via CLI\"}")

echo "${APPROVAL_RESPONSE}" | head -c 400
echo ""

APPROVAL_TOKEN=$(echo "${APPROVAL_RESPONSE}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('approvalToken',''))" 2>/dev/null || true)

if [ -z "${APPROVAL_TOKEN}" ]; then
  echo "No approvalToken returned — inspect JSON above"
  exit 1
fi

echo "=== approvalToken: ${APPROVAL_TOKEN} ==="
echo "=== Retry execute with: ==="
cat <<EOS
curl -X POST "${DOMAIN}/api/gateway/tools/execute" \\
  -H "content-type: application/json" \\
  -H "x-org-id: ${ORG_ID}" \\
  -H "x-actor-id: agent-001" \\
  -H "x-actor-role: agent_operator" \\
  -H "x-org-plan: enterprise" \\
  -H "x-approval-token: ${APPROVAL_TOKEN}" \\
  -d '{"toolName":"...","action":"...","input":{...}}'
EOS
