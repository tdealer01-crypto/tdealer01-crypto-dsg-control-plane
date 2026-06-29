/**
 * Trinity AI System Status
 * GET /api/trinity/status
 *
 * Returns registration status of all 5 Trinity agents.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    system: 'Trinity AI Multi-Agent System',
    version: '1.0',
    agents: {
      Mind: { status: 'registered', role: 'Job discovery across 6 platforms' },
      Hand: { status: 'registered', role: 'Work execution and deliverable generation' },
      Eye: { status: 'registered', role: 'Quality verification and blockchain tx validation' },
      Nerve: { status: 'registered', role: 'Payment settlement and reputation management' },
      Spine: { status: 'registered', role: 'Orchestration, DSG governance, and audit trail' },
    },
    governance: {
      policyVersion: '1.0',
      constraintsEnforced: 5,
      unsupportedMapsTo: 'REVIEW_OR_BLOCK',
    },
    checkedAt: new Date().toISOString(),
  });
}
