// @ts-nocheck
/**
 * MapRepository Interface
 * 
 * Defines the contract for GW2 map data persistence operations.
 * Implementations should handle storing and retrieving GW2Map instances.
 */
export class MapRepository {
    /**
     * Load a GW2 map by ID
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<GW2Map|null>} The map, or null if not found
     * @throws {Error} If load fails
     */
    async loadById(mapId) {
        throw new Error('loadById() must be implemented by subclass');
    }

    /**
     * Load all available GW2 maps
     * @returns {Promise<GW2Map[]>} Array of all available maps
     * @throws {Error} If load fails
     */
    async loadAll() {
        throw new Error('loadAll() must be implemented by subclass');
    }

    /**
     * Get a map's boundary data
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<MapBoundary|null>} The boundary, or null if not found
     * @throws {Error} If load fails
     */
    async getBoundary(mapId) {
        throw new Error('getBoundary() must be implemented by subclass');
    }

    /**
     * Get a map's tile grid coordinates
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<Coordinate[]|null>} Array of tile coordinates, or null if not found
     * @throws {Error} If load fails
     */
    async getTiles(mapId) {
        throw new Error('getTiles() must be implemented by subclass');
    }

    /**
     * Get a map's floor information for a specific continent
     * @param {string|number} continentId - The continent ID
     * @param {string|number} floorId - The floor ID
     * @returns {Promise<object|null>} Floor data, or null if not found
     * @throws {Error} If load fails
     */
    async getFloorData(continentId, floorId) {
        throw new Error('getFloorData() must be implemented by subclass');
    }

    /**
     * Check if a map exists
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<boolean>} True if map exists, false otherwise
     * @throws {Error} If check fails
     */
    async exists(mapId) {
        throw new Error('exists() must be implemented by subclass');
    }

    /**
     * Cache a map in the repository
     * @param {GW2Map} map - The map to cache
     * @returns {Promise<void>}
     * @throws {Error} If caching fails
     */
    async cache(map) {
        throw new Error('cache() must be implemented by subclass');
    }

    /**
     * Clear cache for a specific map
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<void>}
     * @throws {Error} If clear fails
     */
    async clearCache(mapId) {
        throw new Error('clearCache() must be implemented by subclass');
    }

    /**
     * Clear all cached maps
     * @returns {Promise<void>}
     * @throws {Error} If clear fails
     */
    async clearAllCache() {
        throw new Error('clearAllCache() must be implemented by subclass');
    }
}

export default MapRepository;
