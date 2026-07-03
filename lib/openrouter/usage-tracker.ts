/**
 * OpenRouter Usage Tracker
 * Tracks API usage for billing and quota management
 */

export interface UsageRecord {
  timestamp: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byModel: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

const MODEL_COSTS: Record<string, number> = {
  'anthropic/claude-3.5-haiku': 0.8 / 1000,
  'mistralai/mistral-7b-instruct': 0.14 / 1000,
  'meta-llama/llama-2-7b-chat': 0.1 / 1000,
  'microsoft/phi-2': 0.2 / 1000,
  'jondurbin/airoboros-l2-70b': 0.7 / 1000,
};

export class UsageTracker {
  private records: UsageRecord[] = [];
  private stats: UsageStats = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    byModel: {},
  };

  /**
   * Track a completed API call
   */
  track(model: string, promptTokens: number, completionTokens: number): void {
    const totalTokens = promptTokens + completionTokens;
    const costPerToken = MODEL_COSTS[model] || 0.001; // fallback cost
    const costUsd = totalTokens * costPerToken;

    const record: UsageRecord = {
      timestamp: Date.now(),
      model,
      promptTokens,
      completionTokens,
      totalTokens,
      costUsd,
    };

    this.records.push(record);

    // Update stats
    this.stats.totalRequests++;
    this.stats.totalTokens += totalTokens;
    this.stats.totalCost += costUsd;

    if (!this.stats.byModel[model]) {
      this.stats.byModel[model] = {
        requests: 0,
        tokens: 0,
        cost: 0,
      };
    }

    this.stats.byModel[model].requests++;
    this.stats.byModel[model].tokens += totalTokens;
    this.stats.byModel[model].cost += costUsd;
  }

  /**
   * Get current statistics
   */
  getStats(): UsageStats {
    return { ...this.stats };
  }

  /**
   * Get records from last N minutes
   */
  getRecentRecords(minutesAgo: number): UsageRecord[] {
    const cutoffTime = Date.now() - minutesAgo * 60 * 1000;
    return this.records.filter((r) => r.timestamp >= cutoffTime);
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.records = [];
    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byModel: {},
    };
  }

  /**
   * Export usage data for persistence
   */
  export(): {
    records: UsageRecord[];
    stats: UsageStats;
    exportedAt: string;
  } {
    return {
      records: [...this.records],
      stats: { ...this.stats },
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import usage data from persistence
   */
  import(data: {
    records: UsageRecord[];
    stats: UsageStats;
  }): void {
    this.records = [...data.records];
    this.stats = { ...data.stats };
  }
}

// Singleton instance
let trackerInstance: UsageTracker | null = null;

export function getUsageTracker(): UsageTracker {
  if (!trackerInstance) {
    trackerInstance = new UsageTracker();
  }
  return trackerInstance;
}
