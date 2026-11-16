import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Offline, read-only packaging checks. Never calls an MCP or production endpoint.
const root = process.cwd();
const expected = [
  'proofgate-review',
  'dsg-verify',
  'evidence-guard',
  'pr-body-helper',
  'dsg-governance',
  'compliance-ising-z3',
];
const catalogPath = path.join(root, '.claude-plugin', 'marketplace.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
assert.equal(catalog.name, 'dsg-plugins', 'Must preserve existing marketplace identity');
assert.ok(Array.isArray(catalog.plugins), 'Marketplace must declare plugins');
assert.equal(catalog.plugins.length, expected.length, 'Unexpected marketplace entry count');
assert.deepEqual(new Set(catalog.plugins.map(p => p.name)), new Set(expected), 'Marketplace inventory mismatch');
const pluginRoot = fs.realpathSync(path.join(root, 'plugins')) + path.sep;
for (const entry of catalog.plugins) {
  assert.equal(entry.source, `./plugins/${entry.name}`, `Incorrect source for ${entry.name}`);
  assert.match(entry.source, /^\.\/plugins\/[a-z0-9-]+$/, 'Unsafe or nonlocal source');
  const directory = fs.realpathSync(path.join(root, entry.source));
  assert.ok(directory.startsWith(pluginRoot), `${entry.name} escapes plugin directory`);
  const manifestPath = path.join(directory, '.claude-plugin', 'plugin.json');
  assert.ok(fs.statSync(manifestPath).isFile(), `Missing Claude plugin manifest: ${entry.name}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, entry.name, `Name mismatch: ${entry.name}`);
  assert.equal(manifest.version, entry.version, `Version mismatch: ${entry.name}`);
}
assert.equal(new Set(catalog.plugins.map(p => p.source)).size, expected.length, 'Duplicate sources');
console.log(`PASS: offline path, identity, and manifest checks for ${expected.length} Claude Code plugins`);
console.log('NOT TESTED by this script: CLI installation, OAuth, approvals, MCP execution, production evidence');
