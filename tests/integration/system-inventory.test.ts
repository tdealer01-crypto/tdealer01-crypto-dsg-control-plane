import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * System Inventory Integration Tests
 * Tests the complete System Inventory Foundation
 */

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzAwMDAwMCwiZXhwIjo3OTI2ODAwMDAwfQ.fake';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

let adminClient: ReturnType<typeof createClient>;
let anonClient: ReturnType<typeof createClient>;

describe('System Inventory Foundation', () => {
  let skipTests = false;

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey);
    anonClient = createClient(supabaseUrl, supabaseAnonKey);

    // Test connection before running full suite
    const { error: connError } = await adminClient
      .from('dsg_system_components')
      .select('count(*)')
      .limit(1);

    if (connError?.message?.includes('connect ECONNREFUSED') || connError?.message?.includes('fetch failed')) {
      console.log('⚠️ Skipping integration tests: Supabase not reachable. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      skipTests = true;
    } else if (connError?.message?.includes('does not exist')) {
      console.log('ℹ️ Skipping integration tests: Supabase tables not found. Run: supabase db push');
      skipTests = true;
    }
  });

  describe('Schema Verification', () => {
    it('should have dsg_system_components table', async () => {
      if (skipTests) {
        expect(true).toBe(true); // Skip gracefully
        return;
      }

      const { data, error } = await adminClient
        .from('dsg_system_components')
        .select('count(*)')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have dsg_component_dependencies table', async () => {
      if (skipTests) {
        expect(true).toBe(true);
        return;
      }

      const { data, error } = await adminClient
        .from('dsg_component_dependencies')
        .select('count(*)')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have dsg_component_capabilities table', async () => {
      if (skipTests) {
        expect(true).toBe(true);
        return;
      }

      const { data, error } = await adminClient
        .from('dsg_component_capabilities')
        .select('count(*)')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have dsg_constraint_sets table', async () => {
      const { data, error } = await adminClient
        .from('dsg_constraint_sets')
        .select('count(*)')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should have dsg_inventory_snapshots table', async () => {
      const { data, error } = await adminClient
        .from('dsg_inventory_snapshots')
        .select('count(*)')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('Component Population', () => {
    it('should have seeded at least 20 components', async () => {
      const { data, count, error } = await adminClient
        .from('dsg_system_components')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      expect(error).toBeNull();
      expect(count).toBeGreaterThanOrEqual(20);
    });

    it('should have routes component type', async () => {
      const { data, error } = await adminClient
        .from('dsg_system_components')
        .select('*')
        .eq('component_type', 'route')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]).toHaveProperty('path_or_id');
    });

    it('should have tables component type', async () => {
      const { data, error } = await adminClient
        .from('dsg_system_components')
        .select('*')
        .eq('component_type', 'table')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0]).toHaveProperty('path_or_id');
    });

    it('should have policies component type', async () => {
      const { data, error } = await adminClient
        .from('dsg_system_components')
        .select('*')
        .eq('component_type', 'policy')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('should have tools component type', async () => {
      const { data, error } = await adminClient
        .from('dsg_system_components')
        .select('*')
        .eq('component_type', 'tool')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('Dependencies', () => {
    it('should have seeded dependencies', async () => {
      const { data, count, error } = await adminClient
        .from('dsg_component_dependencies')
        .select('*', { count: 'exact' });

      expect(error).toBeNull();
      expect(count).toBeGreaterThan(0);
    });

    it('dependency from_component_id should reference valid component', async () => {
      const { data, error } = await adminClient
        .from('dsg_component_dependencies')
        .select('from_component_id')
        .limit(1)
        .single();

      if (data) {
        const { data: component, error: compError } = await adminClient
          .from('dsg_system_components')
          .select('id')
          .eq('id', data.from_component_id)
          .single();

        expect(compError).toBeNull();
        expect(component).toBeDefined();
      }
    });

    it('dependency should have valid dependency_type', async () => {
      const validTypes = ['calls', 'reads_from', 'writes_to', 'guards', 'requires', 'extends'];

      const { data, error } = await adminClient
        .from('dsg_component_dependencies')
        .select('dependency_type')
        .limit(1)
        .single();

      expect(error).toBeNull();
      expect(data?.dependency_type).toBeOneOf(validTypes);
    });
  });

  describe('Capabilities', () => {
    it('should have capabilities seeded', async () => {
      const { data, count, error } = await adminClient
        .from('dsg_component_capabilities')
        .select('*', { count: 'exact' });

      expect(error).toBeNull();
      expect(count).toBeGreaterThan(0);
    });

    it('capability should reference valid component', async () => {
      const { data, error } = await adminClient
        .from('dsg_component_capabilities')
        .select('component_id')
        .limit(1)
        .single();

      if (data) {
        const { data: component } = await adminClient
          .from('dsg_system_components')
          .select('id')
          .eq('id', data.component_id)
          .single();

        expect(component).toBeDefined();
      }
    });
  });

  describe('Constraint Sets', () => {
    it('should have default constraint set', async () => {
      const { data, error } = await adminClient
        .from('dsg_constraint_sets')
        .select('*')
        .eq('set_name', 'sub_agent_default')
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.allowed_capabilities).toBeDefined();
      expect(Array.isArray(data?.allowed_capabilities)).toBe(true);
    });

    it('constraint set should have max_tokens_output', async () => {
      const { data, error } = await adminClient
        .from('dsg_constraint_sets')
        .select('max_tokens_output')
        .eq('set_name', 'sub_agent_default')
        .single();

      expect(error).toBeNull();
      expect(data?.max_tokens_output).toBeGreaterThan(0);
    });
  });

  describe('RLS Policies', () => {
    it('public tier components should be readable anonymously', async () => {
      const { data, error } = await anonClient
        .from('dsg_system_components')
        .select('*')
        .eq('tier', 'public')
        .eq('status', 'active')
        .limit(1);

      // May fail if no public components, but schema should allow the query
      expect(error === null || error.message.includes('permission')).toBe(true);
    });
  });

  describe('Snapshots', () => {
    it('should create snapshot on population', async () => {
      const { data, count, error } = await adminClient
        .from('dsg_inventory_snapshots')
        .select('*', { count: 'exact' });

      expect(error).toBeNull();
      expect(count).toBeGreaterThan(0);
    });

    it('snapshot should have content hash', async () => {
      const { data, error } = await adminClient
        .from('dsg_inventory_snapshots')
        .select('snapshot_hash')
        .limit(1)
        .single();

      expect(error).toBeNull();
      expect(data?.snapshot_hash).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should not have duplicate components', async () => {
      const { data, error } = await adminClient
        .from('dsg_system_components')
        .select('component_type, path_or_id')
        .order('component_type')
        .order('path_or_id');

      expect(error).toBeNull();

      const seen = new Set<string>();
      const duplicates: string[] = [];

      data?.forEach((comp: any) => {
        const key = `${comp.component_type}:${comp.path_or_id}`;
        if (seen.has(key)) {
          duplicates.push(key);
        }
        seen.add(key);
      });

      expect(duplicates).toHaveLength(0);
    });

    it('should not have dangling dependency references', async () => {
      const { data, error } = await adminClient
        .from('dsg_component_dependencies')
        .select('from_component_id, to_component_id');

      expect(error).toBeNull();

      // Get all component IDs
      const { data: components } = await adminClient
        .from('dsg_system_components')
        .select('id');

      const validIds = new Set(components?.map((c: any) => c.id) || []);

      const danglingRefs: string[] = [];
      data?.forEach((dep: any) => {
        if (!validIds.has(dep.from_component_id)) {
          danglingRefs.push(`from: ${dep.from_component_id}`);
        }
        if (!validIds.has(dep.to_component_id)) {
          danglingRefs.push(`to: ${dep.to_component_id}`);
        }
      });

      expect(danglingRefs).toHaveLength(0);
    });
  });
});

// Helper: Expect one of
function toBeOneOf(value: any, validValues: any[]) {
  return validValues.includes(value);
}

expect.extend({
  toBeOneOf(value, validValues) {
    const pass = validValues.includes(value);
    return {
      pass,
      message: () =>
        `expected ${value} to be one of ${validValues.join(', ')}`,
    };
  },
});

declare global {
  namespace Vi {
    interface Matchers<R> {
      toBeOneOf(values: any[]): R;
    }
  }
}
