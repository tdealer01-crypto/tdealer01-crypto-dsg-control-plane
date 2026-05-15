import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type Role = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';
type MemberStatus = 'ACTIVE' | 'PENDING';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  lastActive: string;
  createdAt: string;
}

interface InviteRequest {
  email: string;
  role: Role;
}

interface ErrorResponse {
  error: string;
  field?: string;
}

const VALID_ROLES: Role[] = ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'];

// In-memory store for demo; replace with DB in production
const MEMBERS: TeamMember[] = [
  {
    id: 'mem_001',
    name: 'Alex Rivera',
    email: 'alex.rivera@acmecorp.com',
    role: 'OWNER',
    status: 'ACTIVE',
    lastActive: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-01-10').toISOString(),
  },
  {
    id: 'mem_002',
    name: 'Jordan Chen',
    email: 'jordan.chen@acmecorp.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    lastActive: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-01-12').toISOString(),
  },
  {
    id: 'mem_003',
    name: 'Morgan Davies',
    email: 'morgan.davies@acmecorp.com',
    role: 'OPERATOR',
    status: 'ACTIVE',
    lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-02-01').toISOString(),
  },
  {
    id: 'mem_004',
    name: 'Sam Okafor',
    email: 'sam.okafor@acmecorp.com',
    role: 'OPERATOR',
    status: 'ACTIVE',
    lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-02-15').toISOString(),
  },
  {
    id: 'mem_005',
    name: 'Taylor Kim',
    email: 'taylor.kim@acmecorp.com',
    role: 'VIEWER',
    status: 'ACTIVE',
    lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-03-01').toISOString(),
  },
  {
    id: 'mem_006',
    name: 'Casey Patel',
    email: 'casey.patel@acmecorp.com',
    role: 'VIEWER',
    status: 'ACTIVE',
    lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date('2024-03-20').toISOString(),
  },
];

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    members: MEMBERS,
    total: MEMBERS.length,
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
  const existing = MEMBERS.find((m) => m.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    const err: ErrorResponse = { error: 'A member with this email already exists', field: 'email' };
    return NextResponse.json(err, { status: 409 });
  }

  const invite: TeamMember = {
    id: `mem_${Date.now()}`,
    name: email.split('@')[0].replace(/[._]/g, ' '),
    email,
    role,
    status: 'PENDING',
    lastActive: '',
    createdAt: new Date().toISOString(),
  };

  MEMBERS.push(invite);

  return NextResponse.json(invite, { status: 201 });
}
