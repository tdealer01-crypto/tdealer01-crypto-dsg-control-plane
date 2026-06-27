import { NextResponse } from 'next/server';
import { trinityDashboardHTML } from '@/lib/dashboard/trinity-html';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new NextResponse(trinityDashboardHTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
