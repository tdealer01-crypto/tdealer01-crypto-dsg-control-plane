const VERCEL_API_ORIGIN = 'https://api.vercel.com';

export class VercelDestinationAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VercelDestinationAuthError';
  }
}

function oneLineSecret(value, name) {
  const normalized = typeof value === 'string' ? value : '';
  if (/\r|\n/.test(normalized)) {
    throw new VercelDestinationAuthError(`${name} must be a single-line token`);
  }
  return normalized;
}

function validTeamId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{3,128}$/.test(value);
}

export async function listAuthorizedTeams(token, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${VERCEL_API_ORIGIN}/v2/teams?limit=100`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new VercelDestinationAuthError(
      `Vercel rejected the existing-token scope probe (${response.status})`,
    );
  }
  const payload = await response.json();
  return (Array.isArray(payload?.teams) ? payload.teams : [])
    .filter((team) => validTeamId(team?.id))
    .map((team) => ({ id: team.id, name: typeof team.name === 'string' ? team.name : '' }));
}

export async function resolveDestinationAuthorization({
  legacyToken,
  configuredNewToken = '',
  requestedTeamId = '',
  legacyTeamId,
  teamLoader = listAuthorizedTeams,
}) {
  const sourceToken = oneLineSecret(legacyToken, 'VERCEL_TOKEN');
  const newToken = oneLineSecret(configuredNewToken, 'VERCEL_TOKEN_NEW');
  if (!sourceToken) {
    throw new VercelDestinationAuthError('Missing VERCEL_TOKEN');
  }
  if (!validTeamId(legacyTeamId)) {
    throw new VercelDestinationAuthError('Invalid legacy Vercel team ID');
  }
  if (requestedTeamId && !validTeamId(requestedTeamId)) {
    throw new VercelDestinationAuthError('Invalid requested destination Vercel team ID');
  }
  if (requestedTeamId === legacyTeamId) {
    throw new VercelDestinationAuthError('Destination Vercel team is the legacy team');
  }

  if (newToken) {
    return {
      token: newToken,
      teamId: requestedTeamId,
      mode: 'dedicated-new-token',
    };
  }

  const authorizedTeams = (await teamLoader(sourceToken))
    .filter((team) => team.id !== legacyTeamId)
    .sort((left, right) => left.id.localeCompare(right.id));

  if (requestedTeamId) {
    const requested = authorizedTeams.find((team) => team.id === requestedTeamId);
    if (!requested) {
      throw new VercelDestinationAuthError(
        `VERCEL_TOKEN is not authorized for requested non-legacy team ${requestedTeamId}`,
      );
    }
    return {
      token: sourceToken,
      teamId: requested.id,
      mode: 'shared-authorized-token',
    };
  }

  if (authorizedTeams.length === 1) {
    return {
      token: sourceToken,
      teamId: authorizedTeams[0].id,
      mode: 'shared-authorized-token',
    };
  }
  if (authorizedTeams.length === 0) {
    throw new VercelDestinationAuthError(
      'VERCEL_TOKEN_NEW is missing and VERCEL_TOKEN authorizes no non-legacy Vercel team',
    );
  }
  throw new VercelDestinationAuthError(
    `VERCEL_TOKEN_NEW is missing and multiple non-legacy teams are authorized; set newTeamId to one of: ${authorizedTeams.map((team) => team.id).join(', ')}`,
  );
}
