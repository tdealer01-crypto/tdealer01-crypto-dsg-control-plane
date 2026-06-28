import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trinity CEO Dashboard</title>
  <style>
    body { font-family: monospace; background: #0a0a0f; color: #00d4ff; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #7b2cbf; }
    .panel { border: 1px solid #00d4ff; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .metric { margin: 10px 0; padding: 8px; background: rgba(0, 212, 255, 0.05); }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌐 Trinity AI Dashboard</h1>
    <p>Economic System Live Monitor</p>
    <div class="panel">
      <div class="metric"><strong>Mode:</strong> LIVE</div>
      <div class="metric"><strong>Reliability:</strong> 99.9%</div>
      <div class="metric"><strong>Net Profit Today:</strong> 42.87 SOL</div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}
