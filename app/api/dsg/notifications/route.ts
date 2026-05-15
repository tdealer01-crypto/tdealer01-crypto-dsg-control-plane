import { NextResponse } from 'next/server';

export type NotificationType = 'BUILD_COMPLETE' | 'BUILD_FAILED' | 'GOVERNANCE' | 'APPROVAL' | 'SYSTEM';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  relativeTime: string;
  read: boolean;
};

// In-memory store (resets on cold start — fine for demo)
let NOTIFICATIONS: Notification[] = [
  { id: 'n20', type: 'BUILD_COMPLETE', title: 'Payments Portal v1.4.2 deployed', body: 'Build completed successfully and is now live on production.', timestamp: '2026-05-15T10:00:00Z', relativeTime: '2 hours ago', read: false },
  { id: 'n19', type: 'GOVERNANCE', title: 'Policy gate triggered on Auth Service', body: 'RBAC rule blocked an unapproved tool call. Review the audit log.', timestamp: '2026-05-15T09:30:00Z', relativeTime: '3 hours ago', read: false },
  { id: 'n18', type: 'APPROVAL', title: 'Approval required: CRM Dashboard v1.3.9', body: 'A build is awaiting your review before it can proceed to staging.', timestamp: '2026-05-15T08:00:00Z', relativeTime: '4 hours ago', read: false },
  { id: 'n17', type: 'BUILD_FAILED', title: 'Auth Service v1.3.9 build failed', body: 'Missing env var OAUTH_CLIENT_SECRET caused the build to fail.', timestamp: '2026-05-14T22:00:00Z', relativeTime: 'yesterday', read: false },
  { id: 'n16', type: 'BUILD_COMPLETE', title: 'CRM Dashboard v1.4.0 deployed', body: 'New chart components shipped. All smoke tests passed.', timestamp: '2026-05-14T16:30:00Z', relativeTime: 'yesterday', read: false },
  { id: 'n15', type: 'SYSTEM', title: 'Scheduled maintenance in 24 hours', body: 'The DSG runtime will be unavailable on May 16 from 02:00–03:00 UTC.', timestamp: '2026-05-14T12:00:00Z', relativeTime: 'yesterday', read: true },
  { id: 'n14', type: 'GOVERNANCE', title: 'Weekly governance digest ready', body: '3 policy violations and 1 override recorded this week.', timestamp: '2026-05-14T09:00:00Z', relativeTime: 'yesterday', read: true },
  { id: 'n13', type: 'BUILD_COMPLETE', title: 'Auth Service v1.3.8 deployed', body: 'Auth redirect fix is live. No regressions detected.', timestamp: '2026-05-13T14:00:00Z', relativeTime: '2 days ago', read: true },
  { id: 'n12', type: 'APPROVAL', title: 'Approval required: Inventory Manager bulk import', body: 'CSV pipeline needs security review before enabling in production.', timestamp: '2026-05-12T11:30:00Z', relativeTime: '3 days ago', read: false },
  { id: 'n11', type: 'BUILD_COMPLETE', title: 'Inventory Manager v1.3.7 build started', body: 'Build is queued and processing. ETA: ~3 minutes.', timestamp: '2026-05-12T10:45:00Z', relativeTime: '3 days ago', read: true },
  { id: 'n10', type: 'BUILD_COMPLETE', title: 'Analytics Hub v1.3.5 deployed', body: 'Cohort retention chart is now available on the analytics dashboard.', timestamp: '2026-05-11T08:30:00Z', relativeTime: '4 days ago', read: true },
  { id: 'n09', type: 'BUILD_FAILED', title: 'Analytics Hub v1.3.2 build failed', body: 'D3 v8 breaking change caused chart rendering errors. Reverting.', timestamp: '2026-05-08T20:00:00Z', relativeTime: '7 days ago', read: true },
  { id: 'n08', type: 'GOVERNANCE', title: 'New compliance rule applied', body: 'PII masking policy is now enforced across all data pipeline tools.', timestamp: '2026-05-08T15:00:00Z', relativeTime: '7 days ago', read: true },
  { id: 'n07', type: 'BUILD_COMPLETE', title: 'Support Inbox v1.3.1 deployed', body: 'Slack thread sync for support tickets is now live.', timestamp: '2026-05-07T09:30:00Z', relativeTime: '8 days ago', read: true },
  { id: 'n06', type: 'SYSTEM', title: 'Billing cycle renewed', body: 'Your Pro plan has been renewed. Next billing date: June 15, 2026.', timestamp: '2026-05-07T08:00:00Z', relativeTime: '8 days ago', read: true },
  { id: 'n05', type: 'APPROVAL', title: 'Approval required: Support Inbox email pipeline', body: 'New inbound email integration needs owner sign-off.', timestamp: '2026-05-05T15:00:00Z', relativeTime: '10 days ago', read: true },
  { id: 'n04', type: 'BUILD_COMPLETE', title: 'Support Inbox v1.2.0 deployed', body: 'Initial email-to-ticket pipeline is live and processing messages.', timestamp: '2026-05-05T14:00:00Z', relativeTime: '10 days ago', read: true },
  { id: 'n03', type: 'GOVERNANCE', title: 'RBAC audit completed', body: '12 users reviewed. 2 excess permissions revoked automatically.', timestamp: '2026-05-03T10:00:00Z', relativeTime: '12 days ago', read: true },
  { id: 'n02', type: 'BUILD_COMPLETE', title: 'Auth Service v1.1.0 deployed', body: 'RBAC layer shipped. All permission matrix tests passed.', timestamp: '2026-05-02T11:00:00Z', relativeTime: '13 days ago', read: true },
  { id: 'n01', type: 'SYSTEM', title: 'Welcome to DSG One', body: 'Your workspace is ready. Start building your first app in the App Builder.', timestamp: '2026-04-28T09:00:00Z', relativeTime: '17 days ago', read: true },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') ?? 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage = 20;

    let filtered = NOTIFICATIONS;
    if (filter === 'UNREAD') filtered = filtered.filter((n) => !n.read);
    else if (filter === 'BUILDS') filtered = filtered.filter((n) => n.type === 'BUILD_COMPLETE' || n.type === 'BUILD_FAILED');
    else if (filter === 'GOVERNANCE') filtered = filtered.filter((n) => n.type === 'GOVERNANCE');
    else if (filter === 'SYSTEM') filtered = filtered.filter((n) => n.type === 'SYSTEM' || n.type === 'APPROVAL');

    const total = filtered.length;
    const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;
    const items = filtered.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({ ok: true, data: { items, total, unreadCount } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NOTIFICATIONS_FETCH_FAILED';
    return NextResponse.json({ ok: false, error: { code: message } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { id?: string; markAll?: boolean } | null;

    if (body?.markAll) {
      NOTIFICATIONS = NOTIFICATIONS.map((n) => ({ ...n, read: true }));
      return NextResponse.json({ ok: true, data: { updated: NOTIFICATIONS.length } });
    }

    if (typeof body?.id === 'string') {
      const idx = NOTIFICATIONS.findIndex((n) => n.id === body.id);
      if (idx === -1) return NextResponse.json({ ok: false, error: { code: 'NOTIFICATION_NOT_FOUND' } }, { status: 404 });
      NOTIFICATIONS[idx] = { ...NOTIFICATIONS[idx], read: true };
      return NextResponse.json({ ok: true, data: NOTIFICATIONS[idx] });
    }

    return NextResponse.json({ ok: false, error: { code: 'NOTIFICATIONS_PATCH_INVALID_BODY' } }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NOTIFICATIONS_PATCH_FAILED';
    return NextResponse.json({ ok: false, error: { code: message } }, { status: 500 });
  }
}
