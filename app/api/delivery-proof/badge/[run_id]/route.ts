/**
 * GET /api/delivery-proof/badge/[run_id]
 * Public SVG status badge for a delivery-proof report, embeddable in GitHub READMEs:
 *   [![DSG Delivery Proof](<base>/api/delivery-proof/badge/<run_id>)](<base>/delivery-proof/report/<run_id>)
 *
 * Status mapping (never 500s — unknown run_id renders a grey badge):
 *   claim_pass_eligible = true  → green  "evidence complete"
 *   claim_pass_eligible = false → red    "production blocked"
 *   not found / DB unavailable  → grey   "unknown"
 */

import { createClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

type BadgeStatus = 'complete' | 'blocked' | 'unknown';

const STATUS_STYLE: Record<BadgeStatus, { message: string; color: string }> = {
  complete: { message: 'evidence complete', color: '#2ea44f' },
  blocked: { message: 'production blocked', color: '#d73a49' },
  unknown: { message: 'unknown', color: '#9f9f9f' },
};

const LABEL = 'DSG delivery proof';
// Approximate character width for Verdana 11px — deterministic, no font measurement.
const CHAR_WIDTH = 6.5;
const PAD = 10;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBadge(status: BadgeStatus): string {
  const { message, color } = STATUS_STYLE[status];
  const labelWidth = Math.round(LABEL.length * CHAR_WIDTH + PAD);
  const messageWidth = Math.round(message.length * CHAR_WIDTH + PAD);
  const total = labelWidth + messageWidth;
  const label = escapeXml(LABEL);
  const msg = escapeXml(message);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${label}: ${msg}">
  <title>${label}: ${msg}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${msg}</text>
  </g>
</svg>`;
}

async function resolveStatus(runId: string): Promise<BadgeStatus> {
  if (!runId || runId.length > 128) return 'unknown';
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('delivery_proof_reports')
      .select('claim_pass_eligible')
      .eq('run_id', runId)
      .maybeSingle();
    if (error || !data) return 'unknown';
    if (data.claim_pass_eligible === true) return 'complete';
    if (data.claim_pass_eligible === false) return 'blocked';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ run_id: string }> },
) {
  const { run_id } = await params;
  const status = await resolveStatus(decodeURIComponent(run_id));

  return new Response(renderBadge(status), {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
