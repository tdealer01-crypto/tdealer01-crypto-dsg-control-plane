import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  verifySignedState,
  generateAuthorizationCode,
  hashAuthorizationCode,
  generateNonce,
} from '@/lib/mcp/oauth-helper';

// ERROR_HANDLER_EXEMPT: OAuth 2.0 consent endpoint requires spec-compliant error responses
export const dynamic = 'force-dynamic';

type ConsentParams = {
  signed_state?: string;
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  action?: string; // 'approve' or 'deny'
};

/**
 * GET /api/mcp/oauth/consent
 *
 * Consent screen for MCP OAuth
 * Shows user what permissions are being requested
 * Returns HTML form for approval or denial
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams) as ConsentParams;

  // Verify signed state from cookie
  const signedState = params.signed_state || request.cookies.get('mcp_oauth_state_signed')?.value;
  if (!signedState) {
    return NextResponse.json(
      {
        error: 'invalid_state',
        error_description: 'Missing or invalid state',
      },
      { status: 400 },
    );
  }

  const statePayload = verifySignedState(signedState);
  if (!statePayload) {
    return NextResponse.json(
      {
        error: 'invalid_state',
        error_description: 'State validation failed or expired',
      },
      { status: 400 },
    );
  }

  // Return HTML consent screen
  const consentHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DSG ONE MCP — Authorize claude.ai</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 60px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 40px; }
    h1 { margin-top: 0; color: #333; }
    .scope-list { background: #f9f9f9; border-left: 4px solid #0066cc; padding: 16px; margin: 20px 0; }
    .scope-list strong { display: block; margin-bottom: 8px; }
    .scope-list li { margin: 8px 0; }
    .actions { display: flex; gap: 12px; margin-top: 30px; }
    button { padding: 12px 24px; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
    .approve { background: #0066cc; color: white; }
    .approve:hover { background: #0052a3; }
    .deny { background: #e0e0e0; color: #333; }
    .deny:hover { background: #d0d0d0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Authorize claude.ai</h1>
    <p>claude.ai is requesting access to your DSG ONE MCP server.</p>

    <div class="scope-list">
      <strong>Permissions requested:</strong>
      <ul>
        <li><strong>mcp:execute</strong> — Execute MCP tools and call available resources</li>
      </ul>
    </div>

    <p>
      This authorization will allow claude.ai to:
    </p>
    <ul>
      <li>Call DSG governance tools (evaluate policies, record evidence)</li>
      <li>Execute available app builder and agent runtime commands</li>
      <li>Record usage for billing (฿490/month subscription)</li>
    </ul>

    <form method="POST">
      <input type="hidden" name="signed_state" value="${signedState}">
      <input type="hidden" name="client_id" value="${params.client_id || ''}">
      <input type="hidden" name="redirect_uri" value="${params.redirect_uri || ''}">
      <input type="hidden" name="scope" value="${params.scope || 'mcp:execute'}">
      <input type="hidden" name="state" value="${params.state || ''}">

      <div class="actions">
        <button type="submit" name="action" value="approve" class="approve">
          ✓ Authorize
        </button>
        <button type="submit" name="action" value="deny" class="deny">
          ✗ Cancel
        </button>
      </div>
    </form>
  </div>
</body>
</html>
  `;

  return new NextResponse(consentHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

/**
 * POST /api/mcp/oauth/consent
 *
 * Handles consent form submission
 * Generates authorization code and redirects back to client
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const signedState = formData.get('signed_state') as string;
  const clientId = formData.get('client_id') as string;
  const redirectUri = formData.get('redirect_uri') as string;
  const scope = formData.get('scope') as string;
  const state = formData.get('state') as string;
  const action = formData.get('action') as string;

  // Verify signed state
  const statePayload = verifySignedState(signedState);
  if (!statePayload) {
    return NextResponse.json(
      {
        error: 'invalid_state',
        error_description: 'State validation failed',
      },
      { status: 400 },
    );
  }

  // Check if user denied consent
  if (action === 'deny') {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_description', 'User denied authorization');
    if (state) redirectUrl.searchParams.set('state', state);
    return NextResponse.redirect(redirectUrl);
  }

  if (action !== 'approve') {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Invalid action',
      },
      { status: 400 },
    );
  }

  // Verify user is still authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== statePayload.actor_id) {
    return NextResponse.json(
      {
        error: 'invalid_grant',
        error_description: 'User session mismatch',
      },
      { status: 400 },
    );
  }

  try {
    // Generate authorization code
    const authCode = generateAuthorizationCode();
    const codeHash = hashAuthorizationCode(authCode);

    // Store authorization code in Supabase
    const supabaseAdmin = getSupabaseAdmin();
    const codeId = await (supabaseAdmin as any)
      .from('mcp_oauth_codes')
      .insert({
        actor_id: user.id,
        code_hash: codeHash,
        code_challenge: statePayload.codeChallenge,
        code_challenge_method: 'S256',
        scope: scope || 'mcp:execute',
        client_id: clientId,
        redirect_uri: redirectUri,
        state_hash: state,
        nonce: statePayload.nonce,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      })
      .select('code_id')
      .single();

    if (codeId.error) {
      throw codeId.error;
    }

    // Redirect to client with authorization code
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (state) redirectUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(redirectUrl);

    // Clear state cookie
    response.cookies.delete('mcp_oauth_state_signed');

    return response;
  } catch (error) {
    console.error('[consent POST] Error:', error);
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: 'Failed to create authorization code',
      },
      { status: 500 },
    );
  }
}
