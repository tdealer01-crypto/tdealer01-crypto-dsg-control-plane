-- AI-Firstify Plugin Core Schema
-- Tables for AI model governance, policies, and audit tracking

-- AI Models Registry
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  provider TEXT NOT NULL, -- e.g., 'openai', 'anthropic', 'custom'
  model_type TEXT, -- e.g., 'llm', 'classifier', 'embedding'
  tags TEXT[] DEFAULT '{}',
  endpoint_url TEXT,
  api_key_id UUID REFERENCES dsg_secrets(id),
  status TEXT DEFAULT 'active', -- active, archived, deprecated
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT ai_models_org_name_version_unique UNIQUE(org_id, name, version)
);

CREATE INDEX idx_ai_models_org_id ON ai_models(org_id);
CREATE INDEX idx_ai_models_status ON ai_models(status);
CREATE INDEX idx_ai_models_provider ON ai_models(provider);

-- Governance Policies for AI Operations
CREATE TABLE IF NOT EXISTS ai_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  policy_type TEXT NOT NULL, -- 'deployment', 'execution', 'data_handling', 'compliance'
  rules JSONB NOT NULL DEFAULT '[]', -- Array of rule objects with condition, action, severity
  risk_level TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  enabled BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  policy_hash TEXT, -- Hash of policy for proof/verification
  applies_to_models TEXT[] DEFAULT '{}', -- Empty = all models
  applies_to_actions TEXT[] DEFAULT '{}', -- Empty = all actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT ai_policies_org_name_unique UNIQUE(org_id, name, version)
);

CREATE INDEX idx_ai_policies_org_id ON ai_policies(org_id);
CREATE INDEX idx_ai_policies_enabled ON ai_policies(enabled);
CREATE INDEX idx_ai_policies_risk_level ON ai_policies(risk_level);
CREATE INDEX idx_ai_policies_type ON ai_policies(policy_type);

-- Policy Versions (for audit trail and rollback)
CREATE TABLE IF NOT EXISTS ai_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES ai_policies(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version INT NOT NULL,
  rules JSONB NOT NULL,
  risk_level TEXT NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT policy_versions_unique UNIQUE(policy_id, version)
);

CREATE INDEX idx_policy_versions_policy_id ON ai_policy_versions(policy_id);
CREATE INDEX idx_policy_versions_org_id ON ai_policy_versions(org_id);

-- Enable RLS on all tables
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_policy_versions ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON ai_models TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_policy_versions TO authenticated;
