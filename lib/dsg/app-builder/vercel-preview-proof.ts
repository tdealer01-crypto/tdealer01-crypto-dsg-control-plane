import { createHash } from 'crypto';

type DeployProofStatus = 'BLOCK' | 'PREVIEW_DEPLOYED' | 'PASS';

export type VercelProofInput = {
  token?: string;
  projectId?: string;
  deploymentId?: string;
  deploymentUrl?: string;
  deploymentStatus?: string;
  healthPassed?: boolean;
};

export type DeployProof = {
  status: DeployProofStatus;
  preview_url?: string;
  deploymentId?: string;
  deploymentStatus?: string;
  projectId?: string;
  healthPassed?: boolean;
  proofHash: string;
  reason?: string;
};

function sha256Json(value: unknown): string {
  const stable = JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
  return `sha256:${createHash('sha256').update(stable).digest('hex')}`;
}

export function verifyVercelPreview(input: VercelProofInput): DeployProof {
  const base = {
    preview_url: input.deploymentUrl,
    deploymentId: input.deploymentId,
    deploymentStatus: input.deploymentStatus,
    projectId: input.projectId,
    healthPassed: input.healthPassed,
  };

  if (!input.token) {
    const payload = { status: 'BLOCK' as const, reason: 'MISSING_VERCEL_TOKEN', ...base };
    return { ...payload, proofHash: sha256Json(payload) };
  }

  if (!input.deploymentUrl) {
    const payload = { status: 'BLOCK' as const, reason: 'MISSING_PREVIEW_URL', ...base };
    return { ...payload, proofHash: sha256Json(payload) };
  }

  if (!input.projectId) {
    const payload = { status: 'BLOCK' as const, reason: 'MISSING_VERCEL_PROJECT_ID', ...base };
    return { ...payload, proofHash: sha256Json(payload) };
  }

  if (!input.deploymentStatus) {
    const payload = { status: 'BLOCK' as const, reason: 'MISSING_DEPLOYMENT_STATUS', ...base };
    return { ...payload, proofHash: sha256Json(payload) };
  }

  const normalized = input.deploymentStatus.toLowerCase();
  if (normalized !== 'ready') {
    const payload = { status: 'PREVIEW_DEPLOYED' as const, reason: 'DEPLOYMENT_NOT_READY', ...base };
    return { ...payload, proofHash: sha256Json(payload) };
  }

  if (!input.healthPassed) {
    const payload = { status: 'PREVIEW_DEPLOYED' as const, reason: 'HEALTHCHECK_FAILED', ...base };
    return { ...payload, proofHash: sha256Json(payload) };
  }

  const payload = { status: 'PASS' as const, reason: 'VERCEL_READY_AND_HEALTHY', ...base };
  return { ...payload, proofHash: sha256Json(payload) };
}
