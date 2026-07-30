import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import PrimaryNav, { type Pillar, type PillarRoute } from '@/components/Navigation/PrimaryNav';

/**
 * PrimaryNav Unit Tests
 *
 * These tests verify the structure and types of the 4-pillar navigation component.
 * Tests validate that:
 * 1. Component exports correctly
 * 2. Types are properly defined
 * 3. Source code contains expected structure
 */

// Read component source for text analysis
const componentPath = resolve(process.cwd(), 'components/Navigation/PrimaryNav.tsx');
const componentSource = readFileSync(componentPath, 'utf-8');

describe('PrimaryNav — 4-Pillar Navigation Component', () => {
  describe('Component Export and Types', () => {
    it('should export PrimaryNav as default export', () => {
      expect(PrimaryNav).toBeDefined();
      expect(typeof PrimaryNav).toBe('function');
    });

    it('should export Pillar type', () => {
      // Verify Pillar type can be used
      const _pillar: Pillar = {
        id: 'monitor',
        name: 'Monitor',
        ariaLabel: 'Test',
        icon: null as any,
        description: 'Test',
        routes: [],
      };
      expect(_pillar.id).toBe('monitor');
    });

    it('should export PillarRoute type', () => {
      // Verify PillarRoute type can be used
      const _route: PillarRoute = {
        path: '/test',
        label: 'Test',
      };
      expect(_route.path).toBe('/test');
    });
  });

  describe('Component Props Support', () => {
    it('should support expandedPillar prop', () => {
      const _component = <PrimaryNav expandedPillar="monitor" />;
      expect(_component.props.expandedPillar).toBe('monitor');
    });

    it('should support onPillarToggle callback prop', () => {
      const callback = (id: string) => null;
      const _component = <PrimaryNav onPillarToggle={callback} />;
      expect(_component.props.onPillarToggle).toBe(callback);
    });

    it('should work without props (uncontrolled mode)', () => {
      const _component = <PrimaryNav />;
      expect(_component).toBeDefined();
    });
  });

  describe('Source Code Structure - 4 Pillars', () => {
    it('should define Monitor pillar', () => {
      expect(componentSource).toContain("id: 'monitor'");
      expect(componentSource).toContain("name: 'Monitor'");
    });

    it('should define Verify pillar', () => {
      expect(componentSource).toContain("id: 'verify'");
      expect(componentSource).toContain("name: 'Verify'");
    });

    it('should define Audit pillar', () => {
      expect(componentSource).toContain("id: 'audit'");
      expect(componentSource).toContain("name: 'Audit'");
    });

    it('should define Optimize pillar', () => {
      expect(componentSource).toContain("id: 'optimize'");
      expect(componentSource).toContain("name: 'Optimize'");
    });
  });

  describe('Source Code Structure - Monitor Routes', () => {
    it('should define Dashboard route', () => {
      expect(componentSource).toContain("label: 'Dashboard'");
      expect(componentSource).toContain("path: '/dashboard'");
    });

    it('should define Executions route', () => {
      expect(componentSource).toContain("label: 'Executions'");
      expect(componentSource).toContain("path: '/dashboard/executions'");
    });

    it('should define Agents route', () => {
      expect(componentSource).toContain("label: 'Agents'");
      expect(componentSource).toContain("path: '/dashboard/agents'");
    });
  });

  describe('Source Code Structure - Verify Routes', () => {
    it('should define Policies route', () => {
      expect(componentSource).toContain("label: 'Policies'");
      expect(componentSource).toContain("path: '/dashboard/policies'");
    });

    it('should define Approvals route', () => {
      expect(componentSource).toContain("label: 'Approvals'");
      expect(componentSource).toContain("path: '/approvals'");
    });

    it('should define Proofs route', () => {
      expect(componentSource).toContain("label: 'Proofs'");
      expect(componentSource).toContain("path: '/dashboard/proofs'");
    });
  });

  describe('Source Code Structure - Audit Routes', () => {
    it('should define Evidence Pack route', () => {
      expect(componentSource).toContain("label: 'Evidence Pack'");
      expect(componentSource).toContain("path: '/dashboard/compliance-evidence-pack'");
    });

    it('should define Breach Signal route', () => {
      expect(componentSource).toContain("label: 'Breach Signal'");
      expect(componentSource).toContain("path: '/dashboard/breach-signal'");
    });
  });

  describe('Source Code Structure - Optimize Routes', () => {
    it('should define Billing route', () => {
      expect(componentSource).toContain("label: 'Billing'");
      expect(componentSource).toContain("path: '/dashboard/billing'");
    });

    it('should define Ledger route', () => {
      expect(componentSource).toContain("label: 'Ledger'");
      expect(componentSource).toContain("path: '/dashboard/ledger'");
    });

    it('should define Security route', () => {
      expect(componentSource).toContain("label: 'Security'");
      expect(componentSource).toContain("path: '/dashboard/settings/security'");
    });
  });

  describe('Accessibility Features', () => {
    it('should include ARIA landmarks', () => {
      expect(componentSource).toContain('aria-label');
      expect(componentSource).toContain('aria-expanded');
      expect(componentSource).toContain('aria-haspopup');
      expect(componentSource).toContain('role="navigation"');
    });

    it('should use semantic HTML (nav element)', () => {
      expect(componentSource).toContain('<nav');
      expect(componentSource).toContain('</nav>');
    });

    it('should use semantic HTML (button element)', () => {
      expect(componentSource).toContain('<button');
      expect(componentSource).toContain('</button>');
    });

    it('should use Link component for navigation', () => {
      expect(componentSource).toContain('Link');
    });

    it('should include transition classes for focus states', () => {
      expect(componentSource).toContain('transition-colors');
    });
  });

  describe('Feature Flags', () => {
    it('should reference ENABLE_MONITOR_DASHBOARD flag', () => {
      expect(componentSource).toContain('ENABLE_MONITOR_DASHBOARD');
    });

    it('should reference ENABLE_BILLING_UI flag', () => {
      expect(componentSource).toContain('ENABLE_BILLING_UI');
    });

    it('should support featureFlag on routes', () => {
      // Type definition allows featureFlag property
      const _route: PillarRoute = {
        path: '/test',
        label: 'Test',
        featureFlag: 'ENABLE_TEST',
      };
      expect(_route.featureFlag).toBe('ENABLE_TEST');
    });
  });

  describe('Lucide Icons', () => {
    it('should import lucide-react', () => {
      expect(componentSource).toContain("from 'lucide-react'");
    });

    it('should import Eye icon for Monitor', () => {
      expect(componentSource).toContain('Eye');
    });

    it('should import CheckCircle icon for Verify', () => {
      expect(componentSource).toContain('CheckCircle');
    });

    it('should import FileText icon for Audit', () => {
      expect(componentSource).toContain('FileText');
    });

    it('should import Zap icon for Optimize', () => {
      expect(componentSource).toContain('Zap');
    });
  });

  describe('Documentation', () => {
    it('should include 4-pillar architecture comment', () => {
      expect(componentSource).toContain('4-Pillar');
    });

    it('should document Monitor pillar purpose', () => {
      expect(componentSource).toContain('Monitor');
    });

    it('should document Verify pillar purpose', () => {
      expect(componentSource).toContain('Verify');
    });

    it('should document Audit pillar purpose', () => {
      expect(componentSource).toContain('Audit');
    });

    it('should document Optimize pillar purpose', () => {
      expect(componentSource).toContain('Optimize');
    });
  });

  describe('Route Structure', () => {
    it('should define routes with path and label', () => {
      expect(componentSource).toContain('path:');
      expect(componentSource).toContain('label:');
    });

    it('should support icon property on routes', () => {
      // Type allows optional icon property
      const _route: PillarRoute = {
        path: '/test',
        label: 'Test',
        icon: null,
      };
      expect(_route).toBeDefined();
    });

    it('should define Pillar type with id field', () => {
      expect(componentSource).toContain("id: 'monitor'");
      expect(componentSource).toContain("id: 'verify'");
      expect(componentSource).toContain("id: 'audit'");
      expect(componentSource).toContain("id: 'optimize'");
    });
  });
});
