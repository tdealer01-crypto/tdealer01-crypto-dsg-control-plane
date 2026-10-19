import assert from 'node:assert/strict';
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
console.log('PASS: DSG Governance plugin manifests, scoped MCP URL and three local skills are consistent.');
console.log('NOT TESTED: network connectivity, OAuth sign-in, owner authority, execute, production evidence, Claude CLI installation.');
