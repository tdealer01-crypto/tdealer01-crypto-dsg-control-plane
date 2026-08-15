#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const LEGACY_TEAM_ID = 'team_n189mlAdVHR6cGGiaAwsKzQ0';
const LEGACY_PROJECT_ID = 'prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW';
const TEAM_ID_PATTERN = /^[A-Za-z0-9_-]{3,128}$/;
const PROJECT_ID_PATTERN = /^prj_[A-Za-z0-9]+$/;
const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}$/;

export class VercelRoutingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VercelRoutingError';
  }
}

function requireAccount(config, name, { allowEmpty = false } = {}) {
  const account = config?.accounts?.[name];
  if (!account || typeof account !== 'object') {
    throw new VercelRoutingError(`Missing Vercel routing account: ${name}`);
  }

  const teamId = typeof account.teamId === 'string' ? account.teamId : '';
  const projectId = typeof account.projectId === 'string' ? account.projectId : '';
  const projectName = typeof account.projectName === 'string' ? account.projectName : '';
  if (!allowEmpty || teamId || projectId) {
    if (!TEAM_ID_PATTERN.test(teamId)) {
      throw new VercelRoutingError(`${name} Vercel team ID is invalid`);
    }
    if (!PROJECT_ID_PATTERN.test(projectId)) {
      throw new VercelRoutingError(`${name} Vercel project ID is invalid`);
    }
  }
  if (!PROJECT_NAME_PATTERN.test(projectName)) {
    throw new VercelRoutingError(`${name} Vercel project name is invalid`);
  }
  return { teamId, projectId, projectName };
}

function requireNewSecretId(value, label, pattern) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new VercelRoutingError(`${label} is missing or invalid`);
  }
  return value;
}

export function resolveVercelRouting({
  config,
  legacyToken,
  newToken,
  newTeamId = '',
  newProjectId = '',
}) {
  if (config?.schemaVersion !== 1) {
    throw new VercelRoutingError('Unsupported Vercel routing schema version');
  }
  if (config.activeAccount !== 'legacy' && config.activeAccount !== 'new') {
    throw new VercelRoutingError('activeAccount must be legacy or new');
  }

  const legacy = requireAccount(config, 'legacy');
  const configuredNext = requireAccount(config, 'new', {
    allowEmpty: true,
  });
  if (legacy.teamId !== LEGACY_TEAM_ID || legacy.projectId !== LEGACY_PROJECT_ID) {
    throw new VercelRoutingError('Legacy Vercel rollback identity was changed');
  }

  const next = config.activeAccount === 'new'
    ? {
        teamId: requireNewSecretId(newTeamId, 'VERCEL_ORG_ID_NEW', TEAM_ID_PATTERN),
        projectId: requireNewSecretId(newProjectId, 'VERCEL_PROJECT_ID_NEW', PROJECT_ID_PATTERN),
        projectName: configuredNext.projectName,
      }
    : configuredNext;

  const account = config.activeAccount === 'new' ? next : legacy;
  const token = config.activeAccount === 'new' ? newToken : legacyToken;
  if (!token) {
    throw new VercelRoutingError(
      config.activeAccount === 'new'
        ? 'Missing VERCEL_TOKEN_NEW for active new-account routing'
        : 'Missing VERCEL_TOKEN for active legacy routing',
    );
  }
  if (/[\r\n]/.test(token)) {
    throw new VercelRoutingError('Selected Vercel token has invalid line breaks');
  }
  if (
    config.activeAccount === 'new' &&
    (account.teamId === LEGACY_TEAM_ID || account.projectId === LEGACY_PROJECT_ID)
  ) {
    throw new VercelRoutingError('New-account routing resolves to the legacy account');
  }

  return {
    accountMode: config.activeAccount,
    useNewAccount: config.activeAccount === 'new',
    teamId: account.teamId,
    projectId: account.projectId,
    projectName: account.projectName,
    token,
  };
}

function writeGitHubEnvironment(name, value) {
  const destination = process.env.GITHUB_ENV;
  if (!destination) {
    throw new VercelRoutingError('GITHUB_ENV is required');
  }
  appendFileSync(destination, `${name}=${String(value)}\n`, 'utf8');
}

export function loadRoutingConfig(path = '.github/vercel-routing.json') {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new VercelRoutingError(`Unable to read Vercel routing config: ${path}`);
  }
}

async function main() {
  const routing = resolveVercelRouting({
    config: loadRoutingConfig(process.env.VERCEL_ROUTING_CONFIG),
    legacyToken: process.env.LEGACY_VERCEL_TOKEN,
    newToken: process.env.NEW_VERCEL_TOKEN,
    newTeamId: process.env.NEW_VERCEL_ORG_ID,
    newProjectId: process.env.NEW_VERCEL_PROJECT_ID,
  });

  writeGitHubEnvironment('VERCEL_ACCOUNT_MODE', routing.accountMode);
  writeGitHubEnvironment('VERCEL_USE_NEW_ACCOUNT', routing.useNewAccount);
  writeGitHubEnvironment('VERCEL_ORG_ID', routing.teamId);
  writeGitHubEnvironment('VERCEL_PROJECT_ID', routing.projectId);
  writeGitHubEnvironment('VERCEL_PROJECT_NAME', routing.projectName);
  writeGitHubEnvironment('VERCEL_TOKEN', routing.token);
  process.stdout.write(`Vercel routing resolved to ${routing.accountMode} account.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown Vercel routing failure';
    process.stderr.write(`Vercel routing blocked: ${message}\n`);
    process.exitCode = 1;
  });
}
