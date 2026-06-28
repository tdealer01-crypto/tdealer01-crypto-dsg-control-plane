import { VercelRequest, VercelResponse } from '@vercel/node';
import { Z3 } from 'z3-solver';

interface SolveRequest {
  formula: string;
  timeout?: number;
}

interface SolveResponse {
  satisfiable: boolean;
  model?: Record<string, string>;
  unsatCore?: string[];
  smtLibHash?: string;
  error?: string;
  timestamp: string;
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

  try {
    const { formula, timeout = 5000 }: SolveRequest = req.body;

    if (!formula || typeof formula !== 'string') {
      return res.status(400).json({ error: 'Invalid formula' });
    }

    const { init } = await Z3.create();
    const { Solver, Context } = init();
    const ctx = Context('main');
    const solver = new Solver(ctx);

    // Parse and add formula to solver
    try {
      const parsed = ctx.parseString(formula);
      if (parsed) {
        for (const assertion of parsed) {
          solver.add(assertion);
        }
      }
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid SMT-LIB v2 formula',
        details: String(parseError),
        timestamp: new Date().toISOString(),
      });
    }

    // Set timeout
    solver.setParam('timeout', timeout);

    // Check satisfiability
    const result = solver.check();
    const satisfiable = result.toString() === 'sat';

    const response: SolveResponse = {
      satisfiable,
      timestamp: new Date().toISOString(),
      smtLibHash: hashFormula(formula),
    };

    if (satisfiable) {
      const model = solver.model();
      const modelObj: Record<string, string> = {};

      try {
        const decls = model.decls();
        for (const decl of decls) {
          modelObj[decl.name().toString()] = model.eval(decl, true).toString();
        }
        response.model = modelObj;
      } catch (e) {
        // Model extraction failed, but result is still valid
      }
    } else {
      // Try to extract unsat core
      try {
        const core = solver.unsatCore();
        response.unsatCore = core.map((e: any) => e.toString());
      } catch (e) {
        // Unsat core extraction not available
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: 'Solver error',
      details: String(error),
      timestamp: new Date().toISOString(),
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
