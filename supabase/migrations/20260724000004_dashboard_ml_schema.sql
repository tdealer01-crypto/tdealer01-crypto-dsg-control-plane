-- Dashboard & ML Enhancement Schema
-- Tables: dsg_dashboard_configs, dsg_ml_models, dsg_ml_predictions, dsg_dashboard_widgets

-- Dashboard configuration per user/org
CREATE TABLE IF NOT EXISTS dsg_dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  user_id UUID,

  -- Dashboard metadata
  name TEXT NOT NULL,
  description TEXT,
  layout_type TEXT NOT NULL DEFAULT 'grid', -- grid, timeline, kanban
  is_default BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,

  -- Configuration
  config JSONB NOT NULL, -- dashboard layout, widget positions, preferences
  theme TEXT DEFAULT 'light', -- light, dark, auto
  refresh_interval_seconds INT DEFAULT 60,

  -- Visibility & access
  is_public BOOLEAN DEFAULT false,
  shared_with UUID[], -- array of user IDs with access

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT valid_layout CHECK (layout_type IN ('grid', 'timeline', 'kanban')),
  CONSTRAINT valid_theme CHECK (theme IN ('light', 'dark', 'auto'))
);

-- ML Model registry and versioning
CREATE TABLE IF NOT EXISTS dsg_ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Model metadata
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  model_type TEXT NOT NULL, -- anomaly_detection, prediction, classification

  -- Model source
  model_source TEXT NOT NULL, -- internal, external_api, huggingface
  model_path TEXT, -- S3 path, huggingface model id, etc
  model_hash TEXT, -- SHA256 hash for integrity

  -- Performance metrics
  accuracy DECIMAL(5,4),
  precision DECIMAL(5,4),
  recall DECIMAL(5,4),
  f1_score DECIMAL(5,4),

  -- Training info
  training_data_size INT,
  training_completed_at TIMESTAMPTZ,
  last_retrained_at TIMESTAMPTZ,

  -- Model status
  is_active BOOLEAN DEFAULT false,
  is_production BOOLEAN DEFAULT false,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.7,

  -- Capabilities
  supported_input_types TEXT[],
  supported_anomaly_types TEXT[],
  latency_ms INT, -- average inference latency

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT valid_model_type CHECK (model_type IN ('anomaly_detection', 'prediction', 'classification')),
  CONSTRAINT valid_model_source CHECK (model_source IN ('internal', 'external_api', 'huggingface')),
  CONSTRAINT unique_model_version UNIQUE(org_id, model_name, model_version)
);

-- ML Model predictions and inference results
CREATE TABLE IF NOT EXISTS dsg_ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  model_id UUID NOT NULL,

  -- Prediction context
  anomaly_id UUID,
  input_data JSONB NOT NULL,

  -- Prediction results
  prediction_type TEXT NOT NULL, -- anomaly_score, severity_class, root_cause
  predicted_value DECIMAL(5,4),
  predicted_class TEXT,
  confidence_score DECIMAL(5,4),

  -- Uncertainty quantification
  prediction_std_dev DECIMAL(5,4),
  confidence_interval_lower DECIMAL(5,4),
  confidence_interval_upper DECIMAL(5,4),

  -- Explainability
  explanation JSONB, -- feature importance, SHAP values, etc
  contributing_features TEXT[],

  -- Inference metadata
  inference_time_ms INT,
  inference_method TEXT, -- batch, real_time, scheduled

  -- Verification & drift detection
  actual_value DECIMAL(5,4), -- ground truth (when available)
  prediction_correct BOOLEAN, -- after validation
  model_drift_detected BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES dsg_ml_models(id) ON DELETE CASCADE,
  CONSTRAINT valid_prediction_type CHECK (prediction_type IN ('anomaly_score', 'severity_class', 'root_cause')),
  CONSTRAINT valid_inference_method CHECK (inference_method IN ('batch', 'real_time', 'scheduled'))
);

-- Dashboard widgets and data sources
CREATE TABLE IF NOT EXISTS dsg_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  dashboard_id UUID NOT NULL,

  -- Widget definition
  widget_type TEXT NOT NULL, -- metric, chart, table, gauge, timeline, alerts
  widget_name TEXT NOT NULL,
  position INT, -- display order

  -- Data source
  data_source TEXT NOT NULL, -- anomalies, predictions, executions, metrics
  metric_type TEXT, -- similarity, severity, confidence, count, etc

  -- Configuration
  config JSONB NOT NULL, -- color scheme, chart type, aggregation, filters
  filters JSONB, -- anomaly type, severity level, date range, etc

  -- Refresh settings
  refresh_interval_seconds INT DEFAULT 60,
  cache_enabled BOOLEAN DEFAULT true,
  cache_ttl_seconds INT DEFAULT 300,

  -- Display settings
  height_units INT DEFAULT 4,
  width_units INT DEFAULT 6,
  show_title BOOLEAN DEFAULT true,
  show_legend BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_dashboard FOREIGN KEY (dashboard_id) REFERENCES dsg_dashboard_configs(id) ON DELETE CASCADE,
  CONSTRAINT valid_widget_type CHECK (widget_type IN ('metric', 'chart', 'table', 'gauge', 'timeline', 'alerts')),
  CONSTRAINT valid_data_source CHECK (data_source IN ('anomalies', 'predictions', 'executions', 'metrics'))
);

-- ML Model drift detection and retraining triggers
CREATE TABLE IF NOT EXISTS dsg_ml_model_drift (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  model_id UUID NOT NULL,

  -- Drift detection
  drift_type TEXT NOT NULL, -- data_drift, prediction_drift, performance_drift
  drift_score DECIMAL(5,4),
  is_significant BOOLEAN,

  -- Metrics
  monitored_metric TEXT,
  previous_value DECIMAL(5,4),
  current_value DECIMAL(5,4),
  change_percent DECIMAL(6,2),

  -- Recommendations
  action_recommended TEXT, -- retrain, monitor, investigate, rollback
  confidence_in_action DECIMAL(3,2),

  -- Timestamps
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES dsg_ml_models(id) ON DELETE CASCADE,
  CONSTRAINT valid_drift_type CHECK (drift_type IN ('data_drift', 'prediction_drift', 'performance_drift')),
  CONSTRAINT valid_action CHECK (action_recommended IN ('retrain', 'monitor', 'investigate', 'rollback'))
);

-- Indexes for performance
CREATE INDEX idx_dsg_dashboard_configs_org ON dsg_dashboard_configs(org_id, is_default);
CREATE INDEX idx_dsg_dashboard_configs_user ON dsg_dashboard_configs(user_id, org_id);
CREATE INDEX idx_dsg_ml_models_org_active ON dsg_ml_models(org_id, is_active);
CREATE INDEX idx_dsg_ml_models_org_production ON dsg_ml_models(org_id, is_production);
CREATE INDEX idx_dsg_ml_predictions_org_model ON dsg_ml_predictions(org_id, model_id);
CREATE INDEX idx_dsg_ml_predictions_created ON dsg_ml_predictions(created_at DESC);
CREATE INDEX idx_dsg_ml_predictions_anomaly ON dsg_ml_predictions(anomaly_id);
CREATE INDEX idx_dsg_ml_predictions_confidence ON dsg_ml_predictions(confidence_score DESC);
CREATE INDEX idx_dsg_dashboard_widgets_dashboard ON dsg_dashboard_widgets(dashboard_id);
CREATE INDEX idx_dsg_dashboard_widgets_data_source ON dsg_dashboard_widgets(data_source);
CREATE INDEX idx_dsg_ml_model_drift_model ON dsg_ml_model_drift(model_id, detected_at DESC);
CREATE INDEX idx_dsg_ml_model_drift_significant ON dsg_ml_model_drift(is_significant) WHERE is_significant = true;

-- RLS Policies
ALTER TABLE dsg_dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_ml_model_drift ENABLE ROW LEVEL SECURITY;

-- Dashboard configs policies
CREATE POLICY dashboard_configs_select ON dsg_dashboard_configs
  FOR SELECT USING (org_id = auth.uid() OR is_public = true OR auth.uid() = ANY(shared_with));

CREATE POLICY dashboard_configs_insert ON dsg_dashboard_configs
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY dashboard_configs_update ON dsg_dashboard_configs
  FOR UPDATE USING (org_id = auth.uid());

-- ML models policies
CREATE POLICY ml_models_select ON dsg_ml_models
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY ml_models_insert ON dsg_ml_models
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY ml_models_update ON dsg_ml_models
  FOR UPDATE USING (org_id = auth.uid());

-- ML predictions policies
CREATE POLICY ml_predictions_select ON dsg_ml_predictions
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY ml_predictions_insert ON dsg_ml_predictions
  FOR INSERT WITH CHECK (org_id = auth.uid());

-- Dashboard widgets policies
CREATE POLICY dashboard_widgets_select ON dsg_dashboard_widgets
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY dashboard_widgets_insert ON dsg_dashboard_widgets
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY dashboard_widgets_update ON dsg_dashboard_widgets
  FOR UPDATE USING (org_id = auth.uid());

-- Model drift policies
CREATE POLICY model_drift_select ON dsg_ml_model_drift
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY model_drift_insert ON dsg_ml_model_drift
  FOR INSERT WITH CHECK (org_id = auth.uid());

-- Audit triggers
CREATE TRIGGER update_dsg_dashboard_configs_updated_at
  BEFORE UPDATE ON dsg_dashboard_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dsg_ml_models_updated_at
  BEFORE UPDATE ON dsg_ml_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dsg_dashboard_widgets_updated_at
  BEFORE UPDATE ON dsg_dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
