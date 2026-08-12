import { sha256Json } from '@/lib/dsg/runtime/hash';
import {
  createAuditLedgerEntry,
  verifyAuditHashChain,
  type AuditLedgerEntry,
} from '@/lib/dsg/runtime/audit';
import { createEvidenceManifest, type EvidenceManifest } from '@/lib/dsg/runtime/evidence';
import { verifyReplay } from '@/lib/dsg/runtime/replay';
import type { EvidenceItem } from '@/lib/dsg/runtime/types';
import { optimizeWithIsing } from '@/lib/dsg-one/ising-optimizer';
import { solveQubo } from '@/lib/dsg-one/ising-solver-core';
import { evaluateSecurityRemediationGate } from '@/lib/dsg/security-remediation/gate';
import type { SecurityRemediationFacts } from '@/lib/dsg/security-remediation/types';
import { executeRepairInWorktree } from './executor';
import {
  canonicalFinding,
  hashSelectedPlan,
  sortCandidates,
} from './canonical';
import { buildRepairQubo, selectedCandidateIds, type RepairQubo } from './qubo';
import { verifyRepairAssignment } from './z3';
import type {
  RepairCandidate,
  RepairExecutionResult,
  RepairEvidenceRef,
  RepairFinding,
  RepairSolverResult,
  RepairValidationResult,
  VerifiedRepairEvidencePack,
  VerifiedRepairRequest,
  VerifiedRepairResult,
} from './types';
import { VERIFIED_REPAIR_SCHEMA } from './types';

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const SHA_PATTERN = /^[a-f0-9]{7,64}$/i;
const MAX_CANDIDATES = 128;

function blockedResult(
  jobId: string,
  reason: string,
  nextAction = 'แก้ข้อมูลที่ระบุแล้วส่งแผนเข้าตรวจใหม่',
  planningOnly = true,
): VerifiedRepairResult {
  return {
    schema: VERIFIED_REPAIR_SCHEMA,
    jobId,
    status: 'BLOCKED',
    verdict: 'BLOCK',
    planningOnly,
    selectedCandidateIds: [],
    gate: {
      finalDecision: 'BLOCK_INPUT_VALIDATION',
      allowed: false,
      claimAllowed: false,
      reasons: [reason],
      nextRequiredEvidence: [],
    },
    counterexample: [reason],
    nextAction,
    userOutcome: `ไม่ผ่าน: ${reason}`,
  };
}

function validRelativePath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  const normalized = value.replaceAll('\\', '/');
  return !normalized.startsWith('/') &&
    !normalized.split('/').some((part) => part === '..' || part === '') &&
    !/(^|\/)(?:\.git|node_modules)(?:\/|$)/i.test(normalized) &&
    !/(^|\/)\.env(?:\.|$)/i.test(normalized);
}

function validEvidence(evidence: unknown): evidence is RepairEvidenceRef[] {
  return Array.isArray(evidence) && evidence.length > 0 && evidence.every((item) =>
    item && typeof item === 'object' &&
    typeof (item as RepairEvidenceRef).id === 'string' &&
    typeof (item as RepairEvidenceRef).type === 'string' &&
    HASH_PATTERN.test((item as RepairEvidenceRef).contentHash),
  );
}

function validateInput(input: VerifiedRepairRequest): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') return ['REQUEST_REQUIRED'];
  if (typeof input.jobId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(input.jobId)) errors.push('INVALID_JOB_ID');
  if (!input.finding || typeof input.finding !== 'object') errors.push('FINDING_REQUIRED');
  if (!Array.isArray(input.allowedFiles) || input.allowedFiles.length === 0) errors.push('ALLOWED_FILES_REQUIRED');
  if (!Array.isArray(input.candidates) || input.candidates.length === 0) errors.push('CANDIDATES_REQUIRED');
  if (Array.isArray(input.candidates) && input.candidates.length > MAX_CANDIDATES) errors.push('TOO_MANY_CANDIDATES');

  const finding = input.finding as RepairFinding;
  if (finding) {
    if (typeof finding.id !== 'string' || !finding.id.trim() || typeof finding.summary !== 'string' || !finding.summary.trim()) {
      errors.push('FINDING_ID_AND_SUMMARY_REQUIRED');
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(finding.severity)) errors.push('INVALID_FINDING_SEVERITY');
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(finding.executionRisk)) errors.push('INVALID_EXECUTION_RISK');
    if (!Array.isArray(finding.affectedFiles) || finding.affectedFiles.length === 0) errors.push('AFFECTED_FILES_REQUIRED');
    if (Array.isArray(finding.affectedFiles) && finding.affectedFiles.some((file) => !validRelativePath(file))) errors.push('INVALID_FINDING_FILE');
    if (!validEvidence(finding.evidence)) errors.push('VERIFIED_FINDING_EVIDENCE_REQUIRED');
    if (finding.evidence?.every((item) => !['scan_output', 'test_output', 'api_response'].includes(item.type))) {
      errors.push('REPRO_OR_SCAN_EVIDENCE_REQUIRED');
    }
  }

  const allowed = new Set(Array.isArray(input.allowedFiles) ? input.allowedFiles : []);
  if (Array.isArray(input.allowedFiles) && input.allowedFiles.some((file) => !validRelativePath(file))) errors.push('INVALID_ALLOWED_FILE');
  const affected = new Set(Array.isArray(finding?.affectedFiles) ? finding.affectedFiles : []);
  const ids = new Set<string>();
  for (const candidate of Array.isArray(input.candidates) ? input.candidates : []) {
    if (!candidate || typeof candidate !== 'object') {
      errors.push('INVALID_CANDIDATE');
      continue;
    }
    const candidateId = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : 'unknown';
    if (candidateId === 'unknown' || ids.has(candidateId)) errors.push(`DUPLICATE_OR_EMPTY_CANDIDATE:${candidateId}`);
    if (candidateId !== 'unknown') ids.add(candidateId);
    if (typeof candidate.changeGroup !== 'string' || !candidate.changeGroup.trim()) errors.push(`CANDIDATE_GROUP_REQUIRED:${candidateId}`);
    if (!validRelativePath(candidate.file)) errors.push(`INVALID_CANDIDATE_FILE:${candidateId}`);
    if (typeof candidate.expected !== 'string' || candidate.expected.length === 0) errors.push(`EXPECTED_TEXT_REQUIRED:${candidateId}`);
    if (typeof candidate.replacement !== 'string') errors.push(`REPLACEMENT_TEXT_REQUIRED:${candidateId}`);
    if (typeof candidate.rationale !== 'string' || !candidate.rationale.trim()) errors.push(`RATIONALE_REQUIRED:${candidateId}`);
    if (candidate.conflictsWith !== undefined && (!Array.isArray(candidate.conflictsWith) || candidate.conflictsWith.some((id) => typeof id !== 'string'))) {
      errors.push(`INVALID_CONFLICTS_WITH:${candidateId}`);
    }
    if (candidate.requires !== undefined && (!Array.isArray(candidate.requires) || candidate.requires.some((id) => typeof id !== 'string'))) {
      errors.push(`INVALID_REQUIRES:${candidateId}`);
    }
    if (validRelativePath(candidate.file) && !allowed.has(candidate.file)) errors.push(`FILE_NOT_IN_ALLOWED_SCOPE:${candidateId}`);
    if (validRelativePath(candidate.file) && !affected.has(candidate.file)) errors.push(`FILE_NOT_IN_FINDING_SCOPE:${candidateId}`);
  }
  for (const candidate of Array.isArray(input.candidates) ? input.candidates : []) {
    const references = [
      ...(Array.isArray(candidate.conflictsWith) ? candidate.conflictsWith : []),
      ...(Array.isArray(candidate.requires) ? candidate.requires : []),
    ];
    for (const id of references) {
      if (!ids.has(id)) errors.push(`UNKNOWN_CANDIDATE_REFERENCE:${candidate.id || 'unknown'}:${id}`);
    }
  }

  if (input.execute) {
    if (!input.repoRoot) errors.push('REPOSITORY_CHECKOUT_REQUIRED');
    if (input.baseCommit && !SHA_PATTERN.test(input.baseCommit)) errors.push('BASE_COMMIT_SHA_REQUIRED');
    if (!['none', 'fast', 'full'].includes(input.validationProfile ?? 'none')) errors.push('INVALID_VALIDATION_PROFILE');
  }
  if (input.solver?.mode !== undefined && !['pinned', 'live'].includes(input.solver.mode)) errors.push('INVALID_SOLVER_MODE');
  if (input.solver?.seed !== undefined && (!Number.isInteger(input.solver.seed) || input.solver.seed < 0)) errors.push('INVALID_SOLVER_SEED');
  if (input.solver?.timeoutMs !== undefined && (!Number.isInteger(input.solver.timeoutMs) || input.solver.timeoutMs < 1 || input.solver.timeoutMs > 30_000)) {
    errors.push('INVALID_SOLVER_TIMEOUT');
  }
  if ((input.solver?.mode ?? 'pinned') === 'live' && !process.env.NVIDIA_ISING_API_URL?.trim()) {
    errors.push('NVIDIA_ISING_API_URL_REQUIRED_FOR_LIVE_SOLVER');
  }
  return errors;
}

function solverSolutionToNumbers(solution: Record<string, number | boolean>): Record<string, number> {
  return Object.fromEntries(Object.entries(solution).map(([key, value]) => [key, Number(value)]));
}

async function solveRepairQubo(
  qubo: RepairQubo,
  request: VerifiedRepairRequest,
): Promise<RepairSolverResult> {
  const mode = request.solver?.mode ?? 'pinned';
  const seed = request.solver?.seed ?? 0;
  if (mode === 'pinned') {
    const startedAt = Date.now();
    const solved = solveQubo({
      Q: qubo.Q,
      linear: qubo.linear,
      numVariables: qubo.numVariables,
      seed,
    });
    const solution: Record<string, number> = {};
    for (const [index, variable] of qubo.variables.entries()) solution[variable.id] = solved.solution[index];
    const solutionHash = sha256Json(Object.entries(solution).sort());
    return {
      mode: 'deterministic-local',
      solverVersion: solved.version,
      solution,
      energy: solved.energy + qubo.constant,
      solveTimeMs: Date.now() - startedAt,
      quboHash: qubo.problemHash,
      solutionHash,
    };
  }

  const result = await optimizeWithIsing({
    problemId: request.jobId,
    quboMatrix: qubo,
    timeout: request.solver?.timeoutMs ?? 5_000,
    useMock: false,
    seed,
    fallbackToMock: false,
  });
  return {
    mode: 'nvidia-live',
    solverVersion: result.solverVersion,
    solution: solverSolutionToNumbers(result.solution),
    energy: result.energy,
    confidence: result.confidence,
    solveTimeMs: result.solveTimeMs,
    quboHash: result.proofData.quboHash,
    solutionHash: result.proofData.solutionHash,
  };
}

function securityFacts(
  request: VerifiedRepairRequest,
  selected: RepairCandidate[],
  execution: RepairExecutionResult | undefined,
  manifestPresent: boolean,
  auditValid: boolean,
): SecurityRemediationFacts {
  const sensitive = selected.some((candidate) => candidate.touchesSensitive === true) ||
    request.finding.executionRisk === 'HIGH' || request.finding.executionRisk === 'CRITICAL';
  const validationByName = new Map((execution?.validations ?? []).map((item) => [item.name, item]));
  const validationPassed = (name: RepairValidationResult['name']) => validationByName.get(name)?.ok === true;
  const profile = request.validationProfile ?? 'none';
  return {
    finding_reported: request.finding.reported !== false,
    finding_evidence_present: request.finding.evidence.length > 0,
    affected_files_present: request.finding.affectedFiles.length > 0,
    repro_or_scan_output_present: request.finding.evidence.some((item) => ['scan_output', 'test_output', 'api_response'].includes(item.type)),
    severity_classified: true,
    severity: request.finding.severity,
    execution_risk: request.finding.executionRisk,
    touches_auth_payment_secrets_admin: sensitive,
    patch_touches_auth_rbac_crypto_secrets: selected.some((candidate) => candidate.touchesSensitive === true),
    human_approval_present: request.approvals?.human === true,
    security_approval_present: request.approvals?.security === true,
    patch_plan_present: selected.length > 0,
    plan_hash_present: true,
    allowed_files_present: true,
    patch_scope_matches_finding: selected.every((candidate) => request.finding.affectedFiles.includes(candidate.file)),
    controlled_executor_used: execution?.controlledExecutorUsed === true,
    patch_applied: execution?.patchApplied === true,
    tests_passed: profile === 'full' && validationPassed('unit'),
    build_passed: profile === 'full' && validationPassed('build'),
    security_scan_passed: profile === 'full' && validationPassed('security'),
    evidence_manifest_present: manifestPresent,
    audit_valid: auditValid,
    deployment_proof_present: false,
    production_claim_requested: false,
  };
}

function gateStatus(finalDecision: string): 'PASS' | 'BLOCK' | 'REVIEW' {
  if (finalDecision === 'PRODUCTION_FIX_CLAIM_ALLOWED') return 'PASS';
  if (finalDecision.startsWith('BLOCK_') || finalDecision === 'WAITING_SECURITY_APPROVAL' || finalDecision === 'WAITING_HUMAN_APPROVAL') return 'BLOCK';
  return 'REVIEW';
}

function deterministicTimestamp(base: string | undefined, index: number): string {
  const start = base ? Date.parse(base) : 0;
  const safeStart = Number.isFinite(start) ? start : 0;
  return new Date(safeStart + index * 1_000).toISOString();
}

function createAuditChain(
  request: VerifiedRepairRequest,
  planHash: string,
  exactProofHash: string,
  decision: 'PASS' | 'BLOCK' | 'REVIEW',
  evidenceIds: string[],
): AuditLedgerEntry[] {
  const entries: AuditLedgerEntry[] = [];
  const append = (action: string, payload: Record<string, unknown>, index: number, entryDecision: 'PASS' | 'BLOCK' | 'REVIEW') => {
    const entry = createAuditLedgerEntry({
      id: `${request.jobId}:${index}:${action}`,
      previousHash: entries.at(-1)?.currentHash,
      actorId: request.actorId ?? 'dsg.verified-repair',
      action,
      decision: entryDecision,
      evidenceIds,
      payload,
      createdAt: deterministicTimestamp(request.createdAt, index),
    });
    entries.push(entry);
  };
  append('PLAN_CREATED', { planHash }, 0, 'REVIEW');
  append('Z3_EXACT_VERIFICATION', { proofHash: exactProofHash }, 1, decision);
  return entries;
}

function buildEvidenceItems(
  request: VerifiedRepairRequest,
  planHash: string,
  qubo: RepairQubo,
  exactProofHash: string,
  validation: RepairValidationResult[],
  execution?: RepairExecutionResult,
): EvidenceItem[] {
  const base = `${request.jobId}:`;
  const items: EvidenceItem[] = [
    { id: `${base}finding`, evidenceType: 'finding', contentHash: sha256Json(canonicalFinding(request.finding)), summary: 'Finding input and source evidence references' },
    { id: `${base}plan`, evidenceType: 'file', contentHash: planHash, summary: 'Deterministic binary repair plan' },
    { id: `${base}qubo`, evidenceType: 'file', contentHash: qubo.problemHash, summary: 'Canonical repair QUBO' },
    { id: `${base}z3`, evidenceType: 'test_output', contentHash: exactProofHash, summary: 'Z3 exact assignment verification' },
  ];
  for (const result of validation) {
    items.push({
      id: `${base}validation:${result.name}`,
      evidenceType: result.name === 'security' ? 'scan_output' : 'test_output',
      contentHash: result.outputHash,
      summary: result.summary,
    });
  }
  if (execution?.patchApplied) {
    items.push({
      id: `${base}execution`,
      evidenceType: 'file',
      contentHash: sha256Json({
        baseCommit: execution.baseCommit,
        worktreeCommit: execution.worktreeCommit,
        changedFiles: execution.changedFiles,
        diffHash: execution.diffHash,
        diffBytes: execution.diffBytes,
        cleanupOk: execution.cleanupOk,
      }),
      summary: 'Isolated worktree commit and diff binding',
    });
  }
  return items;
}

function buildEvidencePack(
  request: VerifiedRepairRequest,
  qubo: RepairQubo,
  solver: RepairSolverResult,
  selected: RepairCandidate[],
  exact: Awaited<ReturnType<typeof verifyRepairAssignment>>,
  planHash: string,
  validation: RepairValidationResult[],
  execution: RepairExecutionResult | undefined,
  gateDecision: 'PASS' | 'BLOCK' | 'REVIEW',
): VerifiedRepairEvidencePack {
  const evidence = buildEvidenceItems(request, planHash, qubo, exact.proofHash, validation, execution);
  const evidenceManifest = createEvidenceManifest({
    id: `${request.jobId}:manifest`,
    evidence,
    createdBy: request.actorId ?? 'dsg.verified-repair',
    createdAt: deterministicTimestamp(request.createdAt, 0),
  });
  const auditEntries = createAuditChain(request, planHash, exact.proofHash, gateDecision, evidence.map((item) => item.id));
  const replay = verifyReplay({
    planHash,
    waveHash: qubo.problemHash,
    evidenceManifest,
    auditEntries,
  });
  const solverReplayHash = solver.mode === 'deterministic-local'
    ? sha256Json({ solution: solver.solution, energy: solver.energy, solverVersion: solver.solverVersion })
    : undefined;
  return {
    schema: VERIFIED_REPAIR_SCHEMA,
    jobId: request.jobId,
    source: request.source ?? 'cli',
    findingHash: sha256Json(canonicalFinding(request.finding)),
    planHash,
    qubo: {
      problemHash: qubo.problemHash,
      variableCount: qubo.numVariables,
      constraintCount: qubo.numConstraints,
      groups: qubo.groups,
      candidateOrder: qubo.candidateOrder,
    },
    selectedCandidateIds: selected.map((candidate) => candidate.id).sort(),
    solver: {
      ...solver,
      replayHash: solverReplayHash,
    },
    exactVerification: exact,
    validation,
    evidenceIds: evidence.map((item) => item.id),
    evidenceManifest: {
      id: evidenceManifest.id,
      manifestHash: evidenceManifest.manifestHash,
      status: evidenceManifest.status === 'COMPLETE' ? 'COMPLETE' : 'BLOCKED',
    },
    audit: {
      entryIds: auditEntries.map((entry) => entry.id),
      chainValid: verifyAuditHashChain(auditEntries).ok,
    },
    replay,
    determinism: solver.mode === 'deterministic-local'
      ? { status: 'PASS', proofHash: solverReplayHash }
      : { status: 'REVIEW', reason: 'Remote solver output requires an independent replay run.' },
  };
}

function chooseNextAction(resultStatus: VerifiedRepairResult['status'], execute: boolean): string {
  if (resultStatus === 'READY_FOR_CONTROLLED_EXECUTION') {
    return execute
      ? 'ตรวจรายการ validation ที่ไม่ผ่าน แล้วส่ง candidate ใหม่พร้อมหลักฐาน counterexample'
      : 'เรียกใช้ local controlled executor ด้วย execute=true และ validationProfile=full';
  }
  if (resultStatus === 'VERIFIED_IN_SIMULATION') {
    return 'ตรวจ evidence pack และ diff hash จากนั้นจึงพิจารณาสร้าง draft PR; ยังไม่ใช่ production fix';
  }
  return 'แก้เหตุผล BLOCK/counterexample ที่รายงาน แล้วส่งแผนเข้าตรวจใหม่';
}

/**
 * Main Verified Repair Simulator entry point.
 * It deliberately stops at a verified worktree result; merge/deploy remains a
 * separate approval-boundary action.
 */
export async function runVerifiedRepair(
  request: VerifiedRepairRequest,
): Promise<VerifiedRepairResult> {
  const jobId = typeof request?.jobId === 'string' ? request.jobId : 'unknown';
  const validationErrors = validateInput(request);
  if (validationErrors.length > 0) {
    return blockedResult(jobId, validationErrors.join(','), undefined, request?.execute !== true);
  }

  let qubo: RepairQubo;
  try {
    qubo = buildRepairQubo(request.candidates);
  } catch (error) {
    return blockedResult(jobId, `QUBO_BUILD_FAILED:${error instanceof Error ? error.message : String(error)}`, undefined, request.execute !== true);
  }

  let solver: RepairSolverResult;
  try {
    solver = await solveRepairQubo(qubo, request);
  } catch (error) {
    return blockedResult(jobId, `SOLVER_FAILED:${error instanceof Error ? error.message : String(error)}`, 'ตรวจ NVIDIA_ISING_API_URL หรือเปลี่ยน solver.mode เป็น pinned แล้วส่งใหม่', request.execute !== true);
  }

  const exact = await verifyRepairAssignment(
    qubo,
    sortCandidates(request.candidates),
    solver.solution,
    request.solver?.timeoutMs ?? 5_000,
  );
  const selectedIds = selectedCandidateIds(qubo, solver.solution);
  const candidatesById = new Map(request.candidates.map((candidate) => [candidate.id, candidate]));
  const selected = selectedIds.map((id) => candidatesById.get(id)).filter((candidate): candidate is RepairCandidate => Boolean(candidate));

  if (!exact.valid) {
    return {
      schema: VERIFIED_REPAIR_SCHEMA,
      jobId,
      status: 'BLOCKED',
      verdict: 'BLOCK',
      planningOnly: !request.execute,
      selectedCandidateIds: selectedIds,
      gate: {
        finalDecision: 'BLOCK_Z3_EXACT_VERIFICATION',
        allowed: false,
        claimAllowed: false,
        reasons: ['Ising/QUBO candidate did not pass the Z3 exact verification gate.'],
        nextRequiredEvidence: ['counterexample_fix'],
      },
      exactVerification: exact,
      counterexample: exact.counterexample,
      nextAction: 'แก้ candidate ตาม counterexample แล้วส่งเข้า simulation รอบใหม่; ห้าม apply patch',
      userOutcome: `ไม่ผ่าน: Z3 ${exact.status.toUpperCase()} — ยังห้ามใช้ patch นี้`,
    };
  }

  const initialFacts = securityFacts(request, selected, undefined, false, false);
  const initialGate = evaluateSecurityRemediationGate(initialFacts);
  const initialGateStatus = gateStatus(initialGate.final_decision);
  if (!initialGate.allowed || initialGate.final_decision !== 'PATCH_EXECUTION_ALLOWED') {
    return {
      schema: VERIFIED_REPAIR_SCHEMA,
      jobId,
      status: 'BLOCKED',
      verdict: initialGateStatus,
      planningOnly: !request.execute,
      selectedCandidateIds: selectedIds,
      gate: {
        finalDecision: initialGate.final_decision,
        allowed: initialGate.allowed,
        claimAllowed: initialGate.claim_allowed,
        reasons: initialGate.reasons,
        nextRequiredEvidence: initialGate.next_required_evidence,
      },
      exactVerification: exact,
      counterexample: initialGate.next_required_evidence,
      nextAction: 'เพิ่ม approval/evidence ที่ gate ระบุ แล้วส่งแผนเข้าตรวจใหม่',
      userOutcome: `ยังไม่อนุญาตให้รัน: ${initialGate.final_decision}`,
    };
  }

  let execution: RepairExecutionResult | undefined;
  if (request.execute) {
    try {
      execution = await executeRepairInWorktree(request, selected);
    } catch (error) {
      execution = {
        controlledExecutorUsed: false,
        patchApplied: false,
        baseCommit: request.baseCommit ?? 'unknown',
        worktreeCommit: 'unknown',
        changedFiles: [],
        diffHash: sha256Json(''),
        diffBytes: 0,
        validations: [],
        cleanupOk: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const validation = execution?.validations ?? [];
  const planInput = execution?.baseCommit && execution.baseCommit !== 'unknown'
    ? { ...request, baseCommit: execution.baseCommit }
    : request;
  const planHash = hashSelectedPlan(planInput, selectedIds, qubo.problemHash);
  const manifestPreview = buildEvidenceItems(request, planHash, qubo, exact.proofHash, validation, execution);
  const manifest: EvidenceManifest = createEvidenceManifest({
    id: `${request.jobId}:manifest`,
    evidence: manifestPreview,
    createdBy: request.actorId ?? 'dsg.verified-repair',
    createdAt: deterministicTimestamp(request.createdAt, 0),
  });
  const auditPreview = createAuditChain(
    request,
    planHash,
    exact.proofHash,
    'REVIEW',
    manifestPreview.map((item) => item.id),
  );
  const auditValid = verifyAuditHashChain(auditPreview).ok;
  const facts = securityFacts(request, selected, execution, manifest.status === 'COMPLETE', auditValid);
  const finalGate = evaluateSecurityRemediationGate(facts);
  const finalGateStatus = gateStatus(finalGate.final_decision);
  const evidencePack = buildEvidencePack(request, qubo, solver, selected, exact, planHash, validation, execution, finalGateStatus);

  let status: VerifiedRepairResult['status'];
  if (!request.execute) {
    status = finalGate.allowed ? 'READY_FOR_CONTROLLED_EXECUTION' : 'BLOCKED';
  } else if (execution?.patchApplied && execution.cleanupOk && finalGate.decisions.verification_passed && evidencePack.replay.status === 'PASS') {
    status = 'VERIFIED_IN_SIMULATION';
  } else {
    status = 'BLOCKED';
  }

  const verdict: VerifiedRepairResult['verdict'] = status === 'VERIFIED_IN_SIMULATION'
    ? 'PASS'
    : status === 'READY_FOR_CONTROLLED_EXECUTION'
      ? 'REVIEW'
      : 'BLOCK';
  const executionFailure = [
    ...(execution?.error ? [`CONTROLLED_EXECUTOR_FAILED:${execution.error}`] : []),
    ...(execution && !execution.cleanupOk ? ['CONTROLLED_WORKTREE_CLEANUP_FAILED'] : []),
  ];
  return {
    schema: VERIFIED_REPAIR_SCHEMA,
    jobId,
    status,
    verdict,
    planningOnly: !request.execute,
    selectedCandidateIds: selectedIds,
    gate: {
      finalDecision: finalGate.final_decision,
      allowed: finalGate.allowed,
      claimAllowed: finalGate.claim_allowed,
      reasons: [...finalGate.reasons, ...executionFailure],
      nextRequiredEvidence: finalGate.next_required_evidence,
    },
    exactVerification: exact,
    execution,
    evidencePack,
    nextAction: chooseNextAction(status, Boolean(request.execute)),
    userOutcome: status === 'VERIFIED_IN_SIMULATION'
      ? 'ผ่านใน isolated worktree พร้อม evidence และ replay proof; ยังไม่ merge/deploy'
      : status === 'READY_FOR_CONTROLLED_EXECUTION'
        ? 'แผนผ่าน Z3 และพร้อมให้ controlled executor รันใน worktree'
        : 'ไม่ผ่านและยังห้าม apply patch',
  };
}
