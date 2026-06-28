import { VercelRequest, VercelResponse } from '@vercel/node';
import { Z3 } from 'z3-solver';

interface SolveRequest {
  smt2: string;
  timeout_ms?: number;
  nonce?: string;
}

interface SolveResponse {
  status: 'sat' | 'unsat' | 'unknown';
  satisfiable: boolean;
  model?: Array<{ name: string; value: string }>;
  unsatisfiable_core?: string[];
  solver_version: string;
  time_ms: number;
  smt2_hash: string;
  error?: string;
}

export default async (req: VercelRequest, res: VercelResponse) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startMs = Date.now();

  try {
    const { smt2, timeout_ms = 5000 }: SolveRequest = req.body;

    if (!smt2 || typeof smt2 !== 'string') {
      return res.status(400).json({
        error: 'Invalid SMT-LIB v2 formula',
        status: 'unknown',
        satisfiable: false,
        solver_version: '4.12.2',
        time_ms: Date.now() - startMs,
        smt2_hash: '',
      });
    }

    const { init } = await Z3.create();
    const { Solver, Context } = init();
    const ctx = Context('main');
    const solver = new Solver(ctx);

    // Parse and add formula to solver
    try {
      const parsed = ctx.parseString(smt2);
      if (parsed) {
        for (const assertion of parsed) {
          solver.add(assertion);
        }
      }
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid SMT-LIB v2 formula',
        status: 'unknown',
        satisfiable: false,
        solver_version: '4.12.2',
        time_ms: Date.now() - startMs,
        smt2_hash: hashFormula(smt2),
      });
    }

    // Set timeout
    solver.setParam('timeout', timeout_ms);

    // Check satisfiability
    const result = solver.check();
    const statusStr = result.toString();
    const satisfiable = statusStr === 'sat';

    const response: SolveResponse = {
      status: (statusStr === 'sat' ? 'sat' : statusStr === 'unsat' ? 'unsat' : 'unknown') as 'sat' | 'unsat' | 'unknown',
      satisfiable,
      solver_version: '4.12.2',
      time_ms: Date.now() - startMs,
      smt2_hash: hashFormula(smt2),
    };

    if (satisfiable) {
      const model = solver.model();
      const modelArray: Array<{ name: string; value: string }> = [];

      try {
        const decls = model.decls();
        for (const decl of decls) {
          modelArray.push({
            name: decl.name().toString(),
            value: model.eval(decl, true).toString(),
          });
        }
        response.model = modelArray;
      } catch (e) {
        // Model extraction failed, but result is still valid
      }
    } else {
      // Try to extract unsat core
      try {
        const core = solver.unsatCore();
        response.unsatisfiable_core = core.map((e: any) => e.toString());
      } catch (e) {
        // Unsat core extraction not available
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: 'Solver error: ' + String(error),
      status: 'unknown',
      satisfiable: false,
      solver_version: '4.12.2',
      time_ms: Date.now() - startMs,
      smt2_hash: '',
    });
  }
};

function hashFormula(formula: string): string {
  // Simple hash for formula tracking
  let hash = 0;
  for (let i = 0; i < formula.length; i++) {
    const char = formula.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}
