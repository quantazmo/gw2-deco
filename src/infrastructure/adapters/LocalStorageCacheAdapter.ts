/**
 * LocalStorageCacheAdapter
 * 
 * Encapsulates caching strategy using browser localStorage.
 * Supports different cache durations per item type and automatic expiration.
 */

interface LocalStorageCacheOptions {
    defaultTTL?: number;
    storagePrefix?: string;
    itemTTLs?: Record<string, number>;
}

interface CacheEnvelope {
    value: unknown;
    timestamp: number;
    ttl: number;
}

interface CacheStats {
    itemCount: number;
    expiredCount: number;
    totalSizeBytes: number;
    totalSizeKB: string;
}

export class LocalStorageCacheAdapter {
    private readonly defaultTTL: number;
    private readonly storagePrefix: string;
    private readonly itemTTLs: Record<string, number>;

    constructor(options: LocalStorageCacheOptions = {}) {
        this.defaultTTL = options.defaultTTL || 3600; // 1 hour default
        this.storagePrefix = options.storagePrefix || 'gw2-cache';
        this.itemTTLs = options.itemTTLs || {}; // Map of item types to TTL in seconds
    }

    /**
     * Get a cached item
     * @param {string} key - The cache key
    * @returns {Promise<unknown|null>} The cached value, or null if expired or not found
     */
    async get(key: string): Promise<unknown | null> {
        try {
            const fullKey = this._getFullKey(key);
            const cached = localStorage.getItem(fullKey);

            if (!cached) {
                return null;
            }

            const wrapper = JSON.parse(cached) as CacheEnvelope;
            const age = (Date.now() - wrapper.timestamp) / 1000; // Age in seconds

            if (age > wrapper.ttl) {
                // Cache expired, remove it
                localStorage.removeItem(fullKey);
                return null;
            }

            return wrapper.value;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to get cache item '${key}': ${message}`);
            return null;
        }
    }

    /**
     * Set a cached item
     * @param {string} key - The cache key
    * @param {unknown} value - The value to cache
     * @param {number} ttl - Optional: Time to live in seconds (uses defaultTTL if not specified)
     * @returns {Promise<void>}
     */
    async set(key: string, value: unknown, ttl: number | null = null): Promise<void> {
        try {
            const fullKey = this._getFullKey(key);
            const ttlSeconds = ttl !== null ? ttl : this._getTTLForKey(key);

            const wrapper = {
                value,
                timestamp: Date.now(),
                ttl: ttlSeconds
            };

            localStorage.setItem(fullKey, JSON.stringify(wrapper));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to set cache item '${key}': ${message}`);
            // Don't throw - cache failures shouldn't crash the app
        }
    }

    /**
     * Delete a cached item
     * @param {string} key - The cache key
     * @returns {Promise<void>}
     */
    async delete(key: string): Promise<void> {
        try {
            const fullKey = this._getFullKey(key);
            localStorage.removeItem(fullKey);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to delete cache item '${key}': ${message}`);
        }
    }

    /**
     * Check if a cache item exists and is valid
     * @param {string} key - The cache key
     * @returns {Promise<boolean>} True if item exists and is not expired
     */
    async exists(key: string): Promise<boolean> {
        const value = await this.get(key);
        return value !== null;
    }

    /**
     * Clear all cache items
     * @returns {Promise<void>}
     */
    async clear(): Promise<void> {
        try {
            const keys = Object.keys(localStorage);
            const prefix = `${this.storagePrefix}-`;

            for (const key of keys) {
                if (key.startsWith(prefix)) {
                    localStorage.removeItem(key);
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to clear cache: ${message}`);
        }
    }

    /**
     * Clear expired items from cache
     * @returns {Promise<void>}
     */
    async clearExpired(): Promise<void> {
        try {
            const keys = Object.keys(localStorage);
            const prefix = `${this.storagePrefix}-`;

            for (const key of keys) {
                if (key.startsWith(prefix)) {
                    const cached = localStorage.getItem(key);
                    if (cached) {
                        const wrapper = JSON.parse(cached) as CacheEnvelope;
                        const age = (Date.now() - wrapper.timestamp) / 1000;

                        if (age > wrapper.ttl) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to clear expired cache items: ${message}`);
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<object>} Cache stats (itemCount, totalSize, etc.)
     */
    async getStats(): Promise<CacheStats> {
        try {
            const keys = Object.keys(localStorage);
            const prefix = `${this.storagePrefix}-`;
            let totalSize = 0;
            let itemCount = 0;
            let expiredCount = 0;

            for (const key of keys) {
                if (key.startsWith(prefix)) {
                    itemCount++;
                    const cached = localStorage.getItem(key);
                    if (cached) {
                        totalSize += cached.length;
                        const wrapper = JSON.parse(cached) as CacheEnvelope;
                        const age = (Date.now() - wrapper.timestamp) / 1000;

                        if (age > wrapper.ttl) {
                            expiredCount++;
                        }
                    }
                }
            }

            return {
                itemCount,
                expiredCount,
                totalSizeBytes: totalSize,
                totalSizeKB: (totalSize / 1024).toFixed(2)
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`Failed to get cache stats: ${message}`);
            return {
                itemCount: 0,
                expiredCount: 0,
                totalSizeBytes: 0,
                totalSizeKB: '0'
            };
        }
    }

    /**
     * Set custom TTL for a specific item type/prefix
     * @param {string} itemType - The item type (e.g., 'map', 'layout')
     * @param {number} ttlSeconds - Time to live in seconds
     */
    setItemTTL(itemType: string, ttlSeconds: number): void {
        this.itemTTLs[itemType] = ttlSeconds;
    }

    // Private helper methods

    /**
     * Get the full storage key with prefix
     * @private
     */
    _getFullKey(key: string): string {
        return `${this.storagePrefix}-${key}`;
    }

    /**
     * Get the TTL for a specific key based on its prefix/type
     * @private
     */
    _getTTLForKey(key: string): number {
        // Check if any item type prefix matches this key
        for (const [itemType, ttl] of Object.entries(this.itemTTLs)) {
            if (key.startsWith(itemType)) {
                return ttl;
            }
        }

        // Default TTL
        return this.defaultTTL;
    }
}

export default LocalStorageCacheAdapter;
