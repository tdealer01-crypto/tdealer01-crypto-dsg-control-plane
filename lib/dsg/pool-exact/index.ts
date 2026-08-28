import { createHash } from 'crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, statSync } from 'fs';
import { resolve, sep } from 'path';
import { init } from 'z3-solver';
import { compareCompositeRaw, isValidDecimalFormat, parseDecimalRaw } from './decimal';
import { extractCompositeRawTopLevel } from './jsonl';

type Candidate = {
  id: string;
  composite: number;
  composite_raw: string;
  [k: string]: any;
};

type ParsedEntry = {
  value: any;
  audit: {
    line: number;
    raw: string;
    rawHash: string;
    compositeRaw: string;
  };
};

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const mcpTool = {
  name: 'dsg_pool_exact_select',
  description: 'Exact top-k 24->12 - Real exact via raw lexeme BigInt comparator',
  inputSchema: {
    type: 'object',
    properties: {
      poolPath: { type: 'string', default: '.dsg/pool.jsonl' },
      k: { type: 'integer', minimum: 1, maximum: 12, default: 12 },
      minComposite: { type: 'string', default: '0', description: 'exact decimal string' },
      useZ3: { type: 'boolean', default: false },
    },
    additionalProperties: false,
  },
  handler: async ({
    poolPath = '.dsg/pool.jsonl',
    k = 12,
    minComposite = '0',
    useZ3 = false,
  }: any) => {
    if (typeof poolPath !== 'string' || poolPath.length === 0) {
      return { success: false, status: 'BLOCKED', reason: 'INVALID_POOL_PATH_TYPE' };
    }
    if (typeof useZ3 !== 'boolean') {
      return { success: false, status: 'BLOCKED', reason: 'INVALID_USEZ3_TYPE' };
    }
    if (!Number.isInteger(k) || k < 1 || k > 12) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'INVALID_K',
        expected: 'integer 1..12',
        received: k,
      };
    }
    if (typeof minComposite !== 'string') {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'INVALID_MIN_COMPOSITE_TYPE',
        expected: 'string decimal',
        received: typeof minComposite,
      };
    }
    if (!isValidDecimalFormat(minComposite)) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'INVALID_MIN_COMPOSITE_FORMAT',
        received: minComposite,
      };
    }

    let minCompositeRaw: string;
    try {
      parseDecimalRaw(minComposite);
      minCompositeRaw = minComposite;
    } catch (e: any) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'INVALID_MIN_COMPOSITE_FORMAT',
        received: minComposite,
        error: e.message,
      };
    }

    const dsgLexical = resolve('.dsg');

    let canonicalRoot: string;
    try {
      canonicalRoot = realpathSync(dsgLexical);
    } catch {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'DSG_ROOT_NOT_FOUND',
        root: dsgLexical,
      };
    }

    try {
      const stat = lstatSync(dsgLexical);
      if (stat.isSymbolicLink()) {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'DSG_ROOT_SYMLINK_ESCAPE',
          root: dsgLexical,
          canonicalRoot,
        };
      }
    } catch {}

    const resolvedPool = resolve(poolPath);
    if (resolvedPool !== dsgLexical && !resolvedPool.startsWith(dsgLexical + sep)) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'POOL_PATH_OUTSIDE_DSG_ROOT',
        root: dsgLexical,
        received: poolPath,
      };
    }

    if (!existsSync(resolvedPool)) {
      return { success: false, status: 'BLOCKED', reason: `pool not found: ${resolvedPool}` };
    }

    let canonicalPool: string;
    try {
      canonicalPool = realpathSync(resolvedPool);
    } catch {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'POOL_REALPATH_RESOLVE_FAILED',
        resolved: resolvedPool,
      };
    }

    if (canonicalPool !== canonicalRoot && !canonicalPool.startsWith(canonicalRoot + sep)) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'POOL_REALPATH_OUTSIDE_DSG_ROOT',
        canonicalRoot,
        canonicalPool,
      };
    }

    let fileStat: any;
    try {
      fileStat = statSync(canonicalPool);
      if (!fileStat.isFile()) {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'POOL_NOT_REGULAR_FILE',
          path: canonicalPool,
        };
      }
      if (fileStat.size > 1024 * 1024) {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'POOL_FILE_TOO_LARGE',
          maxBytes: 1024 * 1024,
          actual: fileStat.size,
        };
      }
    } catch {
      return { success: false, status: 'BLOCKED', reason: 'POOL_STAT_FAILED' };
    }

    let fileContent: string;
    try {
      fileContent = readFileSync(canonicalPool, 'utf-8');
    } catch (e: any) {
      return { success: false, status: 'BLOCKED', reason: 'POOL_READ_FAILED', error: e.message };
    }

    const allLines = fileContent.split(/\r?\n/);
    let prevHash = '0'.repeat(64);
    const hashChain: { line: number; hash: string; rawHash: string }[] = [];
    const parsed: ParsedEntry[] = [];
    let nonBlankCount = 0;

    for (let i = 0; i < allLines.length; i++) {
      const raw = allLines[i]!;
      const rawHash = createHash('sha256').update(raw).digest('hex');
      const chainHash = createHash('sha256').update(prevHash + rawHash).digest('hex');
      hashChain.push({ line: i + 1, hash: chainHash, rawHash });
      prevHash = chainHash;

      if (raw.trim().length === 0) continue;

      nonBlankCount++;
      if (nonBlankCount > 240) {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'RAW_POOL_LIMIT_EXCEEDED',
          maxRaw: 240,
          actual: nonBlankCount,
          line: i + 1,
          hashChainHead: prevHash,
        };
      }

      let value: any;
      try {
        value = JSON.parse(raw);
      } catch {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'INVALID_POOL_JSONL',
          line: i + 1,
          hashChainHead: prevHash,
        };
      }

      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'INVALID_CANDIDATE_OBJECT',
          line: i + 1,
        };
      }

      const compositeRaw = extractCompositeRawTopLevel(raw);
      if (!compositeRaw) {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'INVALID_CANDIDATE_COMPOSITE_MISSING_RAW',
          line: i + 1,
        };
      }

      if (!isValidDecimalFormat(compositeRaw)) {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'INVALID_CANDIDATE_COMPOSITE_FORMAT',
          line: i + 1,
          composite_raw: compositeRaw,
        };
      }

      parsed.push({
        value,
        audit: { line: i + 1, raw: raw.slice(0, 200), rawHash, compositeRaw },
      });
    }

    const byId = new Map<string, Candidate & { __audit: ParsedEntry['audit'] }>();
    for (const entry of parsed) {
      const v = entry.value;
      const audit = entry.audit;
      if (!v.id || typeof v.id !== 'string') {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'INVALID_CANDIDATE_MISSING_ID',
          line: audit.line,
        };
      }
      if (typeof v.composite !== 'number' || !Number.isFinite(v.composite)) {
        return {
          success: false,
          status: 'BLOCKED',
          reason: 'INVALID_CANDIDATE_COMPOSITE',
          line: audit.line,
          id: v.id,
        };
      }
      byId.set(v.id, { ...v, composite_raw: audit.compositeRaw, __audit: audit });
    }

    if (byId.size > 24) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'POOL_LIMIT_EXCEEDED',
        maxPool: 24,
        actual: byId.size,
        rawCount: parsed.length,
        hashChainHead: prevHash,
      };
    }

    let candidates: (Candidate & { __audit: ParsedEntry['audit'] })[];
    try {
      candidates = Array.from(byId.values()).filter(
        (c) => compareCompositeRaw(c.composite_raw, minCompositeRaw) >= 0,
      );
    } catch (e: any) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'INVALID_EXACT_DECIMAL',
        error: e.message,
        hashChainHead: prevHash,
      };
    }

    if (useZ3 && candidates.length < k) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'INSUFFICIENT_CANDIDATES_FOR_EXACT_K',
        required: k,
        actual: candidates.length,
      };
    }

    if (candidates.length <= k) {
      return {
        success: true,
        mode: 'no-optimization-needed',
        total: candidates.length,
        selectedCount: candidates.length,
        hashChainHead: prevHash,
        selected: candidates.map((c) => ({
          id: c.id,
          composite: c.composite,
          composite_raw: c.composite_raw,
          sourceLine: c.__audit.line,
          sourceRawHash: c.__audit.rawHash,
        })),
      };
    }

    let expectedSorted: (Candidate & { __audit: ParsedEntry['audit'] })[];
    try {
      expectedSorted = [...candidates].sort((a, b) => {
        const cmp = compareCompositeRaw(b.composite_raw, a.composite_raw);
        if (cmp !== 0) return cmp;
        return compareId(a.id, b.id);
      });
    } catch (e: any) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'INVALID_EXACT_DECIMAL',
        error: e.message,
        hashChainHead: prevHash,
      };
    }

    const expected = expectedSorted.slice(0, k);
    const expectedIds = expected.map((c) => c.id);

    if (!useZ3) {
      return {
        success: true,
        mode: 'exact-sort',
        solver: 'none - sorting by exact raw decimal BigInt comparator is optimal',
        total: candidates.length,
        k,
        selectedCount: expected.length,
        totalCompositeRaw: expected.map((c) => c.composite_raw),
        hashChainHead: prevHash,
        hashChainCommitsBlanks: true,
        selected: expected.map((c) => ({
          id: c.id,
          composite: c.composite,
          composite_raw: c.composite_raw,
          sourceLine: c.__audit.line,
          sourceRawHash: c.__audit.rawHash,
        })),
      };
    }

    const { Context } = await init();
    const z3 = Context('main');
    const opt = new z3.Optimize();
    const xs = candidates.map((_, i) => z3.Bool.const(`x${i}`));

    let countExpr = z3.Int.val(0);
    for (const x of xs) {
      countExpr = countExpr.add(z3.If(x, z3.Int.val(1), z3.Int.val(0)));
    }
    opt.add(countExpr.eq(k));

    let realObj = z3.Real.val(0);
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i]!;
      const x = xs[i]!;
      const realVal = z3.Real.val(c.composite_raw);
      realObj = realObj.add(z3.If(x, realVal, z3.Real.val(0)) as any);
    }
    opt.maximize(realObj as any);

    const sortedById = [...candidates]
      .map((c, idx) => ({ c, idx, id: c.id }))
      .sort((a, b) => compareId(a.id, b.id));
    const idRank = new Map<string, number>();
    sortedById.forEach((item, rank) => idRank.set(item.id, rank));

    let secondary = z3.Int.val(0);
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i]!;
      const x = xs[i]!;
      const rank = idRank.get(c.id)!;
      const power = candidates.length - 1 - rank;
      const binaryWeight = Math.pow(2, power);
      secondary = secondary.add(z3.If(x, z3.Int.val(binaryWeight), z3.Int.val(0)));
    }
    opt.maximize(secondary);

    const result = await opt.check();
    if (result !== 'sat') {
      return {
        success: false,
        status: 'BLOCKED',
        reason: `SOLVER_${result.toUpperCase()}`,
        solverResult: result,
      };
    }

    const model = opt.model();
    const z3Selected: (Candidate & { __audit: ParsedEntry['audit'] })[] = [];
    xs.forEach((x, i) => {
      const v = model.eval(x);
      if (v.toString() === 'true') z3Selected.push(candidates[i]!);
    });

    if (z3Selected.length !== k) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'SOLVER_POSTCONDITION_FAILED',
        expected: k,
        actual: z3Selected.length,
      };
    }

    try {
      z3Selected.sort((a, b) => {
        const cmp = compareCompositeRaw(b.composite_raw, a.composite_raw);
        if (cmp !== 0) return cmp;
        return compareId(a.id, b.id);
      });
    } catch (e: any) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'INVALID_EXACT_DECIMAL',
        error: e.message,
      };
    }

    const actualIds = z3Selected.map((c) => c.id);
    if (
      expectedIds.length !== actualIds.length ||
      expectedIds.some((id, idx) => id !== actualIds[idx])
    ) {
      return {
        success: false,
        status: 'BLOCKED',
        reason: 'Z3_DETERMINISTIC_RESULT_MISMATCH',
        expected: expectedIds,
        actual: actualIds,
        hashChainHead: prevHash,
      };
    }

    return {
      success: true,
      mode: 'verified-exact',
      solver: 'z3 Real exact via raw lexeme verified',
      total: candidates.length,
      k,
      selectedCount: z3Selected.length,
      totalCompositeRaw: z3Selected.map((c) => c.composite_raw),
      hashChainHead: prevHash,
      hashChainLength: hashChain.length,
      verification: 'Z3 Real exact matched deterministic raw comparator sort',
      selected: z3Selected.map((c) => ({
        id: c.id,
        composite: c.composite,
        composite_raw: c.composite_raw,
        sourceLine: c.__audit.line,
        sourceRawHash: c.__audit.rawHash,
      })),
    };
  },
};

export { compareCompositeRaw, isValidDecimalFormat, parseDecimalRaw } from './decimal';
export { extractCompositeRawTopLevel } from './jsonl';
