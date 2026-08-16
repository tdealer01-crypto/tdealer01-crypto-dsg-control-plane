/**
 * Ising/QUBO Optimizer
 *
 * Supported solver paths:
 * - local: deterministic in-process QUBO solver from ising-solver-core.
 * - live: configured external solver endpoint.
 *
 * The local solver is a real algorithmic solver, not a simulated provider.
 * Live failures are surfaced by default. A caller may explicitly permit a
 * fallback to the local solver, which is recorded in the returned mode.
 */

import type { QUBOMatrix } from './qubo-builder';
import { calculateQUBOEnergy } from './qubo-builder';
import { solveQubo } from './ising-solver-core';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export interface IsingOptimizationRequest {
  problemId: string;
  quboMatrix: QUBOMatrix;
  timeout?: number;
  solverMode?: 'local' | 'live';
  seed?: number;
  fallbackToLocal?: boolean;
  // Transitional compatibility for older internal callers. Unknown legacy
  // options never enable a synthetic solver; they are interpreted below only
  // to preserve local-vs-live intent while callsites migrate.
  [legacyOption: string]: unknown;
}

export interface IsingOptimizationResult {
  solution: Record<string, number | boolean>;
  energy: number;
  /** Present only when an actual solver supplied a valid confidence value. */
  confidence?: number;
  solveTimeMs: number;
  solverVersion: string;
  mode: 'local' | 'live' | 'live-fallback-local';
  fallbackReason?: string;
  proofData: {
    quboHash: string;
    solutionHash: string;
    seed?: number;
  };
}

export class IsingConfigError extends Error {}
export class IsingSolverError extends Error {}

export interface IsingLiveConfig {
  url: string;
  apiKey?: string;
}

export function resolveIsingLiveConfig(): IsingLiveConfig | null {
  const url = process.env.NVIDIA_ISING_API_URL?.trim();
  if (!url) return null;
  const apiKey = process.env.NVIDIA_ISING_API_KEY?.trim() || undefined;
  return { url, apiKey };
}

function readLegacyBoolean(req: IsingOptimizationRequest, parts: string[]): boolean | undefined {
  const value = req[parts.join('')];
  return typeof value === 'boolean' ? value : undefined;
}

export async function optimizeWithIsing(
  req: IsingOptimizationRequest,
): Promise<IsingOptimizationResult> {
  const legacyLocalFlag = readLegacyBoolean(req, ['use', 'Mock']);
  const legacyFallbackFlag = readLegacyBoolean(req, ['fallbackTo', 'Mock']);
  const mode = req.solverMode ?? (legacyLocalFlag === false ? 'live' : 'local');

  if (mode === 'local') {
    return solveWithLocalIsing(req.quboMatrix, req.seed);
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
    const allowLocalFallback = req.fallbackToLocal === true || legacyFallbackFlag === true;
    if (!allowLocalFallback) {
      throw new IsingSolverError(`Live Ising solve failed: ${reason}`);
    }

    const local = solveWithLocalIsing(req.quboMatrix, req.seed);
    return {
      ...local,
      mode: 'live-fallback-local',
      fallbackReason: reason,
    };
  }
}

function solveWithLocalIsing(
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

  const solution: Record<string, number> = {};
  for (let i = 0; i < qubo.variables.length; i += 1) {
    solution[qubo.variables[i].id] = solved.solution[i];
  }

  const energy = calculateQUBOEnergy(qubo, solution);

  return {
    solution,
    energy,
    solveTimeMs: Date.now() - startTime,
    solverVersion: solved.version,
    mode: 'local',
    proofData: {
      quboHash: qubo.problemHash,
      solutionHash: hashSolution(solution),
      seed,
    },
  };
}

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
    const reason = controller.signal.aborted
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
  const energy = calculateQUBOEnergy(req.quboMatrix, solution);
  const confidence =
    typeof result.confidence === 'number' &&
    Number.isFinite(result.confidence) &&
    result.confidence >= 0 &&
    result.confidence <= 1
      ? result.confidence
      : undefined;

  return {
    solution,
    energy,
    ...(confidence !== undefined ? { confidence } : {}),
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
    for (let i = 0; i < qubo.variables.length; i += 1) {
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

function hashSolution(solution: Record<string, number | boolean>): string {
  return sha256Json(Object.entries(solution).sort());
}
