import { evaluateArtifactTimelineProof, type ArtifactTimelineProof } from './artifact-timeline-contract';
import { evaluateBrowserSessionProof, type BrowserSessionProof } from './browser-session-contract';
import { evaluatePreviewDeploymentProof, type PreviewDeploymentProof } from './preview-proof-contract';
import { evaluateRepairLoopProof, type RepairLoopProof } from './repair-loop-contract';
import { evaluateSandboxIsolationProof, type SandboxIsolationProof } from './sandbox-isolation-contract';

export type DsgParallelAutonomousProof = {
  sandbox?: Partial<SandboxIsolationProof>;
  repair?: Partial<RepairLoopProof>;
  browser?: Partial<BrowserSessionProof>;
  timeline?: Partial<ArtifactTimelineProof>;
  preview?: Partial<PreviewDeploymentProof>;
};

export function evaluateDsgParallelAutonomousWork(proof: DsgParallelAutonomousProof = {}) {
  const lanes = {
    sandbox_isolation: evaluateSandboxIsolationProof(proof.sandbox),
    agent_repair_loop: evaluateRepairLoopProof(proof.repair),
    remote_browser_session: evaluateBrowserSessionProof(proof.browser),
    artifact_timeline: evaluateArtifactTimelineProof(proof.timeline),
    preview_deployment_proof: evaluatePreviewDeploymentProof(proof.preview),
  };
  const entries = Object.entries(lanes);
  const passed = entries.filter(([, result]) => result.ok).length;
  const blocked = entries.filter(([, result]) => !result.ok).map(([id]) => id);

  return {
    ok: blocked.length === 0,
    claim: blocked.length === 0 ? 'DSG_AUTONOMOUS_RUNTIME_PROOF_COMPLETE' : 'DSG_AUTONOMOUS_RUNTIME_PROOF_INCOMPLETE',
    passed,
    total: entries.length,
    blocked,
    lanes,
  };
}
