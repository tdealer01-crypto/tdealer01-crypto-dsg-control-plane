import { NextRequest, NextResponse } from 'next/server';
import { syncSystemInventory, getInventoryHealth } from '@/lib/system/inventory-sync';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/inventory-sync
 * Cron job to sync system inventory daily
 *
 * Vercel cron trigger (defined in vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/inventory-sync",
 *     "schedule": "0 2 * * *"  // 2 AM UTC daily
 *   }]
 * }
 *
 * Environment: CRON_SECRET required
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron not configured' },
        { status: 503 }
      );
    }

    if (!cronSecret || cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run sync
    const syncResult = await syncSystemInventory();
    const health = await getInventoryHealth();

    return NextResponse.json({
      ok: true,
      sync: {
        added: syncResult.added,
        removed: syncResult.removed,
        updated: syncResult.updated,
        errors: syncResult.errors,
      },
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Inventory sync error:', error);
    return handleApiError('api/cron/inventory-sync', error);
  }
}
