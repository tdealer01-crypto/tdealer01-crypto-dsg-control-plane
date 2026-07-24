/**
 * Pattern-based RCA: match current incident against historical patterns
 */

export interface IncidentPattern {
  name: string;
  category: string;
  triggers: string[];
  rootCause: string;
  remediation: string[];
  occurrences: number;
  confidence: number;
}

export interface PatternMatch {
  pattern: IncidentPattern;
  matchScore: number; // 0-1
  matchedTriggers: string[];
  unmatchedTriggers: string[];
}

/**
 * Common incident patterns in DSG runtime
 */
export const COMMON_PATTERNS: IncidentPattern[] = [
  {
    name: "Cost Limit Exceeded",
    category: "resource_limit",
    triggers: ["metric_spike", "cost_anomaly", "policy_evaluation_high_risk"],
    rootCause: "Unoptimized query or excessive resource consumption",
    remediation: [
      "Optimize database queries",
      "Add caching layer",
      "Review resource allocation",
      "Set cost alerts at 70% threshold",
    ],
    occurrences: 12,
    confidence: 0.92,
  },
  {
    name: "Permission Denied",
    category: "permission",
    triggers: ["access_denied", "policy_blocked", "rbac_mismatch"],
    rootCause: "Insufficient permissions or role configuration",
    remediation: [
      "Review user role assignments",
      "Check organization structure",
      "Verify API key scopes",
      "Update RLS policies if needed",
    ],
    occurrences: 8,
    confidence: 0.87,
  },
  {
    name: "Dependency Failure",
    category: "dependency_failure",
    triggers: ["external_api_error", "timeout", "service_unavailable"],
    rootCause: "External service downtime or network connectivity",
    remediation: [
      "Check dependency status page",
      "Verify network connectivity",
      "Implement circuit breaker pattern",
      "Add fallback logic",
    ],
    occurrences: 15,
    confidence: 0.88,
  },
  {
    name: "Configuration Drift",
    category: "configuration",
    triggers: ["unexpected_behavior", "policy_mismatch", "env_variable_change"],
    rootCause: "Configuration not synchronized across environments",
    remediation: [
      "Sync configuration from source",
      "Use environment variable validation",
      "Enable config audit logging",
      "Automate config deployment",
    ],
    occurrences: 5,
    confidence: 0.78,
  },
  {
    name: "Data Quality Issue",
    category: "data_quality",
    triggers: ["validation_error", "data_anomaly", "schema_mismatch"],
    rootCause: "Invalid or malformed data in request/database",
    remediation: [
      "Add input validation",
      "Implement data sanitization",
      "Enable schema validation",
      "Add data quality checks",
    ],
    occurrences: 9,
    confidence: 0.82,
  },
];

/**
 * Match current incident against known patterns
 */
export function matchPatterns(
  triggers: string[],
  patterns: IncidentPattern[] = COMMON_PATTERNS
): PatternMatch[] {
  const matches: PatternMatch[] = [];

  for (const pattern of patterns) {
    const matchedTriggers = triggers.filter((t) => pattern.triggers.includes(t));
    const unmatchedTriggers = pattern.triggers.filter((t) => !triggers.includes(t));

    if (matchedTriggers.length > 0) {
      // Score based on trigger overlap and pattern confidence
      const triggerCoverage = matchedTriggers.length / pattern.triggers.length;
      const matchScore = (triggerCoverage * 0.7 + pattern.confidence * 0.3) * pattern.confidence;

      matches.push({
        pattern,
        matchScore,
        matchedTriggers,
        unmatchedTriggers,
      });
    }
  }

  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get best matching pattern
 */
export function getBestPattern(
  triggers: string[],
  patterns: IncidentPattern[] = COMMON_PATTERNS,
  minScore: number = 0.6
): PatternMatch | null {
  const matches = matchPatterns(triggers, patterns);
  const best = matches.find((m) => m.matchScore >= minScore);
  return best || null;
}

/**
 * Learn new pattern from incident
 */
export function createPatternFromIncident(
  triggers: string[],
  rootCause: string,
  category: string,
  name: string,
  remediation: string[]
): IncidentPattern {
  return {
    name,
    category,
    triggers,
    rootCause,
    remediation,
    occurrences: 1,
    confidence: 0.5, // Low initial confidence, increases with recurrence
  };
}

/**
 * Update pattern confidence based on successful matches
 */
export function reinforcePattern(
  pattern: IncidentPattern,
  success: boolean
): IncidentPattern {
  const updated = { ...pattern };
  updated.occurrences += 1;

  if (success) {
    // Increase confidence on successful match
    updated.confidence = Math.min(0.99, pattern.confidence + 0.05);
  } else {
    // Decrease confidence on failed match
    updated.confidence = Math.max(0.5, pattern.confidence - 0.1);
  }

  return updated;
}
