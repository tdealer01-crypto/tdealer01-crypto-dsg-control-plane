-- System Inventory Foundation Schema
-- Enables DSG ONE to understand and track its own components, dependencies, and capabilities
-- Created: 2026-07-25

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE 1: System Components Registry
-- ============================================================================
-- Tracks all discoverable components in the system
-- Types: route, table, policy, tool, integration, skill, agent

CREATE TABLE IF NOT EXISTS dsg_system_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Component identification
  component_type TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  path_or_id TEXT NOT NULL, -- /api/execute, dsg_runtime_executions, policy-spawn-agent, etc.

  -- Status and health tracking
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMP,
  status TEXT DEFAULT 'active', -- active | deprecated | experimental | disabled
  health_status TEXT DEFAULT 'unknown', -- healthy | degraded | unhealthy | unknown

  -- Classification
  category TEXT, -- governance | billing | compliance | monitoring | integrations | agents
  tier TEXT, -- public | authenticated | operator | internal

  -- Component-specific metadata (flexible)
  metadata JSONB, -- { route_method: 'POST', auth_required: true, ... }

  -- Constraints
  UNIQUE(component_type, path_or_id),
  CONSTRAINT valid_type CHECK (component_type IN ('route', 'table', 'policy', 'tool', 'integration', 'skill', 'agent')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'deprecated', 'experimental', 'disabled')),
  CONSTRAINT valid_tier CHECK (tier IN ('public', 'authenticated', 'operator', 'internal'))
);

CREATE INDEX idx_components_type ON dsg_system_components(component_type);
CREATE INDEX idx_components_category ON dsg_system_components(category);
CREATE INDEX idx_components_status ON dsg_system_components(status);
CREATE INDEX idx_components_tier ON dsg_system_components(tier);

-- ============================================================================
-- TABLE 2: Component Dependencies
-- ============================================================================
-- Models relationships between components
-- Examples: route X calls function Y, function Y reads from table Z, policy P guards route X

CREATE TABLE IF NOT EXISTS dsg_component_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Component references (foreign keys)
  from_component_id UUID NOT NULL REFERENCES dsg_system_components(id) ON DELETE CASCADE,
  to_component_id UUID NOT NULL REFERENCES dsg_system_components(id) ON DELETE CASCADE,

  -- Dependency metadata
  dependency_type TEXT NOT NULL, -- calls | reads_from | writes_to | guards | requires | extends
  description TEXT,

  -- Dependency strength
  strength TEXT DEFAULT 'critical', -- critical | required | optional

  -- Verification and tracking
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMP,

  -- Constraints
  UNIQUE(from_component_id, to_component_id, dependency_type),
  CONSTRAINT valid_dependency_type CHECK (dependency_type IN ('calls', 'reads_from', 'writes_to', 'guards', 'requires', 'extends')),
  CONSTRAINT valid_strength CHECK (strength IN ('critical', 'required', 'optional'))
);

CREATE INDEX idx_dependencies_from ON dsg_component_dependencies(from_component_id);
CREATE INDEX idx_dependencies_to ON dsg_component_dependencies(to_component_id);
CREATE INDEX idx_dependencies_strength ON dsg_component_dependencies(strength);

-- ============================================================================
-- TABLE 3: Component Capabilities
-- ============================================================================
-- Models what each component can do and its access controls

CREATE TABLE IF NOT EXISTS dsg_component_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Component reference
  component_id UUID NOT NULL REFERENCES dsg_system_components(id) ON DELETE CASCADE,

  -- Capability definition
  capability_name TEXT NOT NULL, -- execute_governed_action, create_agent, access_billing, etc.
  capability_type TEXT NOT NULL, -- action | read | write | admin

  -- Access control
  required_role TEXT, -- operator | admin | none
  required_policy TEXT, -- policy name that guards this capability

  -- Resource limits (flexible, per-capability)
  quota_limit JSONB, -- { tokens_per_day: 100000, requests_per_min: 100 }
  cost_estimate DECIMAL(12, 8), -- per execution in USD

  -- Additional metadata
  metadata JSONB, -- tool-specific configuration

  -- Tracking
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(component_id, capability_name),
  CONSTRAINT valid_cap_type CHECK (capability_type IN ('action', 'read', 'write', 'admin'))
);

CREATE INDEX idx_capabilities_component ON dsg_component_capabilities(component_id);
CREATE INDEX idx_capabilities_name ON dsg_component_capabilities(capability_name);
CREATE INDEX idx_capabilities_role ON dsg_component_capabilities(required_role);

-- ============================================================================
-- TABLE 4: Organizations (Prerequisite for Constraint Sets)
-- ============================================================================
-- Master organization data for org-level governance

CREATE TABLE IF NOT EXISTS dsg_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON dsg_organizations(slug);

-- ============================================================================
-- TABLE 5: Constraint Sets (for Agent Spawning)
-- ============================================================================
-- Defines what sub-agents can and cannot do

CREATE TABLE IF NOT EXISTS dsg_constraint_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Constraint set identification
  set_name TEXT NOT NULL UNIQUE, -- sub_agent_default, code_review_agent, etc.
  description TEXT,

  -- Component access control (UUIDs or names)
  allowed_components TEXT[] NOT NULL DEFAULT '{}', -- component IDs that can be accessed
  blocked_components TEXT[] DEFAULT '{}', -- explicitly blocked components
  allowed_capabilities TEXT[] NOT NULL DEFAULT '{}', -- capability names

  -- Resource limits
  max_tokens_output BIGINT,
  max_duration_seconds INT,
  max_parallel_executions INT,
  max_cost_per_execution DECIMAL(12, 8),

  -- Governance requirements
  requires_human_approval BOOLEAN DEFAULT FALSE,
  requires_org_owner_role BOOLEAN DEFAULT TRUE,

  -- Metadata and tracking
  metadata JSONB, -- additional constraint configuration
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Scope (org-level constraints)
  organization_id UUID NOT NULL REFERENCES dsg_organizations(id) ON DELETE CASCADE
);

CREATE INDEX idx_constraint_sets_org ON dsg_constraint_sets(organization_id);
CREATE INDEX idx_constraint_sets_name ON dsg_constraint_sets(set_name);

-- ============================================================================
-- TABLE 6: Inventory Snapshots (Change Tracking)
-- ============================================================================
-- Maintains history of inventory changes

CREATE TABLE IF NOT EXISTS dsg_inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Snapshot metadata
  snapshot_type TEXT NOT NULL, -- full | delta

  -- Change summary
  components_added INT DEFAULT 0,
  components_removed INT DEFAULT 0,
  components_modified INT DEFAULT 0,

  -- Snapshot data (for full snapshots)
  snapshot_data JSONB,

  -- Content hash (for deduplication and verification)
  snapshot_hash TEXT UNIQUE,

  -- Tracking
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_snapshots_type ON dsg_inventory_snapshots(snapshot_type);
CREATE INDEX idx_snapshots_created ON dsg_inventory_snapshots(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE dsg_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_system_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_component_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_component_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_constraint_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- dsg_organizations RLS Policies
-- ============================================================================

-- All authenticated users can read organizations
CREATE POLICY "read_organizations"
  ON dsg_organizations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage organizations
CREATE POLICY "manage_organizations_admin"
  ON dsg_organizations
  FOR ALL
  USING ((auth.jwt() ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

-- ============================================================================
-- dsg_system_components RLS Policies
-- ============================================================================

-- Public can read public-tier components
CREATE POLICY "read_public_components"
  ON dsg_system_components
  FOR SELECT
  USING (tier = 'public' AND status = 'active');

-- Authenticated users can read active and experimental components
CREATE POLICY "read_auth_components"
  ON dsg_system_components
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (status IN ('active', 'experimental') OR
     (auth.jwt() ->> 'role')::text = 'admin')
  );

-- Admins can insert/update components
CREATE POLICY "write_admin_components"
  ON dsg_system_components
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

CREATE POLICY "update_admin_components"
  ON dsg_system_components
  FOR UPDATE
  USING ((auth.jwt() ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

-- ============================================================================
-- dsg_component_dependencies RLS Policies
-- ============================================================================

-- Read dependencies based on component visibility
CREATE POLICY "read_dependencies"
  ON dsg_component_dependencies
  FOR SELECT
  USING (
    -- Can read if both from and to components are readable
    EXISTS (
      SELECT 1 FROM dsg_system_components c
      WHERE c.id = from_component_id AND
            (c.tier = 'public' OR auth.role() = 'authenticated')
    )
  );

-- Admins can manage dependencies
CREATE POLICY "manage_dependencies_admin"
  ON dsg_component_dependencies
  FOR ALL
  USING ((auth.jwt() ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

-- ============================================================================
-- dsg_component_capabilities RLS Policies
-- ============================================================================

-- Read capabilities based on component visibility
CREATE POLICY "read_capabilities"
  ON dsg_component_capabilities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dsg_system_components c
      WHERE c.id = component_id AND
            (c.tier = 'public' OR auth.role() = 'authenticated')
    )
  );

-- Admins manage capabilities
CREATE POLICY "manage_capabilities_admin"
  ON dsg_component_capabilities
  FOR ALL
  USING ((auth.jwt() ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

-- ============================================================================
-- dsg_constraint_sets RLS Policies
-- ============================================================================

-- Authenticated users can read constraint sets
CREATE POLICY "read_constraint_sets"
  ON dsg_constraint_sets
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage constraint sets
CREATE POLICY "manage_constraint_sets_admin"
  ON dsg_constraint_sets
  FOR ALL
  USING ((auth.jwt() ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

-- ============================================================================
-- dsg_inventory_snapshots RLS Policies
-- ============================================================================

-- Read snapshots
CREATE POLICY "read_snapshots"
  ON dsg_inventory_snapshots
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can create snapshots
CREATE POLICY "create_snapshots_admin"
  ON dsg_inventory_snapshots
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

-- ============================================================================
-- VERIFICATION: Check all tables exist
-- ============================================================================

-- This will be verified by lib/database.types.ts regeneration
SELECT 'System Inventory schema created successfully' as status;;
