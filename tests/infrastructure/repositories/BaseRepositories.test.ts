// @ts-nocheck
/**
 * Tests for abstract base classes: MapRepository and LayoutRepository
 * Each method must throw "must be implemented by subclass"
 */
import { MapRepository } from '../../../src/infrastructure/repositories/MapRepository.js';

describe('MapRepository (abstract base class)', () => {
    let repo;

    beforeEach(() => {
        repo = new MapRepository();
    });

    test('loadById throws not-implemented', async () => {
        await expect(repo.loadById(1)).rejects.toThrow('loadById() must be implemented');
    });

    test('loadAll throws not-implemented', async () => {
        await expect(repo.loadAll()).rejects.toThrow('loadAll() must be implemented');
    });

    test('getBoundary throws not-implemented', async () => {
        await expect(repo.getBoundary(1)).rejects.toThrow('getBoundary() must be implemented');
    });

    test('getTiles throws not-implemented', async () => {
        await expect(repo.getTiles(1)).rejects.toThrow('getTiles() must be implemented');
    });

    test('getFloorData throws not-implemented', async () => {
        await expect(repo.getFloorData(1, 1)).rejects.toThrow('getFloorData() must be implemented');
    });

    test('exists throws not-implemented', async () => {
        await expect(repo.exists(1)).rejects.toThrow('exists() must be implemented');
    });

    test('cache throws not-implemented', async () => {
        await expect(repo.cache({})).rejects.toThrow('cache() must be implemented');
    });

    test('clearCache throws not-implemented', async () => {
        await expect(repo.clearCache(1)).rejects.toThrow('clearCache() must be implemented');
    });

    test('clearAllCache throws not-implemented', async () => {
        await expect(repo.clearAllCache()).rejects.toThrow('clearAllCache() must be implemented');
    });
});
