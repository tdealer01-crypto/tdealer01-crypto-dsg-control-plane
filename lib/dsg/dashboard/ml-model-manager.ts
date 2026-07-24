import { createHash } from "crypto";

export interface MLModel {
  id: string;
  orgId: string;
  modelName: string;
  modelVersion: string;
  modelType: "anomaly_detection" | "prediction" | "classification";
  modelSource: "internal" | "external_api" | "huggingface";
  modelPath?: string;
  modelHash?: string;

  // Performance metrics
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

export interface MLPrediction {
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

export interface ModelDrift {
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

export class MLModelManager {
  createModel(input: Omit<MLModel, "id" | "createdAt" | "updatedAt">): MLModel {
    const id = `model-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const modelHash = this.hashModel(input);

    return {
      ...input,
      id,
      modelHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  validateModel(model: MLModel): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!model.modelName) errors.push("Model name is required");
    if (!model.modelVersion) errors.push("Model version is required");
    if (!model.modelType) errors.push("Model type is required");
    if (!model.modelSource) errors.push("Model source is required");
    if (model.confidenceThreshold < 0 || model.confidenceThreshold > 1) {
      errors.push("Confidence threshold must be between 0 and 1");
    }

    if (model.accuracy !== undefined && (model.accuracy < 0 || model.accuracy > 1)) {
      errors.push("Accuracy must be between 0 and 1");
    }

    if (model.precision !== undefined && (model.precision < 0 || model.precision > 1)) {
      errors.push("Precision must be between 0 and 1");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  assessModelPerformance(model: MLModel): {
    overallScore: number;
    grade: "A" | "B" | "C" | "D" | "F";
    recommendation: string;
  } {
    const metrics = [model.accuracy, model.precision, model.recall, model.f1Score]
      .filter((m) => m !== undefined) as number[];

    if (metrics.length === 0) {
      return {
        overallScore: 0,
        grade: "D",
        recommendation: "Insufficient metrics for assessment",
      };
    }

    const averageScore = metrics.reduce((a, b) => a + b) / metrics.length;

    let grade: "A" | "B" | "C" | "D" | "F";
    let recommendation: string;

    if (averageScore >= 0.9) {
      grade = "A";
      recommendation = "Model is performing excellently. Ready for production.";
    } else if (averageScore >= 0.8) {
      grade = "B";
      recommendation = "Model is performing well. Monitor for drift regularly.";
    } else if (averageScore >= 0.7) {
      grade = "C";
      recommendation = "Model performance is acceptable. Consider retraining.";
    } else if (averageScore >= 0.6) {
      grade = "D";
      recommendation = "Model performance is concerning. Plan retraining soon.";
    } else {
      grade = "F";
      recommendation = "Model performance is unacceptable. Retrain immediately.";
    }

    return {
      overallScore: averageScore,
      grade,
      recommendation,
    };
  }

  detectDrift(
    predictions: MLPrediction[],
    baseline: { avgConfidence: number; avgLatency: number }
  ): ModelDrift | null {
    if (predictions.length === 0) return null;

    // Calculate current statistics
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidenceScore, 0) / predictions.length;
    const avgLatency = predictions.reduce((sum, p) => sum + p.inferenceTimeMs, 0) / predictions.length;

    // Detect confidence drift
    const confidenceDrift = Math.abs(avgConfidence - baseline.avgConfidence) / baseline.avgConfidence;
    if (confidenceDrift > 0.15) {
      return {
        id: `drift-${Date.now()}`,
        modelId: predictions[0].modelId,
        driftType: "prediction_drift",
        driftScore: Math.min(confidenceDrift, 1),
        isSignificant: confidenceDrift > 0.2,
        monitoredMetric: "avg_confidence",
        previousValue: baseline.avgConfidence,
        currentValue: avgConfidence,
        changePercent: (confidenceDrift * 100),
        actionRecommended: confidenceDrift > 0.2 ? "retrain" : "monitor",
        confidenceInAction: Math.min(confidenceDrift, 1),
        detectedAt: new Date(),
      };
    }

    // Detect latency drift
    const latencyDrift = Math.abs(avgLatency - baseline.avgLatency) / baseline.avgLatency;
    if (latencyDrift > 0.25) {
      return {
        id: `drift-${Date.now()}`,
        modelId: predictions[0].modelId,
        driftType: "performance_drift",
        driftScore: Math.min(latencyDrift, 1),
        isSignificant: latencyDrift > 0.3,
        monitoredMetric: "avg_latency",
        previousValue: baseline.avgLatency,
        currentValue: avgLatency,
        changePercent: (latencyDrift * 100),
        actionRecommended: latencyDrift > 0.3 ? "investigate" : "monitor",
        confidenceInAction: Math.min(latencyDrift, 1),
        detectedAt: new Date(),
      };
    }

    return null;
  }

  private hashModel(model: Omit<MLModel, "id" | "modelHash" | "createdAt" | "updatedAt">): string {
    const data = {
      modelName: model.modelName,
      modelVersion: model.modelVersion,
      modelPath: model.modelPath,
      confidenceThreshold: model.confidenceThreshold,
    };

    return createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex");
  }

  generateModelCard(model: MLModel): string {
    const performance = this.assessModelPerformance(model);

    return `
MODEL CARD
==========

Name: ${model.modelName} v${model.modelVersion}
Type: ${model.modelType}
Source: ${model.modelSource}

PERFORMANCE
-----------
Accuracy:  ${model.accuracy ? (model.accuracy * 100).toFixed(1) + "%" : "N/A"}
Precision: ${model.precision ? (model.precision * 100).toFixed(1) + "%" : "N/A"}
Recall:    ${model.recall ? (model.recall * 100).toFixed(1) + "%" : "N/A"}
F1 Score:  ${model.f1Score ? (model.f1Score * 100).toFixed(1) + "%" : "N/A"}

ASSESSMENT
----------
Overall Score: ${(performance.overallScore * 100).toFixed(1)}%
Grade: ${performance.grade}
Recommendation: ${performance.recommendation}

STATUS
------
Active: ${model.isActive}
Production: ${model.isProduction}
Confidence Threshold: ${(model.confidenceThreshold * 100).toFixed(0)}%

CAPABILITIES
------------
Input Types: ${model.supportedInputTypes?.join(", ") || "Unknown"}
Anomaly Types: ${model.supportedAnomalyTypes?.join(", ") || "All"}
Inference Latency: ${model.latencyMs ? model.latencyMs + "ms" : "Unknown"}

TRAINING
--------
Data Size: ${model.trainingDataSize || "Unknown"} samples
Training Completed: ${model.trainingCompletedAt?.toISOString() || "Never"}
Last Retrained: ${model.lastRetrainedAt?.toISOString() || "Never"}
    `.trim();
  }
}
