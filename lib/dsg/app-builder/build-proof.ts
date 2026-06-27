import { createHash } from 'node:crypto';
export type BuildProofStatus = 'FAILED'|'BLOCK'|'BUILD_VERIFIED';
export function finalizeBuildProof(log: string, ok: boolean) {
  const artifactHash = createHash('sha256').update(log).digest('hex');
  return { status: ok ? 'BUILD_VERIFIED' as BuildProofStatus : 'FAILED' as BuildProofStatus, artifactHash };
}
