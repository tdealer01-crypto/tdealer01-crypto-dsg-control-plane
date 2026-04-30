#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const SUITE_FILE = process.env.GATEWAY_COMPARISON_SUITE || 'benchmarks/gateway-comparison/suite.json';
const SCORE_FILES = (process.env.GATEWAY_COMPARISON_SCORES || 'benchmarks/gateway-comparison/dsg-score.json')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const OUT_DIR = process.env.GATEWAY_COMPARISON_OUT_DIR || 'artifacts/gateway-comparison';

async function main() {
  const suite = JSON.parse(await fs.readFile(SUITE_FILE, 'utf8'));
  const scoreDocs = [];

  for (const file of SCORE_FILES) {
    scoreDocs.push(JSON.parse(await fs.readFile(file, 'utf8')));
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  const results = scoreDocs.map((doc) => scoreVendor(suite, doc));
  const artifact = {
    suite: {
      suiteId: suite.suiteId,
      title: suite.title,
      version: suite.version,
      evidenceBoundary: suite.evidenceBoundary,
    },
    generatedAt: new Date().toISOString(),
    results,
  };

  await fs.writeFile(path.join(OUT_DIR, 'gateway-comparison-result.json'), JSON.stringify(artifact, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'gateway-comparison-report.md'), renderReport(suite, artifact));

  console.log(JSON.stringify({ vendors: results.length, results: results.map(({ vendorId, totalScore, maxScore, percent }) => ({ vendorId, totalScore, maxScore, percent })) }, null, 2));
}

function scoreVendor(suite, doc) {
  let totalScore = 0;
  let maxScore = 0;
  const criteria = [];

  for (const criterion of suite.criteria) {
    const scoreEntry = doc.scores?.[criterion.id] || { score: 0, evidence: 'No evidence submitted.' };
    const normalizedScore = Math.max(0, Math.min(2, Number(scoreEntry.score || 0)));
    const weightedScore = normalizedScore * criterion.weight;
    const weightedMax = 2 * criterion.weight;

    totalScore += weightedScore;
    maxScore += weightedMax;

    criteria.push({
      id: criterion.id,
      label: criterion.label,
      weight: criterion.weight,
      score: normalizedScore,
      weightedScore,
      weightedMax,
      evidence: scoreEntry.evidence || 'No evidence submitted.',
    });
  }

  return {
    vendorId: doc.vendorId,
    vendorName: doc.vendorName,
    scoredAt: doc.scoredAt,
    totalScore,
    maxScore,
    percent: `${Math.round((totalScore / Math.max(maxScore, 1)) * 100)}%`,
    evidence: doc.evidence || {},
    criteria,
  };
}

function renderReport(suite, artifact) {
  const vendorRows = artifact.results
    .map((result) => `| ${escapeMd(result.vendorName)} | ${result.totalScore} / ${result.maxScore} | ${result.percent} |`)
    .join('\n');

  const detailSections = artifact.results
    .map((result) => {
      const rows = result.criteria
        .map((criterion) => `| ${escapeMd(criterion.label)} | ${criterion.score}/2 | ${criterion.weight} | ${criterion.weightedScore}/${criterion.weightedMax} | ${escapeMd(criterion.evidence)} |`)
        .join('\n');

      return `## ${result.vendorName}\n\nTotal: **${result.totalScore} / ${result.maxScore} (${result.percent})**\n\n| Criterion | Score | Weight | Weighted | Evidence |\n|---|---:|---:|---:|---|\n${rows}\n`;
    })
    .join('\n');

  return `# ${suite.title}\n\nGenerated at: ${artifact.generatedAt}\n\n## Evidence boundary\n\n${suite.evidenceBoundary}\n\n## Score scale\n\n- 0: ${suite.scoreScale['0']}\n- 1: ${suite.scoreScale['1']}\n- 2: ${suite.scoreScale['2']}\n\n## Vendor summary\n\n| Vendor | Score | Percent |\n|---|---:|---:|\n${vendorRows}\n\n${detailSections}`;
}

function escapeMd(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
