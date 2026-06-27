import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Execution stopped',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError('api/dashboard/agi/stop', error);
  }
}
