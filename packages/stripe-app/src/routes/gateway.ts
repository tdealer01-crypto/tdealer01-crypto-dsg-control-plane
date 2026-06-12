/**
 * Gateway Evaluate Router
 *
 * Evaluates Stripe operations against governance policies.
 * P0-6: Logs every decision with decision_id, proof_hash, policy_version, audit_recorded
 * P0-7: Uses configurable stripe_policy_rules table
 * P0-8: Computes risk_score from real signals
 */

import { Hono } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';

const router = new Hono();

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ============ Types ============

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
}

// ============ Helpers ============

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
  if (!supabase) return { chainIndex: 0, prevHash: null };

  const { data } = await supabase
    .from('stripe_operation_audits')
    .select('chain_index, record_hash')
    .eq('stripe_account_id', stripeAccountId)
    .order('chain_index', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    return { chainIndex: data[0].chain_index, prevHash: data[0].record_hash };
  }
  return { chainIndex: 0, prevHash: null };
}

// ============ Risk Scoring (P0-8) ============

function computeRiskScore(params: {
  amount_cents?: number;
  currency?: string;
  customer_id?: string;
  payment_method_type?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  operation_type: string;
}): { score: number; level: 'low' | 'medium' | 'high' | 'critical' } {
  let score = 0;
  const factors: string[] = [];

  // Amount risk
  if (params.amount_cents) {
    const amountUsd = params.currency === 'usd' ? params.amount_cents : params.amount_cents * 1.0; // Simplified
    if (amountUsd > 5000000) { // $50,000
      score += 40;
      factors.push('very_high_amount');
    } else if (amountUsd > 1000000) { // $10,000
      score += 25;
      factors.push('high_amount');
    } else if (amountUsd > 100000) { // $1,000
      score += 10;
      factors.push('medium_amount');
    }
  }

  // Currency risk (non-USD adds risk)
  if (params.currency && params.currency !== 'usd') {
    score += 5;
    factors.push('foreign_currency');
  }

  // Operation type risk
  if (params.operation_type === 'payout') {
    score += 15;
    factors.push('payout_operation');
  } else if (params.operation_type === 'refund') {
    score += 10;
    factors.push('refund_operation');
  }

  // Payment method risk
  if (params.payment_method_type) {
    const highRiskMethods = ['bank_transfer', 'ach_debit', 'sepa_debit'];
    if (highRiskMethods.includes(params.payment_method_type)) {
      score += 15;
      factors.push('high_risk_payment_method');
    }
  }

  // Customer risk (new customer vs existing)
  if (!params.customer_id) {
    score += 10;
    factors.push('guest_checkout');
  }

  // Explicit risk level from Stripe/metadata
  if (params.risk_level) {
    const riskScores = { low: 0, medium: 15, high: 30, critical: 50 };
    score += riskScores[params.risk_level];
    factors.push(`explicit_${params.risk_level}_risk`);
  }

  // Cap at 100
  score = Math.min(score, 100);

  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 70) level = 'critical';
  else if (score >= 40) level = 'high';
  else if (score >= 20) level = 'medium';
  else level = 'low';

  return { score, level };
}

// ============ Policy Evaluation (P0-7) ============

async function loadPolicyRules(orgId: string, stripeAccountId?: string): Promise<PolicyRule[]> {
  if (!supabase) return [];

  let query = supabase
    .from('stripe_policy_rules')
    .select('*')
    .eq('org_id', orgId)
    .eq('enabled', true)
    .order('priority', { ascending: true });

  if (stripeAccountId) {
    // Get account-specific rules OR org-wide rules (null stripe_account_id)
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
        const maxOps = conditions.max_operations as number | undefined;
        const windowSec = conditions.window_seconds as number | undefined;
        // Would need to query recent operations count - simplified for now
        if (maxOps && windowSec) {
          // TODO: Implement rate limit check against audit table
          matched = false;
        }
        break;
      }

      case 'time_window': {
        const start = conditions.start_time as string | undefined; // HH:MM
        const end = conditions.end_time as string | undefined;
        const tz = conditions.timezone as string | undefined;
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
      // First matching rule by priority wins
      decision = rule.action;
      reason = ruleReason || `Matched rule: ${rule.name}`;
      break;
    }
  }

  // If no policy matched, apply risk-based fallback (P0-8)
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

// ============ Main Evaluation Endpoint ============

/**
 * POST /stripe/gateway/evaluate
 *
 * Evaluates a Stripe operation against governance policies.
 * Every decision is logged with proof hash and policy version.
 *
 * Request body:
 * {
 *   "stripe_account_id": "acct_...",
 *   "operation_type": "charge" | "payout" | "refund" | "payment_intent",
 *   "amount_cents": 10000,
 *   "currency": "usd",
 *   "customer_id": "cus_...",
 *   "payment_method_type": "card",
 *   "risk_level": "low" | "medium" | "high" | "critical",
 *   "metadata": {},
 *   "stripe_event_id": "evt_..."
 * }
 *
 * Response:
 * {
 *   "decision": "ALLOW" | "BLOCK" | "REVIEW",
 *   "reason": "...",
 *   "decision_id": "dec_...",
 *   "proof_hash": "sha256...",
 *   "policy_version": "1.0.0",
 *   "audit_recorded": true,
 *   "risk_score": 25,
 *   "risk_level": "low",
 *   "matched_rule_ids": ["rule-uuid"]
 * }
 */
router.post('/evaluate', async (c) => {
  const startTime = Date.now();

  // Parse body outside try so it's accessible in catch
  const body = await c.req.json<EvaluateRequest>();

  try {

    // Validate required fields
    if (!body.stripe_account_id) {
      return c.json({ error: 'Missing stripe_account_id' }, 400);
    }
    if (!body.operation_type) {
      return c.json({ error: 'Missing operation_type' }, 400);
    }

    if (!supabase) {
      return c.json({ error: 'Database not configured' }, 500);
    }

    // Get org_id from stripe account
    const { data: account } = await supabase
      .from('stripe_app_accounts')
      .select('dsg_org_id, status')
      .eq('stripe_account_id', body.stripe_account_id)
      .maybeSingle();

    if (!account) {
      return c.json({ error: 'Stripe account not found' }, 404);
    }
    if (account.status !== 'active') {
      return c.json({ error: 'Stripe account not active', status: account.status }, 403);
    }

    const orgId = account.dsg_org_id;

    // Load policy rules (P0-7)
    const rules = await loadPolicyRules(orgId, body.stripe_account_id);

    // Compute risk score (P0-8)
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

    // Generate decision ID and proof hash (P0-6)
    const decisionId = generateDecisionId();
    const policyVersion = '1.0.0'; // Could be from policies table version column

    // The approval_id is the stripe_event_id used in audit (for approval endpoint lookup)
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

    // Get latest audit chain for hash chaining (P0-5)
    const { chainIndex: prevChainIndex, prevHash } = await getLatestAuditChain(body.stripe_account_id);
    const newChainIndex = prevChainIndex + 1;

    // Record audit (P0-4, P0-6) - fail-closed
    let auditRecorded = false;
    try {
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

      if (auditError) {
        console.error('[EVALUATE] Audit insert failed:', auditError.message);
        // P0-4: fail-closed - if audit fails, return REVIEW with reason
        return c.json({
          decision: 'REVIEW',
          reason: 'Audit recording unavailable - fail-closed',
          decision_id: decisionId,
          approval_id: approvalId,
          proof_hash: proofHash,
          policy_version: policyVersion,
          audit_recorded: false,
          risk_score: evaluation.risk_score,
          risk_level: evaluation.risk_level,
          matched_rule_ids: evaluation.matched_rule_ids,
        }, 503);
      }
      auditRecorded = true;
    } catch (auditErr) {
      console.error('[EVALUATE] Audit exception:', auditErr);
      return c.json({
        decision: 'REVIEW',
        reason: 'Audit recording failed - fail-closed',
        decision_id: decisionId,
        approval_id: approvalId,
        proof_hash: proofHash,
        policy_version: policyVersion,
        audit_recorded: false,
        risk_score: evaluation.risk_score,
        risk_level: evaluation.risk_level,
        matched_rule_ids: evaluation.matched_rule_ids,
      }, 503);
    }

    const elapsedMs = Date.now() - startTime;

    return c.json({
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
    }, 200);

  } catch (err) {
    console.error('Gateway evaluate error:', err);
    const errorDecisionId = generateDecisionId();
    const errorApprovalId = body.stripe_event_id || errorDecisionId;
    return c.json({
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
    }, 500);
  }
});

export default router;