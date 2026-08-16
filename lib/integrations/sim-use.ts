import { createLogger } from '@/lib/logging/logger';

const logger = createLogger('sim-use');

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

export interface SIMUsageResult {
  ok: boolean;
  data?: SIMUsageData;
  error?: string;
  queryTime: number;
}

export interface SimUseConfig {
  apiEndpoint?: string;
  apiKey?: string;
  timeout?: number;
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
}

interface CacheEntry {
  data: SIMUsageData;
  expiresAt: number;
}

export class SimUseAdapter {
  private config: Required<SimUseConfig>;
  private cache: Map<string, CacheEntry>;
  private queryCount = 0;
  private lastQueryTime = 0;

  constructor(config: SimUseConfig = {}) {
    const apiKey = config.apiKey || process.env.SIM_USE_API_KEY || '';

    this.config = {
      apiEndpoint: config.apiEndpoint || process.env.SIM_USE_API_ENDPOINT || 'https://sim-use.line.biz/api/v1',
      apiKey,
      timeout: config.timeout || 10_000,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTtlSeconds: config.cacheTtlSeconds || 300,
    };
    this.cache = new Map();

    if (!this.config.apiKey) {
      logger.warn('SIM_USE_API_KEY not configured; integration will fail closed', { module: 'sim-use' });
    }
  }

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
      if (this.config.cacheEnabled && !options?.forceRefresh) {
        const cached = this.getCached(simId);
        if (cached) {
          logger.info('SIM usage query (cache hit)', {
            agentId: options?.agentId,
            userId: options?.userId,
            requestId: options?.requestId,
            frameId: simId,
          });
          return { ok: true, data: cached, queryTime: Date.now() - startTime };
        }
      }

      this.queryCount++;
      this.lastQueryTime = Date.now();

      const result = await this.fetchFromApi(simId);
      if (!result.ok || !result.data) {
        logger.warn('SIM usage query failed', {
          agentId: options?.agentId,
          userId: options?.userId,
          requestId: options?.requestId,
          frameId: simId,
        }, { error: result.error, simId });
        return { ok: false, error: result.error, queryTime: Date.now() - startTime };
      }

      if (this.config.cacheEnabled) {
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

      return { ok: true, data: result.data, queryTime: Date.now() - startTime };
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

  isDataThresholdReached(data: SIMUsageData, threshold = 80): boolean {
    return data.dataPercentage >= threshold;
  }

  getStats() {
    return {
      totalQueries: this.queryCount,
      lastQueryTime: this.lastQueryTime,
      cacheSize: this.cache.size,
      cacheEnabled: this.config.cacheEnabled,
    };
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('SIM usage cache cleared');
  }

  private async fetchFromApi(simId: string): Promise<SIMUsageResult> {
    if (!this.config.apiKey) {
      return { ok: false, error: 'SIM_USE_API_KEY_NOT_CONFIGURED', queryTime: 0 };
    }

    try {
      const url = `${this.config.apiEndpoint}/usage/${encodeURIComponent(simId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
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

      if (!json.simId || !Number.isFinite(json.dataUsageBytes) || !Number.isFinite(json.dataLimitBytes) || json.dataLimitBytes <= 0) {
        return { ok: false, error: 'SIM_USE_INVALID_RESPONSE', queryTime: 0 };
      }

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

      return { ok: true, data, queryTime: 0 };
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

export const simUseAdapter = new SimUseAdapter();
