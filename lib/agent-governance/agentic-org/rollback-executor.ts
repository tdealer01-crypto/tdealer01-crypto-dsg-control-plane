import crypto from 'node:crypto';

export interface GovernedRollbackRequest {
  schemaVersion: 'dsg-governed-rollback-v1';
  promotionId: string;
  deploymentId: string;
  targetRepository: string;
  candidateCommit: string;
  adapter: string;
  rollbackTarget: string;
  controlEvidenceHash: string;
}

export interface GovernedRollbackEvidence {
  schemaVersion: 'dsg-governed-rollback-evidence-v1';
  status: 'ROLLED_BACK';
  promotionId: string;
  deploymentId: string;
  rollbackTarget: string;
  healthPassed: true;
  evidenceHash: string;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
const SHA256 = /^[0-9a-f]{64}$/i;

export async function executeGovernedRollback(
  endpoint: string,
  secret: string,
  request: GovernedRollbackRequest,
  fetcher: FetchLike = fetch,
): Promise<GovernedRollbackEvidence> {
  if (!endpoint.startsWith('https://')) throw new Error('ROLLBACK_ENDPOINT_MUST_BE_HTTPS');
  if (!secret.trim()) throw new Error('ROLLBACK_SECRET_MISSING');
  if (!SHA256.test(request.controlEvidenceHash)) throw new Error('ROLLBACK_CONTROL_EVIDENCE_HASH_INVALID');

  const rawBody = JSON.stringify(request);
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-dsg-signature': `sha256=${signature}`,
    },
    body: rawBody,
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error('ROLLBACK_ADAPTER_INVALID_JSON');
  }

  if (!response.ok) throw new Error(`ROLLBACK_ADAPTER_HTTP_${response.status}`);
  if (!body || typeof body !== 'object') throw new Error('ROLLBACK_EVIDENCE_INVALID');
  const evidence = body as Partial<GovernedRollbackEvidence>;
  if (evidence.schemaVersion !== 'dsg-governed-rollback-evidence-v1' ||
      evidence.status !== 'ROLLED_BACK' ||
      evidence.promotionId !== request.promotionId ||
      evidence.deploymentId !== request.deploymentId ||
      evidence.rollbackTarget !== request.rollbackTarget ||
      evidence.healthPassed !== true ||
      typeof evidence.evidenceHash !== 'string' || !SHA256.test(evidence.evidenceHash)) {
    throw new Error('ROLLBACK_EVIDENCE_BINDING_INVALID');
  }

  return evidence as GovernedRollbackEvidence;
}
