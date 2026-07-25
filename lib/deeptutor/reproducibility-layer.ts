/**
 * Reproducibility Layer for DeepTutor Z3 Simulation
 *
 * Enables exact deterministic replay of entire simulation runs.
 * Every execution is fully auditable and reproducible from saved evidence.
 *
 * Audit Trail:
 * 1. Input hash (DeepTutor data snapshot)
 * 2. Constraint hash (policy version)
 * 3. Master seed (PRNG determinism)
 * 4. Adversarial events (injected attacks)
 * 5. Execution events (decisions, proofs)
 * 6. Output hash (results verification)
 *
 * Full replay: deterministic PRNG + same seeds → identical results
 */

import { createHash, randomBytes } from 'crypto';
import type {
  ExecutionRequest,
  ExecutionResult,
  TelemetryEvent,
} from '../spine/types.js';
import type { AdversarialEvent } from './adversarial-injection.js';
import type { ProofVerificationResult, VerificationReport } from './proof-verification.js';

/**
 * Complete audit event log entry
 */
export interface AuditLogEntry {
  sequenceNumber: number;
  timestamp: number;
  tick: number;
  eventType: 'request' | 'execution' | 'adversarial' | 'proof' | 'decision';
  eventId: string;
  data: {
    requestId?: string;
    decision?: string;
    proofHash?: string;
    latency?: number;
    adversarialEventId?: string;
    [key: string]: unknown;
  };
  hash: string; // hash of this entry
  previousHash: string; // hash chain for tamper detection
}

/**
 * Execution trace for replay
 */
export interface ExecutionTrace {
  traceId: string;
  startTime: number;
  endTime: number;
  totalTicks: number;
  masterSeed: number;
  inputHash: string;
  constraintHash: string;
  auditLog: AuditLogEntry[];
  outputHash: string;
  reproducibilityToken: string;
}

/**
 * Audit checkpoint (periodic snapshot for faster replay)
 */
export interface AuditCheckpoint {
  checkpointId: string;
  tick: number;
  timestamp: number;
  stateHash: string;
  proofHash: string;
  auditLogHash: string;
  sequenceNumber: number;
}

/**
 * Reproducibility manifest
 */
export interface ReproducibilityManifest {
  manifestId: string;
  originalExecutionId: string;
  createdAt: number;
  inputHash: string;
  constraintHash: string;
  masterSeed: number;
  adversarialEventIds: string[];
  proofCertificates: Map<string, string>; // requestId -> proofHash
  checkpoints: AuditCheckpoint[];
  outputHash: string;
  verificationStatus: 'pending' | 'verified' | 'diverged';
  divergenceReport?: {
    divergedAt: number;
    expectedHash: string;
    actualHash: string;
    affectedConstraints: string[];
  };
}

/**
 * Audit log manager
 */
export class AuditLogger {
  private log: AuditLogEntry[] = [];
  private sequenceNumber: number = 0;
  private previousHash: string = 'initial';
  private checkpoints: AuditCheckpoint[] = [];
  private checkpointInterval: number = 100; // checkpoint every N entries

  /**
   * Logs an execution request
   */
  logRequest(request: ExecutionRequest, tick: number): void {
    this.addEntry('request', request.id, {
      requestId: request.id,
      type: request.type,
      priority: request.priority,
      seed: request.seed,
    }, tick);
  }

  /**
   * Logs an execution result
   */
  logResult(result: ExecutionResult, tick: number): void {
    this.addEntry('execution', result.requestId, {
      requestId: result.requestId,
      decision: result.decision,
      latency: result.latency,
      status: result.status,
      genomeId: result.genomeId,
    }, tick);
  }

  /**
   * Logs an adversarial event
   */
  logAdversarialEvent(event: AdversarialEvent): void {
    this.addEntry('adversarial', event.attackId, {
      adversarialEventId: event.attackId,
      category: event.category,
      severity: event.severity,
      duration: event.effectDurationTicks,
    }, event.tick);
  }

  /**
   * Logs a proof verification result
   */
  logProof(proof: ProofVerificationResult, tick: number): void {
    this.addEntry('proof', `proof-${proof.constraintId}`, {
      proofHash: proof.proof,
      constraintId: proof.constraintId,
      satisfied: proof.satisfied,
      margin: proof.margin,
    }, tick);
  }

  /**
   * Logs a decision
   */
  logDecision(decision: string, requestId: string, tick: number, metadata: Record<string, unknown> = {}): void {
    this.addEntry('decision', `decision-${requestId}`, {
      decision,
      requestId,
      ...metadata,
    }, tick);
  }

  /**
   * Adds entry to audit log
   */
  private addEntry(
    eventType: AuditLogEntry['eventType'],
    eventId: string,
    data: Record<string, unknown>,
    tick: number,
  ): void {
    const entry: AuditLogEntry = {
      sequenceNumber: this.sequenceNumber++,
      timestamp: Date.now(),
      tick,
      eventType,
      eventId,
      data,
      hash: '',
      previousHash: this.previousHash,
    };

    // Compute entry hash
    entry.hash = this.hashEntry(entry);
    this.previousHash = entry.hash;

    this.log.push(entry);

    // Create checkpoint if needed
    if (this.log.length % this.checkpointInterval === 0) {
      this.createCheckpoint();
    }
  }

  /**
   * Hashes a log entry
   */
  private hashEntry(entry: Omit<AuditLogEntry, 'hash'>): string {
    const canonical = JSON.stringify({
      sequenceNumber: entry.sequenceNumber,
      eventType: entry.eventType,
      eventId: entry.eventId,
      data: entry.data,
      previousHash: entry.previousHash,
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Creates checkpoint
   */
  private createCheckpoint(): void {
    const checkpoint: AuditCheckpoint = {
      checkpointId: `checkpoint-${this.checkpoints.length}`,
      tick: this.log[this.log.length - 1]?.tick || 0,
      timestamp: Date.now(),
      stateHash: this.computeLogHash(),
      proofHash: this.previousHash,
      auditLogHash: this.computeLogHash(),
      sequenceNumber: this.sequenceNumber,
    };

    this.checkpoints.push(checkpoint);
  }

  /**
   * Computes hash of entire log
   */
  computeLogHash(): string {
    const canonical = JSON.stringify(this.log.map((e) => ({ seq: e.sequenceNumber, hash: e.hash })));
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Exports trace for reproducibility
   */
  exportTrace(
    traceId: string,
    masterSeed: number,
    inputHash: string,
    constraintHash: string,
  ): ExecutionTrace {
    const reproducibilityToken = createHash('sha256')
      .update(`${inputHash}-${constraintHash}-${masterSeed}`)
      .digest('hex');

    return {
      traceId,
      startTime: this.log[0]?.timestamp || Date.now(),
      endTime: this.log[this.log.length - 1]?.timestamp || Date.now(),
      totalTicks: Math.max(...this.log.map((e) => e.tick || 0)) + 1,
      masterSeed,
      inputHash,
      constraintHash,
      auditLog: this.log,
      outputHash: this.computeLogHash(),
      reproducibilityToken,
    };
  }

  /**
   * Gets audit log entries
   */
  getLog(): readonly AuditLogEntry[] {
    return this.log;
  }

  /**
   * Gets checkpoints
   */
  getCheckpoints(): readonly AuditCheckpoint[] {
    return this.checkpoints;
  }
}

/**
 * Reproducibility verifier
 */
export class ReproducibilityVerifier {
  private manifest: ReproducibilityManifest;
  private originalTrace: ExecutionTrace;
  private replayTrace: ExecutionTrace | null = null;

  constructor(manifest: ReproducibilityManifest, originalTrace: ExecutionTrace) {
    this.manifest = manifest;
    this.originalTrace = originalTrace;
  }

  /**
   * Verifies replay against original execution
   */
  verify(replayTrace: ExecutionTrace): {
    isReproducible: boolean;
    divergencePoint?: number;
    report: string;
  } {
    this.replayTrace = replayTrace;

    // Check seed matches
    if (this.originalTrace.masterSeed !== replayTrace.masterSeed) {
      return {
        isReproducible: false,
        report: 'Master seed mismatch',
      };
    }

    // Check hashes match
    if (this.originalTrace.inputHash !== replayTrace.inputHash) {
      return {
        isReproducible: false,
        report: 'Input hash mismatch',
      };
    }

    // Check output hash matches (ultimate proof of reproducibility)
    if (this.originalTrace.outputHash !== replayTrace.outputHash) {
      // Find divergence point
      for (let i = 0; i < Math.min(this.originalTrace.auditLog.length, replayTrace.auditLog.length); i++) {
        if (this.originalTrace.auditLog[i]?.hash !== replayTrace.auditLog[i]?.hash) {
          return {
            isReproducible: false,
            divergencePoint: i,
            report: `Diverged at audit log entry ${i}`,
          };
        }
      }

      return {
        isReproducible: false,
        report: 'Output hashes differ but audit logs match (state divergence)',
      };
    }

    return {
      isReproducible: true,
      report: 'Execution fully reproduced',
    };
  }

  /**
   * Computes proof certificate
   */
  computeProofCertificate(): string {
    const material = JSON.stringify({
      originalOutputHash: this.originalTrace.outputHash,
      replayOutputHash: this.replayTrace?.outputHash,
      masterSeed: this.manifest.masterSeed,
      timestamp: Date.now(),
    });

    return createHash('sha256').update(material).digest('hex');
  }
}

/**
 * Convenience function for creating reproducibility manifest
 */
export function createReproducibilityManifest(
  executionId: string,
  inputHash: string,
  constraintHash: string,
  masterSeed: number,
  adversarialEventIds: string[],
  proofCertificates: Map<string, string>,
  outputHash: string,
): ReproducibilityManifest {
  return {
    manifestId: `manifest-${createHash('sha256').update(executionId).digest('hex').slice(0, 16)}`,
    originalExecutionId: executionId,
    createdAt: Date.now(),
    inputHash,
    constraintHash,
    masterSeed,
    adversarialEventIds,
    proofCertificates,
    checkpoints: [],
    outputHash,
    verificationStatus: 'pending',
  };
}
