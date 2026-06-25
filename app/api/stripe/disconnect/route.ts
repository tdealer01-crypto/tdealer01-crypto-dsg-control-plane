import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

async function getOrgIdForCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return null;
  }

  const admin = getSupabaseAdmin() as any;
  const { data } = await admin
    .from('users')
    .select('org_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  return data?.org_id ? String(data.org_id) : null;
}

export async function GET(request: NextRequest) {
  try {
    const orgId = await getOrgIdForCurrentUser();

    if (!orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const admin = getSupabaseAdmin() as any;

    const { error } = await admin
      .from('stripe_app_accounts')
      .update({
        status: 'revoked',
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('dsg_org_id', orgId);

    if (error) {
      console.error('Disconnect database error:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected Stripe account',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Disconnect endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type !== 'account.application.deauthorized') {
      return NextResponse.json(
        { received: true, message: 'Event type not handled' },
        { status: 200 }
      );
    }

    const accountId = data?.object?.account;

    if (!accountId) {
      console.warn('Deauthorization webhook missing account ID');
      return NextResponse.json(
        { error: 'Missing account ID' },
        { status: 400 }
      );
    }

    console.log(`Processing deauthorization for account: ${accountId}`);

    const admin = getSupabaseAdmin() as any;

    const { error } = await admin
      .from('stripe_app_accounts')
      .update({
        status: 'revoked',
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        webhook_deauthorized: true,
      })
      .eq('stripe_account_id', accountId);

    if (error) {
      console.error('Error updating deauthorization:', error);
      return NextResponse.json(
        { received: true, error: 'Internal server error' },
        { status: 200 }
      );
    }

    console.log(`Account ${accountId} deauthorized successfully`);

    return NextResponse.json({
      success: true,
      message: 'Deauthorization processed',
      account: accountId,
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { received: true, error: String(error) },
      { status: 200 }
    );
  }
}
