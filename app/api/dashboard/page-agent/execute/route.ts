import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const unavailable = () =>
  NextResponse.json(
    {
      success: false,
      available: false,
      error: 'page_agent_provider_not_configured',
      truthBoundary:
        'No browser action is reported as executed until a verified browser provider is connected.',
      timestamp: new Date().toISOString(),
    },
    { status: 503 }
  );

export async function POST() {
  return unavailable();
}

export async function GET() {
  return unavailable();
}
