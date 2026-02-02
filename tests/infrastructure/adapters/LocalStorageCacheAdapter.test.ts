// @ts-nocheck
/**
 * Tests for LocalStorageCacheAdapter
 */

import { LocalStorageCacheAdapter } from '../../../src/infrastructure/adapters/LocalStorageCacheAdapter.js';
import { setupLocalStorageMock, restoreLocalStorage } from '../mocks/localStorageMock.js';

describe('LocalStorageCacheAdapter', () => {
    let localStorage;

    beforeEach(() => {
        localStorage = setupLocalStorageMock();
    });

    afterEach(() => {
        restoreLocalStorage();
    });

    describe('get', () => {
        it('should return cached value when valid', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const testData = { id: 123, name: 'Test' };

            // Use adapter.set to properly create the cache entry
            await adapter.set('test-key', testData);

            const result = await adapter.get('test-key');
            expect(result).toEqual(testData);
        });

        it('should return null for missing key', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const result = await adapter.get('nonexistent-key');
            expect(result).toBeNull();
        });

        it('should return null for expired entry', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const testData = { id: 123, name: 'Test' };

            // Set cache entry with timestamp in the past
            const cacheEntry = {
                value: testData,
                timestamp: Date.now() - 7200000, // 2 hours ago
                ttl: 3600 // 1 hour TTL
            };
            localStorage.setItem('gw2-cache-test-key', JSON.stringify(cacheEntry));

            const result = await adapter.get('test-key');
            expect(result).toBeNull();
        });

        it('should remove expired entry on access', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const testData = { id: 123, name: 'Test' };

            // Set expired cache entry
            const cacheEntry = {
                value: testData,
                timestamp: Date.now() - 7200000, // 2 hours ago
                ttl: 3600 // 1 hour TTL
            };
            localStorage.setItem('gw2-cache-test-key', JSON.stringify(cacheEntry));

            await adapter.get('test-key');

            // Entry should be removed
            expect(localStorage.getItem('gw2-cache-test-key')).toBeNull();
        });

        it('should handle malformed cache data gracefully', async () => {
            const adapter = new LocalStorageCacheAdapter();
            localStorage.setItem('gw2-cache-test-key', 'invalid json{');

            const result = await adapter.get('test-key');
            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('should store value with TTL', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const testData = { id: 123, name: 'Test' };

            await adapter.set('test-key', testData);

            const stored = localStorage.getItem('gw2-cache-test-key');
            expect(stored).not.toBeNull();

            const parsed = JSON.parse(stored);
            expect(parsed.value).toEqual(testData);
            expect(parsed.ttl).toBe(3600); // default TTL
            expect(parsed.timestamp).toBeCloseTo(Date.now(), -2);
        });

        it('should use defaultTTL when no TTL specified', async () => {
            const adapter = new LocalStorageCacheAdapter({ defaultTTL: 7200 });
            const testData = { id: 123, name: 'Test' };

            await adapter.set('test-key', testData);

            const stored = localStorage.getItem('gw2-cache-test-key');
            const parsed = JSON.parse(stored);
            expect(parsed.ttl).toBe(7200);
        });

        it('should use custom TTL when provided', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const testData = { id: 123, name: 'Test' };

            await adapter.set('test-key', testData, 1800);

            const stored = localStorage.getItem('gw2-cache-test-key');
            const parsed = JSON.parse(stored);
            expect(parsed.ttl).toBe(1800);
        });

        it('should handle quota exceeded gracefully', async () => {
            const adapter = new LocalStorageCacheAdapter();
            localStorage.simulateQuotaExceeded(true);

            const testData = { id: 123, name: 'Test' };

            // Should not throw
            await expect(adapter.set('test-key', testData)).resolves.not.toThrow();
        });
    });

    describe('delete', () => {
        it('should remove entry from cache', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const testData = { id: 123, name: 'Test' };

            await adapter.set('test-key', testData);
            expect(localStorage.getItem('gw2-cache-test-key')).not.toBeNull();

            await adapter.delete('test-key');
            expect(localStorage.getItem('gw2-cache-test-key')).toBeNull();
        });

        it('should not throw when deleting nonexistent key', async () => {
            const adapter = new LocalStorageCacheAdapter();
            await expect(adapter.delete('nonexistent')).resolves.not.toThrow();
        });
    });

    describe('exists', () => {
        it('should return true for valid cached entry', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const testData = { id: 123, name: 'Test' };

            await adapter.set('test-key', testData);
            const exists = await adapter.exists('test-key');
            expect(exists).toBe(true);
        });

        it('should return false for missing entry', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const exists = await adapter.exists('nonexistent');
            expect(exists).toBe(false);
        });

        it('should return false for expired entry', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const testData = { id: 123, name: 'Test' };

            // Set expired cache entry
            const cacheEntry = {
                value: testData,
                timestamp: Date.now() - 7200000, // 2 hours ago
                ttl: 3600 // 1 hour TTL
            };
            localStorage.setItem('gw2-cache-test-key', JSON.stringify(cacheEntry));

            const exists = await adapter.exists('test-key');
            expect(exists).toBe(false);
        });
    });

    describe('clear', () => {
        it('should remove all prefixed entries', async () => {
            const adapter = new LocalStorageCacheAdapter({ storagePrefix: 'gw2-cache' });

            // Set multiple cache entries
            await adapter.set('key1', { data: 1 });
            await adapter.set('key2', { data: 2 });
            await adapter.set('key3', { data: 3 });

            // Set a non-cache entry
            localStorage.setItem('other-key', 'should not be removed');

            await adapter.clear();

            expect(localStorage.getItem('gw2-cache-key1')).toBeNull();
            expect(localStorage.getItem('gw2-cache-key2')).toBeNull();
            expect(localStorage.getItem('gw2-cache-key3')).toBeNull();
            expect(localStorage.getItem('other-key')).toBe('should not be removed');
        });

        it('should not affect entries with different prefix', async () => {
            const adapter1 = new LocalStorageCacheAdapter({ storagePrefix: 'cache1' });
            const adapter2 = new LocalStorageCacheAdapter({ storagePrefix: 'cache2' });

            await adapter1.set('key1', { data: 1 });
            await adapter2.set('key1', { data: 2 });

            await adapter1.clear();

            expect(localStorage.getItem('cache1-key1')).toBeNull();
            expect(localStorage.getItem('cache2-key1')).not.toBeNull();
        });
    });

    describe('getStats', () => {
        it('should return cache statistics', async () => {
            const adapter = new LocalStorageCacheAdapter();

            await adapter.set('key1', { data: 'test1' });
            await adapter.set('key2', { data: 'test2' });
            await adapter.set('key3', { data: 'test3' });

            const stats = await adapter.getStats();

            expect(stats.itemCount).toBe(3);
            expect(stats.expiredCount).toBe(0);
            expect(stats.totalSizeBytes).toBeGreaterThan(0);
            expect(stats.totalSizeKB).toBeDefined();
        });

        it('should count expired items in statistics', async () => {
            const adapter = new LocalStorageCacheAdapter();

            // Add valid entry
            await adapter.set('key1', { data: 'test1' });

            // Add expired entry manually
            const expiredEntry = {
                value: { data: 'expired' },
                timestamp: Date.now() - 7200000, // 2 hours ago
                ttl: 3600 // 1 hour TTL
            };
            localStorage.setItem('gw2-cache-key2', JSON.stringify(expiredEntry));

            const stats = await adapter.getStats();

            expect(stats.itemCount).toBe(2);
            expect(stats.expiredCount).toBe(1);
        });

        it('should return zero stats for empty cache', async () => {
            const adapter = new LocalStorageCacheAdapter();
            const stats = await adapter.getStats();

            expect(stats.itemCount).toBe(0);
            expect(stats.expiredCount).toBe(0);
            expect(stats.totalSizeBytes).toBe(0);
        });
    });

    describe('graceful degradation', () => {
        it('should handle localStorage unavailable gracefully', async () => {
            // Simulate localStorage being unavailable/throwing
            const originalGetItem = localStorage.getItem;
            localStorage.getItem = () => {
                throw new Error('localStorage not available');
            };

            const adapter = new LocalStorageCacheAdapter();

            // Operations should not throw
            await expect(adapter.get('test-key')).resolves.toBeNull();

            // Restore
            localStorage.getItem = originalGetItem;
        });

        it('should handle JSON parse errors gracefully', async () => {
            const adapter = new LocalStorageCacheAdapter();
            localStorage.setItem('gw2-cache-bad-json', 'not valid json{]');

            // Should not throw
            await expect(adapter.get('bad-json')).resolves.toBeNull();
        });
    });

    describe('custom item TTLs', () => {
        it('should use item-specific TTL when configured', async () => {
            const adapter = new LocalStorageCacheAdapter({
                defaultTTL: 3600,
                itemTTLs: {
                    'map-': 7200,
                    'layout-': 86400
                }
            });

            await adapter.set('map-123', { id: 123 });
            await adapter.set('layout-456', { id: 456 });
            await adapter.set('other-789', { id: 789 });

            const map = JSON.parse(localStorage.getItem('gw2-cache-map-123'));
            const layout = JSON.parse(localStorage.getItem('gw2-cache-layout-456'));
            const other = JSON.parse(localStorage.getItem('gw2-cache-other-789'));

            expect(map.ttl).toBe(7200);
            expect(layout.ttl).toBe(86400);
            expect(other.ttl).toBe(3600); // default
        });

        it('should allow setting item TTL dynamically', () => {
            const adapter = new LocalStorageCacheAdapter();
            adapter.setItemTTL('special-', 9999);

            expect(adapter.itemTTLs['special-']).toBe(9999);
        });
    });

    describe('clearExpired', () => {
        it('should remove only expired entries', async () => {
            const adapter = new LocalStorageCacheAdapter();

            // Add valid entry
            await adapter.set('valid-key', { data: 'valid' });

            // Add expired entry manually
            const expiredEntry = {
                value: { data: 'expired' },
                timestamp: Date.now() - 7200000, // 2 hours ago
                ttl: 3600 // 1 hour TTL
            };
            localStorage.setItem('gw2-cache-expired-key', JSON.stringify(expiredEntry));

            await adapter.clearExpired();

            expect(localStorage.getItem('gw2-cache-valid-key')).not.toBeNull();
            expect(localStorage.getItem('gw2-cache-expired-key')).toBeNull();
        });
    });
});
