import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import productionTargetJson from '@/config/production-deployment-target.json';
import {
  evaluatePostDeployControl,
  type DeploymentBinding,
  type MonitoringPostDeployResult,
  type ProductionTargetSnapshot,
  type PromotionReceipt,
} from '@/lib/agent-governance/agentic-org/post-deploy-control';
import { executeGovernedRollback } from '@/lib/agent-governance/agentic-org/rollback-executor';

export const dynamic = 'force-dynamic';

interface FeedbackBody {
  monitoring: MonitoringPostDeployResult;
  promotionReceipt: PromotionReceipt;
  deployment: DeploymentBinding;
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const supplied = signatureHeader.replace(/^sha256=/i, '').trim();
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(supplied, expected);
}

function isFeedbackBody(value: unknown): value is FeedbackBody {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return Boolean(body.monitoring && body.promotionReceipt && body.deployment);
}

export async function POST(request: NextRequest) {
  const feedbackSecret = process.env.DSG_POST_DEPLOY_FEEDBACK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!feedbackSecret || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({
      status: 'BLOCK',
      reason: 'POST_DEPLOY_CONTROL_NOT_CONFIGURED',
      missing: [
        ...(!feedbackSecret ? ['DSG_POST_DEPLOY_FEEDBACK_SECRET'] : []),
        ...(!supabaseUrl ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
        ...(!serviceRoleKey ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
      ],
    }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-dsg-signature'), feedbackSecret)) {
    return NextResponse.json({ status: 'BLOCK', reason: 'POST_DEPLOY_SIGNATURE_INVALID' }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: 'BLOCK', reason: 'POST_DEPLOY_PAYLOAD_INVALID_JSON' }, { status: 400 });
  }
  if (!isFeedbackBody(parsed) || !parsed.promotionReceipt?.promotionId) {
    return NextResponse.json({ status: 'BLOCK', reason: 'POST_DEPLOY_PAYLOAD_INVALID' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: canonicalRow, error: canonicalError } = await supabase
    .from('agentic_promotion_receipts')
    .select('promotion_id,promotion_hash,target_repository,baseline_commit,candidate_commit,receipt_payload')
    .eq('promotion_id', parsed.promotionReceipt.promotionId)
    .maybeSingle();

  if (canonicalError) {
    return NextResponse.json({ status: 'BLOCK', reason: 'CANONICAL_PROMOTION_RECEIPT_LOOKUP_FAILED' }, { status: 503 });
  }
  if (!canonicalRow) {
    return NextResponse.json({ status: 'BLOCK', reason: 'CANONICAL_PROMOTION_RECEIPT_NOT_FOUND' }, { status: 409 });
  }

  const canonicalReceipt = canonicalRow.receipt_payload as PromotionReceipt;
  const submittedReceiptMatches = parsed.promotionReceipt.promotionId === canonicalReceipt.promotionId &&
    parsed.promotionReceipt.promotionHash === canonicalReceipt.promotionHash &&
    parsed.promotionReceipt.targetRepository === canonicalReceipt.targetRepository &&
    parsed.promotionReceipt.baselineCommit === canonicalReceipt.baselineCommit &&
    parsed.promotionReceipt.candidateCommit === canonicalReceipt.candidateCommit &&
    canonicalRow.promotion_hash === canonicalReceipt.promotionHash &&
    canonicalRow.target_repository === canonicalReceipt.targetRepository &&
    canonicalRow.baseline_commit === canonicalReceipt.baselineCommit &&
    canonicalRow.candidate_commit === canonicalReceipt.candidateCommit;

  if (!submittedReceiptMatches) {
    return NextResponse.json({ status: 'BLOCK', reason: 'CANONICAL_PROMOTION_RECEIPT_MISMATCH' }, { status: 409 });
  }

  const productionTarget = productionTargetJson as ProductionTargetSnapshot;
  let control;
  try {
    control = evaluatePostDeployControl({
      monitoring: parsed.monitoring,
      promotionReceipt: canonicalReceipt,
      deployment: parsed.deployment,
      productionTarget,
    });
  } catch {
    return NextResponse.json({ status: 'BLOCK', reason: 'POST_DEPLOY_EVALUATION_FAILED' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('agentic_post_deploy_receipts')
    .select('promotion_id,deployment_id,baseline_commit,candidate_commit,monitoring_evidence_hash,control_evidence_hash,control_action')
    .eq('deployment_id', control.deploymentId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ status: 'BLOCK', reason: 'POST_DEPLOY_RECEIPT_LOOKUP_FAILED' }, { status: 503 });
  }

  if (existing) {
    const sameReceipt = existing.promotion_id === control.promotionId &&
      existing.baseline_commit === control.baselineCommit &&
      existing.candidate_commit === control.candidateCommit &&
      existing.monitoring_evidence_hash === control.monitoringEvidenceHash &&
      existing.control_evidence_hash === control.controlEvidenceHash &&
      existing.control_action === control.action;
    if (!sameReceipt) {
      return NextResponse.json({ status: 'BLOCK', reason: 'DEPLOYMENT_RECEIPT_CONFLICT' }, { status: 409 });
    }
  } else {
    const { error: insertError } = await supabase.from('agentic_post_deploy_receipts').insert({
      target_repository: canonicalReceipt.targetRepository,
      promotion_id: control.promotionId,
      deployment_id: control.deploymentId,
      baseline_commit: control.baselineCommit,
      candidate_commit: control.candidateCommit,
      monitoring_evidence_hash: control.monitoringEvidenceHash,
      control_evidence_hash: control.controlEvidenceHash,
      monitoring_status: parsed.monitoring.status,
      recommended_action: parsed.monitoring.data.recommendedAction,
      control_action: control.action,
      receipt_payload: { monitoring: parsed.monitoring, control },
    });
    if (insertError) {
      return NextResponse.json({ status: 'BLOCK', reason: 'POST_DEPLOY_RECEIPT_PERSIST_FAILED' }, { status: 503 });
    }
  }

  if (control.action === 'COMMIT_NEXT_BASELINE') {
    const { data: commitStatus, error: baselineError } = await supabase.rpc('dsg_commit_evolution_baseline', {
      p_target_repository: canonicalReceipt.targetRepository,
      p_expected_baseline: control.baselineCommit,
      p_next_baseline: control.nextBaselineCommit,
      p_source_deployment_id: control.deploymentId,
      p_promotion_id: control.promotionId,
      p_monitoring_evidence_hash: control.monitoringEvidenceHash,
      p_control_evidence_hash: control.controlEvidenceHash,
    });

    if (baselineError) {
      return NextResponse.json({ status: 'BLOCK', reason: 'NEXT_BASELINE_COMMIT_FAILED' }, { status: 503 });
    }
    if (commitStatus !== 'COMMITTED') {
      return NextResponse.json({
        status: 'BLOCK',
        reason: commitStatus === 'STALE_BASELINE' ? 'STALE_BASELINE' : 'NEXT_BASELINE_NOT_COMMITTED',
        control,
      }, { status: 409 });
    }
  }

  if (control.action === 'EXECUTE_ROLLBACK') {
    const rollbackSecret = process.env.DSG_PRODUCTION_ROLLBACK_SECRET;
    if (!rollbackSecret || !productionTarget.rollbackAdapterEndpoint || !control.rollbackAdapter || !control.rollbackTarget) {
      return NextResponse.json({
        status: 'BLOCK',
        reason: 'ROLLBACK_EXECUTOR_NOT_CONFIGURED',
        missing: [
          ...(!rollbackSecret ? ['DSG_PRODUCTION_ROLLBACK_SECRET'] : []),
          ...(!productionTarget.rollbackAdapterEndpoint ? ['rollbackAdapterEndpoint'] : []),
        ],
        control,
      }, { status: 503 });
    }

    const { data: existingRollback, error: rollbackLookupError } = await supabase
      .from('agentic_rollback_evidence')
      .select('promotion_id,deployment_id,rollback_adapter,rollback_target,control_evidence_hash,adapter_evidence_hash,health_passed,evidence_payload')
      .eq('deployment_id', control.deploymentId)
      .maybeSingle();

    if (rollbackLookupError) {
      return NextResponse.json({ status: 'BLOCK', reason: 'ROLLBACK_EVIDENCE_LOOKUP_FAILED', control }, { status: 503 });
    }

    if (existingRollback) {
      const sameRollback = existingRollback.promotion_id === control.promotionId &&
        existingRollback.rollback_adapter === control.rollbackAdapter &&
        existingRollback.rollback_target === control.rollbackTarget &&
        existingRollback.control_evidence_hash === control.controlEvidenceHash &&
        existingRollback.health_passed === true;
      if (!sameRollback) {
        return NextResponse.json({ status: 'BLOCK', reason: 'ROLLBACK_EVIDENCE_CONFLICT', control }, { status: 409 });
      }
      return NextResponse.json({
        status: 'PASS',
        reason: 'ROLLBACK_ALREADY_VERIFIED',
        control,
        rollback: existingRollback.evidence_payload,
        persisted: true,
        rollbackExecuted: true,
        baselineCommitted: false,
      });
    }

    let rollbackEvidence;
    try {
      rollbackEvidence = await executeGovernedRollback(
        productionTarget.rollbackAdapterEndpoint,
        rollbackSecret,
        {
          schemaVersion: 'dsg-governed-rollback-v1',
          promotionId: control.promotionId,
          deploymentId: control.deploymentId,
          targetRepository: canonicalReceipt.targetRepository,
          candidateCommit: control.candidateCommit,
          adapter: control.rollbackAdapter,
          rollbackTarget: control.rollbackTarget,
          controlEvidenceHash: control.controlEvidenceHash,
        },
      );
    } catch (error) {
      return NextResponse.json({
        status: 'BLOCK',
        reason: 'ROLLBACK_EXECUTION_FAILED',
        errorClass: error instanceof Error ? error.message : 'UNKNOWN',
        control,
      }, { status: 502 });
    }

    const { error: rollbackPersistError } = await supabase.from('agentic_rollback_evidence').insert({
      deployment_id: control.deploymentId,
      promotion_id: control.promotionId,
      target_repository: canonicalReceipt.targetRepository,
      candidate_commit: control.candidateCommit,
      rollback_adapter: control.rollbackAdapter,
      rollback_target: control.rollbackTarget,
      control_evidence_hash: control.controlEvidenceHash,
      adapter_evidence_hash: rollbackEvidence.evidenceHash,
      health_passed: rollbackEvidence.healthPassed,
      evidence_payload: rollbackEvidence,
    });
    if (rollbackPersistError) {
      return NextResponse.json({ status: 'BLOCK', reason: 'ROLLBACK_EVIDENCE_PERSIST_FAILED', control }, { status: 503 });
    }

    return NextResponse.json({
      status: 'PASS',
      reason: 'ROLLBACK_EXECUTED_AND_VERIFIED',
      control,
      rollback: rollbackEvidence,
      persisted: true,
      rollbackExecuted: true,
      baselineCommitted: false,
    });
  }

  if (control.action === 'BLOCK') {
    return NextResponse.json({ status: 'BLOCK', reason: 'POST_DEPLOY_CONTROL_BLOCKED', control }, { status: 409 });
  }

  return NextResponse.json({
    status: control.action === 'HOLD_REVIEW' ? 'REVIEW' : 'PASS',
    reason: control.action,
    control,
    persisted: true,
    baselineCommitted: control.action === 'COMMIT_NEXT_BASELINE',
    rollbackExecuted: false,
  }, { status: control.action === 'HOLD_REVIEW' ? 202 : 200 });
}
