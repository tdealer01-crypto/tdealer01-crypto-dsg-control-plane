import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Scope = 'read' | 'write' | 'admin' | 'gates:evaluate' | 'proofs:prove';
type KeyStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';
type ExpiryOption = 'never' | '30d' | '90d' | '1y';

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

interface CreateKeyRequest {
  name: string;
  scopes: Scope[];
  expiry: ExpiryOption;
}

interface ErrorResponse {
  error: string;
  field?: string;
}

const VALID_SCOPES: Scope[] = ['read', 'write', 'admin', 'gates:evaluate', 'proofs:prove'];
const VALID_EXPIRY: ExpiryOption[] = ['never', '30d', '90d', '1y'];

// In-memory store for demo; replace with DB + hash storage in production
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
  {
    id: 'key_002',
    name: 'CI Pipeline — Read Only',
    prefix: 'dsg_live_c7b2...',
    scopes: ['read'],
    createdAt: new Date('2025-02-04').toISOString(),
    lastUsed: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    expiry: new Date('2026-05-04').toISOString(),
    status: 'ACTIVE',
    requestsThisMonth: 3412,
  },
  {
    id: 'key_003',
    name: 'Legacy Audit Export',
    prefix: 'dsg_live_e1d4...',
    scopes: ['read', 'write'],
    createdAt: new Date('2024-11-19').toISOString(),
    lastUsed: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    expiry: new Date('2025-02-19').toISOString(),
    status: 'EXPIRED',
    requestsThisMonth: 0,
  },
];

function randomHex(len: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * 16)];
  return result;
}

function expiryDate(option: ExpiryOption): string | null {
  const now = Date.now();
  const dayMs = 86400000;
  switch (option) {
    case 'never': return null;
    case '30d': return new Date(now + 30 * dayMs).toISOString();
    case '90d': return new Date(now + 90 * dayMs).toISOString();
    case '1y': return new Date(now + 365 * dayMs).toISOString();
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    keys: API_KEYS.map(({ ...key }) => key),
    total: API_KEYS.length,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    const err: ErrorResponse = { error: 'Invalid JSON body' };
    return NextResponse.json(err, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    const err: ErrorResponse = { error: 'Request body must be an object' };
    return NextResponse.json(err, { status: 400 });
  }

  const { name, scopes, expiry } = body as Partial<CreateKeyRequest>;

  // Validate name
  if (!name || typeof name !== 'string' || !name.trim()) {
    const err: ErrorResponse = { error: 'name is required', field: 'name' };
    return NextResponse.json(err, { status: 422 });
  }

  // Validate scopes
  if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
    const err: ErrorResponse = { error: 'scopes must be a non-empty array', field: 'scopes' };
    return NextResponse.json(err, { status: 422 });
  }
  const invalidScopes = scopes.filter((s) => !VALID_SCOPES.includes(s));
  if (invalidScopes.length > 0) {
    const err: ErrorResponse = {
      error: `Invalid scopes: ${invalidScopes.join(', ')}. Valid: ${VALID_SCOPES.join(', ')}`,
      field: 'scopes',
    };
    return NextResponse.json(err, { status: 422 });
  }

  // Validate expiry
  const resolvedExpiry: ExpiryOption = (expiry && VALID_EXPIRY.includes(expiry)) ? expiry : 'never';

  // Generate key — in production, store only the hash
  const rawKey = `dsg_live_${randomHex(8)}_${randomHex(24)}`;
  const prefix = rawKey.slice(0, 18) + '...';

  const newKey: ApiKeyRecord = {
    id: `key_${Date.now()}`,
    name: name.trim(),
    prefix,
    scopes: scopes as Scope[],
    createdAt: new Date().toISOString(),
    lastUsed: null,
    expiry: expiryDate(resolvedExpiry),
    status: 'ACTIVE',
    requestsThisMonth: 0,
  };

  API_KEYS.unshift(newKey);

  // Return the raw key ONCE — it will not be retrievable again
  return NextResponse.json(
    { ...newKey, key: rawKey },
    { status: 201 }
  );
}
