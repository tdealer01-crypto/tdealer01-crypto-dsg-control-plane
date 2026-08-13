#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import {
  resolveDestinationAuthorization,
  VercelDestinationAuthError,
} from './lib/vercel-destination-auth.mjs';

function writeLine(path, name, value) {
  if (path) {
    appendFileSync(path, `${name}=${value}\n`, 'utf8');
  }
}

async function main() {
  const result = await resolveDestinationAuthorization({
    legacyToken: process.env.LEGACY_VERCEL_TOKEN ?? '',
    configuredNewToken: process.env.CONFIGURED_NEW_VERCEL_TOKEN ?? '',
    requestedTeamId: process.env.REQUESTED_NEW_VERCEL_TEAM_ID ?? '',
    legacyTeamId: process.env.LEGACY_VERCEL_TEAM_ID ?? '',
  });

  writeLine(process.env.GITHUB_ENV, 'NEW_VERCEL_TOKEN', result.token);
  writeLine(process.env.GITHUB_ENV, 'NEW_VERCEL_TEAM_ID', result.teamId);
  writeLine(process.env.GITHUB_OUTPUT, 'destination_team_id', result.teamId);
  writeLine(process.env.GITHUB_OUTPUT, 'credential_mode', result.mode);
  process.stdout.write(
    `Destination Vercel authorization resolved: ${result.mode}; team ${result.teamId || '(token default scope)'}.\n`,
  );
}

main().catch((error) => {
  const message = error instanceof VercelDestinationAuthError || error instanceof Error
    ? error.message
    : 'Unknown destination authorization failure';
  process.stderr.write(`Destination Vercel authorization blocked: ${message}\n`);
  process.exitCode = 1;
});
