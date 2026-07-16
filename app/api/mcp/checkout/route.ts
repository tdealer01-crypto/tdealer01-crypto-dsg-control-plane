import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user || !session?.access_token) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user;
    const accessToken = session.access_token;

    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userData?.org_id) {
      return NextResponse.json(
        { ok: false, error: 'Workspace not configured' },
        { status: 400 }
      );
    }

    const workspaceId = String(userData.org_id);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

    // Step 1: Create MCP API key via DSG route
    const keyRes = await fetch(`${appUrl}/api/dsg/mcp/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-dsg-workspace-id': workspaceId,
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    if (!keyRes.ok) {
      const errorData = await keyRes.json().catch(() => ({}));
      const code = errorData?.error?.code || 'KEY_CREATION_FAILED';
      if (code === 'DSG_AUTH_REQUIRED' || code === 'DSG_PERMISSION_DENIED') {
        return NextResponse.json(
          { ok: false, error: 'Insufficient permissions for MCP subscription' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { ok: false, error: 'Failed to create MCP key' },
        { status: keyRes.status }
      );
    }

    const keyData = await keyRes.json();
    if (!keyData?.data?.keyId) {
      return NextResponse.json(
        { ok: false, error: 'Invalid key creation response' },
        { status: 500 }
      );
    }

    // Step 2: Start subscription with created key
    const subscribeRes = await fetch(`${appUrl}/api/dsg/mcp/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-dsg-workspace-id': workspaceId,
      },
      body: JSON.stringify({ keyId: keyData.data.keyId }),
      cache: 'no-store',
    });

    if (!subscribeRes.ok) {
      const errorData = await subscribeRes.json().catch(() => ({}));
      const code = errorData?.error?.code || 'SUBSCRIBE_FAILED';
      if (code === 'DSG_AUTH_REQUIRED' || code === 'DSG_PERMISSION_DENIED') {
        return NextResponse.json(
          { ok: false, error: 'Insufficient permissions for MCP subscription' },
          { status: 403 }
        );
      }
      if (code === 'STRIPE_MCP_PRICE_ID_NOT_CONFIGURED') {
        return NextResponse.json(
          { ok: false, error: 'MCP subscription not yet available — price configuration pending' },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { ok: false, error: 'Failed to create checkout session' },
        { status: subscribeRes.status }
      );
    }

    const subscribeData = await subscribeRes.json();
    if (!subscribeData?.data?.checkoutUrl) {
      return NextResponse.json(
        { ok: false, error: 'Invalid checkout session response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        checkoutUrl: subscribeData.data.checkoutUrl,
        sessionId: subscribeData.data.sessionId,
      },
    });
  } catch (error) {
    return handleApiError('api/mcp/checkout', error);
  }
}
