import { VercelRequest, VercelResponse } from '@vercel/node';
import * as Z3 from 'z3-solver';

export interface SolveRequest {
  smt2: string;
  timeout_ms?: number;
  nonce?: string;
}

export interface SolveResponse {
  status: 'sat' | 'unsat' | 'unknown';
  satisfiable: boolean;
  model?: Array<{ name: string; value: string }>;
  unsatisfiable_core?: string[];
  solver_version: string;
  time_ms: number;
  smt2_hash: string;
  error?: string;
}

function hashSmt2(smt2: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(smt2).digest('hex');
}

/**
 * Z3 Solver Endpoint for DSG Control Plane
 *
 * Accepts SMT-LIB v2 formulas and returns satisfiability results.
 * Used by /api/dsg/v1/gates/evaluate for constraint verification.
 *
 * Request:
 *   POST /api/solve
 *   {
 *     "smt2": "(set-logic QF_UF)\n(declare-const p Bool)\n...",
 *     "timeout_ms": 5000,
 *     "nonce": "unique-request-id"
 *   }
 *
 * Response:
 *   {
 *     "status": "sat" | "unsat" | "unknown",
 *     "satisfiable": boolean,
 *     "solver_version": "z3 4.12.2",
 *     "time_ms": 45,
 *     "smt2_hash": "abc123..."
 *   }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const startTime = Date.now();
  const body = req.body as SolveRequest;

  // Validate request
  if (!body.smt2 || typeof body.smt2 !== 'string') {
    res.status(400).json({ error: 'Missing or invalid smt2 field' });
    return;
  }

  const timeoutMs = body.timeout_ms || 5000;
  const nonce = body.nonce || 'unknown';
  const smt2Hash = hashSmt2(body.smt2);

  try {
    // Initialize Z3
    const { Context, Solver, parse_smt2_string } = await Z3.init();
    const ctx = new Context('main');
    const solver = new Solver(ctx);

    // Set timeout
    solver.setParams({
      ':timeout': timeoutMs,
    });

    // Parse SMT-LIB v2 formula
    let formula: any;
    try {
      formula = parse_smt2_string(ctx, body.smt2);
    } catch (parseErr) {
      const errorMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      res.status(400).json({
        status: 'unknown',
        satisfiable: false,
        solver_version: 'z3 4.12.2',
        time_ms: Date.now() - startTime,
        smt2_hash: smt2Hash,
        error: `SMT-LIB parse error: ${errorMsg}`,
      } as SolveResponse);
      return;
    }

    // Assert the formula
    solver.assert(...formula);

    // Check satisfiability
    const checkResult = solver.check();

    const timeMs = Date.now() - startTime;
    const response: SolveResponse = {
      status: checkResult === 'sat' ? 'sat' : checkResult === 'unsat' ? 'unsat' : 'unknown',
      satisfiable: checkResult === 'sat',
      solver_version: 'z3 4.12.2',
      time_ms: timeMs,
      smt2_hash: smt2Hash,
    };

    // Get model if SAT
    if (checkResult === 'sat') {
      try {
        const model = solver.model();
        response.model = Array.from(model.entries()).map(([k, v]) => ({
          name: k.toString(),
          value: v.toString(),
        }));
      } catch {
        // Model extraction failed, but result is still valid
      }
    }

    // Get unsat core if UNSAT
    if (checkResult === 'unsat') {
      try {
        const unsatCore = solver.unsatCore();
        response.unsatisfiable_core = Array.from(unsatCore).map((x) => x.toString());
      } catch {
        // Core extraction failed, but result is still valid
      }
    }

    res.status(200).json(response);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const timeMs = Date.now() - startTime;

    // Check if it's a timeout
    const isTimeout = errorMsg.includes('timeout') || timeMs > timeoutMs;

    res.status(isTimeout ? 408 : 500).json({
      status: 'unknown',
      satisfiable: false,
      solver_version: 'z3 4.12.2',
      time_ms: timeMs,
      smt2_hash: smt2Hash,
      error: isTimeout ? `Solver timeout (>${timeoutMs}ms)` : `Z3 error: ${errorMsg}`,
    } as SolveResponse);
  }
}
