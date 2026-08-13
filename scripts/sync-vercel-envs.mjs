#!/usr/bin/env node

import { appendFileSync } from 'node:fs';
import {
  createVercelApiClient,
  runVercelEnvMigration,
  VercelEnvMigrationError,
} from './lib/vercel-env-sync.mjs';

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new VercelEnvMigrationError(`Missing required configuration: ${name}`);
  }
  return value;
}

function booleanEnvironment(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new VercelEnvMigrationError(`${name} must be true or false`);
}

function countExcluded(excluded) {
  return Object.values(excluded).reduce((total, keys) => total + keys.length, 0);
}

function writeOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${String(value)}\n`, 'utf8');
}

function writeSummary(result) {
  if (!process.env.GITHUB_STEP_SUMMARY) {
    return;
  }
  const project = result.destinationProject;
  const lines = [
    '## Vercel ENV migration evidence',
    '',
    `- Status: **${result.status}**`,
    `- Source entries discovered: **${result.sourceCount}**`,
    `- Application entries eligible: **${result.copyCount}**`,
    `- System entries excluded: **${result.excluded.system.length}**`,
    `- Integration-managed entries excluded: **${result.excluded.integrationManaged.length}**`,
    `- Custom-environment entries excluded: **${result.excluded.customEnvironment.length}**`,
    `- Sensitive entries verified as manually rotated: **${result.excluded.protectedRotated.length}**`,
    `- Destination project: **${project?.name ?? 'not created during dry-run'}**`,
    `- Destination created by this run: **${result.destinationCreated ? 'yes' : 'no'}**`,
    '',
    'No environment values were written to the workflow summary or outputs.',
    '',
  ];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'), 'utf8');
}

async function main() {
  const sourceClient = createVercelApiClient({
    token: requiredEnvironment('OLD_VERCEL_TOKEN'),
    teamId: requiredEnvironment('OLD_VERCEL_TEAM_ID'),
  });
  const destinationClient = createVercelApiClient({
    token: requiredEnvironment('NEW_VERCEL_TOKEN'),
    teamId: process.env.NEW_VERCEL_TEAM_ID ?? '',
  });

  const result = await runVercelEnvMigration({
    sourceClient,
    sourceProjectId: requiredEnvironment('OLD_VERCEL_PROJECT_ID'),
    destinationClient,
    destinationProjectId: process.env.NEW_VERCEL_PROJECT_ID ?? '',
    destinationProjectName: requiredEnvironment('NEW_VERCEL_PROJECT_NAME'),
    gitRepository: process.env.NEW_VERCEL_GIT_REPOSITORY ?? '',
    includeIntegrationManaged: booleanEnvironment('INCLUDE_INTEGRATION_MANAGED'),
    acknowledgeRotatedProtected: booleanEnvironment('ACKNOWLEDGE_ROTATED_PROTECTED'),
    dryRun: booleanEnvironment('DRY_RUN', true),
  });

  writeOutput('verification_status', result.status);
  writeOutput('source_count', result.sourceCount);
  writeOutput('copy_count', result.copyCount);
  writeOutput('excluded_count', countExcluded(result.excluded));
  writeOutput('new_project_id', result.destinationProject?.id ?? '');
  writeOutput('new_team_id', result.destinationProject?.accountId ?? '');
  writeOutput('new_project_name', result.destinationProject?.name ?? '');
  writeSummary(result);

  process.stdout.write(
    `Vercel ENV migration ${result.status}: ${result.copyCount} eligible, ${countExcluded(result.excluded)} safely excluded.\n`,
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure';
  process.stderr.write(`Vercel ENV migration blocked: ${message}\n`);
  process.exitCode = 1;
});
