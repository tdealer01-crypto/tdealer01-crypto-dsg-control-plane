import { NextResponse } from 'next/server';

export type BuildStatus = 'DEPLOYED' | 'BUILDING' | 'FAILED' | 'DRAFT';

export type BuildEntry = {
  id: string;
  version: string;
  appName: string;
  appIcon: string;
  status: BuildStatus;
  timestamp: string;
  relativeTime: string;
  summary: string;
  addedLines: number;
  removedLines: number;
};

const MOCK_BUILDS: BuildEntry[] = [
  { id: 'b15', version: 'v1.4.2', appName: 'Payments Portal', appIcon: 'CreditCard', status: 'DEPLOYED', timestamp: '2026-05-15T10:00:00Z', relativeTime: '2 hours ago', summary: 'Added Stripe payments integration', addedLines: 142, removedLines: 12 },
  { id: 'b14', version: 'v1.4.1', appName: 'Payments Portal', appIcon: 'CreditCard', status: 'DEPLOYED', timestamp: '2026-05-14T16:30:00Z', relativeTime: 'yesterday', summary: 'Fixed webhook signature validation', addedLines: 28, removedLines: 6 },
  { id: 'b13', version: 'v1.4.0', appName: 'CRM Dashboard', appIcon: 'LayoutDashboard', status: 'DEPLOYED', timestamp: '2026-05-14T09:00:00Z', relativeTime: 'yesterday', summary: 'Updated dashboard UI with new chart components', addedLines: 310, removedLines: 88 },
  { id: 'b12', version: 'v1.3.9', appName: 'Auth Service', appIcon: 'Shield', status: 'FAILED', timestamp: '2026-05-13T22:00:00Z', relativeTime: '2 days ago', summary: 'Attempted OAuth2 PKCE flow — build failed on env vars', addedLines: 54, removedLines: 3 },
  { id: 'b11', version: 'v1.3.8', appName: 'Auth Service', appIcon: 'Shield', status: 'DEPLOYED', timestamp: '2026-05-13T14:00:00Z', relativeTime: '2 days ago', summary: 'Fixed auth flow redirect bug', addedLines: 18, removedLines: 22 },
  { id: 'b10', version: 'v1.3.7', appName: 'Inventory Manager', appIcon: 'Package', status: 'DEPLOYED', timestamp: '2026-05-12T11:00:00Z', relativeTime: '3 days ago', summary: 'Added bulk import CSV support', addedLines: 209, removedLines: 14 },
  { id: 'b09', version: 'v1.3.6', appName: 'Inventory Manager', appIcon: 'Package', status: 'BUILDING', timestamp: '2026-05-12T10:45:00Z', relativeTime: '3 days ago', summary: 'Refactoring stock level alerts', addedLines: 77, removedLines: 40 },
  { id: 'b08', version: 'v1.3.5', appName: 'Analytics Hub', appIcon: 'BarChart2', status: 'DEPLOYED', timestamp: '2026-05-11T08:00:00Z', relativeTime: '4 days ago', summary: 'Added cohort retention chart', addedLines: 185, removedLines: 29 },
  { id: 'b07', version: 'v1.3.4', appName: 'CRM Dashboard', appIcon: 'LayoutDashboard', status: 'DRAFT', timestamp: '2026-05-10T17:00:00Z', relativeTime: '5 days ago', summary: 'Draft: experimental AI lead scoring widget', addedLines: 62, removedLines: 0 },
  { id: 'b06', version: 'v1.3.3', appName: 'Payments Portal', appIcon: 'CreditCard', status: 'DEPLOYED', timestamp: '2026-05-09T12:00:00Z', relativeTime: '6 days ago', summary: 'Multi-currency support for EUR and GBP', addedLines: 93, removedLines: 17 },
  { id: 'b05', version: 'v1.3.2', appName: 'Analytics Hub', appIcon: 'BarChart2', status: 'FAILED', timestamp: '2026-05-08T20:00:00Z', relativeTime: '7 days ago', summary: 'D3 upgrade caused chart rendering error', addedLines: 12, removedLines: 55 },
  { id: 'b04', version: 'v1.3.1', appName: 'Support Inbox', appIcon: 'MessageSquare', status: 'DEPLOYED', timestamp: '2026-05-07T09:30:00Z', relativeTime: '8 days ago', summary: 'Added Slack thread sync for tickets', addedLines: 171, removedLines: 8 },
  { id: 'b03', version: 'v1.2.0', appName: 'Support Inbox', appIcon: 'MessageSquare', status: 'DEPLOYED', timestamp: '2026-05-05T15:00:00Z', relativeTime: '10 days ago', summary: 'Initial email-to-ticket pipeline', addedLines: 442, removedLines: 0 },
  { id: 'b02', version: 'v1.1.0', appName: 'Auth Service', appIcon: 'Shield', status: 'DEPLOYED', timestamp: '2026-05-02T11:00:00Z', relativeTime: '13 days ago', summary: 'Role-based access control (RBAC) layer', addedLines: 288, removedLines: 34 },
  { id: 'b01', version: 'v1.0.0', appName: 'CRM Dashboard', appIcon: 'LayoutDashboard', status: 'DEPLOYED', timestamp: '2026-04-28T09:00:00Z', relativeTime: '17 days ago', summary: 'Initial project scaffold and dashboard shell', addedLines: 620, removedLines: 0 },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') ?? '').toLowerCase();
    const status = searchParams.get('status') ?? 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage = 10;

    let filtered = MOCK_BUILDS;
    if (search) filtered = filtered.filter((b) => b.appName.toLowerCase().includes(search) || b.summary.toLowerCase().includes(search));
    if (status !== 'ALL') filtered = filtered.filter((b) => b.status === status);

    const total = filtered.length;
    const totalPages = Math.ceil(total / perPage);
    const items = filtered.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({ ok: true, data: { items, total, page, totalPages } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HISTORY_FETCH_FAILED';
    return NextResponse.json({ ok: false, error: { code: message } }, { status: 500 });
  }
}
