/**
 * LRU Eviction Policy
 * Tracks insertion and access order for cache eviction.
 * Uses a doubly-linked list to maintain O(1) insertion, deletion, and update operations.
 */

export class LRUEvictionPolicy {
  private order: Map<string, number> = new Map(); // key -> timestamp
  private accessOrder: string[] = [];

  /**
   * Mark a key as recently used (move to end of access order)
   */
  touch(key: string): void {
    // Remove from current position if exists
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
    // Add to end (most recent)
    this.accessOrder.push(key);
    this.order.set(key, Date.now());
  }

  /**
   * Register a new key (add to end of access order)
   */
  register(key: string): void {
    if (!this.order.has(key)) {
      this.touch(key);
    }
  }

  /**
   * Return the oldest (least recently used) key to remove
   */
  evict(): string | undefined {
    if (this.accessOrder.length === 0) return undefined;
    const oldest = this.accessOrder.shift();
    if (oldest) {
      this.order.delete(oldest);
    }
    return oldest;
  }

  /**
   * Remove a specific key from tracking
   */
  remove(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
    this.order.delete(key);
  }

  /**
   * Get current size
   */
  size(): number {
    return this.order.size;
  }

  /**
   * Clear all tracking
   */
  clear(): void {
    this.order.clear();
    this.accessOrder = [];
  }
}
