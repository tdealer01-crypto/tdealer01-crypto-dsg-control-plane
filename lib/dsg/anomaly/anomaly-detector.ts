import { createHash } from "crypto";

export interface AnomalyEvent {
  id: string;
  timestamp: Date;
  type: string;
  description: string;
  metadata: Record<string, unknown>;
}

export interface LearnedPattern {
  id: string;
  name: string;
  category: string;
  triggerSet: string[];
  occurrences: number;
  confidence: number;
  averageInterval?: number;
  averageDuration?: number;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType: string;
  similarityScore: number;
  deviationScore: number;
  matchedPatternId?: string;
  evidence: AnomalyEvidence[];
  severity: "low" | "medium" | "high" | "critical";
  hash: string;
}

export interface AnomalyEvidence {
  type: string;
  description: string;
  confidence: number;
  details: Record<string, unknown>;
}

export class AnomalyDetector {
  private patterns: Map<string, LearnedPattern> = new Map();

  addPatterns(patterns: LearnedPattern[]): void {
    patterns.forEach((p) => this.patterns.set(p.id, p));
  }

  detectAnomalies(
    events: AnomalyEvent[],
    threshold: number = 0.7
  ): AnomalyDetectionResult[] {
    if (events.length === 0) {
      return [];
    }

    const results: AnomalyDetectionResult[] = [];

    // Detect pattern-based anomalies
    for (const pattern of this.patterns.values()) {
      const match = this.matchPatternToEvents(pattern, events);
      if (match && match.similarity >= threshold) {
        results.push({
          isAnomaly: match.isDeviation,
          anomalyType: match.isDeviation ? "pattern_deviation" : "pattern_match",
          similarityScore: match.similarity,
          deviationScore: match.deviation,
          matchedPatternId: pattern.id,
          evidence: match.evidence,
          severity: this.calculateSeverity(match.similarity, match.deviation),
          hash: this.hashResult(pattern.id, match.similarity),
        });
      }
    }

    // Detect behavioral anomalies
    const behavioralAnomaly = this.detectBehavioralDeviation(events);
    if (behavioralAnomaly && behavioralAnomaly.deviation > threshold) {
      results.push(behavioralAnomaly);
    }

    return results;
  }

  private matchPatternToEvents(
    pattern: LearnedPattern,
    events: AnomalyEvent[]
  ): {
    similarity: number;
    deviation: number;
    isDeviation: boolean;
    evidence: AnomalyEvidence[];
  } | null {
    const eventTypes = new Set(events.map((e) => e.type));
    const matchingTriggers = pattern.triggerSet.filter((t) =>
      eventTypes.has(t)
    );

    if (matchingTriggers.length === 0) {
      return null;
    }

    const triggerMatchRatio = matchingTriggers.length / pattern.triggerSet.length;
    const similarityScore = triggerMatchRatio * pattern.confidence;

    // Calculate temporal deviation
    const intervals = this.calculateIntervals(events);
    let temporalDeviation = 0;
    if (pattern.averageInterval && intervals.length > 0) {
      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
      temporalDeviation = Math.abs(
        avgInterval - pattern.averageInterval
      ) / pattern.averageInterval;
    }

    const isDeviation = temporalDeviation > 0.3 || triggerMatchRatio < 0.8;

    const evidence: AnomalyEvidence[] = [
      {
        type: "trigger_match",
        description: `Matched ${matchingTriggers.length}/${pattern.triggerSet.length} triggers`,
        confidence: triggerMatchRatio,
        details: { matched: matchingTriggers, pattern: pattern.triggerSet },
      },
    ];

    if (temporalDeviation > 0.2) {
      evidence.push({
        type: "temporal_deviation",
        description: `Event interval deviated by ${(temporalDeviation * 100).toFixed(1)}%`,
        confidence: temporalDeviation,
        details: { deviation: temporalDeviation },
      });
    }

    return {
      similarity: similarityScore,
      deviation: temporalDeviation,
      isDeviation,
      evidence,
    };
  }

  private detectBehavioralDeviation(
    events: AnomalyEvent[]
  ): AnomalyDetectionResult | null {
    if (events.length < 2) {
      return null;
    }

    // Detect sudden increase in event frequency
    const hourlyBuckets = new Map<string, number>();
    events.forEach((e) => {
      const bucket = e.timestamp
        .toISOString()
        .slice(0, 13);
      hourlyBuckets.set(bucket, (hourlyBuckets.get(bucket) || 0) + 1);
    });

    const counts = Array.from(hourlyBuckets.values());
    if (counts.length < 2) {
      return null;
    }

    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const maxCount = Math.max(...counts);
    const deviation = (maxCount - avg) / avg;

    if (deviation > 0.5) {
      return {
        isAnomaly: true,
        anomalyType: "frequency_spike",
        similarityScore: 0,
        deviationScore: deviation,
        evidence: [
          {
            type: "frequency_analysis",
            description: `Event frequency spike: ${(deviation * 100).toFixed(1)}% above average`,
            confidence: Math.min(deviation, 1),
            details: { avgRate: avg, maxRate: maxCount, deviation },
          },
        ],
        severity: deviation > 1.5 ? "high" : "medium",
        hash: this.hashResult("frequency_spike", deviation),
      };
    }

    return null;
  }

  private calculateIntervals(events: AnomalyEvent[]): number[] {
    if (events.length < 2) {
      return [];
    }

    const sorted = [...events].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    const intervals: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const interval =
        (sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime()) /
        1000;
      intervals.push(interval);
    }

    return intervals;
  }

  private calculateSeverity(
    similarity: number,
    deviation: number
  ): "low" | "medium" | "high" | "critical" {
    const score = Math.max(similarity, deviation);
    if (score >= 0.9) return "critical";
    if (score >= 0.75) return "high";
    if (score >= 0.5) return "medium";
    return "low";
  }

  private hashResult(patternId: string, score: number): string {
    return createHash("sha256")
      .update(`${patternId}-${score}-${Date.now()}`)
      .digest("hex");
  }
}
