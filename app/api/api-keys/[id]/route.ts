import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type KeyStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
type Scope = 'read' | 'write' | 'admin' | 'gates:evaluate' | 'proofs:prove';

interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: Scope[];
  createdAt: string;
  lastUsed: string | null;
  expiry: string | null;
  status: KeyStatus;
  requestsThisMonth: number;
}

interface ErrorResponse {
  error: string;
}

// Shared in-memory store (same reference as parent route in module scope)
// In production this would be a DB query
const API_KEYS: ApiKeyRecord[] = [
  {
    id: 'key_001',
    name: 'Production Gateway',
    prefix: 'dsg_live_a3f9...',
    scopes: ['read', 'write', 'gates:evaluate', 'proofs:prove'],
    createdAt: new Date('2025-01-12').toISOString(),
    lastUsed: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    expiry: null,
    status: 'ACTIVE',
    requestsThisMonth: 14820,
  },
];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  if (!id) {
    const err: ErrorResponse = { error: 'Key ID is required' };
    return NextResponse.json(err, { status: 400 });
  }

  const idx = API_KEYS.findIndex((k) => k.id === id);

  if (idx === -1) {
    const err: ErrorResponse = { error: `API key '${id}' not found` };
    return NextResponse.json(err, { status: 404 });
  }

  if (API_KEYS[idx].status === 'REVOKED') {
    const err: ErrorResponse = { error: 'API key is already revoked' };
    return NextResponse.json(err, { status: 409 });
  }

  API_KEYS[idx] = { ...API_KEYS[idx], status: 'REVOKED' };

  return NextResponse.json({
    id,
    status: 'REVOKED',
    revokedAt: new Date().toISOString(),
  });
}
