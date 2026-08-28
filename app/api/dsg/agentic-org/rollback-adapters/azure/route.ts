import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';
import {
  executeAzureRollback,
  AzureRollbackError,
  type AzureRollbackConfig,
} from '@/lib/agent-governance/agentic-org/azure-rollback-adapter';

export const dynamic = 'force-dynamic';

const SHA256 = /^[0-9a-f]{64}$/i;

interface GovernedRollbackRequest {
  schemaVersion: 'dsg-governed-rollback-v1';
  promotionId: string;
  deploymentId: string;
  targetRepository: string;
  candidateCommit: string;
  adapter: string;
  rollbackTarget: string;
  controlEvidenceHash: string;
}

function isGovernedRollbackRequest(value: unknown): value is GovernedRollbackRequest {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return (
    body.schemaVersion === 'dsg-governed-rollback-v1' &&
    typeof body.promotionId === 'string' && body.promotionId.trim().length > 0 &&
    typeof body.deploymentId === 'string' && body.deploymentId.trim().length > 0 &&
    typeof body.targetRepository === 'string' &&
    typeof body.candidateCommit === 'string' &&
    typeof body.adapter === 'string' &&
    typeof body.rollbackTarget === 'string' && body.rollbackTarget.trim().length > 0 &&
    typeof body.controlEvidenceHash === 'string' && SHA256.test(body.controlEvidenceHash)
  );
}

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

function loadAzureConfig(): AzureRollbackConfig | { missing: string[] } {
  const tenantId = process.env.AZURE_TENANT_ID?.trim();
  const clientId = process.env.AZURE_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_CLIENT_SECRET?.trim();
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID?.trim();
  const resourceGroup = process.env.AZURE_RESOURCE_GROUP?.trim();
  const appServiceMapRaw = process.env.DSG_AZURE_APP_SERVICE_MAP?.trim();

  const missing = [
    ...(!tenantId ? ['AZURE_TENANT_ID'] : []),
    ...(!clientId ? ['AZURE_CLIENT_ID'] : []),
    ...(!clientSecret ? ['AZURE_CLIENT_SECRET'] : []),
    ...(!subscriptionId ? ['AZURE_SUBSCRIPTION_ID'] : []),
    ...(!resourceGroup ? ['AZURE_RESOURCE_GROUP'] : []),
    ...(!appServiceMapRaw ? ['DSG_AZURE_APP_SERVICE_MAP'] : []),
  ];
  if (missing.length > 0) return { missing };

  let appServiceByRepository: Record<string, string>;
  try {
    appServiceByRepository = JSON.parse(appServiceMapRaw!);
  } catch {
    return { missing: ['DSG_AZURE_APP_SERVICE_MAP (invalid JSON)'] };
  }

  return {
    tenantId: tenantId!,
    clientId: clientId!,
    clientSecret: clientSecret!,
    subscriptionId: subscriptionId!,
    resourceGroup: resourceGroup!,
    appServiceByRepository,
  };
}

/**
 * Receives the signed GovernedRollbackRequest that
 * lib/agent-governance/agentic-org/rollback-executor.ts sends from the
 * post-deploy control route, and performs a real Azure App Service
 * deployment-slot swap. See azure-rollback-adapter.ts for why this is the
 * chosen rollback mechanism and what remains unverified against live Azure.
 */
export async function POST(request: NextRequest) {
  const rollbackSecret = process.env.DSG_PRODUCTION_ROLLBACK_SECRET;
  if (!rollbackSecret) {
    return NextResponse.json({
      status: 'BLOCK',
      reason: 'AZURE_ROLLBACK_ADAPTER_NOT_CONFIGURED',
      missing: ['DSG_PRODUCTION_ROLLBACK_SECRET'],
    }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get('x-dsg-signature'), rollbackSecret)) {
    return NextResponse.json({ status: 'BLOCK', reason: 'AZURE_ROLLBACK_SIGNATURE_INVALID' }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: 'BLOCK', reason: 'AZURE_ROLLBACK_PAYLOAD_INVALID_JSON' }, { status: 400 });
  }
  if (!isGovernedRollbackRequest(parsed)) {
    return NextResponse.json({ status: 'BLOCK', reason: 'AZURE_ROLLBACK_PAYLOAD_INVALID' }, { status: 400 });
  }
  if (parsed.adapter.toUpperCase() !== 'AZURE') {
    return NextResponse.json({ status: 'BLOCK', reason: 'AZURE_ROLLBACK_ADAPTER_MISMATCH' }, { status: 400 });
  }

  const config = loadAzureConfig();
  if ('missing' in config) {
    return NextResponse.json({
      status: 'BLOCK',
      reason: 'AZURE_ROLLBACK_ADAPTER_NOT_CONFIGURED',
      missing: config.missing,
    }, { status: 503 });
  }

  try {
    const result = await executeAzureRollback(fetch, config, {
      targetRepository: parsed.targetRepository,
      promotionId: parsed.promotionId,
      deploymentId: parsed.deploymentId,
      rollbackTarget: parsed.rollbackTarget,
      healthProbePath: '/api/agent/status',
    });

    return NextResponse.json({
      schemaVersion: 'dsg-governed-rollback-evidence-v1',
      status: result.status,
      promotionId: parsed.promotionId,
      deploymentId: parsed.deploymentId,
      rollbackTarget: parsed.rollbackTarget,
      healthPassed: result.healthPassed,
      evidenceHash: result.evidenceHash,
    });
  } catch (error) {
    if (error instanceof AzureRollbackError) {
      return NextResponse.json({
        status: 'BLOCK',
        reason: error.code,
        message: error.message,
      }, { status: 502 });
    }
    return handleApiError('api/dsg/agentic-org/rollback-adapters/azure', error, {
      status: 502,
      details: { promotionId: parsed.promotionId, deploymentId: parsed.deploymentId },
    });
  }
}
