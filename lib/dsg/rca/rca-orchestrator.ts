import { reconstructTimeline, findCriticalPath, calculatePathConfidence, type TimelineEvent } from "./timeline-analyzer";
import { matchPatterns, getBestPattern, type IncidentPattern } from "./pattern-analyzer";

export interface RCAInput {
  workspaceId: string;
  orgId: string;
  incidentType: string;
  incidentSummary: string;
  incidentStartTime: Date;
  incidentEndTime?: Date;
  auditLogs: TimelineEvent[];
  memoryEvents: TimelineEvent[];
}

export interface RCAResult {
  id: string;
  rootCause: string;
  rootCauseCategory: string;
  confidenceScore: number;
  criticalPath: string[];
  pathConfidence: number;
  matchedPattern: IncidentPattern | null;
  affectedServices: string[];
  recommendedActions: string[];
  analysisMethod: "timeline_analysis" | "pattern_matching" | "causal_inference" | "hybrid";
  similarPastIncidents: number;
  evidenceCount: number;
}

/**
 * Main RCA orchestrator
 * Combines timeline analysis + pattern matching for root cause detection
 */
export async function analyzeIncident(input: RCAInput): Promise<RCAResult> {
  // 1. Combine all events into single timeline
  const allEvents: TimelineEvent[] = [...input.auditLogs, ...input.memoryEvents];

  if (allEvents.length === 0) {
    return createFallbackResult(input, "insufficient_data");
  }

  // 2. Reconstruct timeline and find critical path
  const timeline = reconstructTimeline(allEvents);
  const criticalPath = findCriticalPath(timeline);
  const pathConfidence = calculatePathConfidence(timeline, criticalPath);

  // 3. Extract triggers from critical path
  const triggers = criticalPath
    .map((eventId) => {
      const event = allEvents.find((e) => e.id === eventId);
      return event?.type || "";
    })
    .filter(Boolean);

  // 4. Pattern matching
  const patternMatches = matchPatterns(triggers);
  const bestPattern = patternMatches[0] || null;

  // 5. Determine root cause
  let rootCause = "Unable to determine";
  let rootCauseCategory = "unknown";
  let analysisMethod: RCAResult["analysisMethod"] = "timeline_analysis";
  let confidenceScore = 0;

  if (bestPattern && bestPattern.matchScore >= 0.7) {
    // High-confidence pattern match
    rootCause = bestPattern.pattern.rootCause;
    rootCauseCategory = bestPattern.pattern.category;
    analysisMethod = "hybrid";
    confidenceScore = Math.max(pathConfidence, bestPattern.matchScore);
  } else if (pathConfidence >= 0.6) {
    // Moderate confidence from timeline analysis
    rootCause = deriveRootCauseFromPath(criticalPath, allEvents);
    rootCauseCategory = categorizeRootCause(rootCause);
    analysisMethod = "timeline_analysis";
    confidenceScore = pathConfidence;
  } else if (bestPattern) {
    // Fallback to pattern with lower confidence
    rootCause = bestPattern.pattern.rootCause;
    rootCauseCategory = bestPattern.pattern.category;
    analysisMethod = "pattern_matching";
    confidenceScore = bestPattern.matchScore;
  }

  // 6. Extract affected services from events
  const affectedServices = extractAffectedServices(allEvents);

  // 7. Generate recommendations
  const recommendedActions = bestPattern
    ? bestPattern.pattern.remediation
    : generateGenericRecommendations(rootCauseCategory);

  return {
    id: `rca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    rootCause,
    rootCauseCategory,
    confidenceScore: Math.min(0.99, confidenceScore),
    criticalPath,
    pathConfidence,
    matchedPattern: bestPattern?.pattern || null,
    affectedServices,
    recommendedActions,
    analysisMethod,
    similarPastIncidents: bestPattern ? bestPattern.pattern.occurrences : 0,
    evidenceCount: allEvents.length,
  };
}

/**
 * Derive root cause description from critical path
 */
function deriveRootCauseFromPath(path: string[], events: TimelineEvent[]): string {
  if (path.length === 0) return "Unknown cause";

  // Look at first event in critical path
  const firstEvent = events.find((e) => e.id === path[0]);
  if (!firstEvent) return "Unknown cause";

  // Build narrative
  const narrative: string[] = [];

  for (let i = 0; i < Math.min(path.length, 3); i++) {
    const event = events.find((e) => e.id === path[i]);
    if (event) {
      narrative.push(event.description);
    }
  }

  return narrative.join(" → ");
}

/**
 * Categorize root cause
 */
function categorizeRootCause(rootCause: string): string {
  const lower = rootCause.toLowerCase();

  if (lower.includes("permission") || lower.includes("access") || lower.includes("deny")) {
    return "permission";
  }
  if (lower.includes("cost") || lower.includes("limit") || lower.includes("quota")) {
    return "resource_limit";
  }
  if (lower.includes("policy") || lower.includes("constraint")) {
    return "policy_constraint";
  }
  if (lower.includes("config") || lower.includes("setting")) {
    return "configuration";
  }
  if (lower.includes("data") || lower.includes("schema") || lower.includes("validation")) {
    return "data_quality";
  }
  if (lower.includes("external") || lower.includes("dependency") || lower.includes("timeout")) {
    return "dependency_failure";
  }

  return "unknown";
}

/**
 * Extract affected services from events
 */
function extractAffectedServices(events: TimelineEvent[]): string[] {
  const services = new Set<string>();

  for (const event of events) {
    const metadata = event.metadata || {};
    if (typeof metadata.service === "string") {
      services.add(metadata.service);
    }
    if (typeof metadata.api === "string") {
      services.add(`API: ${metadata.api}`);
    }
    if (Array.isArray(metadata.affected)) {
      metadata.affected.forEach((s: unknown) => {
        if (typeof s === "string") services.add(s);
      });
    }
  }

  return Array.from(services);
}

/**
 * Generate generic recommendations based on category
 */
function generateGenericRecommendations(category: string): string[] {
  const recommendations: Record<string, string[]> = {
    permission: [
      "Review user role assignments",
      "Check organization structure",
      "Verify API key scopes",
    ],
    resource_limit: [
      "Review resource consumption",
      "Implement rate limiting",
      "Optimize queries",
      "Scale capacity if needed",
    ],
    policy_constraint: [
      "Review active policies",
      "Check policy thresholds",
      "Update policy configuration if appropriate",
    ],
    configuration: [
      "Verify environment configuration",
      "Check configuration consistency",
      "Review recent config changes",
    ],
    data_quality: [
      "Add input validation",
      "Implement data sanitization",
      "Review schema",
    ],
    dependency_failure: [
      "Check external service status",
      "Verify network connectivity",
      "Implement retry logic",
    ],
    unknown: ["Enable debug logging", "Capture more detailed metrics", "Manual investigation needed"],
  };

  return recommendations[category] || recommendations.unknown;
}

/**
 * Fallback result when analysis fails
 */
function createFallbackResult(input: RCAInput, reason: string): RCAResult {
  return {
    id: `rca-fallback-${Date.now()}`,
    rootCause: `Unable to analyze: ${reason}`,
    rootCauseCategory: "unknown",
    confidenceScore: 0,
    criticalPath: [],
    pathConfidence: 0,
    matchedPattern: null,
    affectedServices: [],
    recommendedActions: [
      "Review incident logs manually",
      "Enable additional monitoring",
      "Collect more detailed metrics",
    ],
    analysisMethod: "timeline_analysis",
    similarPastIncidents: 0,
    evidenceCount: 0,
  };
}
