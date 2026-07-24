-- Anomaly Detection Schema
-- Tables: dsg_anomalies, dsg_anomaly_alerts, dsg_anomaly_subscriptions

-- Main anomaly detection results
CREATE TABLE IF NOT EXISTS dsg_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,

  -- Detection
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  detection_method TEXT NOT NULL,
  anomaly_type TEXT NOT NULL,

  -- Pattern matching
  matched_pattern_id UUID,
  similarity_score DECIMAL(3, 2) NOT NULL,
  deviation_score DECIMAL(3, 2),

  -- Context
  incident_summary TEXT,
  affected_services TEXT[],
  related_events_count INT,

  -- Severity & status
  severity_level TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',

  -- Evidence
  detection_evidence JSONB,
  similar_incidents TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT valid_severity CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'investigating', 'resolved', 'dismissed'))
);

-- Anomaly alerts/notifications
CREATE TABLE IF NOT EXISTS dsg_anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  anomaly_id UUID NOT NULL,

  -- Alert routing
  alert_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient_id UUID,
  recipient_email TEXT,

  -- Alert status
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,

  -- Acknowledgment
  acknowledged_by UUID,
  acknowledgment_note TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_anomaly FOREIGN KEY (anomaly_id) REFERENCES dsg_anomalies(id) ON DELETE CASCADE,
  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT valid_channel CHECK (channel IN ('email', 'webhook', 'slack', 'pagerduty')),
  CONSTRAINT valid_alert_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'acknowledged'))
);

-- Alert subscriptions per organization
CREATE TABLE IF NOT EXISTS dsg_anomaly_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,

  -- Subscription config
  name TEXT NOT NULL,
  description TEXT,

  -- Filters
  anomaly_types TEXT[],
  min_similarity_score DECIMAL(3, 2) DEFAULT 0.7,
  severity_levels TEXT[] DEFAULT ARRAY['high', 'critical'],

  -- Alert routing
  alert_channels TEXT[] NOT NULL,
  recipients JSONB,

  -- Auto-remediation
  auto_investigate BOOLEAN DEFAULT false,
  auto_resolve_threshold DECIMAL(3, 2),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_dsg_anomalies_org_created ON dsg_anomalies(org_id, created_at DESC);
CREATE INDEX idx_dsg_anomalies_workspace_status ON dsg_anomalies(workspace_id, status);
CREATE INDEX idx_dsg_anomalies_similarity ON dsg_anomalies(similarity_score DESC);
CREATE INDEX idx_dsg_anomalies_severity ON dsg_anomalies(severity_level, created_at DESC);
CREATE INDEX idx_dsg_anomaly_alerts_anomaly ON dsg_anomaly_alerts(anomaly_id);
CREATE INDEX idx_dsg_anomaly_alerts_org_status ON dsg_anomaly_alerts(org_id, status);
CREATE INDEX idx_dsg_anomaly_subscriptions_org_active ON dsg_anomaly_subscriptions(org_id, is_active);

-- RLS Policies
ALTER TABLE dsg_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_anomaly_subscriptions ENABLE ROW LEVEL SECURITY;

-- dsg_anomalies policies
CREATE POLICY anomalies_org_select ON dsg_anomalies
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY anomalies_org_insert ON dsg_anomalies
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY anomalies_org_update ON dsg_anomalies
  FOR UPDATE USING (org_id = auth.uid());

-- dsg_anomaly_alerts policies
CREATE POLICY alerts_org_select ON dsg_anomaly_alerts
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY alerts_org_insert ON dsg_anomaly_alerts
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY alerts_org_update ON dsg_anomaly_alerts
  FOR UPDATE USING (org_id = auth.uid());

-- dsg_anomaly_subscriptions policies
CREATE POLICY subscriptions_org_select ON dsg_anomaly_subscriptions
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY subscriptions_org_insert ON dsg_anomaly_subscriptions
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY subscriptions_org_update ON dsg_anomaly_subscriptions
  FOR UPDATE USING (org_id = auth.uid());

CREATE POLICY subscriptions_org_delete ON dsg_anomaly_subscriptions
  FOR DELETE USING (org_id = auth.uid());

-- Audit triggers
CREATE TRIGGER update_dsg_anomalies_updated_at
  BEFORE UPDATE ON dsg_anomalies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dsg_anomaly_alerts_updated_at
  BEFORE UPDATE ON dsg_anomaly_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dsg_anomaly_subscriptions_updated_at
  BEFORE UPDATE ON dsg_anomaly_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
