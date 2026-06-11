import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body as { code?: string; state?: string };

    if (!code) {
      return NextResponse.json({ message: 'Missing authorization code' }, { status: 400 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ message: 'Stripe not configured' }, { status: 503 });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      stripe_user_id?: string;
      scope?: string;
      token_type?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok || tokenData.error) {
      return NextResponse.json(
        { message: tokenData.error_description || 'Token exchange failed' },
        { status: 400 },
      );
    }

    const stripeAccountId = tokenData.stripe_user_id;
    if (!stripeAccountId) {
      return NextResponse.json({ message: 'No Stripe account ID in response' }, { status: 400 });
    }

    // Persist the connected account in Supabase.
    // dsg_org_id is set to the Stripe account ID as a stable placeholder
    // when no DSG user session is present (e.g. direct Stripe install flow).
    // The dashboard can later link to a real org via the account management UI.
    //
    // Note: stripe_app_accounts is in supabase/migrations/ but not yet in the generated
    // database.types.ts. Cast through unknown to bypass the generated-type constraint;
    // remove this cast once types are regenerated from the live schema.
    try {
      const supabase = getSupabaseAdmin();
      const { error: upsertError } = await (supabase as unknown as {
        from: (table: string) => {
          upsert: (
            data: Record<string, unknown>,
            opts: { onConflict: string }
          ) => Promise<{ error: { message: string } | null }>;
        };
      })
        .from('stripe_app_accounts')
        .upsert(
          {
            stripe_account_id: stripeAccountId,
            dsg_org_id: stripeAccountId, // placeholder until linked to a DSG org
            status: 'active',
            installed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: {
              scope: tokenData.scope ?? null,
              install_source: 'oauth_callback',
            },
          },
          { onConflict: 'stripe_account_id' },
        );

      if (upsertError) {
        // Log but do not fail — the OAuth handshake succeeded even if DB write fails.
        console.error('[stripe-app/oauth/callback] Supabase upsert error:', upsertError.message);
      }
    } catch (dbErr) {
      console.error('[stripe-app/oauth/callback] DB error:', dbErr);
    }

    // Token exchange and storage successful
    return NextResponse.json({
      success: true,
      account_id: stripeAccountId,
    });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
