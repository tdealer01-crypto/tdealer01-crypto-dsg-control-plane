/**
 * Harmonic pre-filter gate — runs before Makk-8 Z3.
 *
 * Fast path: HarmonicEngine evaluates signal coherence in < 1ms.
 * If CHAOS → block immediately (skip expensive Z3).
 * If UNITY/TUNING → proceed to Makk-8 path integrity check.
 */

import { HarmonicEngine, type EvaluationResult, type Profile, type Signal } from '../harmonic-engine';
import { Makk8Arbiter, type Makk8ActionData, type Makk8VerificationResult } from './makk8-arbiter';

export interface HarmonicGateInput {
  signals: Signal[];
  actionData: Makk8ActionData;
  profile?: Profile;
}

export interface HarmonicGateResult {
  allow_execute: boolean;
  phase: EvaluationResult['phase'];
  harmonic: EvaluationResult;
  makk8: Makk8VerificationResult | null;
  reason: string;
}

export function evaluateHarmonicGate(input: HarmonicGateInput): HarmonicGateResult {
  const engine = new HarmonicEngine(input.profile ?? 'balanced');
  const harmonic = engine.evaluate(input.signals);

  // Fast-block: CHAOS phase skips Z3 entirely
  if (harmonic.phase === 'CHAOS') {
    return {
      allow_execute: false,
      phase: 'CHAOS',
      harmonic,
      makk8: null,
      reason: `Harmonic pre-filter blocked: ${harmonic.reason}`,
    };
  }

  // Proceed to Makk-8 formal verification
  const arbiter = new Makk8Arbiter();
  const makk8 = arbiter.verifyPathIntegrity(input.actionData);

  const allow_execute = makk8.ok;
  return {
    allow_execute,
    phase: harmonic.phase,
    harmonic,
    makk8,
    reason: allow_execute
      ? `SAMMA — harmonic ${harmonic.phase}, Z3 path verified`
      : `MICHA — harmonic ${harmonic.phase}, Z3 path conflict: ${JSON.stringify(makk8.artifact)}`,
  };
}
