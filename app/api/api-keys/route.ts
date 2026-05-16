import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash, randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

type Scope = 'read' | 'write' | 'admin' | 'gates:evaluate' | 'proofs:prove';
type ExpiryOption = 'never' | '30d' | '90d' | '1y';

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

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, authUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('org_id')
    .eq('auth_user_id', authUserId)
    .single();
  return data?.org_id ?? null;
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, name, prefix, scopes, created_at, last_used, expiry, status, requests_this_month')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  const shaped = (keys ?? []).map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    createdAt: k.created_at,
    lastUsed: k.last_used,
    expiry: k.expiry,
    status: k.status,
    requestsThisMonth: k.requests_this_month,
  }));

  return NextResponse.json({ keys: shaped, total: shaped.length });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

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

  const resolvedExpiry: ExpiryOption = (expiry && VALID_EXPIRY.includes(expiry)) ? expiry : 'never';

  // Generate key — store only the hash
  const rawKey = `dsg_live_${randomBytes(4).toString('hex')}_${randomBytes(12).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const prefix = rawKey.slice(0, 18) + '...';

  const { data: newKey, error: insertError } = await supabase
    .from('api_keys')
    .insert({
      org_id: orgId,
      name: name.trim(),
      prefix,
      key_hash: keyHash,
      scopes: scopes as string[],
      expiry: expiryDate(resolvedExpiry),
      status: 'ACTIVE',
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Return the raw key ONCE — it will not be retrievable again
  return NextResponse.json(
    {
      id: newKey.id,
      name: newKey.name,
      prefix: newKey.prefix,
      scopes: newKey.scopes,
      createdAt: newKey.created_at,
      lastUsed: newKey.last_used,
      expiry: newKey.expiry,
      status: newKey.status,
      requestsThisMonth: newKey.requests_this_month,
      key: rawKey,
    },
    { status: 201 }
  );
}
