// @ts-nocheck
import {
    InfrastructureFactory,
    setInfrastructureFactory,
    getInfrastructureFactory,
    infrastructureFactory
} from '../../src/infrastructure/InfrastructureFactory.js';

describe('InfrastructureFactory', () => {
    describe('constructor', () => {
        it('creates with default options', () => {
            const factory = new InfrastructureFactory();
            expect(factory.options.apiBaseUrl).toBe('https://api.guildwars2.com');
            expect(factory.options.apiMaxRetries).toBe(3);
            expect(factory.options.apiTimeout).toBe(10000);
            expect(factory.options.apiRetryDelay).toBe(1000);
            expect(factory.options.cacheDefaultTTL).toBe(3600);
            expect(factory.options.cacheStoragePrefix).toBe('gw2-cache');
            expect(factory.options.layoutStorageKey).toBe('gw2-layouts');
        });

        it('creates with custom options', () => {
            const factory = new InfrastructureFactory({
                apiBaseUrl: 'https://custom.api.com',
                apiMaxRetries: 5,
                apiTimeout: 5000,
                apiRetryDelay: 500,
                cacheDefaultTTL: 7200,
                cacheStoragePrefix: 'custom-cache',
                layoutStorageKey: 'custom-layouts'
            });
            expect(factory.options.apiBaseUrl).toBe('https://custom.api.com');
            expect(factory.options.apiMaxRetries).toBe(5);
            expect(factory.options.apiTimeout).toBe(5000);
            expect(factory.options.apiRetryDelay).toBe(500);
            expect(factory.options.cacheDefaultTTL).toBe(7200);
            expect(factory.options.cacheStoragePrefix).toBe('custom-cache');
            expect(factory.options.layoutStorageKey).toBe('custom-layouts');
        });

        it('initializes singleton instances to null', () => {
            const factory = new InfrastructureFactory();
            expect(factory._apiAdapter).toBeNull();
            expect(factory._cacheAdapter).toBeNull();
            expect(factory._layoutAdapter).toBeNull();
            expect(factory._mapRepository).toBeNull();
            expect(factory._layoutRepository).toBeNull();
        });
    });

    describe('getApiAdapter', () => {
        it('creates and returns Gw2ApiAdapter', () => {
            const factory = new InfrastructureFactory();
            const adapter = factory.getApiAdapter();
            expect(adapter).toBeTruthy();
            expect(adapter.baseUrl).toBe('https://api.guildwars2.com');
        });

        it('returns the same instance on repeated calls (singleton)', () => {
            const factory = new InfrastructureFactory();
            const first = factory.getApiAdapter();
            const second = factory.getApiAdapter();
            expect(first).toBe(second);
        });
    });

    describe('getCacheAdapter', () => {
        it('creates and returns LocalStorageCacheAdapter', () => {
            const factory = new InfrastructureFactory();
            const adapter = factory.getCacheAdapter();
            expect(adapter).toBeTruthy();
            expect(adapter.storagePrefix).toBe('gw2-cache');
        });

        it('returns the same instance on repeated calls (singleton)', () => {
            const factory = new InfrastructureFactory();
            const first = factory.getCacheAdapter();
            const second = factory.getCacheAdapter();
            expect(first).toBe(second);
        });
    });

    describe('getLayoutAdapter', () => {
        it('creates and returns XmlLayoutAdapter', () => {
            const factory = new InfrastructureFactory();
            const adapter = factory.getLayoutAdapter();
            expect(adapter).toBeTruthy();
        });

        it('returns the same instance on repeated calls (singleton)', () => {
            const factory = new InfrastructureFactory();
            const first = factory.getLayoutAdapter();
            const second = factory.getLayoutAdapter();
            expect(first).toBe(second);
        });
    });

    describe('getMapRepository', () => {
        it('creates and returns Gw2MapRepository', () => {
            const factory = new InfrastructureFactory();
            const repo = factory.getMapRepository();
            expect(repo).toBeTruthy();
        });

        it('returns the same instance on repeated calls (singleton)', () => {
            const factory = new InfrastructureFactory();
            const first = factory.getMapRepository();
            const second = factory.getMapRepository();
            expect(first).toBe(second);
        });
    });

    describe('getAdapters', () => {
        it('returns all adapters', () => {
            const factory = new InfrastructureFactory();
            const adapters = factory.getAdapters();
            expect(adapters.api).toBeTruthy();
            expect(adapters.cache).toBeTruthy();
            expect(adapters.layout).toBeTruthy();
        });
    });

    describe('reset', () => {
        it('clears all singleton instances', () => {
            const factory = new InfrastructureFactory();
            // Create all singletons
            factory.getApiAdapter();
            factory.getCacheAdapter();
            factory.getLayoutAdapter();
            factory.getMapRepository();

            factory.reset();

            expect(factory._apiAdapter).toBeNull();
            expect(factory._cacheAdapter).toBeNull();
            expect(factory._layoutAdapter).toBeNull();
            expect(factory._mapRepository).toBeNull();
        });

        it('creates fresh instances after reset', () => {
            const factory = new InfrastructureFactory();
            const first = factory.getApiAdapter();
            factory.reset();
            const second = factory.getApiAdapter();
            expect(first).not.toBe(second);
        });
    });

    describe('clearAllCaches', () => {
        it('calls clear on the cache adapter', async () => {
            const factory = new InfrastructureFactory();
            const mockClear = vi.fn(async () => { });
            factory._cacheAdapter = { clear: mockClear };

            await factory.clearAllCaches();
            expect(mockClear).toHaveBeenCalled();
        });
    });

    describe('getSystemHealth', () => {
        it('returns api health and cache stats', async () => {
            const factory = new InfrastructureFactory();
            factory._apiAdapter = { isHealthy: vi.fn(async () => true) };
            factory._cacheAdapter = { getStats: vi.fn(async () => ({ hits: 5 })) };

            const health = await factory.getSystemHealth();
            expect(health.apiHealthy).toBe(true);
            expect(health.cacheStats).toEqual({ hits: 5 });
        });
    });

    describe('setInfrastructureFactory / getInfrastructureFactory', () => {
        it('sets and gets the global factory', () => {
            const originalFactory = getInfrastructureFactory();
            const customFactory = new InfrastructureFactory({ apiMaxRetries: 99 });
            setInfrastructureFactory(customFactory);
            expect(getInfrastructureFactory()).toBe(customFactory);
            // Restore
            setInfrastructureFactory(originalFactory);
        });

        it('exports a default global instance', () => {
            expect(infrastructureFactory).toBeInstanceOf(InfrastructureFactory);
        });
    });
});
