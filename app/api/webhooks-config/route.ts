import { NextRequest, NextResponse } from 'next/server';

type WebhookRecord = {
  id: string;
  url: string;
  description: string;
  events: string[];
  status: 'ACTIVE' | 'DISABLED' | 'FAILING';
  createdAt: string;
};

// In-memory store — replace with DB in production
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

export async function GET() {
  return NextResponse.json({ webhooks, total: webhooks.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.url || !body.url.startsWith('https://')) {
    return NextResponse.json(
      { error: 'url must be a valid https:// endpoint' },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json(
      { error: 'events must be a non-empty array' },
      { status: 400 },
    );
  }

  const newWebhook: WebhookRecord = {
    id: 'wh_' + Date.now(),
    url: body.url,
    description: body.description ?? '',
    events: body.events,
    status: 'ACTIVE',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  webhooks.push(newWebhook);

  // Return the record and the signing secret (shown once; never persisted here)
  const secret = 'whsec_' + Math.random().toString(36).slice(2, 14);
  return NextResponse.json({ webhook: newWebhook, secret }, { status: 201 });
}
