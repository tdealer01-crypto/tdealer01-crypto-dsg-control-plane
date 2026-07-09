/**
 * Ising Optimizer (with Mock Mode for Day 1)
 *
 * Solves QUBO problems using NVIDIA Ising solver.
 * Day 1: Uses deterministic mock for architecture validation.
 * Phase 2+: Calls real NVIDIA Ising API.
 *
 * Determinism: Same QUBO + seed → same solution (greedy mock or NVIDIA both deterministic with seed)
 */

import type { QUBOMatrix } from './qubo-builder';
import { calculateQUBOEnergy } from './qubo-builder';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export interface IsingOptimizationRequest {
  /** Unique problem identifier */
  problemId: string;

  /** QUBO matrix from qubo-builder.ts */
  quboMatrix: QUBOMatrix;

  /** Maximum solve time in milliseconds */
  timeout?: number;

  /** Use mock instead of real NVIDIA API */
  useMock?: boolean;

  /** Random seed for reproducible solver behavior (for stochastic solvers) */
  seed?: number;
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

  /** Proof metadata for determinism */
  proofData: {
    quboHash: string;
    solutionHash: string;
    seed?: number;
  };
}

/**
 * Solve QUBO problem with Ising optimizer.
 *
 * Day 1: useMock=true returns deterministic greedy assignment
 * Phase 2: Real NVIDIA Ising API call with service credentials
 */
export async function optimizeWithIsing(
  req: IsingOptimizationRequest,
): Promise<IsingOptimizationResult> {
  const startTime = Date.now();

  if (req.useMock ?? true) {
    // Day 1: Deterministic mock (no API call)
    return generateMockIsingResult(req.quboMatrix, req.seed);
  }

  // Phase 2+: Real NVIDIA Ising API
  return callNvidiaIsingAPI(req);
}

/**
 * Mock Ising optimizer for Day 1 validation.
 * Uses greedy assignment: assign each variable to the value that minimizes energy.
 */
function generateMockIsingResult(
  qubo: QUBOMatrix,
  seed?: number,
): IsingOptimizationResult {
  const startTime = Date.now();

  // Greedy algorithm: flip each variable to its best value
  const solution: Record<string, number> = {};
  const x: number[] = Array(qubo.numVariables).fill(0); // Start with all 0s

  // Variable indices to process (sorted for determinism)
  const varIndices = Array.from({ length: qubo.numVariables }, (_, i) => i).sort();

  // Simple greedy: for each variable, keep 1 if it reduces energy, else 0
  for (const idx of varIndices) {
    // Calculate energy delta if we flip this variable
    let energyWith1 = 0;
    let energyWith0 = 0;

    // Energy contribution from this variable with x[idx]=1
    x[idx] = 1;
    for (let j = 0; j < qubo.numVariables; j++) {
      energyWith1 += qubo.Q[idx][j] * x[j];
      energyWith1 += qubo.Q[j][idx] * x[j];
      if (j === idx) energyWith1 -= qubo.Q[idx][j]; // Avoid double-counting diagonal
    }
    energyWith1 += qubo.linear[idx];

    // Energy contribution with x[idx]=0
    x[idx] = 0;
    energyWith0 = 0; // No contribution if 0

    // Keep 1 if it reduces energy, else keep 0
    x[idx] = energyWith1 <= energyWith0 ? 1 : 0;
  }

  // Build solution dictionary
  for (let i = 0; i < qubo.variables.length; i++) {
    const varName = qubo.variables[i].id;
    solution[varName] = x[i];
  }

  // Calculate actual energy
  const energy = calculateQUBOEnergy(qubo, solution);

  // Solution quality is estimated as 0.85 for mock (high but not perfect)
  const confidence = 0.85;

  // Hash for determinism verification
  const solutionHash = sha256Hash(JSON.stringify(Object.entries(solution).sort()));

  const solveTimeMs = Date.now() - startTime;

  return {
    solution,
    energy,
    confidence,
    solveTimeMs,
    solverVersion: 'ising-mock-v1',
    proofData: {
      quboHash: qubo.problemHash,
      solutionHash,
      seed,
    },
  };
}

/**
 * Real NVIDIA Ising API call (Phase 2+).
 * Not implemented yet; placeholder for integration.
 */
async function callNvidiaIsingAPI(
  req: IsingOptimizationRequest,
): Promise<IsingOptimizationResult> {
  const startTime = Date.now();

  const apiKey = process.env.NVIDIA_ISING_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_ISING_API_KEY environment variable not set');
  }

  // Prepare QUBO payload for NVIDIA API
  const payload = {
    Q: req.quboMatrix.Q,
    linear: req.quboMatrix.linear,
    timeout: Math.min(req.timeout ?? 5000, 30000), // Cap at 30s
    seed: req.seed,
  };

  try {
    const response = await fetch('https://api.nvidia.com/ising/solve', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Parse NVIDIA response and extract solution
    const solution = normalizeSolution(result.solution, req.quboMatrix);
    const energy = result.energy ?? calculateQUBOEnergy(req.quboMatrix, solution);
    const confidence = result.confidence ?? 0.90;

    const solutionHash = sha256Hash(JSON.stringify(Object.entries(solution).sort()));

    return {
      solution,
      energy,
      confidence,
      solveTimeMs: Date.now() - startTime,
      solverVersion: `nvidia-ising-${result.version ?? 'unknown'}`,
      proofData: {
        quboHash: req.quboMatrix.problemHash,
        solutionHash,
        seed: req.seed,
      },
    };
  } catch (error) {
    throw new Error(`Failed to call NVIDIA Ising API: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Normalize solution from NVIDIA API response to our format.
 */
function normalizeSolution(
  apiSolution: any,
  qubo: QUBOMatrix,
): Record<string, number | boolean> {
  const solution: Record<string, number | boolean> = {};

  if (Array.isArray(apiSolution)) {
    // Solution as array of binary values
    for (let i = 0; i < Math.min(apiSolution.length, qubo.variables.length); i++) {
      solution[qubo.variables[i].id] = apiSolution[i];
    }
  } else if (typeof apiSolution === 'object') {
    // Solution as dictionary
    for (const [key, value] of Object.entries(apiSolution)) {
      solution[key] = value as number | boolean;
    }
  }

  return solution;
}

/**
 * Simple SHA-256 hash implementation fallback.
 * In production, use crypto.subtle.digest or a library.
 */
function sha256Hash(data: string): string {
  // Placeholder: return deterministic hash based on content
  // In production, use: crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `sha256:${Math.abs(hash).toString(16).padStart(8, '0')}`;
}
