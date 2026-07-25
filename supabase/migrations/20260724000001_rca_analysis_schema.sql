-- DSG RCA Analysis Schema
-- Stores automated root cause analysis results for incident investigation

-- Main RCA analysis results table
CREATE TABLE IF NOT EXISTS dsg_rca_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  org_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,

  -- Incident reference
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'policy_evaluation',
    'execution_blocked',
    'deployment_failed',
    'cost_spike',
    'performance_degradation',
    'access_denied',
    'data_anomaly',
    'compliance_violation',
    'unknown'
  )),
  incident_summary TEXT NOT NULL,
  incident_start_time TIMESTAMPTZ NOT NULL,
  incident_end_time TIMESTAMPTZ,

  -- RCA Results
  root_cause TEXT NOT NULL,
  root_cause_category TEXT NOT NULL CHECK (root_cause_category IN (
    'configuration',
    'permission',
    'resource_limit',
    'dependency_failure',
    'policy_constraint',
    'data_quality',
    'external_factor',
    'unknown'
  )),

  -- Confidence & Evidence
  confidence_score DECIMAL(3, 2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  evidence_count INT DEFAULT 0,
  affected_services TEXT[] DEFAULT '{}',

  -- Analysis metadata
  analysis_method TEXT CHECK (analysis_method IN ('timeline_analysis', 'pattern_matching', 'causal_inference', 'hybrid')),
  similar_past_incidents INT DEFAULT 0,

  -- Remediation
  recommended_action TEXT,
  severity_level TEXT CHECK (severity_level IN ('critical', 'high', 'medium', 'low')),

  -- Timestamps
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT analysis_time_order CHECK (incident_end_time IS NULL OR incident_end_time >= incident_start_time)
);

CREATE INDEX idx_rca_org_workspace ON dsg_rca_analyses(org_id, workspace_id);
CREATE INDEX idx_rca_incident_type ON dsg_rca_analyses(incident_type);
CREATE INDEX idx_rca_confidence ON dsg_rca_analyses(confidence_score DESC);
CREATE INDEX idx_rca_created_at ON dsg_rca_analyses(created_at DESC);

-- Evidence chain: detailed causal links and supporting evidence
CREATE TABLE IF NOT EXISTS dsg_rca_evidence_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  rca_id UUID NOT NULL REFERENCES dsg_rca_analyses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Chain sequence
  chain_index INT NOT NULL,
  chain_step TEXT NOT NULL, -- e.g., "Cost spike detected" -> "Policy evaluation triggered" -> "Deployment blocked"

  -- Evidence
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'audit_log',
    'memory_event',
    'policy_evaluation',
    'metric_change',
    'external_event',
    'inference'
  )),
  evidence_source_id UUID, -- Links to dsg_memory_events.id or ai_audit_logs.id
  evidence_text TEXT NOT NULL,

  -- Timing
  event_time TIMESTAMPTZ NOT NULL,
  time_to_next_event_ms INT,

  -- Causality
  caused_by_ids UUID[] DEFAULT '{}', -- IDs of previous chain steps
  confidence DECIMAL(3, 2) DEFAULT 0.5,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_evidence_rca_id ON dsg_rca_evidence_chains(rca_id);
CREATE INDEX idx_evidence_chain_index ON dsg_rca_evidence_chains(rca_id, chain_index);
CREATE INDEX idx_evidence_time ON dsg_rca_evidence_chains(event_time DESC);

-- Learned patterns from historical RCA results
CREATE TABLE IF NOT EXISTS dsg_rca_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  org_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pattern definition
  pattern_name TEXT NOT NULL,
  pattern_description TEXT,

  -- What triggers this pattern
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'audit_log_sequence',
    'metric_threshold',
    'temporal_correlation',
    'policy_constraint',
    'external_factor'
  )),
  trigger_condition JSONB NOT NULL, -- Flexible condition definition

  -- What we learned
  typical_root_cause TEXT NOT NULL,
  root_cause_category TEXT NOT NULL,
  remediation_steps TEXT[],

  -- Pattern frequency & confidence
  occurrence_count INT DEFAULT 1,
  success_rate DECIMAL(3, 2) CHECK (success_rate >= 0 AND success_rate <= 1),
  confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.5,

  -- Historical context
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pattern_org_active ON dsg_rca_patterns(org_id, is_active);
CREATE INDEX idx_pattern_root_cause ON dsg_rca_patterns(root_cause_category);
CREATE INDEX idx_pattern_occurrence ON dsg_rca_patterns(occurrence_count DESC);

-- RLS Policies
ALTER TABLE dsg_rca_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_rca_evidence_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_rca_patterns ENABLE ROW LEVEL SECURITY;

-- Read access: org members can view RCA analyses
CREATE POLICY rca_analyses_read ON dsg_rca_analyses
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND org_id = auth.uid()
  );

-- Insert: system + service role
CREATE POLICY rca_analyses_insert ON dsg_rca_analyses
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update: system can update
CREATE POLICY rca_analyses_update ON dsg_rca_analyses
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Evidence chains RLS
CREATE POLICY evidence_chains_read ON dsg_rca_evidence_chains
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND org_id = auth.uid()
  );

CREATE POLICY evidence_chains_insert ON dsg_rca_evidence_chains
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Patterns RLS
CREATE POLICY rca_patterns_read ON dsg_rca_patterns
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND org_id = auth.uid()
  );

CREATE POLICY rca_patterns_insert ON dsg_rca_patterns
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY rca_patterns_update ON dsg_rca_patterns
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Audit trigger to update updated_at
CREATE OR REPLACE FUNCTION update_dsg_rca_analyses_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dsg_rca_analyses_timestamp
BEFORE UPDATE ON dsg_rca_analyses
FOR EACH ROW
EXECUTE FUNCTION update_dsg_rca_analyses_timestamp();

CREATE OR REPLACE FUNCTION update_dsg_rca_patterns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dsg_rca_patterns_timestamp
BEFORE UPDATE ON dsg_rca_patterns
FOR EACH ROW
EXECUTE FUNCTION update_dsg_rca_patterns_timestamp();

-- Idempotent: do nothing if tables already exist
-- This migration is safe to re-run
