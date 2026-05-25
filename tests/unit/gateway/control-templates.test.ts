import { describe, expect, it } from 'vitest';
import { gatewayControlTemplates, listGatewayControlTemplates } from '../../../lib/gateway/control-templates';

const VALID_CATEGORIES = ['identity', 'entitlement', 'risk', 'approval', 'evidence', 'runtime', 'deployment'] as const;
const VALID_MODES = ['gateway', 'monitor', 'deploy_gate', 'any'] as const;
const VALID_RISKS = ['low', 'medium', 'high', 'critical'] as const;
const VALID_STATUSES = ['implemented', 'planned'] as const;

describe('gatewayControlTemplates data integrity', () => {
  it('contains at least one template', () => {
    expect(gatewayControlTemplates.length).toBeGreaterThan(0);
  });

  it('every template has a non-empty id', () => {
    gatewayControlTemplates.forEach((t) => {
      expect(t.id).toBeTruthy();
    });
  });

  it('all ids are unique', () => {
    const ids = gatewayControlTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every template has a non-empty name', () => {
    gatewayControlTemplates.forEach((t) => {
      expect(t.name).toBeTruthy();
    });
  });

  it('every category is a valid value', () => {
    gatewayControlTemplates.forEach((t) => {
      expect(VALID_CATEGORIES).toContain(t.category);
    });
  });

  it('every recommendedMode is a valid value', () => {
    gatewayControlTemplates.forEach((t) => {
      expect(VALID_MODES).toContain(t.recommendedMode);
    });
  });

  it('every defaultRisk is a valid value', () => {
    gatewayControlTemplates.forEach((t) => {
      expect(VALID_RISKS).toContain(t.defaultRisk);
    });
  });

  it('every status is a valid value', () => {
    gatewayControlTemplates.forEach((t) => {
      expect(VALID_STATUSES).toContain(t.status);
    });
  });

  it('every template has at least one requiredEvidence entry', () => {
    gatewayControlTemplates.forEach((t) => {
      expect(t.requiredEvidence.length).toBeGreaterThan(0);
    });
  });

  it('requiresApproval is a boolean', () => {
    gatewayControlTemplates.forEach((t) => {
      expect(typeof t.requiresApproval).toBe('boolean');
    });
  });

  it('high-risk-approval template requires approval and is high risk', () => {
    const template = gatewayControlTemplates.find((t) => t.id === 'high-risk-approval');
    expect(template).toBeDefined();
    expect(template!.requiresApproval).toBe(true);
    expect(template!.defaultRisk).toBe('high');
  });

  it('ci-cd-deploy-gate has deploy_gate mode', () => {
    const template = gatewayControlTemplates.find((t) => t.id === 'ci-cd-deploy-gate');
    expect(template).toBeDefined();
    expect(template!.recommendedMode).toBe('deploy_gate');
  });
});

describe('listGatewayControlTemplates', () => {
  it('returns the full array', () => {
    expect(listGatewayControlTemplates()).toBe(gatewayControlTemplates);
  });

  it('returns same reference on repeated calls', () => {
    expect(listGatewayControlTemplates()).toBe(listGatewayControlTemplates());
  });

  it('result has the same length as the exported array', () => {
    expect(listGatewayControlTemplates().length).toBe(gatewayControlTemplates.length);
  });
});
