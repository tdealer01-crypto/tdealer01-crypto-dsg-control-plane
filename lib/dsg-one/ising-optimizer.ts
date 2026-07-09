/**
 * Ising Optimizer (mock mode + live HTTP solver mode)
 *
 * Solves QUBO problems with an Ising-style solver.
 *
 * Modes:
 * - mock (default): deterministic greedy assignment, no network. Used by all
 *   existing callers and CI.
 * - live: POSTs the QUBO to an external solver endpoint configured via
 *   NVIDIA_ISING_API_URL (+ optional NVIDIA_ISING_API_KEY bearer auth).
 *   There is no hardcoded vendor URL: NVIDIA does not publish a public
 *   QUBO/Ising REST endpoint (cuOpt covers LP/MILP/QP/VRP), so the endpoint
 *   must point at a self-hosted or managed solver you actually run.
 *
 * Mode selection:
 * - useMock: true  → mock, always.
 * - useMock: false → live; throws IsingConfigError when the endpoint is not
 *   configured, and falls back to the deterministic mock on transient solver
 *   failures unless fallbackToMock is false.
 * - useMock unset  → live only when NVIDIA_ISING_MODE=live AND the endpoint
 *   is configured; otherwise mock (preserves existing default behavior).
 *
 * Determinism: energy is always recomputed locally from the QUBO (the remote
 * solver's reported energy is never trusted for the audit trail), and
 * proofData hashes are real SHA-256 over the sorted solution entries.
 */

import type { QUBOMatrix } from './qubo-builder';
import { calculateQUBOEnergy } from './qubo-builder';
import { solveQubo } from './ising-solver-core';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export interface IsingOptimizationRequest {
  /** Unique problem identifier */
  problemId: string;

  /** QUBO matrix from qubo-builder.ts */
  quboMatrix: QUBOMatrix;

  /** Maximum solve time in milliseconds */
  timeout?: number;

  /** Use mock instead of the live solver endpoint */
  useMock?: boolean;

  /** Random seed for reproducible solver behavior (for stochastic solvers) */
  seed?: number;

  /**
   * When a live solve fails transiently (network/HTTP/shape errors), fall
   * back to the deterministic mock instead of throwing. Defaults to true.
   * Configuration errors (missing endpoint) always throw.
   */
  fallbackToMock?: boolean;
}

export interface IsingOptimizationResult {
  /** Binary assignment: taskId → agentId or variable name → value */
  solution: Record<string, number | boolean>;

  /** QUBO objective energy value */
  energy: number;

  /** Solution quality confidence (0-1) */
  confidence: number;

  /** Actual solve time in milliseconds */
  solveTimeMs: number;

  /** Solver version identifier */
  solverVersion: string;

  /** Which path produced this result */
  mode: 'mock' | 'live' | 'live-fallback-mock';

  /** Present only when mode is 'live-fallback-mock' */
  fallbackReason?: string;

  /** Proof metadata for determinism */
  proofData: {
    quboHash: string;
    solutionHash: string;
    seed?: number;
  };
}

/** Thrown when live mode is requested but the endpoint is not configured. */
export class IsingConfigError extends Error {}

/** Thrown when the live solver call fails and fallback is disabled. */
export class IsingSolverError extends Error {}

export interface IsingLiveConfig {
  url: string;
  apiKey?: string;
}

/**
 * Read live-solver configuration from the environment.
 * Returns null when no endpoint is configured.
 */
export function resolveIsingLiveConfig(): IsingLiveConfig | null {
  const url = process.env.NVIDIA_ISING_API_URL?.trim();
  if (!url) return null;
  const apiKey = process.env.NVIDIA_ISING_API_KEY?.trim() || undefined;
  return { url, apiKey };
}

function liveModeRequested(req: IsingOptimizationRequest): boolean {
  if (req.useMock === true) return false;
  if (req.useMock === false) return true;
  // Unset: opt-in via env, and only when an endpoint is actually configured.
  return (
    process.env.NVIDIA_ISING_MODE === 'live' && resolveIsingLiveConfig() !== null
  );
}

/**
 * Solve QUBO problem with Ising optimizer.
 */
export async function optimizeWithIsing(
  req: IsingOptimizationRequest,
): Promise<IsingOptimizationResult> {
  if (!liveModeRequested(req)) {
    return generateMockIsingResult(req.quboMatrix, req.seed);
  }

  const config = resolveIsingLiveConfig();
  if (!config) {
    throw new IsingConfigError(
      'Live Ising solve requested but NVIDIA_ISING_API_URL is not set',
    );
  }

  try {
    return await callLiveIsingSolver(req, config);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (req.fallbackToMock === false) {
      throw new IsingSolverError(`Live Ising solve failed: ${reason}`);
    }
    const mockResult = generateMockIsingResult(req.quboMatrix, req.seed);
    return {
      ...mockResult,
      mode: 'live-fallback-mock',
      fallbackReason: reason,
    };
  }
}

/**
 * Mock Ising optimizer: deterministic local solve, no network.
 * Delegates to the same solver core the self-hosted endpoint uses
 * (lib/dsg-one/ising-solver-core), so mock and live results share one
 * deterministic algorithm and differ only in transport.
 */
function generateMockIsingResult(
  qubo: QUBOMatrix,
  seed?: number,
): IsingOptimizationResult {
  const startTime = Date.now();

  const solved = solveQubo({
    Q: qubo.Q,
    linear: qubo.linear,
    numVariables: qubo.numVariables,
    seed,
  });

  // Build solution dictionary
  const solution: Record<string, number> = {};
  for (let i = 0; i < qubo.variables.length; i++) {
    solution[qubo.variables[i].id] = solved.solution[i];
  }

  // Calculate actual energy (includes the QUBO constant term)
  const energy = calculateQUBOEnergy(qubo, solution);

  // Solution quality is estimated as 0.85 for mock (high but not perfect)
  const confidence = 0.85;

  // Hash for determinism verification
  const solutionHash = hashSolution(solution);

  const solveTimeMs = Date.now() - startTime;

  return {
    solution,
    energy,
    confidence,
    solveTimeMs,
    solverVersion: 'ising-mock-v1',
    mode: 'mock',
    proofData: {
      quboHash: qubo.problemHash,
      solutionHash,
      seed,
    },
  };
}

/**
 * POST the QUBO to the configured live solver endpoint.
 *
 * Request body (JSON):
 *   { problemId, Q, linear, numVariables, timeoutMs, seed }
 * Expected response body (JSON):
 *   { solution: number[] | Record<string, 0|1|boolean>, version?, confidence? }
 *
 * Energy is always recomputed locally from the QUBO; the remote value is
 * ignored so the audit trail cannot be skewed by a misbehaving solver.
 */
async function callLiveIsingSolver(
  req: IsingOptimizationRequest,
  config: IsingLiveConfig,
): Promise<IsingOptimizationResult> {
  const startTime = Date.now();
  const timeoutMs = Math.min(req.timeout ?? 5000, 30000);

  const payload = {
    problemId: req.problemId,
    Q: req.quboMatrix.Q,
    linear: req.quboMatrix.linear,
    numVariables: req.quboMatrix.numVariables,
    timeoutMs,
    seed: req.seed,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    const reason =
      controller.signal.aborted
        ? `solver timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : String(error);
    throw new Error(reason);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`solver HTTP ${response.status}`);
  }

  const result = (await response.json()) as {
    solution?: unknown;
    version?: unknown;
    confidence?: unknown;
  };

  const solution = normalizeSolution(result.solution, req.quboMatrix);

  // Determinism boundary: recompute energy locally, never trust remote energy.
  const energy = calculateQUBOEnergy(req.quboMatrix, solution);
  const confidence =
    typeof result.confidence === 'number' &&
    result.confidence >= 0 &&
    result.confidence <= 1
      ? result.confidence
      : 0.9;

  return {
    solution,
    energy,
    confidence,
    solveTimeMs: Date.now() - startTime,
    solverVersion: `ising-live-${typeof result.version === 'string' ? result.version : 'unversioned'}`,
    mode: 'live',
    proofData: {
      quboHash: req.quboMatrix.problemHash,
      solutionHash: hashSolution(solution),
      seed: req.seed,
    },
  };
}

/**
 * Normalize and validate a solver response solution.
 * Every QUBO variable must be assigned a binary value; anything else is a
 * solver contract violation and throws (triggering fallback upstream).
 */
function normalizeSolution(
  apiSolution: unknown,
  qubo: QUBOMatrix,
): Record<string, number> {
  const raw: Record<string, unknown> = {};

  if (Array.isArray(apiSolution)) {
    if (apiSolution.length !== qubo.variables.length) {
      throw new Error(
        `solver returned ${apiSolution.length} values for ${qubo.variables.length} variables`,
      );
    }
    for (let i = 0; i < qubo.variables.length; i++) {
      raw[qubo.variables[i].id] = apiSolution[i];
    }
  } else if (apiSolution !== null && typeof apiSolution === 'object') {
    Object.assign(raw, apiSolution as Record<string, unknown>);
  } else {
    throw new Error('solver response has no solution field');
  }

  const solution: Record<string, number> = {};
  for (const variable of qubo.variables) {
    const value = raw[variable.id];
    if (value === 0 || value === false) {
      solution[variable.id] = 0;
    } else if (value === 1 || value === true) {
      solution[variable.id] = 1;
    } else {
      throw new Error(`solver returned non-binary value for variable ${variable.id}`);
    }
  }

  return solution;
}

/** Real SHA-256 over sorted solution entries (hex, same format as problemHash). */
function hashSolution(solution: Record<string, number | boolean>): string {
  return sha256Json(Object.entries(solution).sort());
}
