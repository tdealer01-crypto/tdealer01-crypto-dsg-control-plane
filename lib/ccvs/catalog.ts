import catalogJson from '@/docs/ccvs/control-catalog.json';

export type EvidenceType =
  | 'unit'
  | 'integration'
  | 'adversarial'
  | 'replay'
  | 'oversight'
  | 'sbom'
  | 'provenance'
  | 'mutation';

export type ControlFamily =
  | 'software-supply-chain'
  | 'testing'
  | 'human-oversight'
  | 'sbom'
  | 'immutable-retention';

export type CorrectiveActionStatus =
  | 'pending-implementation'
  | 'in-progress'
  | 'complete';

export interface ControlEntry {
  id: string;
  family: ControlFamily;
  name: string;
  description: string;
  requirements: string[];
  evidence_type: EvidenceType;
  owner: string;
  frequency: string;
  acceptance_criteria: string;
  corrective_action_status: CorrectiveActionStatus;
}

export interface ControlCatalog {
  schema_version: string;
  catalog_id: string;
  last_updated: string;
  description: string;
  controls: ControlEntry[];
  requirement_registry: Record<string, string>;
}

// Single source of truth – backed by docs/ccvs/control-catalog.json.
// resolveJsonModule is enabled in tsconfig.json so this import is type-safe.
export const catalog: ControlCatalog = catalogJson as ControlCatalog;
