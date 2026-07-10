import type { ConnectorManifest } from '../types';

export interface ManifestRegistry {
  register(manifest: ConnectorManifest): void;
  get(id: string): ConnectorManifest | undefined;
  all(): ConnectorManifest[];
  getByKind(kind: 'oauth' | 'api-key' | 'webhook'): ConnectorManifest[];
  validate(manifest: ConnectorManifest): { valid: boolean; errors: string[] };
}

export interface ManifestValidator {
  validateId(id: string): boolean;
  validatePermissions(permissions: any[]): boolean;
  validateProvides(provides: any[]): boolean;
  validateRequires(requires: any[]): boolean;
  validateHealthCheck(healthCheck: any): boolean;
}
