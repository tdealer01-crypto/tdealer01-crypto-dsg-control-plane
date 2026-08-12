#!/usr/bin/env node
/**
 * verify-smt2-expectations.mjs
 *
 * Runs Z3 on SMT-LIB v2 artifacts and asserts that each (check-sat)
 * matches the `; EXPECTED: sat|unsat` annotation on the same line.
 *
 * Why this exists: reading solver output by eye is how a proof silently
 * rots. A refutation-style proof inverts the meaning of the answer
 * (`unsat` = property proven), so an unannotated `sat`/`unsat` stream
 * carries no signal on its own. This script turns the annotations into
 * a pass/fail gate.
 *
 * Usage:
 *   node scripts/verify-smt2-expectations.mjs [file.smt2 ...]
 *
 * With no arguments it verifies every annotated artifact under formal/.
 * Exit code 0 = all expectations met, 1 = mismatch or solver error.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_DIR = 'formal';

/** Extract the ordered list of `; EXPECTED: <result>` annotations. */
function readExpectations(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  const expectations = [];
  let checkSatCount = 0;

  for (const [index, line] of lines.entries()) {
    // Ignore comment-only lines so prose mentioning (check-sat) is skipped.
    const code = line.split(';')[0];
    if (!/\(check-sat\)/.test(code)) continue;

    checkSatCount += 1;
    const match = line.match(/;\s*EXPECTED:\s*(sat|unsat|unknown)/i);
    expectations.push({
      line: index + 1,
      expected: match ? match[1].toLowerCase() : null,
    });
  }

  return { expectations, checkSatCount };
}

function runZ3(path) {
  try {
    return execFileSync('z3', [path], { encoding: 'utf8' });
  } catch (error) {
    // Z3 exits non-zero when the script contains unsat checks; the output
    // is still the authoritative result stream.
    if (typeof error.stdout === 'string' && error.stdout.length > 0) {
      return error.stdout;
    }
    throw error;
  }
}

function verify(path) {
  const { expectations, checkSatCount } = readExpectations(path);

  if (checkSatCount === 0) {
    return { path, skipped: true, reason: 'no (check-sat) blocks' };
  }

  const annotated = expectations.filter((e) => e.expected !== null);
  if (annotated.length === 0) {
    return { path, skipped: true, reason: 'no EXPECTED annotations' };
  }

  const output = runZ3(path);
  const results = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l === 'sat' || l === 'unsat' || l === 'unknown');

  const failures = [];

  if (results.length !== expectations.length) {
    failures.push(
      `solver emitted ${results.length} result(s) for ${expectations.length} (check-sat) call(s)`,
    );
  }

  expectations.forEach((expectation, i) => {
    if (expectation.expected === null) return;
    const actual = results[i];
    if (actual !== expectation.expected) {
      failures.push(
        `line ${expectation.line}: expected ${expectation.expected}, got ${actual ?? '<missing>'}`,
      );
    }
  });

  return {
    path,
    skipped: false,
    checked: annotated.length,
    total: expectations.length,
    failures,
  };
}

function collectTargets(args) {
  if (args.length > 0) return args;
  if (!existsSync(DEFAULT_DIR)) return [];
  return readdirSync(DEFAULT_DIR)
    .filter((f) => f.endsWith('.smt2'))
    .map((f) => join(DEFAULT_DIR, f))
    .sort();
}

function main() {
  const targets = collectTargets(process.argv.slice(2));

  if (targets.length === 0) {
    console.error(`No .smt2 artifacts found (looked in ./${DEFAULT_DIR}).`);
    process.exit(1);
  }

  try {
    execFileSync('z3', ['--version'], { stdio: 'ignore' });
  } catch {
    console.error('z3 not found on PATH. Install with: pip install z3-solver');
    process.exit(1);
  }

  let failed = 0;
  let verified = 0;

  for (const target of targets) {
    const result = verify(target);

    if (result.skipped) {
      console.log(`SKIP  ${target} (${result.reason})`);
      continue;
    }

    if (result.failures.length > 0) {
      failed += 1;
      console.log(`FAIL  ${target}`);
      for (const failure of result.failures) console.log(`        ${failure}`);
    } else {
      verified += 1;
      console.log(
        `PASS  ${target} (${result.checked}/${result.total} annotated check-sat blocks)`,
      );
    }
  }

  console.log(`\n${verified} file(s) passed, ${failed} file(s) failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
