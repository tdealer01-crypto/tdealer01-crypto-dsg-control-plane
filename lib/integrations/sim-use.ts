import { createLogger } from '@/lib/logging/logger';

const logger = createLogger('sim-use');

/**
 * SIM Usage data from LINE sim-use.
 * Tracks mobile data, call minutes, and SMS usage.
 */
export interface SIMUsageData {
  simId: string;
  phoneNumber?: string;
  dataUsageBytes: number;
  dataLimitBytes: number;
  dataPercentage: number;
  callMinutesUsed: number;
  callMinutesLimit: number;
  smsUsed: number;
  smsLimit: number;
  lastUpdated: string;
  expiresAt?: string;
  status: 'active' | 'inactive' | 'suspended';
}

/**
 * Query result from sim-use.
 */
export interface SIMUsageResult {
  ok: boolean;
  data?: SIMUsageData;
  error?: string;
  queryTime: number;
}

/**
 * Configuration for sim-use integration.
 */
export interface SimUseConfig {
  apiEndpoint?: string;
  apiKey?: string;
  timeout?: number;
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
}

/**
 * SIM Usage query cache entry.
 */
interface CacheEntry {
  data: SIMUsageData;
  expiresAt: number;
}

/**
 * Adapter for LINE sim-use integration.
 *
 * Provides:
 * - Query SIM card usage (data, calls, SMS)
 * - Caching to reduce API calls
 * - Audit logging for compliance
 * - Rate limiting support
 */
export class SimUseAdapter {
  private config: Required<SimUseConfig>;
  private cache: Map<string, CacheEntry>;
  private queryCount: number = 0;
  private lastQueryTime: number = 0;

  constructor(config: SimUseConfig = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || process.env.SIM_USE_API_ENDPOINT || 'https://sim-use.line.biz/api/v1',
      apiKey: config.apiKey || process.env.SIM_USE_API_KEY || '',
      timeout: config.timeout || 10_000,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTtlSeconds: config.cacheTtlSeconds || 300, // 5 minutes default
    };
    this.cache = new Map();

    if (!this.config.apiKey) {
      logger.warn('SIM_USE_API_KEY not configured', { module: 'sim-use' });
    }
  }

  /**
   * Query SIM usage for a specific phone number or SIM ID.
   *
   * @param simId - SIM card identifier (phone number or device ID)
   * @param options - Query options (agentId, userId, etc. for audit trail)
   * @returns SIMUsageResult with usage data or error
   */
  async queryUsage(
    simId: string,
    options?: {
      agentId?: string;
      userId?: string;
      forceRefresh?: boolean;
      requestId?: string;
    }
  ): Promise<SIMUsageResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (this.config.cacheEnabled && !options?.forceRefresh) {
        const cached = this.getCached(simId);
        if (cached) {
          logger.info('SIM usage query (cache hit)', {
            agentId: options?.agentId,
            userId: options?.userId,
            requestId: options?.requestId,
            frameId: simId,
          });
          return {
            ok: true,
            data: cached,
            queryTime: Date.now() - startTime,
          };
        }
      }

      // Query API
      this.queryCount++;
      this.lastQueryTime = Date.now();

      logger.debug('Querying SIM usage from sim-use API', {
        agentId: options?.agentId,
        requestId: options?.requestId,
        frameId: simId,
      });

      const result = await this.fetchFromApi(simId);

      if (!result.ok) {
        logger.warn('SIM usage query failed', {
          agentId: options?.agentId,
          userId: options?.userId,
          requestId: options?.requestId,
          frameId: simId,
        }, {
          error: result.error,
          simId,
        });
        return {
          ok: false,
          error: result.error,
          queryTime: Date.now() - startTime,
        };
      }

      // Cache the result
      if (this.config.cacheEnabled && result.data) {
        this.setCached(simId, result.data);
      }

      logger.info('SIM usage query succeeded', {
        agentId: options?.agentId,
        userId: options?.userId,
        requestId: options?.requestId,
        frameId: simId,
      }, {
        dataPercentage: result.data.dataPercentage,
        status: result.data.status,
        simId: result.data.simId,
      });

      return {
        ok: true,
        data: result.data,
        queryTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error(
        'Unexpected error in SIM usage query',
        error instanceof Error ? error : new Error(String(error)),
        {
          agentId: options?.agentId,
          userId: options?.userId,
          requestId: options?.requestId,
          frameId: simId,
        }
      );

      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if SIM usage has reached warning threshold.
   */
  isDataThresholdReached(
    data: SIMUsageData,
    threshold: number = 80
  ): boolean {
    return data.dataPercentage >= threshold;
  }

  /**
   * Get query statistics for auditing.
   */
  getStats() {
    return {
      totalQueries: this.queryCount,
      lastQueryTime: this.lastQueryTime,
      cacheSize: this.cache.size,
      cacheEnabled: this.config.cacheEnabled,
    };
  }

  /**
   * Clear cache (for testing or maintenance).
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('SIM usage cache cleared');
  }

  /**
   * Fetch SIM usage from the API.
   * Mock implementation - replace with real API call.
   */
  private async fetchFromApi(simId: string): Promise<SIMUsageResult> {
    try {
      const url = `${this.config.apiEndpoint}/usage/${encodeURIComponent(simId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        return {
          ok: false,
          error: `API error: ${response.status} ${response.statusText}`,
          queryTime: 0,
        };
      }

      const json = (await response.json()) as {
        simId: string;
        phoneNumber?: string;
        dataUsageBytes: number;
        dataLimitBytes: number;
        callMinutesUsed: number;
        callMinutesLimit: number;
        smsUsed: number;
        smsLimit: number;
        lastUpdated: string;
        expiresAt?: string;
        status: 'active' | 'inactive' | 'suspended';
      };

      const data: SIMUsageData = {
        simId: json.simId,
        phoneNumber: json.phoneNumber,
        dataUsageBytes: json.dataUsageBytes,
        dataLimitBytes: json.dataLimitBytes,
        dataPercentage: Math.round((json.dataUsageBytes / json.dataLimitBytes) * 100),
        callMinutesUsed: json.callMinutesUsed,
        callMinutesLimit: json.callMinutesLimit,
        smsUsed: json.smsUsed,
        smsLimit: json.smsLimit,
        lastUpdated: json.lastUpdated,
        expiresAt: json.expiresAt,
        status: json.status,
      };

      return {
        ok: true,
        data,
        queryTime: 0,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Network error',
        queryTime: 0,
      };
    }
  }

  private getCached(simId: string): SIMUsageData | null {
    const entry = this.cache.get(simId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(simId);
      return null;
    }
    return entry.data;
  }

  private setCached(simId: string, data: SIMUsageData): void {
    this.cache.set(simId, {
      data,
      expiresAt: Date.now() + this.config.cacheTtlSeconds * 1000,
    });
  }
}

/**
 * Global sim-use adapter instance.
 */
export const simUseAdapter = new SimUseAdapter();
