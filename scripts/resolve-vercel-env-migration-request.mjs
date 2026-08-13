#!/usr/bin/env node

import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[0-9a-fA-F]{40}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,79}$/;
const TEAM_ID_PATTERN = /^[A-Za-z0-9_-]{3,128}$/;
const PROJECT_ID_PATTERN = /^prj_[A-Za-z0-9]+$/;
const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}$/;

export class VercelMigrationRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VercelMigrationRequestError';
  }
}

function booleanValue(value, name) {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  throw new VercelMigrationRequestError(`${name} must be true or false`);
}

function validateRequest(request) {
  const normalized = {
    requestId: typeof request.requestId === 'string' ? request.requestId : '',
    expectedMainSha:
      typeof request.expectedMainSha === 'string' ? request.expectedMainSha : '',
    newTeamId: typeof request.newTeamId === 'string' ? request.newTeamId : '',
    newProjectId: typeof request.newProjectId === 'string' ? request.newProjectId : '',
    newProjectName:
      typeof request.newProjectName === 'string' ? request.newProjectName : '',
    dryRun: booleanValue(request.dryRun, 'dryRun'),
    includeIntegrationManaged: booleanValue(
      request.includeIntegrationManaged,
      'includeIntegrationManaged',
    ),
    acknowledgeRotatedProtected: booleanValue(
      request.acknowledgeRotatedProtected,
      'acknowledgeRotatedProtected',
    ),
    deployPreview: booleanValue(request.deployPreview, 'deployPreview'),
  };

  if (!REQUEST_ID_PATTERN.test(normalized.requestId)) {
    throw new VercelMigrationRequestError('requestId is invalid');
  }
  if (!SHA_PATTERN.test(normalized.expectedMainSha)) {
    throw new VercelMigrationRequestError('expectedMainSha must be a full commit SHA');
  }
  if (normalized.newTeamId && !TEAM_ID_PATTERN.test(normalized.newTeamId)) {
    throw new VercelMigrationRequestError('newTeamId is invalid');
  }
  if (normalized.newProjectId && !PROJECT_ID_PATTERN.test(normalized.newProjectId)) {
    throw new VercelMigrationRequestError('newProjectId is invalid');
  }
  if (!PROJECT_NAME_PATTERN.test(normalized.newProjectName)) {
    throw new VercelMigrationRequestError('newProjectName is invalid');
  }
  if (!normalized.dryRun && !normalized.deployPreview) {
    throw new VercelMigrationRequestError(
      'A live migration requires preview deployment and health verification',
    );
  }

  return normalized;
}

export function resolveMigrationRequest({ eventName, githubSha, dispatch, fileRequest }) {
  if (eventName === 'push') {
    if (fileRequest?.schemaVersion !== 1) {
      throw new VercelMigrationRequestError('Unsupported migration request schema version');
    }
    return validateRequest({
      ...fileRequest,
      expectedMainSha: githubSha,
    });
  }
  if (eventName === 'workflow_dispatch') {
    if (!SHA_PATTERN.test(githubSha)) {
      throw new VercelMigrationRequestError('GITHUB_SHA must be a full commit SHA');
    }
    return validateRequest({
      requestId: `manual-${githubSha.slice(0, 12)}`,
      expectedMainSha: dispatch.expectedMainSha,
      newTeamId: dispatch.newTeamId,
      newProjectId: dispatch.newProjectId,
      newProjectName: dispatch.newProjectName,
      dryRun: dispatch.dryRun,
      includeIntegrationManaged: dispatch.includeIntegrationManaged,
      acknowledgeRotatedProtected: dispatch.acknowledgeRotatedProtected,
      deployPreview: dispatch.deployPreview,
    });
  }
  throw new VercelMigrationRequestError(`Unsupported migration event: ${eventName}`);
}

function writeOutput(name, value) {
  const destination = process.env.GITHUB_OUTPUT;
  if (!destination) {
    throw new VercelMigrationRequestError('GITHUB_OUTPUT is required');
  }
  appendFileSync(destination, `${name}=${String(value)}\n`, 'utf8');
}

function readRequestFile(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new VercelMigrationRequestError(`Unable to read migration request: ${path}`);
  }
}

async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME ?? '';
  const githubSha = process.env.GITHUB_SHA ?? '';
  const request = resolveMigrationRequest({
    eventName,
    githubSha,
    fileRequest:
      eventName === 'push'
        ? readRequestFile(
            process.env.VERCEL_MIGRATION_REQUEST_FILE ??
              '.github/vercel-env-migration-request.json',
          )
        : undefined,
    dispatch: {
      expectedMainSha: process.env.INPUT_EXPECTED_MAIN_SHA ?? '',
      newTeamId: process.env.INPUT_NEW_TEAM_ID ?? '',
      newProjectId: process.env.INPUT_NEW_PROJECT_ID ?? '',
      newProjectName: process.env.INPUT_NEW_PROJECT_NAME ?? '',
      dryRun: process.env.INPUT_DRY_RUN ?? '',
      includeIntegrationManaged: process.env.INPUT_INCLUDE_INTEGRATION_MANAGED ?? '',
      acknowledgeRotatedProtected:
        process.env.INPUT_ACKNOWLEDGE_ROTATED_PROTECTED ?? '',
      deployPreview: process.env.INPUT_DEPLOY_PREVIEW ?? '',
    },
  });

  writeOutput('request_id', request.requestId);
  writeOutput('expected_main_sha', request.expectedMainSha);
  writeOutput('new_team_id', request.newTeamId);
  writeOutput('new_project_id', request.newProjectId);
  writeOutput('new_project_name', request.newProjectName);
  writeOutput('dry_run', request.dryRun);
  writeOutput('include_integration_managed', request.includeIntegrationManaged);
  writeOutput('acknowledge_rotated_protected', request.acknowledgeRotatedProtected);
  writeOutput('deploy_preview', request.deployPreview);
  process.stdout.write(`Vercel migration request ${request.requestId} validated.\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : 'Unknown migration request failure';
    process.stderr.write(`Vercel migration request blocked: ${message}\n`);
    process.exitCode = 1;
  });
}
