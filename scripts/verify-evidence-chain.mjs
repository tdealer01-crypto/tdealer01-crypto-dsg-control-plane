#!/usr/bin/env node
/**
 * Verifies the integrity of a CCVS evidence envelope or a directory of envelopes.
 * Checks chain_hash, previous_chain_hash linkage, and schema_version.
 *
 * Usage:
 *   node scripts/verify-evidence-chain.mjs ccvs-unit-evidence.json
 *   node scripts/verify-evidence-chain.mjs --dir ./ccvs-evidence
 *
 * Exit 0 = all verified. Exit 1 = one or more failures.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(obj[k])).join(',') + '}';
}

function verifyEnvelope(envelope, filePath) {
  const errors = [];

  if (envelope.schema_version !== '1.0.0') {
    errors.push('schema_version is not 1.0.0: ' + envelope.schema_version);
  }

  const stored = envelope.integrity?.chain_hash;
  if (!stored) {
    errors.push('missing integrity.chain_hash');
    return errors;
  }

  const withoutHash = { ...envelope, integrity: { ...envelope.integrity, chain_hash: '' } };
  const expected = 'sha256:' + sha256Hex(canonicalize(withoutHash));

  if (stored !== expected) {
    errors.push('chain_hash mismatch: stored=' + stored + ' expected=' + expected);
  }

  if (!envelope.generated_at || isNaN(new Date(envelope.generated_at).getTime())) {
    errors.push('generated_at is invalid: ' + envelope.generated_at);
  }

  if (!envelope.run?.commit || envelope.run.commit.length < 7) {
    errors.push('run.commit too short or missing: ' + envelope.run?.commit);
  }

  return errors;
}

const args = process.argv.slice(2);
const dirFlag = args.indexOf('--dir');
let files = [];

if (dirFlag !== -1) {
  const dir = args[dirFlag + 1];
  if (!fs.existsSync(dir)) {
    console.error('[verify-chain] directory not found: ' + dir);
    process.exit(1);
  }
  files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('ccvs-') && f.endsWith('.json'))
    .map((f) => path.join(dir, f));
} else if (args.length > 0 && !args[0].startsWith('--')) {
  files = args.filter((a) => !a.startsWith('--'));
} else {
  // auto-discover ccvs-*.json in cwd
  files = fs.readdirSync('.').filter((f) => f.startsWith('ccvs-') && f.endsWith('.json'));
}

if (files.length === 0) {
  console.warn('[verify-chain] no evidence files found');
  process.exit(0);
}

let totalErrors = 0;

for (const filePath of files) {
  let envelope;
  try {
    envelope = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('[verify-chain] FAIL ' + filePath + ': parse error — ' + e.message);
    totalErrors++;
    continue;
  }

  const errors = verifyEnvelope(envelope, filePath);
  if (errors.length === 0) {
    console.log('[verify-chain] OK   ' + filePath + ' (' + envelope.integrity.chain_hash + ')');
  } else {
    for (const err of errors) {
      console.error('[verify-chain] FAIL ' + filePath + ': ' + err);
    }
    totalErrors += errors.length;
  }
}

if (totalErrors > 0) {
  console.error('[verify-chain] ' + totalErrors + ' error(s) found — evidence chain is NOT clean');
  process.exit(1);
} else {
  console.log('[verify-chain] all ' + files.length + ' envelope(s) verified OK');
}
