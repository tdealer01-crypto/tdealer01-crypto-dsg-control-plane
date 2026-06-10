import { createHash } from 'crypto';
import type { SafeDomCommand, SafeElementManifest } from '@/lib/dsg/safe-dom/types';

/**
 * HeuristicMatch: Fast-path matching using exact command hash
 * Cost: O(1) lookup, <5ms
 */
interface HeuristicEntry {
  hash: string; // = hashCommand(frameId|elementId|operation|value|key)
  manifestId: string;
  manifest: SafeElementManifest[];
  hitCount: number;
  lastUsedAt: number;
}

/**
 * EmbeddingMatch: Fallback matching using lightweight feature vectors
 * Cost: O(n) cosine similarity (n = cached entries), <50ms
 */
interface EmbeddingEntry {
  contractHash: string;
  commandHash: string;
  features: number[]; // Lightweight feature encoding of command
  manifestId: string;
}

type MatchSource = 'heuristic' | 'embedding' | 'miss';

export interface HarmonyMatchResult {
  manifest: SafeElementManifest[] | null;
  source: MatchSource;
  latency: number; // milliseconds
  hitCount?: number; // For heuristic hits only
}

const HEURISTIC_TTL_MS = 5 * 60 * 1000; // Entries older than 5 min are stale
const EMBEDDING_SIMILARITY_THRESHOLD = 0.85;
const MAX_HEURISTIC_ENTRIES = 5000;
const MAX_EMBEDDING_ENTRIES = 2000;

/**
 * Harmony Engine: hybrid semantic matching for manifest caching.
 * Tier 1: exact command-hash lookup (fast path).
 * Tier 2: feature-vector cosine similarity (fallback).
 * Combined target: >80% cache hit rate under concurrent load.
 *
 * Note: per-process state. On serverless this is per-instance, so stats
 * reflect the instance serving the request, not a global aggregate.
 */
export class HarmonyEngine {
  private heuristicIndex = new Map<string, HeuristicEntry>();
  private embeddingIndex: EmbeddingEntry[] = [];
  private manifestStore = new Map<string, SafeElementManifest[]>();

  private stats = {
    heuristicHits: 0,
    embeddingHits: 0,
    misses: 0,
    totalLatency: 0
  };

  /**
   * Deterministic command hash from the real SafeDomCommand fields.
   */
  private hashCommand(cmd: SafeDomCommand): string {
    const key = `${cmd.frameId}|${cmd.elementId}|${cmd.operation}|${cmd.value ?? ''}|${cmd.key ?? ''}`;
    return createHash('sha256').update(key).digest('hex').slice(0, 16);
  }

  /**
   * Lightweight feature vector from command semantics.
   * Not an ML embedding — deterministic features good enough for
   * near-duplicate detection across frames/sessions.
   */
  private encodeCommand(cmd: SafeDomCommand): number[] {
    const opMap: Record<string, number> = { click: 1, type: 2, scroll: 3, press: 4 };
    const elementHash = createHash('sha256').update(cmd.elementId).digest();
    const valueLen = cmd.value?.length ?? 0;

    return [
      (opMap[cmd.operation] ?? 0) * 10, // Operation dominates similarity
      elementHash[0], // Element identity features
      elementHash[1],
      valueLen % 97, // Value shape (length bucket)
      cmd.key ? cmd.key.charCodeAt(0) % 97 : 0
    ];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  /**
   * Tier 1: exact hash match. Cost <5ms.
   */
  private matchWithHeuristics(cmd: SafeDomCommand): HeuristicEntry | null {
    const hash = this.hashCommand(cmd);
    const entry = this.heuristicIndex.get(hash);
    if (!entry) return null;

    if (Date.now() - entry.lastUsedAt > HEURISTIC_TTL_MS) {
      this.heuristicIndex.delete(hash);
      return null;
    }

    entry.hitCount++;
    entry.lastUsedAt = Date.now();
    return entry;
  }

  /**
   * Tier 2: feature-similarity match. Cost O(n), <50ms for n<=2000.
   */
  private matchWithEmbeddings(cmd: SafeDomCommand): SafeElementManifest[] | null {
    if (this.embeddingIndex.length === 0) return null;

    const features = this.encodeCommand(cmd);
    let best: EmbeddingEntry | null = null;
    let bestScore = EMBEDDING_SIMILARITY_THRESHOLD;

    for (const entry of this.embeddingIndex) {
      const score = this.cosineSimilarity(features, entry.features);
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    if (!best) return null;
    return this.manifestStore.get(best.manifestId) ?? null;
  }

  /**
   * Main lookup: heuristic first, embeddings as fallback.
   */
  findBestMatch(cmd: SafeDomCommand): HarmonyMatchResult {
    const t0 = performance.now();

    const heuristic = this.matchWithHeuristics(cmd);
    if (heuristic) {
      const latency = performance.now() - t0;
      this.stats.heuristicHits++;
      this.stats.totalLatency += latency;
      return { manifest: heuristic.manifest, source: 'heuristic', latency, hitCount: heuristic.hitCount };
    }

    const fromEmbedding = this.matchWithEmbeddings(cmd);
    if (fromEmbedding) {
      const latency = performance.now() - t0;
      this.stats.embeddingHits++;
      this.stats.totalLatency += latency;
      // Promote to heuristic index so the next identical command takes the fast path
      this.addToIndex(cmd, fromEmbedding);
      return { manifest: fromEmbedding, source: 'embedding', latency };
    }

    const latency = performance.now() - t0;
    this.stats.misses++;
    this.stats.totalLatency += latency;
    return { manifest: null, source: 'miss', latency };
  }

  /**
   * Register a command → manifest mapping (heuristic + embedding).
   * Called after an on-demand fetch resolves, or when building an index
   * from a delegation contract.
   */
  addToIndex(cmd: SafeDomCommand, manifest: SafeElementManifest[], contractHash = 'adhoc'): void {
    const hash = this.hashCommand(cmd);
    const manifestId = `${contractHash}:${hash}`;

    this.manifestStore.set(manifestId, manifest);

    if (!this.heuristicIndex.has(hash)) {
      // Evict oldest entry when full (Map preserves insertion order)
      if (this.heuristicIndex.size >= MAX_HEURISTIC_ENTRIES) {
        const oldest = this.heuristicIndex.keys().next().value;
        if (oldest !== undefined) this.heuristicIndex.delete(oldest);
      }
      this.heuristicIndex.set(hash, {
        hash,
        manifestId,
        manifest,
        hitCount: 0,
        lastUsedAt: Date.now()
      });
    }

    if (this.embeddingIndex.length >= MAX_EMBEDDING_ENTRIES) {
      this.embeddingIndex.shift();
    }
    this.embeddingIndex.push({
      contractHash,
      commandHash: hash,
      features: this.encodeCommand(cmd),
      manifestId
    });
  }

  /**
   * Build index from a delegation contract's known commands.
   */
  buildHybridIndex(
    contractHash: string,
    commands: SafeDomCommand[],
    manifests: SafeElementManifest[][]
  ): void {
    commands.forEach((cmd, i) => {
      const manifest = manifests[i];
      if (manifest) this.addToIndex(cmd, manifest, contractHash);
    });
  }

  /**
   * Invalidate all entries for a contract when its policy changes.
   */
  invalidateOnPolicyChange(contractHash: string): void {
    const prefix = `${contractHash}:`;
    const removedManifestIds = new Set<string>();

    for (const id of this.manifestStore.keys()) {
      if (id.startsWith(prefix)) {
        this.manifestStore.delete(id);
        removedManifestIds.add(id);
      }
    }
    for (const [hash, entry] of this.heuristicIndex.entries()) {
      if (removedManifestIds.has(entry.manifestId)) this.heuristicIndex.delete(hash);
    }
    this.embeddingIndex = this.embeddingIndex.filter((e) => e.contractHash !== contractHash);
  }

  getStats() {
    const total = this.stats.heuristicHits + this.stats.embeddingHits + this.stats.misses;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return {
      totalLookups: total,
      heuristicHits: this.stats.heuristicHits,
      embeddingHits: this.stats.embeddingHits,
      misses: this.stats.misses,
      heuristicRate: pct(this.stats.heuristicHits),
      embeddingRate: pct(this.stats.embeddingHits),
      hitRate: pct(this.stats.heuristicHits + this.stats.embeddingHits),
      avgLatency: total > 0 ? Math.round((this.stats.totalLatency / total) * 100) / 100 : 0,
      indexSize: {
        heuristic: this.heuristicIndex.size,
        embedding: this.embeddingIndex.length
      }
    };
  }

  clear(): void {
    this.heuristicIndex.clear();
    this.embeddingIndex = [];
    this.manifestStore.clear();
    this.stats = { heuristicHits: 0, embeddingHits: 0, misses: 0, totalLatency: 0 };
  }
}

// Global harmony engine instance (per process/instance)
export const harmonyEngine = new HarmonyEngine();
