import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { handleApiError } from '../../../../lib/security/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await request.json();

    if (!['developer', 'finance_operator', 'executive'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from('users')
      .update({ onboarding_role: role })
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    return handleApiError(error, 'Failed to save onboarding role');
  }
}
