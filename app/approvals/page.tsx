import Link from "next/link";
import { listPendingGatewayApprovals } from "../../lib/gateway/approvals";

export const dynamic = "force-dynamic";

type SearchParams = {
  orgId?: string;
  lastDecision?: string;
  approvalHash?: string;
};

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const orgId = params.orgId?.trim() || "org-smoke";
  const result = await listPendingGatewayApprovals(orgId);
  const approvals = result.ok ? result.approvals : [];
  const lastDecision = params.lastDecision?.trim();
  const approvalHash = params.approvalHash?.trim();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Approval Workflow</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
            Review queue for governed AI actions
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            DSG routes high-risk or approval-required actions to review before execution. This page is actionable: reviewers can approve or reject pending actions and DSG records an approval hash as workflow evidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/ai-compliance" className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black">Back to AI compliance</Link>
            <Link href={`/api/gateway/approvals?orgId=${orgId}`} className="rounded-xl border border-amber-300/50 px-5 py-3 font-bold text-amber-100">Open approvals JSON</Link>
            <Link href="/controls" className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-slate-200">View controls</Link>
          </div>
        </section>

        {lastDecision ? (
          <section className="mt-8 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
            <h2 className="text-xl font-bold text-emerald-100">Decision saved</h2>
            <p className="mt-2 break-all text-slate-300">
              Last decision: <span className="font-bold text-emerald-200">{lastDecision}</span>{approvalHash ? ` · approvalHash: ${approvalHash}` : ""}
            </p>
          </section>
        ) : null}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Organization</p>
            <p className="mt-2 text-2xl font-bold text-white">{orgId}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Pending approvals</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{approvals.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Working action</p>
            <p className="mt-2 text-lg font-bold text-white">Approve / Reject buttons</p>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          {approvals.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-2xl font-bold text-white">No pending approval events</h2>
              <p className="mt-3 leading-7 text-slate-300">
                There are currently no DSG monitor events with decision = review for this organization. Open the JSON endpoint to verify the queue state or run a review-required plan-check to create a pending item.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/api/gateway/approvals?orgId=${orgId}`} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black">Verify queue JSON</Link>
                <Link href="/gateway/monitor?orgId=org-smoke" className="rounded-xl border border-amber-300/40 px-4 py-2 text-sm font-bold text-amber-100">Open monitor flow</Link>
              </div>
            </div>
          ) : (
            approvals.map((approval: any) => (
              <article key={approval.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-white">{approval.tool_name} / {approval.action}</h2>
                  <span className="rounded-full bg-amber-400/10 px-3 py-1 text-sm font-bold text-amber-300">review required</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Actor</p>
                    <p className="mt-1 font-semibold text-amber-100">{approval.actor_id}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Role</p>
                    <p className="mt-1 font-semibold text-amber-100">{approval.actor_role}</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm text-slate-400">Risk</p>
                    <p className="mt-1 font-semibold text-amber-100">{approval.risk ?? "unknown"}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Audit token</p>
                  <p className="mt-1 break-all font-mono text-sm text-slate-200">{approval.audit_token}</p>
                </div>
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-sm text-slate-400">Request hash</p>
                  <p className="mt-1 break-all font-mono text-sm text-slate-200">{approval.request_hash}</p>
                </div>

                <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4">
                  <h3 className="font-bold text-amber-100">Reviewer action</h3>
                  <p className="mt-2 text-sm text-slate-300">These buttons call the approval API and record an approvalHash.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <form method="post" action="/api/gateway/approvals">
                      <input type="hidden" name="orgId" value={orgId} />
                      <input type="hidden" name="auditToken" value={approval.audit_token} />
                      <input type="hidden" name="decision" value="approved" />
                      <input type="hidden" name="reviewerId" value="reviewer-ui" />
                      <input type="hidden" name="reviewerRole" value="finance_approver" />
                      <input type="hidden" name="note" value="approved from DSG approval queue" />
                      <input type="hidden" name="redirectTo" value={`/approvals?orgId=${orgId}`} />
                      <button type="submit" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-black">Approve</button>
                    </form>
                    <form method="post" action="/api/gateway/approvals">
                      <input type="hidden" name="orgId" value={orgId} />
                      <input type="hidden" name="auditToken" value={approval.audit_token} />
                      <input type="hidden" name="decision" value="rejected" />
                      <input type="hidden" name="reviewerId" value="reviewer-ui" />
                      <input type="hidden" name="reviewerRole" value="finance_approver" />
                      <input type="hidden" name="note" value="rejected from DSG approval queue" />
                      <input type="hidden" name="redirectTo" value={`/approvals?orgId=${orgId}`} />
                      <button type="submit" className="rounded-xl bg-rose-400 px-4 py-2 text-sm font-bold text-black">Reject</button>
                    </form>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-bold">Decision API example</h2>
          <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{`curl -X POST https://your-domain.com/api/gateway/approvals \\
  -H "Content-Type: application/json" \\
  -H "x-reviewer-id: reviewer-001" \\
  -H "x-reviewer-role: finance_approver" \\
  -d '{
    "orgId": "${orgId}",
    "auditToken": "gat_example",
    "decision": "approved",
    "note": "approved for controlled pilot"
  }'`}</pre>
        </section>

        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6">
          <h2 className="text-2xl font-bold">Boundary</h2>
          <p className="mt-3 leading-7 text-slate-300">
            Approval queue decisions are DSG-generated workflow evidence. They are not independent third-party certification or guaranteed compliance claims.
          </p>
        </section>
      </div>
    </main>
  );
}
