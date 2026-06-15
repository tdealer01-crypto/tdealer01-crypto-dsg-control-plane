import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

interface EvaluateRequest {
  stripe_account_id: string;
  operation_type: 'charge' | 'payout' | 'refund' | 'payment_intent';
  amount_cents?: number;
  currency?: string;
  customer_id?: string;
  payment_method_id?: string;
  payment_method_type?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
  stripe_event_id?: string;
}

interface PolicyRule {
  id: string;
  org_id: string;
  stripe_account_id: string | null;
  rule_type: string;
  name: string;
  conditions: Record<string, unknown>;
  action: 'ALLOW' | 'BLOCK' | 'REVIEW';
  priority: number;
  enabled: boolean;
}

interface EvaluationResult {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  matched_rule_ids: string[];
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

interface GatewayResponse {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  decision_id: string;
  proof_hash: string;
  policy_version: string;
  audit_recorded: boolean;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  matched_rule_ids: string[];
  approval_id: string;
  evaluation_time_ms: number;
}

function generateDecisionId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `dec_${timestamp}_${random}`;
}

async function computeProofHash(data: Record<string, unknown>): Promise<string> {
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  const hash = createHash('sha256');
  hash.update(canonical);
  return hash.digest('hex');
}

async function getLatestAuditChain(stripeAccountId: string): Promise<{ chainIndex: number; prevHash: string | null }> {
  try {
    const supabase = getSupabaseAdmin() as any;
    const { data } = await supabase
      .from('stripe_operation_audits')
      .select('chain_index, record_hash')
      .eq('stripe_account_id', stripeAccountId)
      .order('chain_index', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      return { chainIndex: data[0].chain_index, prevHash: data[0].record_hash };
    }
  } catch {}
  return { chainIndex: 0, prevHash: null };
}

function computeRiskScore(params: {
  amount_cents?: number;
  currency?: string;
  customer_id?: string;
  payment_method_type?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  operation_type: string;
}): { score: number; level: 'low' | 'medium' | 'high' | 'critical' } {
  let score = 0;

  if (params.amount_cents) {
    const amountUsd = params.currency === 'usd' ? params.amount_cents : params.amount_cents * 1.0;
    if (amountUsd > 5000000) { score += 40; }
    else if (amountUsd > 1000000) { score += 25; }
    else if (amountUsd > 100000) { score += 10; }
  }

  if (params.currency && params.currency !== 'usd') score += 5;
  if (params.operation_type === 'payout') score += 15;
  else if (params.operation_type === 'refund') score += 10;

  if (params.payment_method_type) {
    const highRiskMethods = ['bank_transfer', 'ach_debit', 'sepa_debit'];
    if (highRiskMethods.includes(params.payment_method_type)) score += 15;
  }

  if (!params.customer_id) score += 10;

  if (params.risk_level) {
    const riskScores = { low: 0, medium: 15, high: 30, critical: 50 };
    score += riskScores[params.risk_level];
  }

  score = Math.min(score, 100);

  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 70) level = 'critical';
  else if (score >= 40) level = 'high';
  else if (score >= 20) level = 'medium';
  else level = 'low';

  return { score, level };
}

async function loadPolicyRules(orgId: string, stripeAccountId?: string): Promise<PolicyRule[]> {
  try {
    const supabase = getSupabaseAdmin() as any;
    let query = supabase
      .from('stripe_policy_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('enabled', true)
      .order('priority', { ascending: true });

    if (stripeAccountId) {
      query = query.or(`stripe_account_id.eq.${stripeAccountId},stripe_account_id.is.null`);
    } else {
      query = query.is('stripe_account_id', null);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to load policy rules:', error.message);
      return [];
    }
    return (data || []) as PolicyRule[];
  } catch {
    return [];
  }
}

async function evaluatePolicyRules(
  rules: PolicyRule[],
  context: EvaluateRequest,
  riskScore: number
): Promise<EvaluationResult> {
  const matchedRules: string[] = [];
  let decision: 'ALLOW' | 'BLOCK' | 'REVIEW' = 'ALLOW';
  let reason = 'No matching policies - default allow';

  for (const rule of rules) {
    const conditions = rule.conditions as Record<string, unknown>;
    let matched = false;
    let ruleReason = '';

    switch (rule.rule_type) {
      case 'amount_threshold': {
        const threshold = conditions.max_amount_cents as number | undefined;
        const minThreshold = conditions.min_amount_cents as number | undefined;
        if (threshold && context.amount_cents && context.amount_cents > threshold) {
          matched = true;
          ruleReason = `Amount ${context.amount_cents} exceeds threshold ${threshold}`;
        }
        if (minThreshold && context.amount_cents && context.amount_cents < minThreshold) {
          matched = true;
          ruleReason = `Amount ${context.amount_cents} below minimum ${minThreshold}`;
        }
        break;
      }
      case 'rate_limit': {
        // TODO: Implement rate limit check against audit table
        break;
      }
      case 'time_window': {
        const start = conditions.start_time as string | undefined;
        const end = conditions.end_time as string | undefined;
        if (start && end) {
          const now = new Date();
          const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
          const [startH, startM] = start.split(':').map(Number);
          const [endH, endM] = end.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;

          let inWindow = false;
          if (startMinutes <= endMinutes) {
            inWindow = nowMinutes >= startMinutes && nowMinutes <= endMinutes;
          } else {
            inWindow = nowMinutes >= startMinutes || nowMinutes <= endMinutes;
          }

          if (!inWindow) {
            matched = true;
            ruleReason = `Outside allowed time window: ${start}-${end}`;
          }
        }
        break;
      }
      case 'customer_allowlist': {
        const allowlist = conditions.customer_ids as string[] | undefined;
        const blocklist = conditions.blocked_customer_ids as string[] | undefined;
        if (allowlist && context.customer_id && !allowlist.includes(context.customer_id)) {
          matched = true;
          ruleReason = 'Customer not in allowlist';
        }
        if (blocklist && context.customer_id && blocklist.includes(context.customer_id)) {
          matched = true;
          ruleReason = 'Customer in blocklist';
        }
        break;
      }
      case 'risk_score': {
        const threshold = conditions.risk_threshold as number | undefined;
        if (threshold && riskScore >= threshold) {
          matched = true;
          ruleReason = `Risk score ${riskScore} exceeds threshold ${threshold}`;
        }
        break;
      }
    }

    if (matched) {
      matchedRules.push(rule.id);
      decision = rule.action;
      reason = ruleReason || `Matched rule: ${rule.name}`;
      break;
    }
  }

  if (matchedRules.length === 0) {
    if (riskScore >= 70) {
      decision = 'REVIEW';
      reason = `High risk score: ${riskScore}`;
    } else if (riskScore >= 40) {
      decision = 'REVIEW';
      reason = `Elevated risk score: ${riskScore}`;
    }
  }

  return {
    decision,
    reason,
    matched_rule_ids: matchedRules,
    risk_score: riskScore,
    risk_level: riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low',
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const corsHeaders = buildCorsHeaders(request);

  try {
    const body = await request.json() as EvaluateRequest;

    if (!body.stripe_account_id) {
      return NextResponse.json({ error: 'Missing stripe_account_id' }, { status: 400, headers: corsHeaders });
    }
    if (!body.operation_type) {
      return NextResponse.json({ error: 'Missing operation_type' }, { status: 400, headers: corsHeaders });
    }

    // Get org_id from stripe account
    const supabase = getSupabaseAdmin() as any;
    const { data: account } = await supabase
      .from('stripe_app_accounts')
      .select('dsg_org_id, status')
      .eq('stripe_account_id', body.stripe_account_id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: 'Stripe account not found' }, { status: 404, headers: corsHeaders });
    }
    if (account.status !== 'active') {
      return NextResponse.json({ error: 'Stripe account not active', status: account.status }, { status: 403, headers: corsHeaders });
    }

    const orgId = account.dsg_org_id;

    // Load policy rules
    const rules = await loadPolicyRules(orgId, body.stripe_account_id);

    // Compute risk score
    const { score: riskScore, level: riskLevel } = computeRiskScore({
      amount_cents: body.amount_cents,
      currency: body.currency,
      customer_id: body.customer_id,
      payment_method_type: body.payment_method_type,
      risk_level: body.risk_level,
      operation_type: body.operation_type,
    });

    // Evaluate against rules
    const evaluation = await evaluatePolicyRules(rules, body, riskScore);

    // Generate decision ID and proof hash
    const decisionId = generateDecisionId();
    const policyVersion = '1.0.0';
    const approvalId = body.stripe_event_id || decisionId;

    const proofData = {
      decision_id: decisionId,
      approval_id: approvalId,
      stripe_account_id: body.stripe_account_id,
      org_id: orgId,
      operation_type: body.operation_type,
      amount_cents: body.amount_cents,
      currency: body.currency,
      customer_id: body.customer_id,
      decision: evaluation.decision,
      reason: evaluation.reason,
      matched_rule_ids: evaluation.matched_rule_ids,
      risk_score: evaluation.risk_score,
      risk_level: evaluation.risk_level,
      policy_version: policyVersion,
      timestamp: new Date().toISOString(),
    };

    const proofHash = await computeProofHash(proofData);

    // Get latest audit chain for hash chaining
    const { chainIndex: prevChainIndex, prevHash } = await getLatestAuditChain(body.stripe_account_id);
    const newChainIndex = prevChainIndex + 1;

    // Record audit - fail-closed
    let auditRecorded = false;
    try {
      const supabase = getSupabaseAdmin() as any;
      const { error: auditError } = await supabase
        .from('stripe_operation_audits')
        .insert({
          stripe_account_id: body.stripe_account_id,
          stripe_event_id: body.stripe_event_id || decisionId,
          stripe_object_id: body.stripe_event_id || decisionId,
          operation_type: body.operation_type,
          dsg_decision_id: decisionId,
          dsg_decision: evaluation.decision,
          dsg_reason: evaluation.reason,
          dsg_proof: proofHash,
          payload: {
            ...proofData,
            prev_hash: prevHash,
            chain_index: newChainIndex,
          },
          status: 'recorded',
          prev_hash: prevHash,
          record_hash: proofHash,
          chain_index: newChainIndex,
          locked_at: new Date().toISOString(),
        });

      if (!auditError) {
        auditRecorded = true;
      } else {
        console.error('[EVALUATE] Audit insert failed:', auditError.message);
      }
    } catch (auditErr) {
      console.error('[EVALUATE] Audit exception:', auditErr);
    }

    const elapsedMs = Date.now() - startTime;

    const response: GatewayResponse = {
      decision: evaluation.decision,
      reason: evaluation.reason,
      decision_id: decisionId,
      approval_id: approvalId,
      proof_hash: proofHash,
      policy_version: policyVersion,
      audit_recorded: auditRecorded,
      risk_score: evaluation.risk_score,
      risk_level: evaluation.risk_level,
      matched_rule_ids: evaluation.matched_rule_ids,
      evaluation_time_ms: elapsedMs,
    };

    return NextResponse.json(response, { headers: corsHeaders });

  } catch (err) {
    console.error('Gateway evaluate error:', err);
    const errorDecisionId = generateDecisionId();
    const errorApprovalId = (await request.json() as EvaluateRequest)?.stripe_event_id || errorDecisionId;

    return NextResponse.json({
      decision: 'REVIEW',
      reason: 'Evaluation failed - fail-closed',
      decision_id: errorDecisionId,
      approval_id: errorApprovalId,
      proof_hash: '',
      policy_version: '1.0.0',
      audit_recorded: false,
      risk_score: 0,
      risk_level: 'low',
      matched_rule_ids: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500, headers: corsHeaders });
  }
}