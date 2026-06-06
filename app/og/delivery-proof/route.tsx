import type { Metadata } from 'next';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ run_id: string }> }
) {
  const { run_id } = await params;
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    'https://tdealer01-crypto-dsg-control-plane.vercel.app';

  // Try to fetch real data for the report
  let claim = 'PENDING';
  let passRate = 'n/a';
  let env = 'production';

  try {
    const res = await fetch(`${base}/api/ccvs/compliance-status?run_id=${encodeURIComponent(run_id)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json() as {
        claim_pass_eligible: boolean | null;
        requirements_pass: number | null;
        requirements_total: number;
        deployment: { env: string };
      };
      if (data.claim_pass_eligible === true) claim = 'EVIDENCE COMPLETE';
      else if (data.claim_pass_eligible === false) claim = 'PRODUCTION BLOCKED';
      if (data.requirements_pass !== null && data.requirements_total) {
        passRate = `${data.requirements_pass}/${data.requirements_total}`;
      }
      env = data.deployment?.env || 'production';
    }
  } catch {
    // Use defaults
  }

  const colors = {
    'EVIDENCE COMPLETE': { bg: '#064e3b', text: '#6ee7b7', accent: '#10b981' },
    'PRODUCTION BLOCKED': { bg: '#7f1d1d', text: '#fca5a5', accent: '#ef4444' },
    'PENDING': { bg: '#374151', text: '#9ca3af', accent: '#6b7280' },
  };

  const { bg, text, accent } = colors[claim as keyof typeof colors] || colors['PENDING'];

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: bg,
          fontFamily: 'system-ui, sans-serif',
          padding: 80,
          color: 'white',
        }}
      >
        {/* Top brand */}
        <div style={{ position: 'absolute', top: 40, left: 80, fontSize: 20, fontWeight: 700, color: '#fff' }}>
          DSG ONE
        </div>

        {/* Main claim badge */}
        <div
          style={{
            background: accent,
            borderRadius: 16,
            padding: '16px 40px',
            marginBottom: 32,
            fontSize: 36,
            fontWeight: 800,
            color: '#000',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {claim}
        </div>

        {/* Run ID */}
        <div style={{ fontSize: 18, color: '#9ca3af', marginBottom: 16, fontFamily: 'monospace' }}>
          run_id: {run_id}
        </div>

        {/* Metrics row */}
        <div style={{ display: 'flex', gap: 60, marginTop: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: text }}>{passRate}</div>
            <div style={{ fontSize: 16, color: '#9ca3af', marginTop: 4 }}>Requirements Passed</div>
          </div>
          <div style={{ borderLeft: '1px solid #374151', paddingLeft: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: text }}>{env}</div>
            <div style={{ fontSize: 16, color: '#9ca3af', marginTop: 4 }}>Environment</div>
          </div>
          <div style={{ borderLeft: '1px solid #374151', paddingLeft: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: accent }}>✅</div>
            <div style={{ fontSize: 16, color: '#9ca3af', marginTop: 4 }}>Verifiable</div>
          </div>
        </div>

        {/* Bottom trust signals */}
        <div style={{ position: 'absolute', bottom: 60, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b7280' }}>
          <span>CCVS v1.2 · 24 Z3 Theorems · 72% Mutation Score</span>
          <span>zenodo.org/10.5281/zenodo.18225586</span>
        </div>

        {/* QR code placeholder indicator */}
        <div style={{ position: 'absolute', bottom: 40, right: 80, fontSize: 12, color: '#6b7280' }}>
          📱 Scan to verify
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

export async function generateMetadata({ params }: { params: Promise<{ run_id: string }> }): Promise<Metadata> {
  const { run_id } = await params;
  return {
    title: `Delivery Proof Report — ${run_id} — DSG ONE`,
    description: 'AI governance proof report with pre-execution gate verification.',
  };
}