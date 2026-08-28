import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import productionTargetJson from '@/config/production-deployment-target.json';
import type { ProductionTargetSnapshot } from '@/lib/agent-governance/agentic-org/post-deploy-control';
import {
  bindDeploymentToPromotion,
  isDeploymentRecordRequest,
} from '@/lib/agent-governance/agentic-org/deployment-record';

export const dynamic = 'force-dynamic';

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const supplied = header.replace(/^sha256=/i, '').trim();
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqualHex(supplied, expected);
}

/**
 * Records that a promoted candidate was actually deployed.
 *
 * This exists because post-deploy control took the DeploymentBinding straight
 * from the monitoring payload: a caller could name a deploymentId for a deploy
 * that never happened. The deploy step calls this immediately after the slot
 * swap; post-deploy control then requires a matching row before acting on any
 * canary evidence.
 *
 * Every field is cross-checked against the canonical promotion receipt already
 * persisted by promotion/evaluate. Nothing here can create a deployment record
 * for a candidate the Control Plane never issued an ALLOW for.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.DSG_PROMOTION_EVALUATION_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({
      status: 'BLOCK',
      reason: 'DEPLOYMENT_RECORD_NOT_CONFIGURED',
      missing: [
        ...(!secret ? ['DSG_PROMOTION_EVALUATION_SECRET'] : []),
        ...(!supabaseUrl ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
        ...(!serviceRoleKey ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
      ],
    }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-dsg-signature'), secret)) {
    return NextResponse.json({ status: 'BLOCK', reason: 'DEPLOYMENT_RECORD_SIGNATURE_INVALID' }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: 'BLOCK', reason: 'DEPLOYMENT_RECORD_INVALID_JSON' }, { status: 400 });
  }
  if (!isDeploymentRecordRequest(parsed)) {
    return NextResponse.json({ status: 'BLOCK', reason: 'DEPLOYMENT_RECORD_PAYLOAD_INVALID' }, { status: 400 });
  }

  const target = productionTargetJson as ProductionTargetSnapshot;
  if (target.provider === 'UNBOUND' || target.productionDeployEnabled !== true) {
    return NextResponse.json({ status: 'BLOCK', reason: 'PRODUCTION_TARGET_UNBOUND' }, { status: 409 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: receipt, error: receiptError } = await supabase
    .from('agentic_promotion_receipts')
    .select('promotion_id,promotion_hash,target_repository,baseline_commit,candidate_commit')
    .eq('promotion_id', parsed.promotionId)
    .maybeSingle();

  if (receiptError) {
    return NextResponse.json({ status: 'BLOCK', reason: 'PROMOTION_RECEIPT_LOOKUP_FAILED' }, { status: 503 });
  }
  if (!receipt) {
    return NextResponse.json({ status: 'BLOCK', reason: 'PROMOTION_RECEIPT_NOT_FOUND' }, { status: 409 });
  }

  const bindingFailures = bindDeploymentToPromotion(parsed, receipt, target.provider);
  if (bindingFailures.length > 0) {
    return NextResponse.json({ status: 'BLOCK', reason: bindingFailures[0], failures: bindingFailures }, { status: 409 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('agentic_deployment_records')
    .select('deployment_id,promotion_id,candidate_commit,provider,deployment_slot')
    .eq('deployment_id', parsed.deploymentId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ status: 'BLOCK', reason: 'DEPLOYMENT_RECORD_LOOKUP_FAILED' }, { status: 503 });
  }

  if (existing) {
    const same = existing.promotion_id === parsed.promotionId &&
      existing.candidate_commit === parsed.candidateCommit &&
      existing.provider === parsed.provider &&
      existing.deployment_slot === parsed.deploymentSlot;
    if (!same) {
      return NextResponse.json({ status: 'BLOCK', reason: 'DEPLOYMENT_RECORD_CONFLICT' }, { status: 409 });
    }
    return NextResponse.json({
      status: 'PASS',
      reason: 'DEPLOYMENT_ALREADY_RECORDED',
      deploymentId: parsed.deploymentId,
      promotionId: parsed.promotionId,
    });
  }

  const { error: insertError } = await supabase.from('agentic_deployment_records').insert({
    deployment_id: parsed.deploymentId,
    promotion_id: parsed.promotionId,
    target_repository: parsed.targetRepository,
    baseline_commit: parsed.baselineCommit,
    candidate_commit: parsed.candidateCommit,
    provider: parsed.provider,
    deployment_slot: parsed.deploymentSlot,
    image_digest: parsed.imageDigest ?? null,
    workflow_run_uri: parsed.workflowRunUri,
  });

  if (insertError) {
    return NextResponse.json({ status: 'BLOCK', reason: 'DEPLOYMENT_RECORD_PERSIST_FAILED' }, { status: 503 });
  }

  return NextResponse.json({
    status: 'PASS',
    reason: 'DEPLOYMENT_RECORDED',
    deploymentId: parsed.deploymentId,
    promotionId: parsed.promotionId,
  });
}
