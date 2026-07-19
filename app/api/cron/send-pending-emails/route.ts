import { sendPendingEmails } from '../../../../lib/emails/sequences';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Cron job to send pending emails
// Called hourly by Vercel cron or external scheduler
export async function GET(request: Request) {
  // Verify CRON_SECRET
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendPendingEmails(100);

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Send pending emails error:', err);
    return NextResponse.json(
      { error: 'Failed to send emails', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
