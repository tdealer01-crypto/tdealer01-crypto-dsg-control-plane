#!/usr/bin/env node

import { createHash } from 'crypto';

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stableJson(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function sha256Json(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(stableJson(value))).digest('hex')}`;
}

async function fetchDeployment({ token, deploymentId, deploymentUrl, teamId }) {
  if (!deploymentId && !deploymentUrl) return null;
  const query = new URLSearchParams();
  if (teamId) query.set('teamId', teamId);
  const base = deploymentId
    ? `https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentId)}`
    : `https://api.vercel.com/v13/deployments/get?url=${encodeURIComponent(deploymentUrl)}`;
  const url = query.toString() ? `${base}${base.includes('?') ? '&' : '?'}${query.toString()}` : base;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`VERCEL_DEPLOYMENT_LOOKUP_FAILED:${res.status}:${text.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchHealth(url) {
  if (!url) return { ok: false, status: 0, error: 'MISSING_PREVIEW_URL' };
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    return { ok: res.ok, status: res.status };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : 'HEALTHCHECK_FAILED' };
  }
}

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;
const teamId = process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID;
const deploymentIdInput = process.env.VERCEL_DEPLOYMENT_ID;
const previewUrlInput = process.env.DSG_VERCEL_PREVIEW_URL;

const artifact = {
  provider: 'vercel',
  projectId: projectId || null,
  deploymentId: deploymentIdInput || null,
  previewUrl: previewUrlInput || null,
  deploymentStatus: null,
  health: { ok: false, status: 0, error: null },
  status: 'BLOCK',
  reason: null,
  verifiedAt: new Date().toISOString(),
};

if (!token) {
  artifact.reason = 'MISSING_VERCEL_TOKEN';
} else if (!projectId) {
  artifact.reason = 'MISSING_VERCEL_PROJECT_ID';
} else {
  try {
    const deployment = await fetchDeployment({ token, deploymentId: deploymentIdInput, deploymentUrl: previewUrlInput, teamId });
    if (!deployment) {
      artifact.reason = 'MISSING_DEPLOYMENT_DATA';
    } else {
      const deploymentUrl = deployment.url ? `https://${deployment.url}` : previewUrlInput || null;
      artifact.deploymentId = deployment.id || artifact.deploymentId;
      artifact.previewUrl = deploymentUrl;
      artifact.deploymentStatus = deployment.readyState || deployment.state || null;

      if (!artifact.previewUrl || !artifact.deploymentStatus) {
        artifact.reason = 'MISSING_DEPLOYMENT_DATA';
      } else {
        artifact.health = await fetchHealth(artifact.previewUrl);
        if (String(artifact.deploymentStatus).toLowerCase() === 'ready' && artifact.health.ok) {
          artifact.status = 'PASS';
          artifact.reason = 'VERCEL_READY_AND_HEALTHY';
        } else {
          artifact.status = 'PREVIEW_DEPLOYED';
          artifact.reason = artifact.health.ok ? 'DEPLOYMENT_NOT_READY' : 'HEALTHCHECK_FAILED';
        }
      }
    }
  } catch (error) {
    artifact.reason = error instanceof Error ? error.message : 'VERCEL_PREVIEW_PROOF_FAILED';
  }
}

artifact.proofHash = sha256Json({
  provider: artifact.provider,
  projectId: artifact.projectId,
  deploymentId: artifact.deploymentId,
  previewUrl: artifact.previewUrl,
  deploymentStatus: artifact.deploymentStatus,
  health: artifact.health,
  status: artifact.status,
  reason: artifact.reason,
});

console.log(JSON.stringify(artifact));
process.exit(artifact.status === 'BLOCK' ? 1 : 0);
