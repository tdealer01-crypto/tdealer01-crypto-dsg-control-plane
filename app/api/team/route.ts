import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';

export const dynamic = 'force-dynamic';

type Role = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

interface InviteRequest {
  email: string;
  role: Role;
}

interface ErrorResponse {
  error: string;
  field?: string;
}

const VALID_ROLES: Role[] = ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'];

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

  const { data: members, error } = await supabase
    .from('users')
    .select('id, email, role, is_active, created_at, updated_at, user_org_roles(role)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  const shaped = (members ?? []).map((m) => {
    const orgRole = Array.isArray(m.user_org_roles) && m.user_org_roles.length > 0
      ? (m.user_org_roles[0] as { role: string }).role
      : (m.role ?? 'VIEWER');
    return {
      id: m.id,
      name: m.email.split('@')[0].replace(/[._]/g, ' '),
      email: m.email,
      role: orgRole,
      status: m.is_active ? 'ACTIVE' : 'PENDING',
      lastActive: m.updated_at ?? '',
      createdAt: m.created_at ?? new Date().toISOString(),
    };
  });

  return NextResponse.json({ members: shaped, total: shaped.length });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const access = await requireOrgPermission('org.invite_members');
  if (access.ok !== true) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = await createClient();
  const orgId = access.orgId;

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

  const { email, role } = body as Partial<InviteRequest>;

  // Validate email
  if (!email || typeof email !== 'string') {
    const err: ErrorResponse = { error: 'email is required', field: 'email' };
    return NextResponse.json(err, { status: 422 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const err: ErrorResponse = { error: 'email is not a valid email address', field: 'email' };
    return NextResponse.json(err, { status: 422 });
  }

  // Validate role
  if (!role || !VALID_ROLES.includes(role)) {
    const err: ErrorResponse = {
      error: `role must be one of: ${VALID_ROLES.join(', ')}`,
      field: 'role',
    };
    return NextResponse.json(err, { status: 422 });
  }

  if (role === 'OWNER') {
    const err: ErrorResponse = { error: 'Cannot invite a member with OWNER role', field: 'role' };
    return NextResponse.json(err, { status: 422 });
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', orgId)
    .ilike('email', email)
    .maybeSingle();

  if (existing) {
    const err: ErrorResponse = { error: 'A member with this email already exists', field: 'email' };
    return NextResponse.json(err, { status: 409 });
  }

  // Insert new user with PENDING status
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      email,
      org_id: orgId,
      role,
      is_active: false,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Insert org role
  const { error: roleInsertError } = await supabase.from('user_org_roles').insert({
    org_id: orgId,
    user_id: newUser.id,
    role,
  });

  if (roleInsertError) {
    return NextResponse.json({ error: 'Failed to assign organization role' }, { status: 500 });
  }

  const invite = {
    id: newUser.id,
    name: email.split('@')[0].replace(/[._]/g, ' '),
    email,
    role,
    status: 'PENDING' as const,
    lastActive: '',
    createdAt: newUser.created_at ?? new Date().toISOString(),
  };

  return NextResponse.json(invite, { status: 201 });
}
