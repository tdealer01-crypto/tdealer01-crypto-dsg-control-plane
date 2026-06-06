/**
 * Deterministic App Builder flow proof.
 *
 * Produces a stable, content-addressed description of the App Builder
 * governance flow for a given goal. It enumerates the ordered gate stages the
 * flow must pass and derives a deterministic proof hash over them via the
 * runtime canonical hasher, so the same goal always yields the same proof hash.
 *
 * This is evidence-mapping scaffold output. It records the intended flow and a
 * tamper-evident hash; it is not proof that any external build, deploy, or
 * production step actually executed.
 */

import { sha256Json } from '@/lib/dsg/runtime/hash';

export type AppBuilderFlowStage = {
  id: string;
  label: string;
  /** Gate semantics for this stage. */
  gate: 'plan' | 'approval' | 'runtime' | 'build' | 'evidence';
  /** What must be true before the flow may advance past this stage. */
  requirement: string;
};

export type AppBuilderFlowProof = {
  ok: true;
  kind: 'app_builder_flow_proof';
  goal: string;
  generatedAt: string;
  stages: AppBuilderFlowStage[];
  /** Deterministic hash over goal + ordered stage definitions. */
  proofHash: string;
  truthBoundary: string;
};

const FLOW_STAGES: AppBuilderFlowStage[] = [
  {
    id: 'plan',
    label: 'Visible plan generated',
    gate: 'plan',
    requirement: 'A human-readable plan snapshot exists before any execution.',
  },
  {
    id: 'approval',
    label: 'Plan approved',
    gate: 'approval',
    requirement: 'An authorized actor approves the plan; planHash is locked.',
  },
  {
    id: 'runtime',
    label: 'Runtime environment provisioned',
    gate: 'runtime',
    requirement: 'Runtime environment + action-layer contract prepared under approval.',
  },
  {
    id: 'build',
    label: 'Implementation PR generated',
    gate: 'build',
    requirement: 'Generated files written to a branch and a pull request opened.',
  },
  {
    id: 'evidence',
    label: 'Evidence recorded',
    gate: 'evidence',
    requirement: 'Audit event + evidence references captured; no evidence means block.',
  },
];

/**
 * Build a deterministic App Builder flow proof for `goal`.
 *
 * The proof hash covers the goal and the ordered stage definitions only, so it
 * is reproducible. The `generatedAt` timestamp is metadata and intentionally
 * excluded from the hash.
 */
export function createAppBuilderFlowProof(goal: string): AppBuilderFlowProof {
  const normalizedGoal = goal.trim();
  const proofHash = sha256Json({ goal: normalizedGoal, stages: FLOW_STAGES });

  return {
    ok: true,
    kind: 'app_builder_flow_proof',
    goal: normalizedGoal,
    generatedAt: new Date().toISOString(),
    stages: FLOW_STAGES,
    proofHash,
    truthBoundary:
      'Deterministic flow + proof hash only. Records the governed App Builder stages; not proof that build, CI, deploy, or production steps executed.',
  };
}
