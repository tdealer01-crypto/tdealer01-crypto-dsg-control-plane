/**
 * POST /api/beta-signup
 * Capture beta signups from ProductHunt + landing pages.
 * Persists to the shared `leads` table (same funnel the marketing agent
 * works from) and sends a welcome email via Resend when configured.
 * Both persistence and email degrade gracefully — the signup response
 * never fails because a downstream service is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody } from '../../../lib/security/request-json';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { sendLeadWelcome } from '../../../lib/email/sales';

export const dynamic = 'force-dynamic';

interface BetaSignupRequest {
  email?: string;
  firstName?: string;
  companyName?: string;
  productInterest?: 'agent_governance' | 'compliance_proof' | 'policy_gates' | 'all';
  source?: 'producthunt' | 'twitter' | 'email' | 'landing_page' | 'referral' | 'other';
  notes?: string;
}

const VALID_SOURCES = ['producthunt', 'twitter', 'email', 'landing_page', 'referral', 'other'];

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function persistLead(body: BetaSignupRequest, source: string): Promise<'saved' | 'duplicate' | 'skipped'> {
  try {
    const supabase = getSupabaseAdmin() as any;
    const note = [
      `Beta signup via ${source}`,
      body.firstName ? `name: ${String(body.firstName).slice(0, 100)}` : null,
      body.productInterest ? `interest: ${String(body.productInterest).slice(0, 50)}` : null,
      body.notes ? `notes: ${String(body.notes).slice(0, 500)}` : null,
    ].filter(Boolean).join(' — ');

    const { error } = await supabase.from('leads').insert({
      email: body.email,
      source: 'beta-signup',
      intent: 'high',
      intent_score: 70,
      company: body.companyName ? String(body.companyName).slice(0, 255) : null,
      messages: [{ role: 'system', content: note.slice(0, 1000) }],
      last_seen_at: new Date().toISOString(),
    });

    if (!error) return 'saved';
    if (error.code === '23505') return 'duplicate';
    console.error('[Beta Signup] lead insert failed:', error.message ?? error);
    return 'skipped';
  } catch (e) {
    console.error('[Beta Signup] Supabase unavailable:', e instanceof Error ? e.message : e);
    return 'skipped';
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await readJsonBody<BetaSignupRequest>(request, { maxBytes: 4_096 });
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.error }, { status: parsed.status });
    }
    const body = parsed.value ?? {};

    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        { success: false, message: 'Valid email required' },
        { status: 400 },
      );
    }

    const source = VALID_SOURCES.includes(body.source || 'other') ? (body.source ?? 'other') : 'other';
    const signupId = `signup_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const persisted = await persistLead(body, source);

    // Fire-and-forget welcome email (no-op without RESEND_API_KEY).
    void sendLeadWelcome(body.email).catch(() => undefined);

    return NextResponse.json({
      success: true,
      signupId,
      persisted: persisted !== 'skipped',
      message: persisted === 'duplicate'
        ? 'You are already on the list — check your email for next steps.'
        : 'Welcome! Check your email for next steps.',
    });
  } catch (error) {
    console.error('[Beta Signup Error]', error);
    return NextResponse.json(
      { success: false, message: 'Signup failed. Please try again.' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/beta-signup?email=<email>
 * Check if an email is already signed up (leads table lookup, fail-open).
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { exists: false, message: 'Email parameter required' },
        { status: 400 },
      );
    }

    try {
      const supabase = getSupabaseAdmin() as any;
      const { data } = await supabase
        .from('leads')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      return NextResponse.json({
        exists: Boolean(data),
        message: data ? 'Email already signed up' : 'Email not yet signed up',
      });
    } catch {
      return NextResponse.json({ exists: false, message: 'Email not yet signed up' });
    }
  } catch {
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 },
    );
  }
}
