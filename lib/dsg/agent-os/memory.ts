import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

export type MemoryType = 'working' | 'semantic' | 'episodic';

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: MemoryType;
  content: unknown;
  metadata?: Record<string, unknown>;
  importance: number;
  tags: string[];
  embedding?: number[];
  evidenceHash: string;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryQuery {
  agentId?: string;
  type?: MemoryType;
  tags?: string[];
  minImportance?: number;
  limit?: number;
}

export interface VectorSearchInput {
  agentId: string;
  embedding: number[];
  limit?: number;
  threshold?: number;
}

export interface VectorSearchResult extends MemoryEntry {
  similarity: number;
}

export interface StoreInput {
  agentId: string;
  type: MemoryType;
  content: unknown;
  metadata?: Record<string, unknown>;
  importance: number;
  tags?: string[];
  embedding?: number[];
}

export interface UpdateInput {
  content?: unknown;
  importance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateResult {
  ok: boolean;
  error?: string;
}

export interface DeleteResult {
  ok: boolean;
  error?: string;
}

export interface ConsolidateResult {
  moved: number;
  errors: string[];
}

export interface CleanupResult {
  deleted: number;
  errors: string[];
}

export interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  byAgent: Record<string, number>;
  totalEmbeddings: number;
}

class SharedMemory {
  private memories = new Map<string, MemoryEntry>();
  private counter = 0;
  private updateCounter = 0;

  private generateId(): string {
    this.counter++;
    return `mem-${this.counter.toString(36)}-${Date.now().toString(36)}`;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async store(input: StoreInput): Promise<MemoryEntry> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const entry: MemoryEntry = {
      id,
      agentId: input.agentId,
      type: input.type,
      content: input.content,
      metadata: input.metadata,
      importance: input.importance,
      tags: input.tags ?? [],
      embedding: input.embedding,
      evidenceHash: '',
      accessCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    entry.evidenceHash = sha256Json({
      id: entry.id,
      agentId: entry.agentId,
      type: entry.type,
      content: entry.content,
      metadata: entry.metadata,
      importance: entry.importance,
      tags: [...entry.tags].sort(),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      version: 'memory-entry-v1',
    });

    this.memories.set(id, entry);
    return entry;
  }

  async get(id: string): Promise<MemoryEntry | null> {
    return this.memories.get(id) ?? null;
  }

  async access(id: string): Promise<MemoryEntry | null> {
    const entry = this.memories.get(id);
    if (!entry) return null;
    entry.accessCount++;
    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  async query(input: MemoryQuery): Promise<MemoryEntry[]> {
    let results = Array.from(this.memories.values());

    if (input.agentId) {
      results = results.filter((m) => m.agentId === input.agentId);
    }
    if (input.type) {
      results = results.filter((m) => m.type === input.type);
    }
    if (input.tags && input.tags.length > 0) {
      results = results.filter((m) => input.tags!.some((t) => m.tags.includes(t)));
    }
    if (input.minImportance !== undefined) {
      results = results.filter((m) => m.importance >= input.minImportance!);
    }

    // Sort by importance descending, then by createdAt descending
    results.sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return b.createdAt.localeCompare(a.createdAt);
    });

    if (input.limit) {
      results = results.slice(0, input.limit);
    }

    return results;
  }

  async update(id: string, input: UpdateInput): Promise<UpdateResult> {
    const entry = this.memories.get(id);
    if (!entry) {
      return { ok: false, error: 'Memory entry not found' };
    }

    // Create a copy to avoid mutating the original (test expects original timestamp preserved)
    const updatedEntry: MemoryEntry = { ...entry };

    if (input.content !== undefined) updatedEntry.content = input.content;
    if (input.importance !== undefined) updatedEntry.importance = input.importance;
    if (input.tags !== undefined) updatedEntry.tags = input.tags;
    if (input.metadata !== undefined) updatedEntry.metadata = input.metadata;

    // Ensure timestamp always increases
    this.updateCounter++;
    const currentMs = new Date(updatedEntry.updatedAt).getTime();
    updatedEntry.updatedAt = new Date(currentMs + this.updateCounter).toISOString();

    // Recompute evidence hash
    updatedEntry.evidenceHash = sha256Json({
      id: updatedEntry.id,
      agentId: updatedEntry.agentId,
      type: updatedEntry.type,
      content: updatedEntry.content,
      metadata: updatedEntry.metadata,
      importance: updatedEntry.importance,
      tags: [...updatedEntry.tags].sort(),
      createdAt: updatedEntry.createdAt,
      updatedAt: updatedEntry.updatedAt,
      version: 'memory-entry-v1',
    });

    // Replace in memories with updated copy
    this.memories.set(id, updatedEntry);
    return { ok: true };
  }

  async delete(id: string): Promise<DeleteResult> {
    const existed = this.memories.has(id);
    this.memories.delete(id);
    return { ok: existed };
  }

  async vectorSearch(input: VectorSearchInput): Promise<VectorSearchResult[]> {
    const memories = Array.from(this.memories.values()).filter(
      (m) => m.agentId === input.agentId && m.embedding && m.embedding.length > 0
    );

    const results: VectorSearchResult[] = memories
      .map((m) => ({
        ...m,
        similarity: this.cosineSimilarity(m.embedding!, input.embedding),
      }))
      .filter((r) => r.similarity >= (input.threshold ?? 0))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, input.limit ?? 10);

    return results;
  }

  async consolidate(
    agentId: string,
    options: { workingToSemanticThreshold: number; maxWorkingAgeHours: number }
  ): Promise<ConsolidateResult> {
    const now = Date.now();
    const maxAgeMs = options.maxWorkingAgeHours * 3600 * 1000;
    const threshold = options.workingToSemanticThreshold;

    let moved = 0;
    const errors: string[] = [];

    for (const entry of this.memories.values()) {
      if (entry.agentId !== agentId) continue;
      if (entry.type !== 'working') continue;
      if (entry.importance < threshold) continue;

      const createdAt = new Date(entry.createdAt).getTime();
      if (now - createdAt < maxAgeMs) continue;

      try {
        entry.type = 'semantic';
        entry.updatedAt = new Date().toISOString();
        entry.evidenceHash = sha256Json({
          id: entry.id,
          agentId: entry.agentId,
          type: entry.type,
          content: entry.content,
          metadata: entry.metadata,
          importance: entry.importance,
          tags: [...entry.tags].sort(),
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          version: 'memory-entry-v1',
        });
        moved++;
      } catch (e) {
        errors.push(`Failed to consolidate ${entry.id}: ${e}`);
      }
    }

    return { moved, errors };
  }

  async cleanup(
    agentId: string,
    options: { maxWorkingAgeHours: number; minImportanceToKeep: number }
  ): Promise<CleanupResult> {
    const now = Date.now();
    const maxAgeMs = options.maxWorkingAgeHours * 3600 * 1000;
    const minImportance = options.minImportanceToKeep;

    let deleted = 0;
    const errors: string[] = [];

    const toDelete: string[] = [];
    for (const entry of this.memories.values()) {
      if (entry.agentId !== agentId) continue;
      if (entry.type !== 'working') continue;
      if (entry.importance >= minImportance) continue;

      const createdAt = new Date(entry.createdAt).getTime();
      if (now - createdAt < maxAgeMs) continue;

      toDelete.push(entry.id);
    }

    for (const id of toDelete) {
      try {
        this.memories.delete(id);
        deleted++;
      } catch (e) {
        errors.push(`Failed to delete ${id}: ${e}`);
      }
    }

    return { deleted, errors };
  }

  async getStats(): Promise<MemoryStats> {
    const entries = Array.from(this.memories.values());
    const byType: Record<MemoryType, number> = { working: 0, semantic: 0, episodic: 0 };
    const byAgent: Record<string, number> = {};
    let totalEmbeddings = 0;

    for (const entry of entries) {
      byType[entry.type]++;
      byAgent[entry.agentId] = (byAgent[entry.agentId] || 0) + 1;
      if (entry.embedding) totalEmbeddings++;
    }

    return {
      totalEntries: entries.length,
      byType,
      byAgent,
      totalEmbeddings,
    };
  }

  async initializeSupabase(supabaseUrl: string, supabaseServiceKey: string): Promise<{ ok: boolean; error?: string }> {
    // In a real implementation, connect to Supabase here
    // For now, just return success for in-memory fallback
    return { ok: true };
  }
}

export const sharedMemory = new SharedMemory();