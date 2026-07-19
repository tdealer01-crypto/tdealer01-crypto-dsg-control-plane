import { recordEmailEngagement } from '../../../../../../lib/emails/sequences';

export const dynamic = 'force-dynamic';

// 1x1 pixel tracking image for email opens
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sendId: string }> }
) {
  const { sendId } = await params;

  try {
    // Record the open event (we don't have lead_id here, will be NULL but that's ok)
    await recordEmailEngagement(sendId, '', 'opened');
  } catch (err) {
    console.error('Failed to record email open:', err);
  }

  // Return 1x1 transparent pixel
  const pixel = Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
    0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x0a, 0x00, 0x01, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
  ]);

  return new Response(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
