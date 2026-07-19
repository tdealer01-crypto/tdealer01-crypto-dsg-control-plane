import { unsubscribeLead } from '../../../../lib/emails/sequences';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Unsubscribe endpoint (can be called by email link or API)
export async function POST(request: Request) {
  try {
    const { email, reason } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    await unsubscribeLead(email, reason);

    return NextResponse.json({ success: true, message: `${email} unsubscribed` });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

// GET endpoint for unsubscribe link in emails
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    await unsubscribeLead(email, 'unsubscribe_link');

    // Return HTML confirmation page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body { font-family: system-ui; text-align: center; padding: 40px; }
            .container { max-width: 500px; margin: 0 auto; }
            h1 { color: #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Unsubscribed</h1>
            <p>You've been removed from our email list.</p>
            <p>We won't send you any more emails.</p>
          </div>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return new Response('Failed to unsubscribe', { status: 500 });
  }
}
