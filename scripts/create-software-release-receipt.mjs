#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stable(child)]),
    );
  }
  return value;
}

const hash = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const validHash = (value) => /^(?:sha256:)?[a-f0-9]{64}$/i.test(value ?? '');
const commit = process.env.COMMIT_SHA || process.env.GITHUB_SHA;
const deploymentUrl = process.env.DEPLOY_URL;
const softwareEvidenceBundleHash = process.env.SOFTWARE_EVIDENCE_HASH;
const dsgProofHash = process.env.DSG_PROOF_HASH || null;
const dir = process.env.DSG_RELEASE_DIR || '.dsg-release';

if (!commit || !/^[a-f0-9]{7,64}$/i.test(commit)) throw new Error('COMMIT_SHA_REQUIRED');
if (!deploymentUrl?.startsWith('https://')) throw new Error('HTTPS_DEPLOY_URL_REQUIRED');
if (!/^sha256:[a-f0-9]{64}$/i.test(softwareEvidenceBundleHash ?? '')) throw new Error('SOFTWARE_EVIDENCE_HASH_REQUIRED');
if (dsgProofHash && !validHash(dsgProofHash)) throw new Error('DSG_PROOF_HASH_INVALID');

const health = await readFile(`${dir}/health.json`, 'utf8');
const readiness = await readFile(`${dir}/readiness.json`, 'utf8');
const readinessBody = JSON.parse(readiness);
if (readinessBody.ready !== true) throw new Error('READINESS_POSTCONDITION_NOT_MET');

const body = {
  schema: 'dsg.software-release-receipt.v1',
  commit,
  deploymentUrl,
  softwareEvidenceBundleHash,
  dsgProofHash,
  observedPostconditions: {
    healthHash: hash(health),
    readinessHash: hash(readiness),
    readiness: true,
  },
};
const receiptHash = hash(JSON.stringify(stable(body)));
const receipt = { ...body, receiptHash };
await writeFile(`${dir}/release-receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
