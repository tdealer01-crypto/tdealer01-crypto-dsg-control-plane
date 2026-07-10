import type { ConnectorManifest } from '../types';
import type { ManifestRegistry, ManifestValidator } from './types';

class ManifestRegistryImpl implements ManifestRegistry {
  private manifests = new Map<string, ConnectorManifest>();
  private validator: ManifestValidator;

  constructor(validator: ManifestValidator) {
    this.validator = validator;
  }

  register(manifest: ConnectorManifest): void {
    const validation = this.validator.validateId(manifest.id);
    if (!validation) {
      throw new Error(`Invalid manifest ID: ${manifest.id}`);
    }

    if (this.manifests.has(manifest.id)) {
      console.warn(`Manifest ${manifest.id} already registered, skipping`);
      return;
    }

    this.manifests.set(manifest.id, manifest);
  }

  get(id: string): ConnectorManifest | undefined {
    return this.manifests.get(id);
  }

  all(): ConnectorManifest[] {
    return Array.from(this.manifests.values());
  }

  getByKind(kind: 'oauth' | 'api-key' | 'webhook'): ConnectorManifest[] {
    return Array.from(this.manifests.values()).filter((m) => m.kind === kind);
  }

  validate(manifest: ConnectorManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.validator.validateId(manifest.id)) {
      errors.push(`Invalid connector ID: ${manifest.id}`);
    }

    if (!manifest.name || manifest.name.trim().length === 0) {
      errors.push('Manifest must have a name');
    }

    if (!['oauth', 'api-key', 'webhook'].includes(manifest.kind)) {
      errors.push(`Invalid kind: ${manifest.kind}`);
    }

    if (!Array.isArray(manifest.permissions)) {
      errors.push('Permissions must be an array');
    }

    if (!Array.isArray(manifest.provides)) {
      errors.push('Provides must be an array');
    }

    if (!Array.isArray(manifest.requires)) {
      errors.push('Requires must be an array');
    }

    if (manifest.health_check && !this.validator.validateHealthCheck(manifest.health_check)) {
      errors.push('Invalid health check configuration');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

class ManifestValidatorImpl implements ManifestValidator {
  validateId(id: string): boolean {
    return id.length > 0 && /^[a-z0-9-]+$/.test(id);
  }

  validatePermissions(permissions: any[]): boolean {
    return (
      Array.isArray(permissions) &&
      permissions.every(
        (p) =>
          typeof p === 'object' &&
          typeof p.permission === 'string' &&
          typeof p.required === 'boolean',
      )
    );
  }

  validateProvides(provides: any[]): boolean {
    return (
      Array.isArray(provides) &&
      provides.every(
        (p) => typeof p === 'object' && typeof p.resource === 'string' && typeof p.key === 'string',
      )
    );
  }

  validateRequires(requires: any[]): boolean {
    return (
      Array.isArray(requires) &&
      requires.every(
        (r) => typeof r === 'object' && typeof r.resource === 'string' && typeof r.key === 'string',
      )
    );
  }

  validateHealthCheck(healthCheck: any): boolean {
    return (
      typeof healthCheck === 'object' &&
      typeof healthCheck.endpoint === 'string' &&
      ['GET', 'POST'].includes(healthCheck.method) &&
      typeof healthCheck.expected_status === 'number'
    );
  }
}

const validator = new ManifestValidatorImpl();
export const manifestRegistry = new ManifestRegistryImpl(validator);
