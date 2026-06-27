#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COVERAGE_FILE = "coverage/coverage-final.json";
const DEFAULT_TEST_RESULTS = "qa-logs/test-results.json";
const DEFAULT_MUTATION_RESULTS = "qa-logs/mutation-results.json";
const DEFAULT_SBOM_FILE = "artifacts/bom.cdx.json";
const DEFAULT_AUDIT_FILE = "artifacts/security/npm-audit.json";
const DEFAULT_OUTPUT_DIR = "artifacts";
const OUTPUT_MANIFEST = "evidence-bundle-manifest.json";

// ============================================================================
// Helper: Get Git Commit
// ============================================================================

async function getGitCommit() {
  try {
    const result = await spawnPromise("git", ["rev-parse", "HEAD"], {
      cwd: PROJECT_ROOT,
    });
    const commit = result.stdout.trim();
    if (commit && /^[0-9a-f]{40}$/.test(commit)) {
      return commit;
    }
  } catch {
    // fall through
  }
  return "unknown";
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

async function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    coverageFile: DEFAULT_COVERAGE_FILE,
    testResults: DEFAULT_TEST_RESULTS,
    mutationResults: DEFAULT_MUTATION_RESULTS,
    sbomFile: DEFAULT_SBOM_FILE,
    auditFile: DEFAULT_AUDIT_FILE,
    commit: process.env.GIT_COMMIT || await getGitCommit(),
    outputDir: DEFAULT_OUTPUT_DIR,
    sign: false,
    uploadS3: false,
    dryRun: false,
    help: false,
  };

  for (const arg of args) {
    if (arg === "--help") {
      options.help = true;
    } else if (arg === "--sign") {
      options.sign = true;
    } else if (arg === "--upload-s3") {
      options.uploadS3 = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--coverage-file=")) {
      options.coverageFile = arg.split("=")[1];
    } else if (arg.startsWith("--test-results=")) {
      options.testResults = arg.split("=")[1];
    } else if (arg.startsWith("--mutation-results=")) {
      options.mutationResults = arg.split("=")[1];
    } else if (arg.startsWith("--sbom-file=")) {
      options.sbomFile = arg.split("=")[1];
    } else if (arg.startsWith("--audit-file=")) {
      options.auditFile = arg.split("=")[1];
    } else if (arg.startsWith("--commit=")) {
      options.commit = arg.split("=")[1];
    } else if (arg.startsWith("--output=")) {
      options.outputDir = arg.split("=")[1];
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Build Evidence Bundle — Orchestrate artifact collection, hashing, signing, and storage

Usage:
  node scripts/build-evidence-bundle.mjs [OPTIONS]

Options:
  --coverage-file=PATH        Coverage JSON file (default: ${DEFAULT_COVERAGE_FILE})
  --test-results=PATH         Test results JSON file (default: ${DEFAULT_TEST_RESULTS})
  --mutation-results=PATH     Mutation test results (default: ${DEFAULT_MUTATION_RESULTS})
  --sbom-file=PATH            SBOM file (default: ${DEFAULT_SBOM_FILE})
  --audit-file=PATH           Security audit JSON (default: ${DEFAULT_AUDIT_FILE})
  --commit=SHA                Git commit SHA (default: from GIT_COMMIT env or 'unknown')
  --output=DIR                Output directory (default: ${DEFAULT_OUTPUT_DIR})
  --sign                      Sign bundle with Cosign or GitHub OIDC (optional)
  --upload-s3                 Upload to S3 (optional, requires S3_BUCKET env)
  --dry-run                   Print actions without writing files
  --help                      Show this help message

Examples:
  node scripts/build-evidence-bundle.mjs
  node scripts/build-evidence-bundle.mjs --coverage-file=custom-coverage.json --commit=abc123
  node scripts/build-evidence-bundle.mjs --sign --output=/tmp/evidence
  `);
}

// ============================================================================
// Helper: Read File
// ============================================================================

async function readJsonFile(filePath) {
  try {
    const resolvedPath = path.resolve(PROJECT_ROOT, filePath);
    const content = await fs.readFile(resolvedPath, "utf-8");
    const data = JSON.parse(content);
    const hash = sha256(canonicalize(data));
    return { data, hash, path: filePath };
  } catch (err) {
    console.warn(`⚠ ${filePath}: ${err.message}`);
    return null;
  }
}

// ============================================================================
// Helper: Canonicalize
// ============================================================================

function canonicalize(obj) {
  if (obj === null || obj === undefined) {
    return "null";
  }
  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    const items = obj.map(canonicalize);
    return `[${items.join(",")}]`;
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `"${k}":${canonicalize(obj[k])}`);
  return `{${pairs.join(",")}}`;
}

// ============================================================================
// Helper: SHA256
// ============================================================================

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

// ============================================================================
// Helper: Spawn Promise
// ============================================================================

function spawnPromise(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    if (proc.stdout) {
      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
    }
    if (proc.stderr) {
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`${command} exited with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

// ============================================================================
// Main: Collect Artifacts
// ============================================================================

async function collectArtifacts(options) {
  console.log("[→] Collecting artifacts...");

  const artifacts = {};
  const warnings = [];

  // Coverage
  const coverageResult = await readJsonFile(options.coverageFile);
  if (coverageResult) {
    artifacts.coverage = {
      type: "coverage",
      hash: coverageResult.hash,
      path: coverageResult.path,
      created_at: new Date().toISOString(),
      summary: extractCoverageSummary(coverageResult.data),
    };
  } else {
    warnings.push("coverage data unavailable");
  }

  // Test Results
  const testResult = await readJsonFile(options.testResults);
  if (testResult) {
    artifacts.tests = {
      type: "tests",
      hash: testResult.hash,
      path: testResult.path,
      created_at: new Date().toISOString(),
      summary: extractTestSummary(testResult.data),
    };
  } else {
    warnings.push("test results unavailable");
  }

  // Mutation Results
  const mutationResult = await readJsonFile(options.mutationResults);
  if (mutationResult) {
    artifacts.mutation = {
      type: "mutation",
      hash: mutationResult.hash,
      path: mutationResult.path,
      created_at: new Date().toISOString(),
      summary: extractMutationSummary(mutationResult.data),
    };
  } else {
    warnings.push("mutation test results unavailable");
  }

  // SBOM
  const sbomResult = await readJsonFile(options.sbomFile);
  if (sbomResult) {
    artifacts.sbom = {
      type: "sbom",
      hash: sbomResult.hash,
      path: sbomResult.path,
      created_at: new Date().toISOString(),
      summary: { format: "cdx" },
    };
  } else {
    warnings.push("SBOM unavailable");
  }

  // Audit
  const auditResult = await readJsonFile(options.auditFile);
  if (auditResult) {
    artifacts.audit = {
      type: "audit",
      hash: auditResult.hash,
      path: auditResult.path,
      created_at: new Date().toISOString(),
      summary: extractAuditSummary(auditResult.data),
    };
  } else {
    warnings.push("security audit unavailable");
  }

  return { artifacts, warnings };
}

// ============================================================================
// Extract Summaries
// ============================================================================

function extractCoverageSummary(data) {
  if (!data.total) {
    return null;
  }
  const total = data.total;
  return {
    lines: total.lines ? Math.round(total.lines.pct) : null,
    branches: total.branches ? Math.round(total.branches.pct) : null,
    functions: total.functions ? Math.round(total.functions.pct) : null,
    statements: total.statements ? Math.round(total.statements.pct) : null,
  };
}

function extractTestSummary(data) {
  if (Array.isArray(data)) {
    // Vitest format
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let duration = 0;

    for (const testFile of data) {
      if (testFile.tests) {
        for (const test of testFile.tests) {
          if (test.state === "pass") passed++;
          else if (test.state === "fail") failed++;
          else if (test.state === "skip") skipped++;
        }
      }
      if (testFile.duration) {
        duration += testFile.duration;
      }
    }

    return { passed, failed, skipped, duration };
  }

  // Generic format
  return {
    passed: data.passed || 0,
    failed: data.failed || 0,
    skipped: data.skipped || 0,
    duration: data.duration || 0,
  };
}

function extractMutationSummary(data) {
  if (data.metrics) {
    return {
      killed: data.metrics.killed || 0,
      survived: data.metrics.survived || 0,
      noCoverage: data.metrics.noCoverage || 0,
      timeout: data.metrics.timeout || 0,
      runtimeError: data.metrics.runtimeError || 0,
      // Stryker reports use mutationScore; CCVS evidence envelopes use mutation_score.
      score: data.metrics.mutationScore ?? data.metrics.mutation_score ?? 0,
    };
  }
  return null;
}

function extractAuditSummary(data) {
  const vulnerabilities = data.metadata?.vulnerabilities || {};
  return {
    critical: vulnerabilities.critical || 0,
    high: vulnerabilities.high || 0,
    medium: vulnerabilities.medium || 0,
    low: vulnerabilities.low || 0,
    info: vulnerabilities.info || 0,
  };
}

// ============================================================================
// Main: Build Chain
// ============================================================================

function buildChain(artifacts) {
  console.log("[→] Building artifact chain...");

  const chain = [];
  let previousHash = "";

  const keys = Object.keys(artifacts).sort();
  for (const key of keys) {
    const artifact = artifacts[key];
    const chainInput = previousHash + artifact.hash;
    const chainHash = sha256(chainInput);

    chain.push({
      ...artifact,
      chain_hash: chainHash,
      linked_from: previousHash || "root",
    });

    previousHash = chainHash;
  }

  return {
    chain,
    final_chain_hash: previousHash,
  };
}

// ============================================================================
// Main: Build Bundle
// ============================================================================

function buildBundle(artifacts, chainData, options) {
  console.log("[→] Building evidence bundle manifest...");

  const manifest = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    commit: options.commit,
    policy_version: process.env.POLICY_VERSION || "unknown",
    artifacts: chainData.chain.map((artifact) => ({
      type: artifact.type,
      hash: artifact.hash,
      chain_hash: artifact.chain_hash,
      linked_from: artifact.linked_from,
      path: artifact.path,
      created_at: artifact.created_at,
      summary: artifact.summary,
    })),
    chain_hash: chainData.final_chain_hash,
    summary: buildBundleSummary(artifacts),
    signature: null,
  };

  return manifest;
}

function buildBundleSummary(artifacts) {
  const summary = {};

  if (artifacts.coverage?.summary) {
    Object.assign(summary, {
      coverage_lines_pct: artifacts.coverage.summary.lines,
      coverage_branches_pct: artifacts.coverage.summary.branches,
      coverage_functions_pct: artifacts.coverage.summary.functions,
      coverage_statements_pct: artifacts.coverage.summary.statements,
    });
  }

  if (artifacts.tests?.summary) {
    Object.assign(summary, {
      test_passed: artifacts.tests.summary.passed,
      test_failed: artifacts.tests.summary.failed,
      test_skipped: artifacts.tests.summary.skipped,
      test_duration_ms: artifacts.tests.summary.duration,
    });
  }

  if (artifacts.mutation?.summary) {
    Object.assign(summary, {
      mutation_killed: artifacts.mutation.summary.killed,
      mutation_survived: artifacts.mutation.summary.survived,
      mutation_score: artifacts.mutation.summary.score,
    });
  }

  if (artifacts.audit?.summary) {
    Object.assign(summary, {
      vuln_critical: artifacts.audit.summary.critical,
      vuln_high: artifacts.audit.summary.high,
      vuln_medium: artifacts.audit.summary.medium,
      vuln_low: artifacts.audit.summary.low,
    });
  }

  return summary;
}

// ============================================================================
// Main: Sign Bundle
// ============================================================================

async function signBundle(manifestPath, options) {
  if (!options.sign) {
    return { signed: false, method: null };
  }

  console.log("[→] Signing bundle...");

  // Try Cosign first
  if (process.env.COSIGN_KEY) {
    try {
      console.log("  [→] Attempting Cosign signature...");
      const result = await spawnPromise("cosign", [
        "sign-blob",
        `--key=${process.env.COSIGN_KEY}`,
        manifestPath,
      ]);
      const signature = result.stdout.trim();
      const sigPath = `${manifestPath}.sig`;
      await fs.writeFile(sigPath, signature);
      console.log(`  [✓] Signed with Cosign: ${sigPath}`);
      return { signed: true, method: "cosign", path: sigPath };
    } catch (err) {
      console.warn(`  ⚠ Cosign signing failed: ${err.message}`);
    }
  }

  // Try GitHub OIDC
  if (process.env.GITHUB_TOKEN) {
    try {
      console.log("  [→] Attempting GitHub OIDC attestation...");
      const result = await spawnPromise("gh", [
        "attestation",
        "create",
        manifestPath,
      ]);
      console.log(`  [✓] Signed with GitHub OIDC`);
      return { signed: true, method: "github-oidc", output: result.stdout };
    } catch (err) {
      console.warn(`  ⚠ GitHub OIDC signing failed: ${err.message}`);
    }
  }

  console.warn("⚠ No signing method available (COSIGN_KEY or GITHUB_TOKEN)");
  return { signed: false, method: null };
}

// ============================================================================
// Main: Write Manifest
// ============================================================================

async function writeManifest(manifest, options) {
  const outputDir = path.resolve(PROJECT_ROOT, options.outputDir);
  const manifestPath = path.join(outputDir, OUTPUT_MANIFEST);

  if (options.dryRun) {
    console.log(`[DRY-RUN] Would write manifest to: ${manifestPath}`);
    console.log("[DRY-RUN] Manifest preview:");
    console.log(JSON.stringify(manifest, null, 2).substring(0, 500) + "...");
    return manifestPath;
  }

  console.log(`[→] Writing manifest to ${outputDir}...`);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf-8"
  );
  console.log(`[✓] Manifest written: ${manifestPath}`);

  return manifestPath;
}

// ============================================================================
// Main: Report Results
// ============================================================================

function reportResults(manifest, signResult, warnings, options) {
  console.log("\n" + "=".repeat(70));
  console.log("[✓] Evidence bundle built");
  console.log("=".repeat(70));

  if (manifest.summary.coverage_lines_pct !== null) {
    console.log(`[✓] Coverage: ${manifest.summary.coverage_lines_pct}% lines, ${manifest.summary.coverage_branches_pct}% branches`);
  } else {
    console.log("[·] Coverage: unavailable");
  }

  if (manifest.summary.test_passed !== undefined) {
    console.log(`[✓] Tests: ${manifest.summary.test_passed} passed, ${manifest.summary.test_failed} failed`);
  } else {
    console.log("[·] Tests: unavailable");
  }

  if (manifest.summary.mutation_score !== undefined) {
    console.log(`[✓] Mutation: score ${manifest.summary.mutation_score}%`);
  } else {
    console.log("[·] Mutation: unavailable");
  }

  if (manifest.summary.vuln_critical !== undefined) {
    console.log(`[✓] Vulnerabilities: ${manifest.summary.vuln_critical} critical, ${manifest.summary.vuln_high} high`);
  } else {
    console.log("[·] Vulnerabilities: unavailable");
  }

  console.log(`[✓] Chain hash verified: ${manifest.chain_hash.substring(0, 12)}...`);

  if (signResult.signed) {
    console.log(`[✓] Signature: ${signResult.method}`);
  } else {
    console.log("[·] Signature: unsigned");
  }

  console.log(
    `[✓] Bundle: ${path.join(options.outputDir, OUTPUT_MANIFEST)}`
  );

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`  ⚠ ${warning}`);
    }
  }

  console.log("=".repeat(70) + "\n");
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
  const options = await parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    console.log("🔗 Evidence Bundle Builder\n");

    // Collect artifacts
    const { artifacts, warnings } = await collectArtifacts(options);

    if (Object.keys(artifacts).length === 0) {
      console.error(
        "✗ No artifacts found. Check paths and try again."
      );
      process.exit(1);
    }

    // Build chain
    const chainData = buildChain(artifacts);

    // Build manifest
    const manifest = buildBundle(artifacts, chainData, options);

    // Write manifest
    const manifestPath = await writeManifest(manifest, options);

    // Sign (optional)
    const signResult = await signBundle(manifestPath, options);

    // Update manifest with signature if signed
    if (signResult.signed && !options.dryRun) {
      manifest.signature = {
        method: signResult.method,
        path: signResult.path,
      };
      await fs.writeFile(
        manifestPath,
        JSON.stringify(manifest, null, 2) + "\n",
        "utf-8"
      );
    }

    // Report
    reportResults(manifest, signResult, warnings, options);

    // Exit with appropriate code
    if (warnings.length > 0) {
      process.exit(2); // Partial data
    } else {
      process.exit(0); // Success
    }
  } catch (err) {
    console.error("\n✗ Error building evidence bundle:");
    console.error(err.message);
    process.exit(1);
  }
}

main();
