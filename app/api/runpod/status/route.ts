import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

// Public configuration probe (same spirit as /api/health): reports only whether
// RUNPOD_API_KEY is present in this deployment. Never returns the value and
// never calls the Runpod API.
export async function GET() {
  try {
    const configured = Boolean(process.env.RUNPOD_API_KEY);
    return NextResponse.json({
      service: 'runpod',
      configured,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError('api/runpod/status', error);
  }
}
