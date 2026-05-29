/**
 * DSG™ Harmonic Engine — Deterministic Safety Gate
 * Version: V159-DHAMMA-INTEGRITY
 *
 * Signal-based safety evaluation using Harmonic Mean + Shannon Entropy.
 * 100% offline, zero-latency, no ML, deterministic output.
 *
 * Phases: UNITY (safe) → TUNING (caution) → CHAOS (block)
 */

export type Phase = 'UNITY' | 'TUNING' | 'CHAOS';
export type Profile = 'conservative' | 'balanced' | 'aggressive' | 'strict';

export interface Signal {
  name: string;
  value: number;  // 0.0 – 1.0
  weight: number; // 0.0 – 1.0, higher = more important
}

export interface EvaluationResult {
  phase: Phase;
  allow_execute: boolean;
  confidence: number;  // 0.0 – 1.0
  entropy: number;     // 0.0 – 1.0 (lower = more ordered)
  reason: string;
  timestamp: number;
}

interface ProfileConfig {
  threshold: number;
  entropyLimit: number;
  memoryWindowMs: number;
}

const PROFILES: Record<Profile, ProfileConfig> = {
  conservative: { threshold: 0.90, entropyLimit: 0.30, memoryWindowMs: 24 * 60 * 60 * 1000 },
  balanced:     { threshold: 0.75, entropyLimit: 0.45, memoryWindowMs: 12 * 60 * 60 * 1000 },
  aggressive:   { threshold: 0.60, entropyLimit: 0.60, memoryWindowMs:  4 * 60 * 60 * 1000 },
  strict:       { threshold: 0.95, entropyLimit: 0.20, memoryWindowMs: 48 * 60 * 60 * 1000 },
};

interface MemoryEntry {
  phase: Phase;
  entropy: number;
  confidence: number;
  timestamp: number;
}

function weightedHarmonicMean(signals: Signal[]): number {
  const totalWeight = signals.reduce((s, sig) => s + sig.weight, 0);
  if (totalWeight === 0) return 0;
  const denom = signals.reduce((s, sig) => {
    const v = Math.max(sig.value, 1e-9); // avoid div/0
    return s + sig.weight / v;
  }, 0);
  return totalWeight / denom;
}

function shannonEntropy(signals: Signal[]): number {
  const weightedSum = signals.reduce((s, sig) => s + sig.weight * sig.value, 0);
  if (weightedSum === 0) return 1;
  let h = 0;
  for (const sig of signals) {
    const p = (sig.weight * sig.value) / weightedSum;
    if (p > 0) h -= p * Math.log2(p);
  }
  // Normalize to 0–1 using max entropy = log2(n)
  const maxH = Math.log2(Math.max(signals.length, 2));
  return Math.min(h / maxH, 1);
}

function detectPhase(confidence: number, entropy: number, config: ProfileConfig): Phase {
  if (confidence >= config.threshold && entropy <= config.entropyLimit) return 'UNITY';
  if (confidence >= config.threshold * 0.65 && entropy <= config.entropyLimit * 1.5) return 'TUNING';
  return 'CHAOS';
}

export class HarmonicEngine {
  private config: ProfileConfig;
  private memory: MemoryEntry[] = [];
  readonly profile: Profile;

  constructor(profile: Profile = 'balanced') {
    this.profile = profile;
    this.config = PROFILES[profile];
  }

  evaluate(signals: Signal[]): EvaluationResult {
    if (!signals.length) {
      return {
        phase: 'CHAOS',
        allow_execute: false,
        confidence: 0,
        entropy: 1,
        reason: 'No signals provided',
        timestamp: Date.now(),
      };
    }

    const confidence = weightedHarmonicMean(signals);
    const entropy = shannonEntropy(signals);

    // Apply memory penalty: if recent evaluations were unstable, raise entropy
    const adjustedEntropy = this._memoryAdjustedEntropy(entropy);

    const phase = detectPhase(confidence, adjustedEntropy, this.config);
    const allow_execute = phase === 'UNITY';

    const reason = allow_execute
      ? `High coherence (${(confidence * 100).toFixed(1)}%), low entropy — UNITY phase`
      : phase === 'TUNING'
      ? `Marginal coherence (${(confidence * 100).toFixed(1)}%) or elevated entropy (${(adjustedEntropy * 100).toFixed(1)}%) — TUNING`
      : `Low coherence (${(confidence * 100).toFixed(1)}%) or high entropy (${(adjustedEntropy * 100).toFixed(1)}%) — CHAOS`;

    const result: EvaluationResult = {
      phase,
      allow_execute,
      confidence: Math.round(confidence * 1000) / 1000,
      entropy: Math.round(adjustedEntropy * 1000) / 1000,
      reason,
      timestamp: Date.now(),
    };

    this._addMemory({ phase, entropy: adjustedEntropy, confidence, timestamp: result.timestamp });
    return result;
  }

  reset(): void {
    this.memory = [];
  }

  private _pruneMemory(): void {
    const cutoff = Date.now() - this.config.memoryWindowMs;
    this.memory = this.memory.filter((e) => e.timestamp >= cutoff);
  }

  private _addMemory(entry: MemoryEntry): void {
    this.memory.push(entry);
    this._pruneMemory();
  }

  private _memoryAdjustedEntropy(rawEntropy: number): number {
    this._pruneMemory();
    if (this.memory.length < 2) return rawEntropy;
    // If last 2+ evaluations were CHAOS/TUNING, bump entropy slightly (temporal instability)
    const recent = this.memory.slice(-3);
    const unstableCount = recent.filter((e) => e.phase !== 'UNITY').length;
    if (unstableCount >= 2) {
      return Math.min(rawEntropy + 0.1, 1);
    }
    return rawEntropy;
  }
}
