// @ts-nocheck
/**
 * InfrastructureFactory
 * 
 * Factory for creating and configuring infrastructure components.
 * Central place for dependency injection and configuration.
 */

import { Gw2ApiAdapter } from './adapters/Gw2ApiAdapter.js';
import { LocalStorageCacheAdapter } from './adapters/LocalStorageCacheAdapter.js';
import { XmlLayoutAdapter } from './XmlLayoutAdapter.js';
import { Gw2MapRepository } from './repositories/Gw2MapRepository.js';

export class InfrastructureFactory {
    constructor(options = {}) {
        this.options = {
            apiBaseUrl: options.apiBaseUrl || 'https://api.guildwars2.com',
            apiMaxRetries: options.apiMaxRetries || 3,
            apiTimeout: options.apiTimeout || 10000,
            apiRetryDelay: options.apiRetryDelay || 1000,
            cacheDefaultTTL: options.cacheDefaultTTL || 3600, // 1 hour
            cacheStoragePrefix: options.cacheStoragePrefix || 'gw2-cache',
            layoutStorageKey: options.layoutStorageKey || 'gw2-layouts',
            ...options
        };

        // Singleton instances
        this._apiAdapter = null;
        this._cacheAdapter = null;
        this._layoutAdapter = null;
        this._mapRepository = null;
        this._layoutRepository = null;
    }

    /**
     * Get or create GW2 API adapter
     * @returns {Gw2ApiAdapter}
     */
    getApiAdapter() {
        if (!this._apiAdapter) {
            this._apiAdapter = new Gw2ApiAdapter({
                baseUrl: this.options.apiBaseUrl,
                maxRetries: this.options.apiMaxRetries,
                timeout: this.options.apiTimeout,
                retryDelay: this.options.apiRetryDelay
            });
        }
        return this._apiAdapter;
    }

    /**
     * Get or create cache adapter
     * @returns {LocalStorageCacheAdapter}
     */
    getCacheAdapter() {
        if (!this._cacheAdapter) {
            this._cacheAdapter = new LocalStorageCacheAdapter({
                defaultTTL: this.options.cacheDefaultTTL,
                storagePrefix: this.options.cacheStoragePrefix
            });
        }
        return this._cacheAdapter;
    }

    /**
     * Get or create XML layout adapter
     * @returns {XmlLayoutAdapter}
     */
    getLayoutAdapter() {
        if (!this._layoutAdapter) {
            this._layoutAdapter = new XmlLayoutAdapter();
        }
        return this._layoutAdapter;
    }

    /**
     * Get or create map repository
     * @returns {Gw2MapRepository}
     */
    getMapRepository() {
        if (!this._mapRepository) {
            this._mapRepository = new Gw2MapRepository(
                this.getApiAdapter(),
                this.getCacheAdapter()
            );
        }
        return this._mapRepository;
    }

    /**
     * Get all configured adapters
     * @returns {Object}
     */
    getAdapters() {
        return {
            api: this.getApiAdapter(),
            cache: this.getCacheAdapter(),
            layout: this.getLayoutAdapter()
        };
    }

    /**
     * Clear all cache data
     * @returns {Promise<void>}
     */
    async clearAllCaches() {
        const cache = this.getCacheAdapter();
        await cache.clear();
    }

    /**
     * Get system health information
     * @returns {Promise<Object>}
     */
    async getSystemHealth() {
        const api = this.getApiAdapter();
        const cache = this.getCacheAdapter();

        return {
            apiHealthy: await api.isHealthy(),
            cacheStats: await cache.getStats()
        };
    }

    /**
     * Reset all singleton instances (useful for testing)
     */
    reset() {
        this._apiAdapter = null;
        this._cacheAdapter = null;
        this._layoutAdapter = null;
        this._mapRepository = null;
        this._layoutRepository = null;
    }
}

/**
 * Global infrastructure factory instance
 * Can be overridden for testing
 */
export let infrastructureFactory = new InfrastructureFactory();

/**
 * Set a custom infrastructure factory instance
 * @param {InfrastructureFactory} factory
 */
export function setInfrastructureFactory(factory) {
    infrastructureFactory = factory;
}

/**
 * Get the global infrastructure factory
 * @returns {InfrastructureFactory}
 */
export function getInfrastructureFactory() {
    return infrastructureFactory;
}
