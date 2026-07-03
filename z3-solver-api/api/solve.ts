import { init } from 'z3-solver';

// Minimal request/response shapes compatible with Vercel's Node runtime.
// Avoids a hard dependency on @vercel/node (provided by the build runtime).
interface VercelRequest {
  method?: string;
  body?: unknown;
}
interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  end(): VercelResponse;
}

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

// z3-solver WebAssembly init is expensive; reuse a single Context across invocations.
let z3ContextPromise: ReturnType<typeof createContext> | null = null;

async function createContext() {
  const { Context, Z3 } = await init();
  // Resolve the solver binary version once for the audit trail.
  let version = '4.16.0';
  try {
    const v = Z3.get_version ? Z3.get_version() : undefined;
    if (v && typeof v === 'object') {
      version = `${v.major}.${v.minor}.${v.build_number}`;
    }
  } catch {
    // Fall back to the pinned version string.
  }
  return { ctx: Context('main'), version };
}

function getContext() {
  if (!z3ContextPromise) {
    z3ContextPromise = createContext();
  }
  return z3ContextPromise;
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

  // Resolve context first so version is always available in responses.
  let ctx: Awaited<ReturnType<typeof createContext>>['ctx'];
  let solverVersion = '4.12.2';
  try {
    const resolved = await getContext();
    ctx = resolved.ctx;
    solverVersion = resolved.version;
  } catch (error) {
    return res.status(500).json({
      error: 'Solver init failed: ' + String(error),
      status: 'unknown',
      satisfiable: false,
      solver_version: solverVersion,
      time_ms: Date.now() - startMs,
      smt2_hash: '',
    });
  }

  const { smt2, timeout_ms = 5000 } = (req.body ?? {}) as SolveRequest;

  if (!smt2 || typeof smt2 !== 'string') {
    return res.status(400).json({
      error: 'Invalid SMT-LIB v2 formula: "smt2" must be a non-empty string',
      status: 'unknown',
      satisfiable: false,
      solver_version: solverVersion,
      time_ms: Date.now() - startMs,
      smt2_hash: '',
    });
  }

  const solver = new ctx.Solver();

  // Bound solver wall-clock time. Z3 reads "timeout" in milliseconds.
  const boundedTimeout = Math.max(1, Math.min(Number(timeout_ms) || 5000, 30000));
  try {
    solver.set('timeout', boundedTimeout);
  } catch {
    // Older binaries may reject the param name; safe to ignore.
  }

  // Parse SMT-LIB v2 into the solver.
  try {
    solver.fromString(smt2);
  } catch (parseError) {
    return res.status(400).json({
      error: 'Invalid SMT-LIB v2 formula: ' + String(parseError),
      status: 'unknown',
      satisfiable: false,
      solver_version: solverVersion,
      time_ms: Date.now() - startMs,
      smt2_hash: hashFormula(smt2),
    });
  }

  // Check satisfiability (async in the WASM binding).
  let statusStr: string;
  try {
    statusStr = await solver.check();
  } catch (error) {
    return res.status(500).json({
      error: 'Solver error: ' + String(error),
      status: 'unknown',
      satisfiable: false,
      solver_version: solverVersion,
      time_ms: Date.now() - startMs,
      smt2_hash: hashFormula(smt2),
    });
  }

  const status: SolveResponse['status'] =
    statusStr === 'sat' ? 'sat' : statusStr === 'unsat' ? 'unsat' : 'unknown';

  const response: SolveResponse = {
    status,
    satisfiable: status === 'sat',
    solver_version: solverVersion,
    time_ms: Date.now() - startMs,
    smt2_hash: hashFormula(smt2),
  };

  if (status === 'sat') {
    try {
      const model = solver.model();
      const modelArray: Array<{ name: string; value: string }> = [];
      for (const decl of model.decls()) {
        modelArray.push({
          name: decl.name().toString(),
          value: model.get(decl).toString(),
        });
      }
      response.model = modelArray;
    } catch {
      // Model extraction is best-effort; the sat result is still valid.
    }
  } else if (status === 'unsat') {
    // Unsat core is best-effort and only populated when assertions are tracked.
    try {
      const core = solver.unsatCore();
      const length = typeof core.length === 'function' ? core.length() : 0;
      const items: string[] = [];
      for (let i = 0; i < length; i++) {
        items.push(core.get(i).toString());
      }
      if (items.length > 0) {
        response.unsatisfiable_core = items;
      }
    } catch {
      // Unsat core extraction not available for this query.
    }
  }

  return res.status(200).json(response);
};

function hashFormula(formula: string): string {
  // Stable non-cryptographic hash for formula tracking / audit correlation.
  let hash = 0;
  for (let i = 0; i < formula.length; i++) {
    const char = formula.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}
