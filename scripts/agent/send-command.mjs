#!/usr/bin/env node

const args = process.argv.slice(2);

function readFlag(name, fallback = undefined) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const type = readFlag('type', 'device.open_url');
const target = readFlag('target', 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status');
const deviceId = readFlag('device', 'android.owner.default');
const reason = readFlag('reason', 'Owner requested CLI command test');
const submit = args.includes('--submit');
const baseUrl = readFlag('base-url', process.env.DSG_CONTROL_PLANE_URL || 'http://localhost:3000');

const command = {
  sourceKind: 'cli',
  actorType: 'user',
  actorId: process.env.USER ? `user:${process.env.USER}` : 'operator:cli',
  target: { deviceId },
  tool: { name: type },
  args: {
    deviceId,
    reason,
    ...(type === 'device.open_url' ? { url: target } : {}),
    ...(type === 'device.open_app' ? { packageName: target } : {}),
    ...(type === 'device.open_settings' ? { screen: target } : {}),
    ...(type === 'ui.scroll' ? { direction: 'down' } : {}),
  },
  idempotencyKey: `${type}:${deviceId}:${target}`,
};

if (!submit) {
  console.log(JSON.stringify({
    ok: true,
    dryRun: true,
    message: 'Dry run only. Add --submit to POST this envelope to /api/agent/commands. Android still requires owner approval before execution.',
    command,
  }, null, 2));
  process.exit(0);
}

const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/agent/commands`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(command),
});

const text = await response.text();
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text);
}

if (!response.ok) process.exit(1);
