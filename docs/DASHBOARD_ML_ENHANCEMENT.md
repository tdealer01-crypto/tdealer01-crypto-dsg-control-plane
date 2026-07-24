# Dashboard & ML Enhancement - Phase 5 Documentation

## Overview

Phase 5 implements a comprehensive Dashboard and ML model management system for the DSG ONE / ProofGate control plane. This phase enables:

1. **Dashboard Management** - User-configurable dashboards with customizable widgets
2. **ML Model Registry** - Central repository for managing machine learning models
3. **Prediction Tracking** - Real-time inference results and explainability
4. **Model Drift Detection** - Automated monitoring for model performance degradation
5. **Performance Analytics** - Grades, metrics aggregation, and recommendations

## Architecture

### Component Overview

```
Dashboard & ML System
├── Database Layer (Supabase)
│   ├── dsg_dashboard_configs
│   ├── dsg_dashboard_widgets
│   ├── dsg_ml_models
│   ├── dsg_ml_predictions
│   └── dsg_ml_model_drift
├── Engine Core (MLModelManager)
│   ├── Model lifecycle management
│   ├── Performance assessment
│   ├── Drift detection
│   └── Model card generation
├── MCP Integration
│   ├── 7 new tools for model/dashboard operations
│   └── Handlers for Anthropic integrations
└── API Routes
    ├── Dashboard endpoints
    └── ML model endpoints
```

## Database Schema

### dsg_dashboard_configs

Stores user and organizational dashboard configurations.

```sql
id UUID PRIMARY KEY
org_id UUID NOT NULL (FK auth.users)
workspace_id UUID NOT NULL
user_id UUID (optional)

-- Metadata
name TEXT NOT NULL
description TEXT
layout_type TEXT ('grid' | 'timeline' | 'kanban', default: 'grid')
is_default BOOLEAN
is_shared BOOLEAN

-- Configuration
config JSONB (layout, widget positions, preferences)
theme TEXT ('light' | 'dark' | 'auto', default: 'light')
refresh_interval_seconds INT DEFAULT 60

-- Visibility & access
is_public BOOLEAN
shared_with UUID[] (array of user IDs)

-- Timestamps & Audit
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**RLS Policies**:
- SELECT: Own org_id OR is_public=true OR user is in shared_with
- INSERT/UPDATE: Own org_id

**Indexes**:
- (org_id, is_default)
- (user_id, org_id)

### dsg_ml_models

Central registry for ML models with versioning and performance tracking.

```sql
id UUID PRIMARY KEY
org_id UUID NOT NULL (FK auth.users)

-- Model Metadata
model_name TEXT NOT NULL
model_version TEXT NOT NULL
model_type TEXT NOT NULL ('anomaly_detection' | 'prediction' | 'classification')

-- Model Source
model_source TEXT NOT NULL ('internal' | 'external_api' | 'huggingface')
model_path TEXT (S3 path, huggingface id, etc)
model_hash TEXT (SHA256 for integrity)

-- Performance Metrics (0-1 range)
accuracy DECIMAL(5,4)
precision DECIMAL(5,4)
recall DECIMAL(5,4)
f1_score DECIMAL(5,4)

-- Training Info
training_data_size INT
training_completed_at TIMESTAMPTZ
last_retrained_at TIMESTAMPTZ

-- Model Status
is_active BOOLEAN DEFAULT false
is_production BOOLEAN DEFAULT false
confidence_threshold DECIMAL(3,2) DEFAULT 0.7

-- Capabilities
supported_input_types TEXT[]
supported_anomaly_types TEXT[]
latency_ms INT (average inference latency)

-- Metadata
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
created_by UUID
```

**RLS Policies**: org_id matching

**Indexes**:
- (org_id, is_active)
- (org_id, is_production)

**Constraints**:
- UNIQUE(org_id, model_name, model_version)

### dsg_ml_predictions

Records inference results with explainability and verification.

```sql
id UUID PRIMARY KEY
org_id UUID NOT NULL (FK auth.users)
workspace_id UUID NOT NULL
model_id UUID NOT NULL (FK dsg_ml_models)

-- Prediction Context
anomaly_id UUID (optional, links to detected anomaly)
input_data JSONB NOT NULL

-- Prediction Results
prediction_type TEXT ('anomaly_score' | 'severity_class' | 'root_cause')
predicted_value DECIMAL(5,4)
predicted_class TEXT
confidence_score DECIMAL(5,4) NOT NULL (0-1)

-- Uncertainty Quantification
prediction_std_dev DECIMAL(5,4)
confidence_interval_lower DECIMAL(5,4)
confidence_interval_upper DECIMAL(5,4)

-- Explainability
explanation JSONB (feature importance, SHAP values, etc)
contributing_features TEXT[]

-- Inference Metadata
inference_time_ms INT NOT NULL
inference_method TEXT ('batch' | 'real_time' | 'scheduled')

-- Verification & Drift Detection
actual_value DECIMAL(5,4) (ground truth when available)
prediction_correct BOOLEAN (after validation)
model_drift_detected BOOLEAN DEFAULT false

-- Timestamps
created_at TIMESTAMPTZ
verified_at TIMESTAMPTZ
```

**RLS Policies**: org_id matching

**Indexes**:
- (org_id, model_id)
- (created_at DESC) - for time-series queries
- (anomaly_id)
- (confidence_score DESC)

### dsg_dashboard_widgets

Configurable dashboard components for visualization.

```sql
id UUID PRIMARY KEY
org_id UUID NOT NULL (FK auth.users)
workspace_id UUID NOT NULL
dashboard_id UUID NOT NULL (FK dsg_dashboard_configs)

-- Widget Definition
widget_type TEXT ('metric' | 'chart' | 'table' | 'gauge' | 'timeline' | 'alerts')
widget_name TEXT NOT NULL
position INT (display order)

-- Data Source
data_source TEXT ('anomalies' | 'predictions' | 'executions' | 'metrics')
metric_type TEXT (similarity, severity, confidence, count, etc)

-- Configuration
config JSONB (color scheme, chart type, aggregation, filters)
filters JSONB (anomaly type, severity level, date range, etc)

-- Refresh Settings
refresh_interval_seconds INT DEFAULT 60
cache_enabled BOOLEAN DEFAULT true
cache_ttl_seconds INT DEFAULT 300

-- Display Settings
height_units INT DEFAULT 4
width_units INT DEFAULT 6
show_title BOOLEAN DEFAULT true
show_legend BOOLEAN DEFAULT true

-- Timestamps
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**RLS Policies**: org_id matching

**Indexes**:
- (dashboard_id)
- (data_source)

### dsg_ml_model_drift

Detected drift events with recommendations.

```sql
id UUID PRIMARY KEY
org_id UUID NOT NULL (FK auth.users)
model_id UUID NOT NULL (FK dsg_ml_models)

-- Drift Detection
drift_type TEXT ('data_drift' | 'prediction_drift' | 'performance_drift')
drift_score DECIMAL(5,4) (0-1)
is_significant BOOLEAN

-- Monitored Metrics
monitored_metric TEXT
previous_value DECIMAL(5,4)
current_value DECIMAL(5,4)
change_percent DECIMAL(6,2)

-- Recommendations
action_recommended TEXT ('retrain' | 'monitor' | 'investigate' | 'rollback')
confidence_in_action DECIMAL(3,2) (0-1)

-- Timestamps
detected_at TIMESTAMPTZ
```

**RLS Policies**: org_id matching

**Indexes**:
- (model_id, detected_at DESC)
- (is_significant) WHERE is_significant=true

## Engine Core: MLModelManager

### Class: MLModelManager

Manages ML model lifecycle, performance assessment, and drift detection.

```typescript
class MLModelManager {
  createModel(input: Omit<MLModel, "id" | "createdAt" | "updatedAt">): MLModel
  validateModel(model: MLModel): { isValid: boolean; errors: string[] }
  assessModelPerformance(model: MLModel): { overallScore: number; grade: "A" | "B" | "C" | "D" | "F"; recommendation: string }
  detectDrift(predictions: MLPrediction[], baseline: { avgConfidence: number; avgLatency: number }): ModelDrift | null
  generateModelCard(model: MLModel): string
  private hashModel(model: Omit<MLModel, "id" | "modelHash" | "createdAt" | "updatedAt">): string
}
```

### Interfaces

#### MLModel

```typescript
interface MLModel {
  id: string;
  orgId: string;
  modelName: string;
  modelVersion: string;
  modelType: "anomaly_detection" | "prediction" | "classification";
  modelSource: "internal" | "external_api" | "huggingface";
  modelPath?: string;
  modelHash?: string;

  // Performance metrics (0-1 range)
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;

  // Training info
  trainingDataSize?: number;
  trainingCompletedAt?: Date;
  lastRetrainedAt?: Date;

  // Status
  isActive: boolean;
  isProduction: boolean;
  confidenceThreshold: number;

  // Capabilities
  supportedInputTypes?: string[];
  supportedAnomalyTypes?: string[];
  latencyMs?: number;

  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
```

#### MLPrediction

```typescript
interface MLPrediction {
  id: string;
  modelId: string;
  anomalyId?: string;
  inputData: Record<string, unknown>;

  predictionType: "anomaly_score" | "severity_class" | "root_cause";
  predictedValue?: number;
  predictedClass?: string;
  confidenceScore: number;

  // Uncertainty
  predictionStdDev?: number;
  confidenceIntervalLower?: number;
  confidenceIntervalUpper?: number;

  // Explainability
  explanation?: Record<string, unknown>;
  contributingFeatures?: string[];

  // Inference metadata
  inferenceTimeMs: number;
  inferenceMethod: "batch" | "real_time" | "scheduled";

  // Verification
  actualValue?: number;
  predictionCorrect?: boolean;
  modelDriftDetected: boolean;

  createdAt: Date;
  verifiedAt?: Date;
}
```

#### ModelDrift

```typescript
interface ModelDrift {
  id: string;
  modelId: string;
  driftType: "data_drift" | "prediction_drift" | "performance_drift";
  driftScore: number;
  isSignificant: boolean;

  monitoredMetric: string;
  previousValue?: number;
  currentValue?: number;
  changePercent?: number;

  actionRecommended: "retrain" | "monitor" | "investigate" | "rollback";
  confidenceInAction: number;

  detectedAt: Date;
}
```

### Methods

#### createModel

Generates a new model entry with SHA256 hash.

```typescript
createModel(input: Omit<MLModel, "id" | "createdAt" | "updatedAt">): MLModel
```

- Generates unique model ID: `model-${timestamp}-${random}`
- Computes SHA256 hash from model name, version, path, and confidence threshold
- Sets createdAt and updatedAt to current date

#### validateModel

Comprehensive validation of model configuration.

```typescript
validateModel(model: MLModel): { isValid: boolean; errors: string[] }
```

**Validation Rules**:
- Model name: required, non-empty
- Model version: required, non-empty
- Model type: required, must be valid enum value
- Model source: required, must be valid enum value
- Confidence threshold: 0-1 range
- Accuracy, Precision, Recall, F1 Score: 0-1 range (if provided)

**Returns**: Validation result with error list

#### assessModelPerformance

Calculates performance grade based on averaged metrics.

```typescript
assessModelPerformance(model: MLModel): {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  recommendation: string;
}
```

**Grading Scale**:
- A: >= 0.9 (Excellent, ready for production)
- B: >= 0.8 (Good, monitor for drift regularly)
- C: >= 0.7 (Acceptable, consider retraining)
- D: >= 0.6 (Concerning, plan retraining soon)
- F: < 0.6 (Unacceptable, retrain immediately)

**Metrics Averaged**: accuracy, precision, recall, f1Score (if available)

#### detectDrift

Compares prediction statistics against baseline to detect drift.

```typescript
detectDrift(
  predictions: MLPrediction[],
  baseline: { avgConfidence: number; avgLatency: number }
): ModelDrift | null
```

**Drift Detection**:
- **Confidence Drift**: Compares average confidence against baseline
  - Threshold: > 15% deviation triggers detection
  - Significant: > 20% deviation
  - Monitored Metric: avg_confidence

- **Latency Drift**: Compares average inference time against baseline
  - Threshold: > 25% deviation triggers detection
  - Significant: > 30% deviation
  - Monitored Metric: avg_latency

**Action Recommendations**:
- Retrain: if drift > 20%
- Monitor: if 15% < drift <= 20%

**Returns**: ModelDrift record or null if no significant drift detected

#### generateModelCard

Creates human-readable model report.

```typescript
generateModelCard(model: MLModel): string
```

**Report Includes**:
- Model name, version, type, and source
- Performance metrics (formatted as percentages)
- Overall assessment grade and recommendation
- Active/production status and confidence threshold
- Supported input types and anomaly types
- Training history and latency

## MCP Integration

### Tools Available

#### list_ml_models

Retrieve all ML models with optional filtering.

**Parameters**:
- `org_id` (required): Organization ID
- `model_type` (optional): Filter by anomaly_detection | prediction | classification
- `is_production` (optional): Filter production models only
- `limit` (default: 10): Maximum results

**Returns**: List of models with performance grades and summary statistics

#### create_ml_model

Register a new ML model in the registry.

**Parameters**:
- `org_id` (required): Organization ID
- `model_name` (required): Model name
- `model_version` (required): Version string (e.g., 1.0.0)
- `model_type` (required): Type enum
- `model_source` (required): Source enum
- `accuracy`, `precision` (optional): Performance metrics
- `confidence_threshold` (default: 0.7): 0-1 range

**Returns**: Created model ID, name, version, and hash

#### predict_with_model

Execute inference using a trained model.

**Parameters**:
- `org_id` (required): Organization ID
- `model_id` (required): Model to use
- `input_data` (required): Feature dictionary
- `anomaly_id` (optional): Link to anomaly

**Returns**: Prediction ID, model name, confidence score, inference time

#### detect_model_drift

Monitor model performance for drift indicators.

**Parameters**:
- `org_id` (required): Organization ID
- `model_id` (required): Model to check
- `time_window_hours` (default: 24): Lookback period

**Returns**: Drift status, metrics comparison, recommendations

#### get_dashboard_config

Retrieve dashboard configurations.

**Parameters**:
- `org_id` (required): Organization ID
- `user_id` (optional): Filter by user
- `is_default` (optional): Get default dashboard

**Returns**: Dashboard list with layout and sharing info

#### create_dashboard_widget

Add a widget to a dashboard.

**Parameters**:
- `org_id`, `dashboard_id` (required): Dashboard context
- `widget_type` (required): Widget type enum
- `widget_name` (required): Display name
- `data_source` (required): Data source enum
- `metric_type` (optional): Specific metric

**Returns**: Widget ID, name, type, and data source

## API Routes

### Dashboard Configuration Routes

#### GET /api/dsg/v1/dashboard/configs

Retrieve dashboard configurations with filtering.

**Query Parameters**:
- `org_id` (required): Organization ID
- `user_id` (optional): Filter by user
- `is_default` (optional): true/false
- `limit` (default: 10): Max results

**Response**:
```json
{
  "total": 5,
  "dashboards": [
    {
      "id": "...",
      "org_id": "...",
      "name": "Operations Dashboard",
      "layout_type": "grid",
      "theme": "dark",
      "refresh_interval_seconds": 60,
      "is_default": true,
      "is_shared": false,
      "created_at": "2026-07-24T..."
    }
  ],
  "timestamp": "2026-07-24T..."
}
```

#### POST /api/dsg/v1/dashboard/configs

Create a new dashboard configuration.

**Request Body**:
```json
{
  "org_id": "...",
  "workspace_id": "...",
  "name": "Operations Dashboard",
  "description": "...",
  "layout_type": "grid",
  "theme": "light",
  "refresh_interval_seconds": 60
}
```

**Response**:
```json
{
  "dashboard_id": "...",
  "name": "Operations Dashboard",
  "layout_type": "grid",
  "created_at": "2026-07-24T..."
}
```

### Dashboard Widgets Routes

#### GET /api/dsg/v1/dashboard/widgets

List dashboard widgets with summary statistics.

**Query Parameters**:
- `org_id` (required): Organization ID
- `dashboard_id` (optional): Filter by dashboard
- `data_source` (optional): Filter by data source
- `limit` (default: 20): Max results

**Response**:
```json
{
  "total": 12,
  "widgets": [...],
  "summary": {
    "widget_types": {
      "metric": 3,
      "chart": 4,
      "table": 5
    },
    "data_sources": {
      "anomalies": 6,
      "predictions": 4,
      "executions": 2
    }
  }
}
```

#### POST /api/dsg/v1/dashboard/widgets

Create a new dashboard widget.

**Request Body**:
```json
{
  "org_id": "...",
  "workspace_id": "...",
  "dashboard_id": "...",
  "widget_type": "chart",
  "widget_name": "Anomaly Distribution",
  "data_source": "anomalies",
  "metric_type": "severity",
  "height_units": 4,
  "width_units": 6
}
```

### ML Models Routes

#### GET /api/dsg/v1/ml/models

List ML models with performance assessment.

**Query Parameters**:
- `org_id` (required): Organization ID
- `model_type` (optional): Filter by type
- `is_production` (optional): Production models only
- `limit` (default: 10): Max results

**Response**:
```json
{
  "total": 8,
  "models": [
    {
      "id": "...",
      "model_name": "Fraud Detector",
      "model_version": "2.1.0",
      "model_type": "classification",
      "accuracy": 0.95,
      "is_production": true,
      "performance_grade": "A",
      "performance_score": 0.945,
      "recommendation": "Model is performing excellently. Ready for production."
    }
  ],
  "summary": {
    "by_type": {
      "anomaly_detection": 3,
      "prediction": 2,
      "classification": 3
    },
    "production_count": 5,
    "active_count": 7
  }
}
```

#### POST /api/dsg/v1/ml/models

Register a new ML model.

**Request Body**:
```json
{
  "org_id": "...",
  "model_name": "Fraud Detector",
  "model_version": "2.1.0",
  "model_type": "classification",
  "model_source": "internal",
  "accuracy": 0.95,
  "precision": 0.92,
  "recall": 0.98,
  "f1_score": 0.95,
  "confidence_threshold": 0.7,
  "latency_ms": 45
}
```

### ML Predictions Routes

#### GET /api/dsg/v1/ml/predictions

Retrieve inference results with statistics.

**Query Parameters**:
- `org_id` (required): Organization ID
- `model_id` (optional): Filter by model
- `anomaly_id` (optional): Filter by anomaly
- `prediction_type` (optional): Filter by type
- `limit` (default: 20): Max results

**Response**:
```json
{
  "total": 156,
  "predictions": [...],
  "statistics": {
    "confidence_avg": 0.832,
    "confidence_min": 0.421,
    "confidence_max": 0.998,
    "drift_detected_count": 12,
    "drift_percentage": "7.7%"
  }
}
```

#### POST /api/dsg/v1/ml/predictions

Store a prediction result.

**Request Body**:
```json
{
  "org_id": "...",
  "workspace_id": "...",
  "model_id": "...",
  "input_data": { "feature1": 0.5, "feature2": "value" },
  "prediction_type": "anomaly_score",
  "predicted_value": 0.85,
  "confidence_score": 0.92,
  "inference_time_ms": 48,
  "inference_method": "real_time",
  "contributing_features": ["feature1", "feature2"]
}
```

### Model Drift Detection Routes

#### GET /api/dsg/v1/ml/drift

List detected drift events.

**Query Parameters**:
- `org_id` (required): Organization ID
- `model_id` (optional): Filter by model
- `is_significant` (optional): Significant only
- `limit` (default: 10): Max results

**Response**:
```json
{
  "total": 5,
  "drifts": [...],
  "summary": {
    "by_type": {
      "prediction_drift": 3,
      "performance_drift": 2
    },
    "by_action": {
      "retrain": 3,
      "monitor": 2
    },
    "significant_count": 3
  }
}
```

#### POST /api/dsg/v1/ml/drift

Execute drift detection on recent predictions.

**Request Body**:
```json
{
  "org_id": "...",
  "model_id": "...",
  "time_window_hours": 24
}
```

**Response**:
```json
{
  "status": "drift_detected",
  "drift_type": "prediction_drift",
  "metrics": {
    "predictions_analyzed": 48,
    "confidence": {
      "baseline": 0.750,
      "current": 0.632,
      "drift_percent": 15.7
    },
    "latency": {
      "baseline": 50.0,
      "current": 48.2,
      "drift_percent": 3.6
    }
  },
  "recommendation": "monitor"
}
```

## Best Practices

### Model Management

1. **Version Models Consistently**: Use semantic versioning (major.minor.patch)
2. **Track Performance**: Record metrics at model creation and update times
3. **Monitor Drift**: Check drift detection results regularly (daily for production)
4. **Document Models**: Use generateModelCard() for audit trails
5. **Validate Before Deployment**: Run validateModel() before promoting to production

### Dashboard Configuration

1. **User-Specific Dashboards**: Create personalized views for different roles
2. **Refresh Intervals**: Balance between freshness (60s) and load (300s+)
3. **Widget Caching**: Enable cache for expensive data sources, TTL 5-10 minutes
4. **Organized Layout**: Use clear naming and consistent widget positioning
5. **Sharing Settings**: Carefully control dashboard visibility and sharing

### Prediction Handling

1. **Store Input Data**: Preserve input_data for debugging and drift analysis
2. **Capture Explanations**: Record contributing_features for transparency
3. **Verify When Possible**: Log actual_value for model performance tracking
4. **Inference Timing**: Monitor latency_ms for performance regressions
5. **Uncertainty Quantification**: Include confidence intervals when available

### Drift Detection

1. **Set Appropriate Baselines**: Establish baseline metrics from baseline predictions
2. **Act on Significant Drift**: Retrain when drift > 20%
3. **Monitor Thresholds**: Confidence drift 15%, Latency drift 25%
4. **Document Retraining**: Update lastRetrainedAt when retraining completes
5. **Archive Old Models**: Move old models to archived status when superseded

## Troubleshooting

### Issue: Model validation fails with "confidence_threshold must be between 0 and 1"

**Cause**: Confidence threshold value outside valid range

**Solution**: Ensure confidence_threshold is a decimal between 0.0 and 1.0

### Issue: Drift detection returns "no_data"

**Cause**: No predictions found within specified time window

**Solution**: Either increase time_window_hours or check if model is actively being used

### Issue: Widget creation fails with "dashboard_id not found"

**Cause**: Referenced dashboard doesn't exist for the organization

**Solution**: Create dashboard first using POST /dashboard/configs, then add widgets

### Issue: Performance grade is 'F' despite high individual metrics

**Cause**: One or more metrics are missing, lowering average

**Solution**: Provide all relevant metrics (accuracy, precision, recall, f1_score) when creating model

## Integration Examples

### Example 1: Monitor Production Model Drift

```bash
# 1. List active production models
curl -X GET "http://localhost:3000/api/dsg/v1/ml/models?org_id=ORG_ID&is_production=true"

# 2. For each model, check for drift
curl -X POST "http://localhost:3000/api/dsg/v1/ml/drift" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "ORG_ID",
    "model_id": "MODEL_ID",
    "time_window_hours": 24
  }'

# 3. If drift > 20%, trigger retraining workflow
```

### Example 2: Create Custom Monitoring Dashboard

```bash
# 1. Create dashboard
DASH_ID=$(curl -X POST "http://localhost:3000/api/dsg/v1/dashboard/configs" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "ORG_ID",
    "workspace_id": "WS_ID",
    "name": "Model Drift Monitor",
    "layout_type": "grid",
    "theme": "dark"
  }' | jq -r '.dashboard_id')

# 2. Add prediction confidence metric
curl -X POST "http://localhost:3000/api/dsg/v1/dashboard/widgets" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "ORG_ID",
    "workspace_id": "WS_ID",
    "dashboard_id": "'$DASH_ID'",
    "widget_type": "chart",
    "widget_name": "Confidence Over Time",
    "data_source": "predictions",
    "metric_type": "confidence"
  }'

# 3. Add drift detection alerts
curl -X POST "http://localhost:3000/api/dsg/v1/dashboard/widgets" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "ORG_ID",
    "workspace_id": "WS_ID",
    "dashboard_id": "'$DASH_ID'",
    "widget_type": "alerts",
    "widget_name": "Drift Alerts",
    "data_source": "metrics"
  }'
```

### Example 3: Implement Continuous Model Monitoring

```bash
#!/bin/bash

ORG_ID="your-org-id"
MODEL_ID="your-model-id"

while true; do
  # Fetch predictions from last hour
  RESPONSE=$(curl -s "http://localhost:3000/api/dsg/v1/ml/predictions?org_id=$ORG_ID&model_id=$MODEL_ID&limit=100")
  
  # Check drift
  DRIFT=$(curl -s -X POST "http://localhost:3000/api/dsg/v1/ml/drift" \
    -H "Content-Type: application/json" \
    -d '{
      "org_id": "'$ORG_ID'",
      "model_id": "'$MODEL_ID'",
      "time_window_hours": 1
    }')
  
  STATUS=$(echo $DRIFT | jq -r '.status')
  RECOMMENDATION=$(echo $DRIFT | jq -r '.recommendation')
  
  if [ "$STATUS" = "drift_detected" ] && [ "$RECOMMENDATION" = "retrain" ]; then
    echo "ALERT: Model drift detected! Recommendation: $RECOMMENDATION"
    # Trigger retraining workflow
  fi
  
  sleep 3600  # Check hourly
done
```

## Related Documentation

- [Anomaly Detection](./ANOMALY_DETECTION.md) - Phase 3
- [Automated Remediation](./AUTOMATED_REMEDIATION.md) - Phase 4
- [DSG Architecture](./ARCHITECTURE.md) - Overall system design
