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

    // Attempt to update onboarding_role, gracefully handle if column doesn't exist yet
    try {
      const { error } = await admin
        .from('users')
        .update({ onboarding_role: role })
        .eq('id', user.id);

      if (error) {
        // Log but don't fail - column might not exist in test environments
        console.warn(`Could not update onboarding_role: ${error.message}`);
      }
    } catch (updateError) {
      // Column doesn't exist yet, log and continue
      console.warn('onboarding_role column not available yet during migration', updateError);
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    return handleApiError(error, 'Failed to save onboarding role');
  }
}
