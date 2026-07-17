/**
 * Lead Outreach API
 * POST /api/leads/outreach
 * Sends automated emails to leads
 */

import { NextResponse } from 'next/server';
import { sendOutreachEmail, sendOutreachToTopLeads } from '../../../../lib/leads/outreach';
import type { OutreachTemplate } from '../../../../lib/leads/outreach';

export const dynamic = 'force-dynamic';

interface OutreachRequest {
  leadId?: string;
  template?: OutreachTemplate;
  limit?: number;
  minScore?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OutreachRequest;

    const { leadId, template = 'first-contact', limit = 10, minScore = 70 } = body;

    if (leadId && template) {
      // Send to specific lead
      const result = await sendOutreachEmail(leadId, template);
      return NextResponse.json(result, { status: 200 });
    }

    if (!leadId) {
      // Send to top leads
      const results = await sendOutreachToTopLeads(limit, minScore);

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return NextResponse.json(
        {
          ok: true,
          sent: successful,
          failed,
          results,
          message: `Sent ${successful} emails, ${failed} failed`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid request parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Outreach error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Outreach failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads/outreach
 * Get outreach status/history
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId parameter required' },
        { status: 400 }
      );
    }

    // This would fetch interaction history for a lead
    // Implementation would query lead_interactions table
    return NextResponse.json(
      {
        ok: true,
        message: 'Outreach history endpoint',
        leadId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Outreach GET error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch outreach history',
      },
      { status: 500 }
    );
  }
}
