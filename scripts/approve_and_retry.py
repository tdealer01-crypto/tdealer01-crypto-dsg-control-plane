#!/data/data/com.termux/files/usr/bin/python3
import sys
import json
import urllib.request

if len(sys.argv) < 4:
    print("Usage: scripts/approve_and_retry.py <auditToken> <orgId> <domain> [reviewerId] [reviewerRole]")
    print("Example: scripts/approve_and_retry.py gat_example org-smoke https://tdealer01-crypto-dsg-control-plane.vercel.app")
    sys.exit(1)

audit_token = sys.argv[1]
org_id = sys.argv[2]
domain = sys.argv[3].rstrip("/")
reviewer_id = sys.argv[4] if len(sys.argv) > 4 else "cli-reviewer-001"
reviewer_role = sys.argv[5] if len(sys.argv) > 5 else "finance_approver"


def api(method, path, body=None, extra_headers=None):
    url = f"{domain}{path}"
    headers = {"Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


print(f"=== Pending approvals for {org_id} ===")
pending = api("GET", f"/api/gateway/approvals?orgId={org_id}", extra_headers={"x-org-id": org_id})
print(json.dumps(pending, indent=2)[:1200])

print(f"\n=== Approving auditToken={audit_token} ===")
approval = api(
    "POST",
    "/api/gateway/approvals",
    body={
        "orgId": org_id,
        "auditToken": audit_token,
        "decision": "approved",
        "note": "approved via CLI helper",
    },
    extra_headers={
        "x-org-id": org_id,
        "x-reviewer-id": reviewer_id,
        "x-reviewer-role": reviewer_role,
    },
)
print(json.dumps(approval, indent=2)[:600])

approval_token = ((approval or {}).get("approvalToken") or "").strip()
if not approval_token:
    print("\nERROR: no approvalToken returned")
    sys.exit(2)

print(f"\n=== approvalToken: {approval_token} ===")
print("=== Retry execute with: ===")
print(
    f"curl -X POST '{domain}/api/gateway/tools/execute' \\\n"
    + '  -H "content-type: application/json" \\\n'
    + f'  -H "x-org-id: {org_id}" \\\n'
    + '  -H "x-actor-id: agent-001" \\\n'
    + '  -H "x-actor-role: agent_operator" \\\n'
    + '  -H "x-org-plan: enterprise" \\\n'
    + f'  -H "x-approval-token: {approval_token}" \\\n'
    + '  -d \'{"toolName":"...","action":"...","input":{...}}\''
)
