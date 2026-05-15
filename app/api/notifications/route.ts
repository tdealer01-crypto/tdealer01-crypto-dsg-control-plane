import { NextRequest, NextResponse } from 'next/server';

type NotifType =
  | 'gate.evaluated'
  | 'approval.required'
  | 'deployment.ready'
  | 'agent.failed'
  | 'billing.alert';

type Notification = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  relativeTime: string;
  read: boolean;
  createdAt: string;
};

const notifications: Notification[] = [
  { id: 'n01', type: 'approval.required', title: 'Action needs human review', body: 'Agent agt_007 requested approval for wire_transfer ($84,000) — policy P-14 requires review over $50k.', relativeTime: '2 min ago', read: false, createdAt: '2025-05-15T09:58:00Z' },
  { id: 'n02', type: 'gate.evaluated', title: 'Gate evaluated: BLOCK', body: 'Gate gt_finance_limit blocked action approve_invoice for agent agt_003. Limit policy exceeded.', relativeTime: '11 min ago', read: false, createdAt: '2025-05-15T09:49:00Z' },
  { id: 'n03', type: 'deployment.ready', title: 'Deployment go/no-go ready', body: 'Release v2.4.1 passed all governance gates. Deployment is cleared for production.', relativeTime: '34 min ago', read: false, createdAt: '2025-05-15T09:26:00Z' },
  { id: 'n04', type: 'agent.failed', title: 'Agent governance exception', body: 'Agent agt_005 (compliance_scan) failed with POLICY_VIOLATION: action export_data blocked by rule R-88.', relativeTime: '1 hr ago', read: false, createdAt: '2025-05-15T09:00:00Z' },
  { id: 'n05', type: 'gate.evaluated', title: 'Gate evaluated: PASS', body: 'Gate gt_pii_check passed for agent agt_002 action read_customer_profile. No violations.', relativeTime: '1 hr ago', read: true, createdAt: '2025-05-15T08:55:00Z' },
  { id: 'n06', type: 'billing.alert', title: 'Approaching monthly gate limit', body: 'Your org has used 87% of the 10,000 gate evaluations included in the Pro plan. Upgrade to avoid throttling.', relativeTime: '3 hr ago', read: false, createdAt: '2025-05-15T07:00:00Z' },
  { id: 'n07', type: 'approval.required', title: 'Pending approval: delete_records', body: 'Agent agt_009 is awaiting approval to execute delete_records on table customer_pii. Assigned to compliance team.', relativeTime: '4 hr ago', read: true, createdAt: '2025-05-15T06:00:00Z' },
  { id: 'n08', type: 'gate.evaluated', title: 'Gate evaluated: REVIEW', body: 'Gate gt_cross_border flagged action send_payment_abroad for agent agt_001 — routed to compliance reviewer.', relativeTime: '5 hr ago', read: true, createdAt: '2025-05-15T05:00:00Z' },
  { id: 'n09', type: 'deployment.ready', title: 'Deployment blocked: governance check failed', body: 'Release v2.4.0 failed gate gt_production_readiness. 2 actions lack required audit proofs.', relativeTime: '6 hr ago', read: true, createdAt: '2025-05-15T04:00:00Z' },
  { id: 'n10', type: 'agent.failed', title: 'Agent governance exception', body: 'Agent agt_011 (invoice_automation) exceeded max retries after 3 BLOCK decisions. Task paused.', relativeTime: '8 hr ago', read: true, createdAt: '2025-05-15T02:00:00Z' },
  { id: 'n11', type: 'gate.evaluated', title: 'Gate evaluated: PASS', body: 'Gate gt_soc2_evidence passed for agent agt_004. All required evidence fields present.', relativeTime: '10 hr ago', read: true, createdAt: '2025-05-15T00:00:00Z' },
  { id: 'n12', type: 'billing.alert', title: 'Invoice generated', body: 'Invoice INV-2025-05 for $1,240.00 (Pro plan + 3,200 overage gate evaluations) is ready.', relativeTime: '1 day ago', read: true, createdAt: '2025-05-14T10:00:00Z' },
  { id: 'n13', type: 'approval.required', title: 'Action needs human review', body: 'Agent agt_006 requested approval for bulk_export — 12,000 records flagged for PII review by DLP policy.', relativeTime: '1 day ago', read: true, createdAt: '2025-05-14T08:00:00Z' },
  { id: 'n14', type: 'gate.evaluated', title: 'Gate evaluated: BLOCK', body: 'Gate gt_vendor_access blocked agent agt_008 from calling external vendor API. Allowlist violation.', relativeTime: '2 days ago', read: true, createdAt: '2025-05-13T12:00:00Z' },
  { id: 'n15', type: 'deployment.ready', title: 'Deployment go/no-go ready', body: 'Release v2.3.9 cleared all pre-deployment gates. Governance proof exported to audit log.', relativeTime: '2 days ago', read: true, createdAt: '2025-05-13T10:00:00Z' },
];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const limit = parseInt(url.searchParams.get('limit') ?? '15', 10);
  const unreadOnly = url.searchParams.get('unread') === 'true';

  let filtered = unreadOnly ? notifications.filter((n) => !n.read) : notifications;
  const total = filtered.length;
  const start = (page - 1) * limit;
  filtered = filtered.slice(start, start + limit);

  return NextResponse.json({
    notifications: filtered,
    total,
    page,
    limit,
    unread: notifications.filter((n) => !n.read).length,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();

  // Mark individual IDs as read, or markAll
  if (body.markAll) {
    notifications.forEach((n) => { n.read = true; });
    return NextResponse.json({ updated: notifications.length });
  }

  if (!Array.isArray(body.ids)) {
    return NextResponse.json({ error: 'ids must be an array or pass markAll: true' }, { status: 400 });
  }

  let count = 0;
  for (const n of notifications) {
    if (body.ids.includes(n.id)) {
      n.read = true;
      count++;
    }
  }

  return NextResponse.json({ updated: count });
}
