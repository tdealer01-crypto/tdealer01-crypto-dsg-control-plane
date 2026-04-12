#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const INPUT_FILE =
  process.env.BENCHMARK_SITE_INPUT || "artifacts/benchmark/benchmark-result.json";
const SITE_DIR = process.env.BENCHMARK_SITE_DIR || "site";

async function main() {
  const raw = await fs.readFile(INPUT_FILE, "utf8");
  const result = JSON.parse(raw);

  await fs.mkdir(path.join(SITE_DIR, "benchmark"), { recursive: true });

  const benchmarkIndex = renderBenchmarkPage(result);
  const rootIndex = renderRootIndex(result);

  await fs.writeFile(
    path.join(SITE_DIR, "benchmark", "index.html"),
    benchmarkIndex,
    "utf8",
  );

  await fs.writeFile(
    path.join(SITE_DIR, "benchmark", "result.json"),
    JSON.stringify(result, null, 2),
    "utf8",
  );

  await fs.writeFile(path.join(SITE_DIR, "index.html"), rootIndex, "utf8");

  console.log(`[ok] wrote ${SITE_DIR}/benchmark/index.html`);
  console.log(`[ok] wrote ${SITE_DIR}/benchmark/result.json`);
  console.log(`[ok] wrote ${SITE_DIR}/index.html`);
}

function renderRootIndex(result) {
  const verdict = result.summary?.pass ? "PASS" : "FAIL";
  const gateAccuracy = result.summary?.metrics?.gate_accuracy ?? "N/A";
  const replayCompleteness =
    result.summary?.metrics?.replay_completeness ?? "N/A";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DSG Benchmark</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <style>
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      background: #0b1020;
      color: #e7ecf5;
    }
    .wrap {
      max-width: 880px;
      margin: 0 auto;
      padding: 48px 20px 80px;
    }
    .card {
      background: #121a30;
      border: 1px solid #24304f;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,.25);
    }
    .eyebrow { color: #8ea3d1; font-size: 14px; margin-bottom: 10px; }
    h1 { font-size: 36px; margin: 0 0 12px; }
    p { color: #c3cee5; line-height: 1.6; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin: 24px 0;
    }
    .metric {
      background: #0d1529;
      border: 1px solid #24304f;
      border-radius: 12px;
      padding: 16px;
    }
    .metric-label { color: #8ea3d1; font-size: 13px; }
    .metric-value { font-size: 28px; font-weight: 700; margin-top: 6px; }
    .btn {
      display: inline-block;
      padding: 12px 16px;
      background: #1b5cff;
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      margin-top: 10px;
    }
    .small { color: #8ea3d1; font-size: 13px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="eyebrow">DSG Public Benchmark</div>
      <h1>Governed runtime benchmark</h1>
      <p>
        DSG benchmark results measure gate decision accuracy, replay completeness,
        ledger match, proof presence, and false allow rate for governed runtime execution.
      </p>

      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Verdict</div>
          <div class="metric-value">${escapeHtml(verdict)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Gate Accuracy</div>
          <div class="metric-value">${escapeHtml(gateAccuracy)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Replay Completeness</div>
          <div class="metric-value">${escapeHtml(replayCompleteness)}</div>
        </div>
      </div>

      <a class="btn" href="./benchmark/">Open full benchmark report</a>
      <div class="small">Generated from the repository benchmark workflow artifacts.</div>
    </div>
  </div>
</body>
</html>`;
}

function renderBenchmarkPage(result) {
  const meta = result.meta ?? {};
  const summary = result.summary ?? {};
  const metrics = summary.metrics ?? {};
  const totals = summary.totals ?? {};
  const rows = (result.results ?? [])
    .map(
      (r) => `<tr>
  <td>${escapeHtml(r.case_id)}</td>
  <td>${escapeHtml(r.expected_decision)}</td>
  <td>${escapeHtml(r.observed_decision)}</td>
  <td>${r.decision_match ? "yes" : "no"}</td>
  <td>${r.replay_ok ? "yes" : "no"}</td>
  <td>${r.ledger_ok === true ? "yes" : "no"}</td>
  <td>${r.proof_present ? "yes" : "no"}</td>
  <td>${escapeHtml(String(r.latency_ms))}</td>
</tr>`,
    )
    .join("\n");

  const verdict = summary.pass ? "PASS" : "FAIL";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DSG Benchmark Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <style>
    :root {
      --bg: #0b1020;
      --panel: #121a30;
      --panel-2: #0d1529;
      --border: #24304f;
      --text: #e7ecf5;
      --muted: #8ea3d1;
      --accent: #1b5cff;
      --good: #1ea672;
      --bad: #e25555;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px 80px;
    }
    h1 { font-size: 38px; margin: 0 0 10px; }
    h2 { font-size: 22px; margin: 0 0 16px; }
    p, li { color: #c3cee5; line-height: 1.6; }
    .muted { color: var(--muted); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin: 20px 0 32px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 10px 30px rgba(0,0,0,.2);
    }
    .label { font-size: 13px; color: var(--muted); }
    .value { font-size: 30px; font-weight: 700; margin-top: 6px; }
    .section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px;
      margin-top: 20px;
    }
    .pill {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      border: 1px solid var(--border);
      background: ${summary.pass ? "rgba(30,166,114,.15)" : "rgba(226,85,85,.15)"};
      color: ${summary.pass ? "var(--good)" : "var(--bad)"};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 14px;
    }
    th, td {
      text-align: left;
      padding: 12px 10px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    th { color: var(--muted); font-weight: 600; }
    code, pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    pre {
      background: var(--panel-2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px;
      overflow: auto;
      color: #d7def0;
    }
    a { color: #8eb0ff; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="muted">DSG Public Benchmark Report</div>
    <h1>Governed runtime benchmark</h1>
    <p>
      This benchmark validates governed runtime behavior for DSG execution flow,
      including gate decision accuracy, replay completeness, ledger match, proof presence,
      false allow rate, and latency.
    </p>
    <div class="pill">${escapeHtml(verdict)}</div>

    <div class="grid">
      <div class="card"><div class="label">Gate Accuracy</div><div class="value">${escapeHtml(metrics.gate_accuracy ?? "N/A")}</div></div>
      <div class="card"><div class="label">Replay Completeness</div><div class="value">${escapeHtml(metrics.replay_completeness ?? "N/A")}</div></div>
      <div class="card"><div class="label">Ledger Match Rate</div><div class="value">${escapeHtml(metrics.ledger_match_rate ?? "N/A")}</div></div>
      <div class="card"><div class="label">Proof Presence Rate</div><div class="value">${escapeHtml(metrics.proof_presence_rate ?? "N/A")}</div></div>
      <div class="card"><div class="label">False Allow Rate</div><div class="value">${escapeHtml(metrics.false_allow_rate ?? "N/A")}</div></div>
      <div class="card"><div class="label">Average Latency</div><div class="value">${escapeHtml(String(metrics.avg_latency_ms ?? "N/A"))} ms</div></div>
    </div>

    <div class="section">
      <h2>Target</h2>
      <ul>
        <li>Generated at: <code>${escapeHtml(meta.generated_at ?? "N/A")}</code></li>
        <li>Base URL: <code>${escapeHtml(meta.base_url ?? "N/A")}</code></li>
        <li>Execute path: <code>${escapeHtml(meta.execute_path ?? "N/A")}</code></li>
        <li>Replay path prefix: <code>${escapeHtml(meta.replay_path_prefix ?? "N/A")}</code></li>
        <li>Agent ID: <code>${escapeHtml(meta.agent_id ?? "N/A")}</code></li>
        <li>Total cases: <code>${escapeHtml(String(meta.total_cases ?? "N/A"))}</code></li>
      </ul>
    </div>

    <div class="section">
      <h2>Totals</h2>
      <pre>${escapeHtml(JSON.stringify(totals, null, 2))}</pre>
    </div>

    <div class="section">
      <h2>Case Results</h2>
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Expected</th>
            <th>Observed</th>
            <th>Decision match</th>
            <th>Replay ok</th>
            <th>Ledger ok</th>
            <th>Proof present</th>
            <th>Latency ms</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Raw result JSON</h2>
      <p><a href="./result.json">Download result.json</a></p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
