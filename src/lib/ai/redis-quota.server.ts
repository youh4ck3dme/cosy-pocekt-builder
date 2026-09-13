// Note: redis package must be installed (npm install redis)
// Using dynamic import to avoid build-time dependency issues
import type { QuotaStore, QuotaBucket } from './generate-quota';
import { createClient } from 'redis';

interface RedisQuotaBucket {
  hits: string; // JSON array of timestamps
  day: string;
  dayCount: number;
}

/**
 * Redis-based quota store for distributed rate limiting
 * Uses Redis for persistence across container restarts
 */
export class RedisQuotaStore implements QuotaStore {
  private client: ReturnType<typeof createClient> | null = null;
  private readonly prefix: string;
  private connected = false;

  constructor(prefix: string = 'quota') {
    this.prefix = prefix;
  }

  async connect(): Promise<boolean> {
    if (this.client) {
      return this.connected;
    }

    const redisUrl = process.env.REDIS_URL || process.env.REDIS_MODULE_URL || 'redis://localhost:6379';
    
    try {
      this.client = createClient({ url: redisUrl });
      
      // Handle connection errors
      this.client.on('error', (err: unknown) => {
        console.error('[RedisQuotaStore] Connection error:', err);
        this.connected = false;
      });
      
      await this.client.connect();
      this.connected = true;
      console.log('[RedisQuotaStore] Connected to Redis');
      return true;
    } catch (error) {
      console.error('[RedisQuotaStore] Failed to connect to Redis:', error);
      this.connected = false;
      // Fall back to in-memory store
      return false;
    }
  }

  async ensureConnected(): Promise<boolean> {
    if (!this.client) {
      return await this.connect();
    }
    if (!this.connected) {
      try {
        // In Redis v4, ping returns "PONG" string
        const pong = await this.client.ping();
        if (pong === 'PONG') {
          this.connected = true;
        }
      } catch {
        // Try to reconnect
        this.connected = await this.connect();
      }
    }
    return this.connected;
  }

  async get(key: string): Promise<QuotaBucket | undefined> {
    await this.ensureConnected();
    
    if (!this.connected || !this.client) {
      // Return undefined to signal fallback to in-memory
      return undefined;
    }

    try {
      const redisKey = `${this.prefix}:${key}`;
      // In Redis v4, use the command API
      const data = await this.client.hGetAll(redisKey) as Record<string, string>;
      
      if (!data || !data.hits) {
        return undefined;
      }

      const bucket: RedisQuotaBucket = {
        hits: data.hits || '[]',
        day: data.day || '',
        dayCount: parseInt(data.dayCount || '0', 10) || 0
      };

      return {
        hits: JSON.parse(bucket.hits),
        day: bucket.day,
        dayCount: bucket.dayCount
      };
    } catch (error) {
      console.error('[RedisQuotaStore] Failed to get quota:', error);
      return undefined;
    }
  }

  async set(key: string, value: QuotaBucket): Promise<void> {
    await this.ensureConnected();
    
    if (!this.connected || !this.client) {
      // Silent failure - this shouldn't block the request
      return;
    }

    try {
      const redisKey = `${this.prefix}:${key}`;
      // In Redis v4, hSet accepts an object
      await this.client.hSet(redisKey, {
        hits: JSON.stringify(value.hits),
        day: value.day,
        dayCount: String(value.dayCount)
      });
      // Set TTL to 24 hours to automatically clean up old entries
      await this.client.expire(redisKey, 86400);
    } catch (error) {
      console.error('[RedisQuotaStore] Failed to set quota:', error);
    }
  }

  clear(): void {
    // Can't easily clear all Redis keys without scanning
    // This is mainly for testing
    console.warn('[RedisQuotaStore] clear() not implemented for Redis');
  }

  async destroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // Ignore disconnect errors
      }
      this.client = null;
      this.connected = false;
    }
  }
}

// Singleton instance
let redisQuotaStore: RedisQuotaStore | null = null;

export function getRedisQuotaStore(): RedisQuotaStore {
  if (!redisQuotaStore) {
    redisQuotaStore = new RedisQuotaStore();
  }
  return redisQuotaStore;
}

// Reset for testing
export function resetRedisQuotaStore(): void {
  if (redisQuotaStore) {
    // Note: We don't actually destroy the connection in tests
    // to avoid repeated connection attempts
  }
}
