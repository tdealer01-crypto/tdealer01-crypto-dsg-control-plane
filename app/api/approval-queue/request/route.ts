/**
 * POST /api/approval-queue/request
 * Create an approval request for agent action
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ApprovalRequestBody {
  agentId: string;
  orgId: string;
  action: string; // What the agent wants to do (e.g., "deploy to production")
  input?: Record<string, unknown>; // Action parameters
  expiresInHours?: number; // Default: 24h
  priority?: 'low' | 'medium' | 'high'; // Urgency
  notifyEmails?: string[]; // Who to notify
}

interface ApprovalRequestResponse {
  requestId: string;
  agentId: string;
  action: string;
  status: 'pending';
  expiresAt: string;
  createdAt: string;
  createdBy?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ApprovalRequestBody;

    // Validate required fields
    if (!body.agentId || !body.orgId || !body.action) {
      return NextResponse.json(
        { error: 'agentId, orgId, and action are required' },
        { status: 400 },
      );
    }

    // Generate request ID
    const requestId = `areq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresInHours = body.expiresInHours || 24;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    // In production: save to Supabase
    console.log('[Approval Request Created]', {
      requestId,
      agentId: body.agentId,
      orgId: body.orgId,
      action: body.action,
      expiresAt,
      createdAt,
    });

    // Send notifications (in production)
    if (body.notifyEmails && body.notifyEmails.length > 0) {
      console.log(`[Notify] Send approval request to: ${body.notifyEmails.join(', ')}`);
    }

    return NextResponse.json({
      requestId,
      agentId: body.agentId,
      action: body.action,
      status: 'pending',
      expiresAt,
      createdAt,
    } as ApprovalRequestResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Request creation failed' },
      { status: 500 },
    );
  }
}
