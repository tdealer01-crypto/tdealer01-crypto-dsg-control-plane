import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

const PRODUCTION_MCP = 'https://aws.dsg.pics/mcp';
const rootManifest = json('.claude-plugin/plugin.json');
const scopedManifest = json('plugins/dsg-governance/.claude-plugin/plugin.json');
const catalog = json('.claude-plugin/marketplace.json');
const scopedMcp = json('plugins/dsg-governance/.mcp.json');
const catalogEntry = catalog.plugins.find((item) => item.name === 'dsg-governance');

assert.equal(rootManifest.name, 'dsg-governance');
assert.equal(scopedManifest.name, 'dsg-governance');
assert.equal(typeof rootManifest.author, 'object');
assert.equal(typeof scopedManifest.author, 'object');
assert.ok(rootManifest.author?.name);
assert.ok(scopedManifest.author?.name);
assert.equal('skills' in rootManifest, false, 'Root legacy skills array must not return');
assert.equal('pricing' in rootManifest, false, 'No unverified billing tiers in installation manifest');
assert.equal('endpoints' in rootManifest, false, 'Do not package old REST endpoint claims');
assert.equal('schemaVersion' in rootManifest, false, 'Unsupported manifest field');
assert.equal(catalogEntry?.source, './plugins/dsg-governance');
assert.equal(catalogEntry?.version, scopedManifest.version);
assert.equal(scopedManifest.version, rootManifest.version);
assert.equal(scopedManifest.version, '1.1.0', 'Public release must match canonical AWS plugin version');
assert.deepEqual(Object.keys(scopedMcp.mcpServers), ['dsg-spacetime']);
assert.equal(scopedMcp.mcpServers['dsg-spacetime'].type, 'http');
assert.equal(scopedMcp.mcpServers['dsg-spacetime'].url, PRODUCTION_MCP);
assert.deepEqual(rootManifest.mcpServers?.['dsg-spacetime'], scopedMcp.mcpServers['dsg-spacetime']);

const skills = [
  'dsg-action-layer-ged',
  'dsg-github-marketplace-action-controller',
  'dsg-multi-governance-orchestrator',
];
for (const name of skills) {
  const content = read(`plugins/dsg-governance/skills/${name}/SKILL.md`);
  assert.match(content, new RegExp(`^---\\nname: ${name}\\n`));
  assert.match(content, /https:\/\/aws\.dsg\.pics\/mcp/);
  assert.match(content, /spacetime_control_surface/);
  assert.match(content, /VERIFIED_OAUTH_SUBJECT/);
  assert.match(content, /agent_principal/);
  assert.match(content, /OAUTH_AGENT_PRINCIPAL_MISMATCH/);
  assert.doesNotMatch(content, /https:\/\/[^\\s)]*vercel\.app/);
  assert.doesNotMatch(content, /https:\/\/[^\\s)]*azurewebsites\.net/);
  assert.doesNotMatch(content, /https:\/\/[^\\s)]*azurecontainerapps\.io/);
}

// Canonical production SOURCE snapshot from the private repository main, checked
// by GitHub blob SHA readback on 2026-10-30. All four files were already public
// before this PR; this gate must never copy private repository content.
// This pins parity to that verified snapshot; it is NOT a live read of private main.
const canonicalPackage = {
  'plugins/dsg-governance/.mcp.json': '4b6b9a0f1a288335905221ed10ef585f83d5bc16',
  'plugins/dsg-governance/skills/dsg-action-layer-ged/SKILL.md': '601294122a907bad5097f1844e25ecd612ea71dc',
  'plugins/dsg-governance/skills/dsg-github-marketplace-action-controller/SKILL.md': '5f6aa36dc8aa85c08eac30769c85cb3215852618',
  'plugins/dsg-governance/skills/dsg-multi-governance-orchestrator/SKILL.md': '1aef9aa1ca12f177dc0e534b96052dac4a3d15e5',
};
function gitBlobSha(content) {
  const bytes = Buffer.from(content, 'utf8');
  return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
for (const [file, expected] of Object.entries(canonicalPackage)) {
  assert.equal(gitBlobSha(read(file)), expected, `Canonical AWS package snapshot drift: ${file}`);
}
console.log('PASS: v1.1.0 and four public package payloads match the inspected private AWS canonical source snapshot.');
console.log('NOT TESTED by snapshot gate: changes to private main after inspection, user OAuth, live route execution.');

console.log('PASS: DSG Governance plugin manifests, scoped MCP URL and three local skills are consistent.');
console.log('NOT TESTED: network connectivity, OAuth sign-in, owner authority, execute, production evidence, Claude CLI installation.');
