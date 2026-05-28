import crypto from 'node:crypto';

export interface DriftSnapshot {
  policy_version: string;
  hash_algorithm: string;
  deployment_config_hash: string;
  schema_version: string;
  captured_at: string;
}

export interface DriftReport {
  changed: boolean;
  fields_changed: string[];
  previous: DriftSnapshot | null;
  current: DriftSnapshot;
  invalidated_attestations: string[];
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

export function buildDriftSnapshot(overrides: Partial<DriftSnapshot> = {}): DriftSnapshot {
  const deploymentConfigFields = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    DSG_CONTROL_PLANE_BASE_URL: process.env.DSG_CONTROL_PLANE_BASE_URL ?? '',
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
    GITHUB_SHA: process.env.GITHUB_SHA ?? '',
  };

  return {
    policy_version: overrides.policy_version ?? process.env.DSG_POLICY_VERSION ?? 'v1',
    hash_algorithm: 'sha256',
    deployment_config_hash:
      overrides.deployment_config_hash ?? 'sha256:' + sha256Hex(JSON.stringify(deploymentConfigFields)),
    schema_version: overrides.schema_version ?? '1.0.0',
    captured_at: overrides.captured_at ?? new Date().toISOString(),
  };
}

export function detectDrift(previous: DriftSnapshot | null, current: DriftSnapshot): DriftReport {
  const fieldsChanged: string[] = [];

  if (previous) {
    const keys: (keyof DriftSnapshot)[] = [
      'policy_version',
      'hash_algorithm',
      'deployment_config_hash',
      'schema_version',
    ];
    for (const key of keys) {
      if (previous[key] !== current[key]) fieldsChanged.push(key);
    }
  }

  const changed = fieldsChanged.length > 0;

  const invalidatedAttestations: string[] = [];
  if (fieldsChanged.includes('policy_version')) {
    invalidatedAttestations.push('all_compliance_attestations', 'all_evidence_envelopes');
  }
  if (fieldsChanged.includes('hash_algorithm')) {
    invalidatedAttestations.push('all_integrity_hashes');
  }
  if (fieldsChanged.includes('deployment_config_hash')) {
    invalidatedAttestations.push('deployment_provenance', 'sbom_attestation');
  }
  if (fieldsChanged.includes('schema_version')) {
    invalidatedAttestations.push('all_evidence_envelopes');
  }

  return {
    changed,
    fields_changed: fieldsChanged,
    previous,
    current,
    invalidated_attestations: [...new Set(invalidatedAttestations)],
  };
}

export function snapshotHash(snapshot: DriftSnapshot): string {
  const keys = Object.keys(snapshot).filter((k) => k !== 'captured_at').sort();
  const stable = Object.fromEntries(keys.map((k) => [k, snapshot[k as keyof DriftSnapshot]]));
  return 'sha256:' + sha256Hex(JSON.stringify(stable));
}
