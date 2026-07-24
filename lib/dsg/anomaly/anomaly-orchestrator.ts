import { AnomalyDetector, AnomalyEvent, LearnedPattern } from "./anomaly-detector";

export interface AnomalySubscription {
  id: string;
  orgId: string;
  workspaceId: string;
  name: string;
  anomalyTypes: string[];
  minSimilarityScore: number;
  severityLevels: string[];
  alertChannels: string[];
  recipients: Record<string, unknown>;
  autoInvestigate: boolean;
  autoResolveThreshold?: number;
  isActive: boolean;
}

export interface DetectionInput {
  workspaceId: string;
  orgId: string;
  events: AnomalyEvent[];
  patterns: LearnedPattern[];
  subscriptions: AnomalySubscription[];
}

export interface DetectionOutput {
  orgId: string;
  workspaceId: string;
  anomalies: Array<{
    id: string;
    type: string;
    severity: string;
    similarity: number;
    deviation: number;
    patternId?: string;
    evidence: Record<string, unknown>[];
  }>;
  alerts: Array<{
    anomalyId: string;
    subscriptionId: string;
    channels: string[];
    recipients: Record<string, unknown>;
  }>;
  detectionMethod: string;
  timestamp: Date;
}

export class AnomalyOrchestrator {
  private detector: AnomalyDetector;

  constructor() {
    this.detector = new AnomalyDetector();
  }

  async detectAndAlert(input: DetectionInput): Promise<DetectionOutput> {
    // Add patterns to detector
    this.detector.addPatterns(input.patterns);

    // Detect anomalies
    const detectionResults = this.detector.detectAnomalies(
      input.events,
      input.subscriptions.length > 0
        ? Math.min(...input.subscriptions.map((s) => s.minSimilarityScore))
        : 0.7
    );

    // Filter anomalies by subscription criteria
    const matchingAnomalies = detectionResults.filter((result) =>
      this.isAnomalyMatchingSubscriptions(result, input.subscriptions)
    );

    // Generate alerts
    const alerts = this.generateAlerts(
      matchingAnomalies,
      input.subscriptions
    );

    return {
      orgId: input.orgId,
      workspaceId: input.workspaceId,
      anomalies: matchingAnomalies.map((anomaly, index) => ({
        id: `anomaly-${Date.now()}-${index}`,
        type: anomaly.anomalyType,
        severity: anomaly.severity,
        similarity: anomaly.similarityScore,
        deviation: anomaly.deviationScore,
        patternId: anomaly.matchedPatternId,
        evidence: anomaly.evidence.map((e) => ({
          type: e.type,
          description: e.description,
          confidence: e.confidence,
          details: e.details,
        })),
      })),
      alerts,
      detectionMethod: "hybrid_pattern_behavioral",
      timestamp: new Date(),
    };
  }

  private isAnomalyMatchingSubscriptions(
    anomaly: ReturnType<AnomalyDetector["detectAnomalies"]>[0],
    subscriptions: AnomalySubscription[]
  ): boolean {
    return subscriptions.some((sub) => {
      const typeMatch =
        sub.anomalyTypes.length === 0 ||
        sub.anomalyTypes.includes(anomaly.anomalyType);

      const severityMatch = sub.severityLevels.includes(anomaly.severity);

      const scoreMatch = anomaly.similarityScore >= sub.minSimilarityScore;

      return typeMatch && severityMatch && scoreMatch && sub.isActive;
    });
  }

  private generateAlerts(
    anomalies: ReturnType<AnomalyDetector["detectAnomalies"]>,
    subscriptions: AnomalySubscription[]
  ): Array<{
    anomalyId: string;
    subscriptionId: string;
    channels: string[];
    recipients: Record<string, unknown>;
  }> {
    const alerts: Array<{
      anomalyId: string;
      subscriptionId: string;
      channels: string[];
      recipients: Record<string, unknown>;
    }> = [];

    anomalies.forEach((anomaly, anomalyIndex) => {
      subscriptions.forEach((sub) => {
        const typeMatch =
          sub.anomalyTypes.length === 0 ||
          sub.anomalyTypes.includes(anomaly.anomalyType);

        const severityMatch = sub.severityLevels.includes(anomaly.severity);

        const scoreMatch = anomaly.similarityScore >= sub.minSimilarityScore;

        if (typeMatch && severityMatch && scoreMatch && sub.isActive) {
          alerts.push({
            anomalyId: `anomaly-${Date.now()}-${anomalyIndex}`,
            subscriptionId: sub.id,
            channels: sub.alertChannels,
            recipients: sub.recipients,
          });
        }
      });
    });

    return alerts;
  }

  getDetectorMetrics(): {
    patternsCount: number;
  } {
    return {
      patternsCount: 0,
    };
  }
}
