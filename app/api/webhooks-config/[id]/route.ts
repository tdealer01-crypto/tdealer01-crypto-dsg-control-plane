import { NextRequest, NextResponse } from 'next/server';

type WebhookStatus = 'ACTIVE' | 'DISABLED' | 'FAILING';

type WebhookRecord = {
  id: string;
  url: string;
  description: string;
  events: string[];
  status: WebhookStatus;
  createdAt: string;
};

// Shared in-memory store reference (in production, use a real DB)
const webhooks: WebhookRecord[] = [
  {
    id: 'wh_01',
    url: 'https://app.acme-corp.io/hooks/dsg-governance',
    description: 'Production governance event sink for ACME ERP',
    events: ['gate.evaluated', 'action.approved', 'action.blocked', 'agent.completed'],
    status: 'ACTIVE',
    createdAt: '2025-04-12',
  },
  {
    id: 'wh_02',
    url: 'https://hooks.sentinel-ai.net/dsg/inbound/prod',
    description: 'Sentinel AI secondary compliance feed',
    events: ['proof.created', 'action.reviewed', 'agent.started', 'agent.completed'],
    status: 'FAILING',
    createdAt: '2025-03-28',
  },
];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const idx = webhooks.findIndex((wh) => wh.id === params.id);
  if (idx === -1) {
    return NextResponse.json({ error: 'webhook not found' }, { status: 404 });
  }
  const [removed] = webhooks.splice(idx, 1);
  return NextResponse.json({ deleted: removed });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const idx = webhooks.findIndex((wh) => wh.id === params.id);
  if (idx === -1) {
    return NextResponse.json({ error: 'webhook not found' }, { status: 404 });
  }

  const body = await req.json();
  const allowed: (keyof WebhookRecord)[] = ['status', 'description', 'events', 'url'];

  for (const key of allowed) {
    if (key in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (webhooks[idx] as any)[key] = body[key];
    }
  }

  return NextResponse.json({ webhook: webhooks[idx] });
}
