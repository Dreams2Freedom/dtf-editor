import { useState, useCallback, useEffect, DependencyList } from 'react';

// Simple in-memory cache with TTL support
interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<unknown>>();
  private maxSize = 100; // Maximum number of items to cache

  set<T>(key: string, value: T, ttlMs = 5 * 60 * 1000): void {
    // Default 5 minutes
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired items before returning size
    this.cleanExpired();
    return this.cache.size;
  }

  private cleanExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache key generators
export const cacheKeys = {
  userProfile: (userId: string) => `user_profile_${userId}`,
  processingHistory: (userId: string, limit: number) =>
    `processing_history_${userId}_${limit}`,
  accountInfo: (service: string) => `account_info_${service}`,
  imageMetadata: (imageUrl: string) => `image_metadata_${imageUrl}`,
};

// Cached fetch wrapper
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 5 * 60 * 1000 // Default 5 minutes
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache result
  try {
    const result = await fetcher();
    cache.set(key, result, ttlMs);
    return result;
  } catch (error) {
    // Don't cache errors
    throw error;
  }
}

// React hook for cached data
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: DependencyList = [],
  ttlMs = 5 * 60 * 1000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await cachedFetch(key, fetcher, ttlMs);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttlMs]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    cache.delete(key);
    fetchData();
  }, [key, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
