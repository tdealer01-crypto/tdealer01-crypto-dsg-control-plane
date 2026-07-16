import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Client-side handles localStorage cleanup
    // This route can be extended for server-side session cleanup if needed

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('POST /api/auth/logout', error);
  }
}
