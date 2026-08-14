const VERCEL_API_ORIGIN = 'https://api.vercel.com';
const TARGET_ORDER = new Map([
  ['development', 0],
  ['preview', 1],
  ['production', 2],
]);
const COPYABLE_TYPES = new Set(['plain', 'encrypted']);
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const CONTROL_ENV_KEYS = new Set([
  'ACTIONS_ID_TOKEN_REQUEST_TOKEN',
  'ACTIONS_RUNTIME_TOKEN',
  'CI',
  'GITHUB_TOKEN',
  'NODE_AUTH_TOKEN',
  'NPM_TOKEN',
]);

export class VercelApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'VercelApiError';
    this.status = status;
    this.code = code;
  }
}

export class VercelEnvMigrationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'VercelEnvMigrationError';
    this.details = details;
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function redactText(value, secrets = []) {
  let redacted = typeof value === 'string' ? value : '';
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 0) {
      redacted = redacted.split(secret).join('[REDACTED]');
    }
  }
  return redacted;
}

function apiErrorMessage(payload, secrets) {
  const code = payload?.error?.code;
  const message = payload?.error?.message;
  return {
    code: typeof code === 'string' ? code : undefined,
    message: redactText(
      typeof message === 'string' ? message : 'Vercel rejected the request',
      secrets,
    ),
  };
}

function requestSecrets(body) {
  const entries = Array.isArray(body) ? body : body ? [body] : [];
  return entries
    .map((entry) => entry?.value)
    .filter((value) => typeof value === 'string' && value.length > 0);
}

function retryDelay(response, attempt) {
  const retryAfter = response.headers?.get?.('retry-after');
  const parsed = Number.parseInt(retryAfter ?? '', 10);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.min(parsed * 1_000, 10_000);
  }
  return Math.min(500 * 2 ** attempt, 4_000);
}

function appendScope(url, teamId) {
  if (teamId) {
    url.searchParams.set('teamId', teamId);
  }
  return url;
}

export function createVercelApiClient({ token, teamId = '', fetchImpl = fetch }) {
  if (!token) {
    throw new VercelEnvMigrationError('A Vercel token is required');
  }

  async function request(path, { method = 'GET', body, allowNotFound = false } = {}) {
    const secrets = requestSecrets(body);
    const url = appendScope(new URL(path, VERCEL_API_ORIGIN), teamId);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(url, {
          method,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        if (attempt < 3) {
          await sleep(Math.min(500 * 2 ** attempt, 4_000));
          continue;
        }
        throw new VercelApiError(
          `Vercel API ${method} request failed before a response was received`,
        );
      }

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        payload = {};
      }

      if (response.status === 404 && allowNotFound) {
        return null;
      }

      if (!response.ok && RETRYABLE_STATUS_CODES.has(response.status) && attempt < 3) {
        await sleep(retryDelay(response, attempt));
        continue;
      }

      if (!response.ok) {
        const error = apiErrorMessage(payload, secrets);
        throw new VercelApiError(
          `Vercel API ${method} failed (${response.status})${error.code ? ` [${error.code}]` : ''}: ${error.message}`,
          { status: response.status, code: error.code },
        );
      }

      return payload;
    }

    throw new VercelApiError(`Vercel API ${method} exhausted its retry budget`);
  }

  return {
    teamId,
    getProject(idOrName, options = {}) {
      return request(`/v9/projects/${encodeURIComponent(idOrName)}`, options);
    },
    createProject({ name, gitRepository }) {
      return request('/v11/projects', {
        method: 'POST',
        body: {
          name,
          framework: 'nextjs',
          ...(gitRepository
            ? { gitRepository: { type: 'github', repo: gitRepository } }
            : {}),
        },
      });
    },
    listEnvironmentVariables(projectId) {
      return request(
        `/v10/projects/${encodeURIComponent(projectId)}/env?decrypt=true`,
      );
    },
    getEnvironmentVariable(projectId, envId) {
      return request(
        `/v1/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(envId)}`,
      );
    },
    upsertEnvironmentVariables(projectId, entries) {
      return request(
        `/v10/projects/${encodeURIComponent(projectId)}/env?upsert=true`,
        { method: 'POST', body: entries },
      );
    },
  };
}

export function normalizeTargets(target) {
  const values = Array.isArray(target) ? target : target ? [target] : [];
  const normalized = [...new Set(values.map((value) => String(value).toLowerCase()))];
  const invalid = normalized.filter((value) => !TARGET_ORDER.has(value));
  if (invalid.length > 0 || normalized.length === 0) {
    throw new VercelEnvMigrationError(
      `Unsupported or missing Vercel target: ${invalid.join(', ') || '(missing)'}`,
    );
  }
  return normalized.sort((left, right) => TARGET_ORDER.get(left) - TARGET_ORDER.get(right));
}

export function isSystemEnvironmentVariable(record) {
  const key = typeof record?.key === 'string' ? record.key : '';
  return (
    record?.type === 'system' ||
    record?.system === true ||
    key.startsWith('VERCEL_') ||
    key.startsWith('NOW_') ||
    CONTROL_ENV_KEYS.has(key)
  );
}

export function isIntegrationManagedEnvironmentVariable(record) {
  const hint = record?.contentHint;
  return Boolean(
    record?.configurationId ||
      record?.edgeConfigId ||
      record?.edgeConfigTokenId ||
      hint?.storeId ||
      hint?.integrationConfigurationId ||
      hint?.projectId,
  );
}

function safeKey(record) {
  return typeof record?.key === 'string' && record.key.length > 0
    ? record.key
    : '(invalid key)';
}

export function classifyEnvironmentVariables(
  records,
  { includeIntegrationManaged = false } = {},
) {
  const candidates = [];
  const integrationRequirements = [];
  const excluded = {
    system: [],
    integrationManaged: [],
    customEnvironment: [],
  };

  for (const record of Array.isArray(records) ? records : []) {
    if (isSystemEnvironmentVariable(record)) {
      excluded.system.push(safeKey(record));
    } else if (
      isIntegrationManagedEnvironmentVariable(record) &&
      !includeIntegrationManaged
    ) {
      excluded.integrationManaged.push(safeKey(record));
      integrationRequirements.push(record);
    } else if (Array.isArray(record?.customEnvironmentIds) && record.customEnvironmentIds.length > 0) {
      excluded.customEnvironment.push(safeKey(record));
    } else {
      candidates.push(record);
    }
  }

  for (const keys of Object.values(excluded)) {
    keys.sort();
  }

  return { candidates, integrationRequirements, excluded };
}

function normalizeScope(record) {
  const key = safeKey(record);
  if (key === '(invalid key)') {
    throw new VercelEnvMigrationError('Environment variable has an invalid key');
  }
  const target = normalizeTargets(record.target);
  const gitBranch = typeof record.gitBranch === 'string' && record.gitBranch.length > 0
    ? record.gitBranch
    : undefined;
  if (gitBranch && !target.includes('preview')) {
    throw new VercelEnvMigrationError(
      `${key}: gitBranch is only valid for the preview target`,
    );
  }

  return {
    id: typeof record.id === 'string' ? record.id : undefined,
    key,
    target,
    ...(gitBranch ? { gitBranch } : {}),
  };
}

function normalizeMetadata(record) {
  const scope = normalizeScope(record);
  const sourceType = typeof record?.type === 'string' ? record.type.toLowerCase() : '';
  if (!COPYABLE_TYPES.has(sourceType)) {
    const reason = sourceType === 'sensitive' || sourceType === 'secret'
      ? 'protected values must be rotated because Vercel cannot return them after creation'
      : `type ${sourceType || '(missing)'} is unsupported`;
    throw new VercelEnvMigrationError(`${scope.key}: ${reason}`);
  }
  return { ...scope, type: sourceType };
}

function readableListValue(record) {
  if (record?.type === 'plain' && typeof record.value === 'string') {
    return record.value;
  }
  if (record?.decrypted === true && typeof record.value === 'string') {
    return record.value;
  }
  return undefined;
}

function readableDetailedValue(record) {
  if (record?.decrypted === false || typeof record?.value !== 'string') {
    return undefined;
  }
  return record.value;
}

export function environmentIdentity(record) {
  const target = normalizeTargets(record.target);
  const branch = typeof record.gitBranch === 'string' ? record.gitBranch : '';
  return `${record.key}\u0000${target.join(',')}\u0000${branch}`;
}

function stableEnvironmentSort(left, right) {
  return environmentIdentity(left).localeCompare(environmentIdentity(right)) ||
    left.type.localeCompare(right.type);
}

function duplicateIdentities(records) {
  const seen = new Set();
  const duplicates = [];
  for (const record of records) {
    const identity = environmentIdentity(record);
    if (seen.has(identity)) {
      duplicates.push(record.key);
    }
    seen.add(identity);
  }
  return [...new Set(duplicates)].sort();
}

function formatKeys(keys) {
  const visible = keys.slice(0, 40);
  return `${visible.join(', ')}${keys.length > visible.length ? ` (+${keys.length - visible.length} more)` : ''}`;
}

export async function prepareMigrationPlan({
  records,
  sourceClient,
  sourceProjectId,
  includeIntegrationManaged = false,
  acknowledgeRotatedProtected = false,
}) {
  const {
    candidates,
    integrationRequirements: rawIntegrationRequirements,
    excluded,
  } = classifyEnvironmentVariables(records, { includeIntegrationManaged });
  const entries = [];
  const protectedEntries = [];
  const integrationRequirements = [];
  const protectedOrUnsupported = [];
  const invalidIntegrationRequirements = [];
  const unreadable = [];

  for (const record of rawIntegrationRequirements) {
    try {
      const sourceType = typeof record?.type === 'string'
        ? record.type.toLowerCase()
        : '';
      if (!sourceType) {
        throw new VercelEnvMigrationError('Integration-managed ENV type is missing');
      }
      integrationRequirements.push({
        ...normalizeScope(record),
        type: sourceType === 'secret' ? 'sensitive' : sourceType,
      });
    } catch {
      invalidIntegrationRequirements.push(safeKey(record));
    }
  }

  for (const candidate of candidates) {
    const sourceType = typeof candidate?.type === 'string'
      ? candidate.type.toLowerCase()
      : '';
    if (sourceType === 'sensitive' || sourceType === 'secret') {
      if (!acknowledgeRotatedProtected) {
        protectedOrUnsupported.push(safeKey(candidate));
        continue;
      }
      try {
        protectedEntries.push({
          ...normalizeScope(candidate),
          type: 'sensitive',
        });
      } catch {
        protectedOrUnsupported.push(safeKey(candidate));
      }
      continue;
    }

    let metadata;
    try {
      metadata = normalizeMetadata(candidate);
    } catch (error) {
      protectedOrUnsupported.push(safeKey(candidate));
      continue;
    }

    let value = readableListValue(candidate);
    if (value === undefined && metadata.id) {
      const detailed = await sourceClient.getEnvironmentVariable(
        sourceProjectId,
        metadata.id,
      );
      value = readableDetailedValue(detailed);
    }

    if (value === undefined) {
      unreadable.push(metadata.key);
      continue;
    }

    entries.push({
      key: metadata.key,
      value,
      type: metadata.type,
      target: metadata.target,
      ...(metadata.gitBranch ? { gitBranch: metadata.gitBranch } : {}),
    });
  }

  entries.sort(stableEnvironmentSort);
  protectedEntries.sort(stableEnvironmentSort);
  integrationRequirements.sort(stableEnvironmentSort);
  protectedOrUnsupported.sort();
  invalidIntegrationRequirements.sort();
  unreadable.sort();
  const duplicates = duplicateIdentities([
    ...entries,
    ...protectedEntries,
    ...integrationRequirements,
  ]);

  if (
    protectedOrUnsupported.length > 0 ||
    invalidIntegrationRequirements.length > 0 ||
    unreadable.length > 0 ||
    duplicates.length > 0
  ) {
    const reasons = [];
    if (protectedOrUnsupported.length > 0) {
      reasons.push(`protected/unsupported: ${formatKeys(protectedOrUnsupported)}`);
    }
    if (invalidIntegrationRequirements.length > 0) {
      reasons.push(
        `invalid integration metadata: ${formatKeys(invalidIntegrationRequirements)}`,
      );
    }
    if (unreadable.length > 0) {
      reasons.push(`unreadable: ${formatKeys(unreadable)}`);
    }
    if (duplicates.length > 0) {
      reasons.push(`duplicate scopes: ${formatKeys(duplicates)}`);
    }
    throw new VercelEnvMigrationError(
      `ENV migration preflight failed; no destination values were changed. ${reasons.join('; ')}`,
      {
        protectedOrUnsupported,
        invalidIntegrationRequirements,
        unreadable,
        duplicates,
        excluded,
      },
    );
  }

  return {
    entries,
    protectedEntries,
    integrationRequirements,
    excluded: {
      ...excluded,
      protectedRotated: protectedEntries.map((entry) => entry.key).sort(),
    },
  };
}

function destinationMetadataConflicts(sourceEntries, destinationRecords) {
  const destinationByIdentity = new Map();
  for (const record of destinationRecords) {
    try {
      destinationByIdentity.set(environmentIdentity(record), record);
    } catch {
      // Unrelated malformed destination entries are outside this migration's scope.
    }
  }

  return sourceEntries
    .filter((source) => {
      const destination = destinationByIdentity.get(environmentIdentity(source));
      return destination && destination.type !== source.type;
    })
    .map((source) => source.key)
    .sort();
}

async function loadDestinationEntries({ destinationClient, destinationProjectId, sourceEntries }) {
  const response = await destinationClient.listEnvironmentVariables(destinationProjectId);
  const records = Array.isArray(response?.envs) ? response.envs : [];
  const sourceIdentities = new Set(sourceEntries.map(environmentIdentity));
  const hydrated = [];

  for (const record of records) {
    let identity;
    try {
      identity = environmentIdentity(record);
    } catch {
      continue;
    }
    if (!sourceIdentities.has(identity)) {
      continue;
    }

    let value = readableListValue(record);
    if (value === undefined && typeof record.id === 'string') {
      const detailed = await destinationClient.getEnvironmentVariable(
        destinationProjectId,
        record.id,
      );
      value = readableDetailedValue(detailed);
    }

    hydrated.push({
      key: record.key,
      type: record.type,
      target: normalizeTargets(record.target),
      ...(record.gitBranch ? { gitBranch: record.gitBranch } : {}),
      ...(value === undefined ? {} : { value }),
    });
  }

  return { records, hydrated };
}

export function verifyEnvironmentParity(sourceEntries, destinationEntries) {
  const destinationByIdentity = new Map(
    destinationEntries.map((entry) => [environmentIdentity(entry), entry]),
  );
  const missing = [];
  const unreadable = [];
  const mismatched = [];

  for (const source of sourceEntries) {
    const destination = destinationByIdentity.get(environmentIdentity(source));
    if (!destination) {
      missing.push(source.key);
    } else if (typeof destination.value !== 'string') {
      unreadable.push(source.key);
    } else if (destination.type !== source.type || destination.value !== source.value) {
      mismatched.push(source.key);
    }
  }

  return {
    ok: missing.length === 0 && unreadable.length === 0 && mismatched.length === 0,
    missing: [...new Set(missing)].sort(),
    unreadable: [...new Set(unreadable)].sort(),
    mismatched: [...new Set(mismatched)].sort(),
  };
}

async function resolveDestinationProject({
  destinationClient,
  destinationProjectId,
  destinationProjectName,
  gitRepository,
  dryRun,
  requireExisting = false,
}) {
  const idOrName = destinationProjectId || destinationProjectName;
  const existing = await destinationClient.getProject(idOrName, { allowNotFound: true });
  if (existing) {
    return { project: existing, created: false };
  }
  if (requireExisting) {
    throw new VercelEnvMigrationError(
      'Destination project must already exist with manually rotated sensitive values; no project or ENV values were changed',
    );
  }
  if (dryRun) {
    return { project: null, created: false };
  }
  const created = await destinationClient.createProject({
    name: destinationProjectName,
    gitRepository,
  });
  return { project: created, created: true };
}

function verifyRotatedProtectedMetadata(protectedEntries, destinationRecords) {
  const destinationByIdentity = new Map();
  for (const record of destinationRecords) {
    try {
      destinationByIdentity.set(environmentIdentity(record), record);
    } catch {
      // Ignore destination records unrelated to the authorized source scopes.
    }
  }
  const missing = [];
  const incompatible = [];
  for (const source of protectedEntries) {
    const destination = destinationByIdentity.get(environmentIdentity(source));
    if (!destination) {
      missing.push(source.key);
    } else if (destination.type !== 'sensitive') {
      incompatible.push(source.key);
    }
  }
  return {
    ok: missing.length === 0 && incompatible.length === 0,
    missing: [...new Set(missing)].sort(),
    incompatible: [...new Set(incompatible)].sort(),
  };
}

export function verifyReconnectedIntegrationMetadata(
  integrationRequirements,
  destinationRecords,
) {
  const destinationByIdentity = new Map();
  for (const record of destinationRecords) {
    try {
      destinationByIdentity.set(environmentIdentity(record), record);
    } catch {
      // Ignore destination records unrelated to the authorized source scopes.
    }
  }

  const missing = [];
  const detached = [];
  const incompatible = [];
  for (const source of integrationRequirements) {
    const destination = destinationByIdentity.get(environmentIdentity(source));
    if (!destination) {
      missing.push(source.key);
    } else if (!isIntegrationManagedEnvironmentVariable(destination)) {
      detached.push(source.key);
    } else if (
      typeof destination.type !== 'string' ||
      (destination.type.toLowerCase() === 'secret'
        ? 'sensitive'
        : destination.type.toLowerCase()) !== source.type
    ) {
      incompatible.push(source.key);
    }
  }

  return {
    ok: missing.length === 0 && detached.length === 0 && incompatible.length === 0,
    missing: [...new Set(missing)].sort(),
    detached: [...new Set(detached)].sort(),
    incompatible: [...new Set(incompatible)].sort(),
  };
}

export async function runVercelEnvMigration({
  sourceClient,
  sourceProjectId,
  destinationClient,
  destinationProjectId = '',
  destinationProjectName,
  gitRepository = '',
  includeIntegrationManaged = false,
  acknowledgeRotatedProtected = false,
  dryRun = true,
}) {
  if (!sourceProjectId || !destinationProjectName) {
    throw new VercelEnvMigrationError('Source project ID and destination project name are required');
  }
  if (
    sourceClient.teamId &&
    destinationClient.teamId &&
    sourceClient.teamId === destinationClient.teamId
  ) {
    throw new VercelEnvMigrationError(
      'Source and destination Vercel account IDs are identical; migration was not started',
    );
  }

  const sourceResponse = await sourceClient.listEnvironmentVariables(sourceProjectId);
  const sourceRecords = Array.isArray(sourceResponse?.envs) ? sourceResponse.envs : [];
  const hiddenProductionEnvCount = Number(sourceResponse?.hiddenProductionEnvCount ?? 0);
  if (hiddenProductionEnvCount > 0) {
    throw new VercelEnvMigrationError(
      `ENV migration preflight failed; the source token cannot enumerate ${hiddenProductionEnvCount} protected production ENV metadata record(s). Replace or reauthorize VERCEL_TOKEN with an owner/team token that can list every source ENV, then rerun. Destination-only rotation cannot satisfy this gate. No destination values were changed.`,
      { hiddenProductionEnvCount },
    );
  }
  const plan = await prepareMigrationPlan({
    records: sourceRecords,
    sourceClient,
    sourceProjectId,
    includeIntegrationManaged,
    acknowledgeRotatedProtected,
  });

  const resolved = await resolveDestinationProject({
    destinationClient,
    destinationProjectId,
    destinationProjectName,
    gitRepository,
    dryRun,
    requireExisting:
      plan.protectedEntries.length > 0 || plan.integrationRequirements.length > 0,
  });

  if (resolved.project?.id === sourceProjectId) {
    throw new VercelEnvMigrationError(
      'Destination resolved to the legacy source project; no ENV values were changed',
    );
  }
  if (resolved.project?.accountId && resolved.project.accountId === sourceClient.teamId) {
    throw new VercelEnvMigrationError(
      'Destination resolved to the legacy source account; no ENV values were changed',
    );
  }

  let destinationBefore = [];
  if (
    resolved.project?.id &&
    (
      plan.protectedEntries.length > 0 ||
      plan.integrationRequirements.length > 0 ||
      !dryRun
    )
  ) {
    const before = await destinationClient.listEnvironmentVariables(resolved.project.id);
    destinationBefore = Array.isArray(before?.envs) ? before.envs : [];
  }

  if (plan.protectedEntries.length > 0) {
    const protectedVerification = verifyRotatedProtectedMetadata(
      plan.protectedEntries,
      destinationBefore,
    );
    if (!protectedVerification.ok) {
      throw new VercelEnvMigrationError(
        `Rotated sensitive ENV metadata verification failed; no destination values were changed. Missing: ${formatKeys(protectedVerification.missing)}; not sensitive: ${formatKeys(protectedVerification.incompatible)}`,
        protectedVerification,
      );
    }
  }

  if (plan.integrationRequirements.length > 0) {
    const integrationVerification = verifyReconnectedIntegrationMetadata(
      plan.integrationRequirements,
      destinationBefore,
    );
    if (!integrationVerification.ok) {
      throw new VercelEnvMigrationError(
        `Reconnected integration ENV verification failed; no destination values were changed. Missing: ${formatKeys(integrationVerification.missing)}; detached: ${formatKeys(integrationVerification.detached)}; incompatible type: ${formatKeys(integrationVerification.incompatible)}`,
        integrationVerification,
      );
    }
  }

  if (dryRun) {
    return {
      status: 'dry_run',
      sourceCount: sourceRecords.length,
      copyCount: plan.entries.length,
      integrationVerifiedCount: plan.integrationRequirements.length,
      excluded: plan.excluded,
      destinationProject: resolved.project,
      destinationCreated: false,
    };
  }

  const project = resolved.project;
  if (!project?.id || !project?.accountId) {
    throw new VercelEnvMigrationError('Destination project response lacked id or accountId');
  }

  const conflicts = destinationMetadataConflicts(
    plan.entries,
    destinationBefore,
  );
  if (conflicts.length > 0) {
    throw new VercelEnvMigrationError(
      `Destination contains incompatible ENV types; no values were changed: ${formatKeys(conflicts)}`,
      { conflicts },
    );
  }

  for (let index = 0; index < plan.entries.length; index += 50) {
    await destinationClient.upsertEnvironmentVariables(
      project.id,
      plan.entries.slice(index, index + 50),
    );
  }

  const destination = await loadDestinationEntries({
    destinationClient,
    destinationProjectId: project.id,
    sourceEntries: plan.entries,
  });
  const verification = verifyEnvironmentParity(plan.entries, destination.hydrated);
  if (!verification.ok) {
    throw new VercelEnvMigrationError(
      `Post-write verification failed. Missing: ${formatKeys(verification.missing)}; unreadable: ${formatKeys(verification.unreadable)}; mismatched: ${formatKeys(verification.mismatched)}`,
      verification,
    );
  }

  return {
    status: 'verified',
    sourceCount: sourceRecords.length,
    copyCount: plan.entries.length,
    integrationVerifiedCount: plan.integrationRequirements.length,
    excluded: plan.excluded,
    destinationProject: project,
    destinationCreated: resolved.created,
  };
}
