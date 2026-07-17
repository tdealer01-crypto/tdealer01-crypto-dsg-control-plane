/**
 * Zapier Webhook Handler
 * Receives leads from Zapier marketplace automations
 *
 * POST /api/webhooks/zapier/marketplace
 * Body: { email, name, company, source, pricingTier }
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';
import { buildCorsHeaders } from '@/lib/security/cors';
import { readJsonBody } from '@/lib/security/request-json';

export const dynamic = 'force-dynamic';

async function handler(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    if (request.method === 'OPTIONS') {
      return NextResponse.json({}, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        {
          status: 405,
          headers: corsHeaders
        }
      );
    }

    const parsed = await readJsonBody<{
      email?: string;
      name?: string;
      company?: string;
      source?: string;
      pricingTier?: string;
    }>(request, { maxBytes: 1024 });

    if (!parsed.ok || !parsed.value) {
      return NextResponse.json(
        { error: parsed.error || 'invalid_body' },
        {
          status: parsed.status,
          headers: corsHeaders
        }
      );
    }

    // Validate required fields
    const { email, name, source, company, pricingTier } = parsed.value;
    if (!email || !name || !source) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, source' },
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Log lead received
    console.log('📥 Lead received from Zapier:', {
      email,
      name,
      source,
      timestamp: new Date().toISOString()
    });

    // TODO: Integrate with your lead processing system
    // Examples:
    // - Store in Supabase
    // - Send to HubSpot via API
    // - Trigger email automation
    // - Record in PostHog analytics
    // - Send Slack notification

    return NextResponse.json(
      {
        success: true,
        message: 'Lead received',
        id: `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        received_at: new Date().toISOString()
      },
      {
        status: 200,
        headers: corsHeaders
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return handleApiError('/api/webhooks/zapier/marketplace', error, { headers: corsHeaders });
  }
}

export { handler as POST, handler as OPTIONS };
