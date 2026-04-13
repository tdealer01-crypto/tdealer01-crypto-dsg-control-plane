#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const PLACEHOLDER_HINTS = ["<API_KEY", "<Agent_ID", "<AGENT_ID", "<your", "YOUR_"];

const BASE_URL = mustGetEnv("BENCHMARK_BASE_URL");
const API_KEY = mustGetEnv("BENCHMARK_API_KEY");
const AGENT_ID = mustGetEnv("BENCHMARK_AGENT_ID");
const ACTION = process.env.BENCHMARK_ACTION || "scan";
const CASES_FILE =
  process.env.BENCHMARK_CASES_FILE || "benchmarks/cases/gate-cases.json";
const OUT_DIR = process.env.BENCHMARK_OUT_DIR || "artifacts/benchmark";
const EXECUTE_PATH = process.env.BENCHMARK_EXECUTE_PATH || "/api/execute";
const REPLAY_PATH_PREFIX =
  process.env.BENCHMARK_REPLAY_PATH_PREFIX || "/api/replay";

const nowIso = new Date().toISOString();

async function main() {
  const cases = await loadCases(CASES_FILE);
  await fs.mkdir(OUT_DIR, { recursive: true });

  const results = [];
  for (const testCase of cases) {
    const result = await runCase(testCase);
    results.push(result);

    const fatalSetupMessage = getFatalSetupMessage(result);
    if (fatalSetupMessage) {
      throw new Error(fatalSetupMessage);
    }
  }

  const summary = buildSummary(results);

  const resultJson = {
    meta: {
      generated_at: nowIso,
      base_url: BASE_URL,
      execute_path: EXECUTE_PATH,
      replay_path_prefix: REPLAY_PATH_PREFIX,
      agent_id: AGENT_ID,
      action: ACTION,
      total_cases: results.length,
    },
    summary,
    results,
  };

  const resultPath = path.join(OUT_DIR, "benchmark-result.json");
  const summaryPath = path.join(OUT_DIR, "benchmark-summary.md");

  await fs.writeFile(resultPath, JSON.stringify(resultJson, null, 2), "utf8");
  await fs.writeFile(summaryPath, renderMarkdownSummary(resultJson), "utf8");

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.pass) {
    process.exitCode = 1;
  }
}

function getFatalSetupMessage(result) {
  const status = Number(result?.execute_status || 0);
  const message = String(result?.execute_response?.error || "");
  const lower = message.toLowerCase();

  if (status === 401 && lower.includes("invalid agent_id or api key")) {
    return [
      "Benchmark stopped: invalid BENCHMARK_AGENT_ID or BENCHMARK_API_KEY.",
      "- Ensure API key belongs to the same agent_id.",
      "- Reissue a new agent API key and export both values again.",
      "- Quick check:",
      `  curl -s -X POST \"${BASE_URL}${EXECUTE_PATH}\" -H \"Content-Type: application/json\" -H \"Authorization: Bearer <API_KEY>\" -d '{\"agent_id\":\"<AGENT_ID>\",\"action\":\"scan\",\"input\":{},\"context\":{}}' | jq .`,
    ].join("\n");
  }

  if (status === 401 && lower.includes("missing bearer token")) {
    return "Benchmark stopped: missing Authorization Bearer token. Check BENCHMARK_API_KEY export.";
  }

  if (status === 403 && lower.includes("agent is not active")) {
    return "Benchmark stopped: agent is not active. Activate the agent before running benchmark.";
  }

  return null;
}

async function loadCases(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Invalid benchmark cases file: ${filePath}`);
  }
  return parsed;
}

async function runCase(testCase) {
  const startedAt = Date.now();

  const executePayload = {
    agent_id: AGENT_ID,
    action: testCase.action || ACTION,
    input: testCase.input || {},
    context: testCase.context || {},
  };

  const executeRes = await fetchJson(`${BASE_URL}${EXECUTE_PATH}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(executePayload),
  });

  if (!executeRes.ok && !executeRes.network_error) {
    console.error(
      `[benchmark][${testCase.case_id}] execute failed: status=${executeRes.status} path=${EXECUTE_PATH} error=${extractErrorMessage(executeRes.data)}`,
    );
  }

  if (executeRes.network_error) {
    console.error(
      `[benchmark][${testCase.case_id}] execute network error: ${executeRes.network_error}`,
    );
  }

  const executionId = findExecutionId(executeRes.data);
  let replayRes = null;

  if (executionId) {
    replayRes = await fetchJson(
      `${BASE_URL}${REPLAY_PATH_PREFIX}/${encodeURIComponent(executionId)}`,
      {
        method: "GET",
        headers: authHeaders(),
      },
    );

    if (!replayRes.ok && !replayRes.network_error) {
      console.error(
        `[benchmark][${testCase.case_id}] replay failed: status=${replayRes.status} path=${REPLAY_PATH_PREFIX}/${executionId} error=${extractErrorMessage(replayRes.data)}`,
      );
    }
  }

  const finishedAt = Date.now();

  const observedDecision =
    findDecision(replayRes?.data) ||
    findDecision(executeRes.data) ||
    "UNKNOWN";

  const proofHash = findProofHash(replayRes?.data);
  const ledgerOk = findLedgerOk(replayRes?.data);
  const replayOk = Boolean(replayRes?.ok && replayRes?.data?.ok);
  const executionOk = Boolean(executeRes?.ok);
  const latencyMs = finishedAt - startedAt;

  const expectedDecision = String(testCase.expected_decision || "").toUpperCase();
  const decisionMatch = expectedDecision === observedDecision;
  const proofPresent = typeof proofHash === "string" && proofHash.length > 0;

  return {
    case_id: testCase.case_id,
    name: testCase.name,
    expected_decision: expectedDecision,
    observed_decision: observedDecision,
    decision_match: decisionMatch,
    execution_ok: executionOk,
    replay_ok: replayOk,
    execution_id: executionId,
    ledger_ok: ledgerOk,
    proof_present: proofPresent,
    proof_hash: proofHash,
    latency_ms: latencyMs,
    execute_status: executeRes.status,
    replay_status: replayRes?.status ?? null,
    network_error: executeRes.network_error || replayRes?.network_error || null,
    request: executePayload,
    execute_response: executeRes.data,
    replay_response: replayRes?.data ?? null,
  };
}

function buildSummary(results) {
  const total = results.length;
  const decisionMatches = results.filter((r) => r.decision_match).length;
  const replaySuccess = results.filter((r) => r.replay_ok).length;
  const ledgerMatches = results.filter((r) => r.ledger_ok === true).length;
  const proofPresent = results.filter((r) => r.proof_present).length;

  const decisionConsistency = ratio(decisionMatches, total);
  const replayCompleteness = ratio(replaySuccess, total);
  const ledgerMatchRate = ratio(ledgerMatches, total);
  const proofPresenceRate = ratio(proofPresent, total);

  const falseAllows = results.filter(
    (r) =>
      r.expected_decision === "BLOCK" &&
      ["ALLOW", "STABILIZE"].includes(r.observed_decision),
  ).length;

  const falseAllowRate = ratio(falseAllows, total);

  const avgLatencyMs =
    total > 0
      ? Math.round(
          results.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / total,
        )
      : 0;

  const pass =
    decisionMatches === total &&
    replaySuccess === total &&
    ledgerMatches === total &&
    proofPresent === total &&
    falseAllows === 0;

  return {
    pass,
    totals: {
      total,
      decision_matches: decisionMatches,
      replay_success: replaySuccess,
      ledger_matches: ledgerMatches,
      proof_present: proofPresent,
      false_allows: falseAllows,
    },
    metrics: {
      gate_accuracy: toPercent(decisionConsistency),
      replay_completeness: toPercent(replayCompleteness),
      ledger_match_rate: toPercent(ledgerMatchRate),
      proof_presence_rate: toPercent(proofPresenceRate),
      false_allow_rate: toPercent(falseAllowRate),
      avg_latency_ms: avgLatencyMs,
    },
  };
}

function renderMarkdownSummary(resultJson) {
  const { meta, summary, results } = resultJson;

  const rows = results
    .map((r) => {
      return `| ${escapeMd(r.case_id)} | ${escapeMd(r.expected_decision)} | ${escapeMd(r.observed_decision)} | ${r.decision_match ? "yes" : "no"} | ${r.replay_ok ? "yes" : "no"} | ${r.ledger_ok === true ? "yes" : "no"} | ${r.proof_present ? "yes" : "no"} | ${r.latency_ms} |`;
    })
    .join("\n");

  return `# DSG Benchmark Summary

Generated at: ${meta.generated_at}

## Target
- Base URL: \`${meta.base_url}\`
- Execute path: \`${meta.execute_path}\`
- Replay path prefix: \`${meta.replay_path_prefix}\`
- Agent ID: \`${meta.agent_id}\`
- Action: \`${meta.action}\`

## Verdict
**${summary.pass ? "PASS" : "FAIL"}**

## Metrics
- Gate accuracy: **${summary.metrics.gate_accuracy}**
- Replay completeness: **${summary.metrics.replay_completeness}**
- Ledger match rate: **${summary.metrics.ledger_match_rate}**
- Proof presence rate: **${summary.metrics.proof_presence_rate}**
- False allow rate: **${summary.metrics.false_allow_rate}**
- Average latency: **${summary.metrics.avg_latency_ms} ms**

## Case Results
| Case | Expected | Observed | Decision match | Replay ok | Ledger ok | Proof present | Latency ms |
|---|---|---|---|---|---|---|---|
${rows}
`;
}

async function fetchJson(url, init) {
  let res;
  try {
    res = await fetch(url, init);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {
        error: "Network request failed",
        details: error instanceof Error ? error.message : String(error),
      },
      network_error: error instanceof Error ? error.message : String(error),
    };
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    network_error: null,
  };
}

function extractErrorMessage(data) {
  if (!data || typeof data !== "object") return "unknown";
  return data.error || data.message || "unknown";
}

function authHeaders() {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${API_KEY}`,
  };
}

function findExecutionId(data) {
  if (!data || typeof data !== "object") return null;

  return (
    data.execution_id ||
    data.executionId ||
    data.execution?.id ||
    data.execution?.execution_id ||
    null
  );
}

function findDecision(data) {
  if (!data || typeof data !== "object") return null;

  const decision =
    data.execution?.decision ||
    data.audit?.decision ||
    data.decision ||
    data.final_decision ||
    null;

  return decision ? String(decision).toUpperCase() : null;
}

function findProofHash(data) {
  if (!data || typeof data !== "object") return null;

  return (
    data.audit?.evidence?.core_result?.proof_hash ||
    data.audit?.evidence?.proof_hash ||
    data.proof_hash ||
    null
  );
}

function findLedgerOk(data) {
  if (!data || typeof data !== "object") return null;
  return data.core?.ledger_ok ?? null;
}

function ratio(num, den) {
  if (!den) return 0;
  return num / den;
}

function toPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function mustGetEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  if (PLACEHOLDER_HINTS.some((hint) => value.includes(hint))) {
    throw new Error(
      `Environment variable ${name} still has placeholder text. Replace it with a real value before running benchmark.`,
    );
  }

  return value;
}

function escapeMd(value) {
  return String(value).replace(/\|/g, "\\|");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
