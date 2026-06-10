/**
 * POST /api/delegation/create
 *
 * Creates a new delegation contract.
 * Input validation, DB storage, and response formatting.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CreateDelegationRequest {
  orgId: string;
  userId: string;
  goal: string;
  scope: string;
  allowedActions: string[];
  blockedActions: string[];
  requiresUserConfirm: string[];
  expiresAt: string;
}

interface CreateDelegationResponse {
  success: boolean;
  delegationId?: string;
  delegation?: {
    delegationId: string;
    orgId: string;
    userId: string;
    goal: string;
    scope: string;
    allowedActions: string[];
    blockedActions: string[];
    requiresUserConfirm: string[];
    expiresAt: string;
    createdAt: string;
  };
  error?: string;
  details?: string;
}

/**
 * Validate the delegation creation request.
 */
function validateRequest(body: unknown): {
  valid: boolean;
  errors: string[];
  data?: CreateDelegationRequest;
} {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  const req = body as Record<string, unknown>;

  // Check required fields
  if (!req.orgId || typeof req.orgId !== 'string') {
    errors.push('orgId is required and must be a string');
  }
  if (!req.userId || typeof req.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  if (!req.goal || typeof req.goal !== 'string') {
    errors.push('goal is required and must be a string');
  }
  if (!req.scope || typeof req.scope !== 'string') {
    errors.push('scope is required and must be a string');
  }
  if (!Array.isArray(req.allowedActions)) {
    errors.push('allowedActions is required and must be an array');
  }
  if (!Array.isArray(req.blockedActions)) {
    errors.push('blockedActions is required and must be an array');
  }
  if (!Array.isArray(req.requiresUserConfirm)) {
    errors.push('requiresUserConfirm is required and must be an array');
  }
  if (!req.expiresAt || typeof req.expiresAt !== 'string') {
    errors.push('expiresAt is required and must be an ISO8601 string');
  } else {
    try {
      const expiresDate = new Date(req.expiresAt as string);
      if (isNaN(expiresDate.getTime())) {
        errors.push('expiresAt must be a valid ISO8601 date');
      }
      if (expiresDate <= new Date()) {
        errors.push('expiresAt must be in the future');
      }
    } catch {
      errors.push('expiresAt must be a valid ISO8601 date');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: (req as unknown) as CreateDelegationRequest,
  };
}

/**
 * Generate a unique delegation ID.
 */
function generateDelegationId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `deleg_${timestamp}_${randomPart}`;
}

/**
 * POST handler: Create a delegation.
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateDelegationResponse>> {
  try {
    // Parse request body
    const body = await request.json().catch(() => null);

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_FAILED',
          details: validation.errors.join('; '),
        },
        { status: 400 }
      );
    }

    const data = validation.data!;

    // Generate delegation ID
    const delegationId = generateDelegationId();

    // Create delegation object
    const now = new Date().toISOString();
    const delegation = {
      delegationId,
      orgId: data.orgId,
      userId: data.userId,
      goal: data.goal,
      scope: data.scope,
      allowedActions: data.allowedActions,
      blockedActions: data.blockedActions,
      requiresUserConfirm: data.requiresUserConfirm,
      expiresAt: data.expiresAt,
      createdAt: now,
    };

    // TODO: Store in Supabase delegated_agi_jobs table
    // For now, we just return the delegation object
    // In production, this would:
    // 1. Store in DB
    // 2. Return with database-assigned timestamps
    // 3. Handle concurrency and duplicate key errors

    return NextResponse.json(
      {
        success: true,
        delegationId,
        delegation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating delegation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
