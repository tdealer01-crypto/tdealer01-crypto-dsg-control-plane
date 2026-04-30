#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const BASELINES_FILE = process.env.PUBLIC_VENDOR_BASELINES_FILE || 'benchmarks/vendor-baseline/public-doc-baselines.json';
const FULL_EVIDENCE_FILE = process.env.DSG_FULL_EVIDENCE_FILE || 'artifacts/full-evidence/dsg-full-evidence-manifest.json';
const OUT_DIR = process.env.PUBLIC_VENDOR_BASELINE_OUT_DIR || 'artifacts/public-vendor-baseline';

await main();

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const baseline = JSON.parse(await fs.readFile(BASELINES_FILE, 'utf8'));
  const dsgEvidence = await readJsonIfExists(FULL_EVIDENCE_FILE);
  const dsgEvidenceHash = await hashFileIfExists(FULL_EVIDENCE_FILE);

  const vendorRows = baseline.vendors.map((vendor) => ({
    vendorId: vendor.id,
    vendorName: vendor.name,
    baselineType: vendor.baselineType,
    runtimeTested: vendor.runtimeTested,
    scoreEligible: vendor.scoreEligible,
    category: vendor.category,
    sourceCount: vendor.sourceUrls.length,
    capabilities: Object.keys(vendor.capabilities || {}),
    status: vendor.runtimeTested ? 'tested' : 'public_docs_only',
  }));

  const artifact = {
    generatedAt: new Date().toISOString(),
    suiteId: baseline.suiteId,
    evidenceBoundary: baseline.evidenceBoundary,
    dsg: {
      baselineType: 'tested_production_evidence',
      runtimeTested: true,
      scoreEligible: true,
      fullEvidencePath: FULL_EVIDENCE_FILE,
      fullEvidenceExists: Boolean(dsgEvidence),
      fullEvidenceSha256: dsgEvidenceHash,
      latestObserved: baseline.dsgTestedEvidence.latestObserved,
      evidenceSummary: dsgEvidence?.summary ?? null,
    },
    vendors: vendorRows,
    sources: Object.fromEntries(baseline.vendors.map((vendor) => [vendor.id, vendor.sourceUrls])),
  };

  await fs.writeFile(path.join(OUT_DIR, 'public-vendor-baseline-result.json'), JSON.stringify(artifact, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'public-vendor-baseline-report.md'), renderReport(artifact, baseline));

  console.log(JSON.stringify({
    pass: Boolean(dsgEvidence),
    dsgRuntimeTested: true,
    publicDocVendors: vendorRows.length,
    vendorRuntimeTested: vendorRows.filter((row) => row.runtimeTested).length,
  }, null, 2));

  if (!dsgEvidence) {
    process.exitCode = 1;
  }
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function hashFileIfExists(file) {
  try {
    const content = await fs.readFile(file);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

function renderReport(artifact, baseline) {
  const rows = artifact.vendors.map((vendor) => `| ${vendor.vendorName} | ${vendor.category} | ${vendor.status} | ${vendor.scoreEligible ? 'yes' : 'no'} | ${vendor.sourceCount} |`).join('\n');
  const sourceSections = baseline.vendors.map((vendor) => {
    const capabilities = Object.entries(vendor.capabilities || {})
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
    const sources = vendor.sourceUrls.map((url) => `- ${url}`).join('\n');
    return `### ${vendor.name}\n\nCategory: ${vendor.category}\n\nRuntime tested by this suite: **${vendor.runtimeTested ? 'yes' : 'no'}**\n\nScore eligible: **${vendor.scoreEligible ? 'yes' : 'no'}**\n\nCapabilities from public docs:\n\n${capabilities}\n\nSources:\n\n${sources}\n`;
  }).join('\n');

  return `# Public Vendor Baseline Comparison\n\nGenerated at: ${artifact.generatedAt}\n\n## Boundary\n\n${artifact.evidenceBoundary}\n\n## DSG tested evidence\n\n- Runtime tested: **yes**\n- Score eligible: **yes**\n- Full evidence artifact: \`${artifact.dsg.fullEvidencePath}\`\n- Full evidence artifact exists: **${artifact.dsg.fullEvidenceExists ? 'yes' : 'no'}**\n- Full evidence SHA-256: \`${artifact.dsg.fullEvidenceSha256 || 'missing'}\`\n- Latest observed full evidence pass: **${artifact.dsg.latestObserved.fullEvidencePass ? 'true' : 'false'}**\n- Production gateway: **${artifact.dsg.latestObserved.productionGatewayPassed}**\n- SMT2 runtime invariants: **${artifact.dsg.latestObserved.smt2RuntimeInvariantPassed}**\n- Comparison score: **${artifact.dsg.latestObserved.comparisonScore} (${artifact.dsg.latestObserved.comparisonPercent})**\n\n## Vendor baseline table\n\n| Vendor | Category | Status | Score eligible | Source count |\n|---|---|---|---:|---:|\n${rows}\n\n## Vendor public-doc baselines\n\n${sourceSections}\n\n## Safe interpretation\n\nUse: DSG has production-tested evidence against a public vendor-baseline rubric derived from official/public market-leader documentation.\n\nDo not use: DSG runtime-tested and beat every vendor listed here.\n`;
}
