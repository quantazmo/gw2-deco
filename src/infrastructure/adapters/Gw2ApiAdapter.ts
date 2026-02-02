// @ts-nocheck
/**
 * Gw2ApiAdapter
 * 
 * Wraps the low-level gw2api.js functions with error handling, retry logic, and timeouts.
 * Provides a cleaner interface for API operations with resilience features.
 */

export class Gw2ApiAdapter {
    constructor(options = {}) {
        this.maxRetries = options.maxRetries || 3;
        this.timeout = options.timeout || 10000; // 10 seconds
        this.retryDelay = options.retryDelay || 1000; // 1 second
        this.baseUrl = options.baseUrl || 'https://api.guildwars2.com';
    }

    /**
     * Get map data from GW2 API
     * @param {number} mapId - The map ID
     * @returns {Promise<object|null>} Map data or null if not found
     * @throws {Error} If all retries fail
     */
    async getMap(mapId) {
        return this._callWithRetry(`v2/maps/${mapId}`);
    }

    /**
     * Get continent data from GW2 API
     * @param {number} continentId - The continent ID
     * @returns {Promise<object|null>} Continent data or null if not found
     * @throws {Error} If all retries fail
     */
    async getContinent(continentId) {
        return this._callWithRetry(`v2/continents/${continentId}`);
    }

    /**
     * Get map floor data from GW2 API
     * @param {number} continentId - The continent ID
     * @param {number} floorId - The floor ID
     * @returns {Promise<object|null>} Floor data or null if not found
     * @throws {Error} If all retries fail
     */
    async getMapFloor(continentId, floorId) {
        return this._callWithRetry(`v1/map_floor.json?continent_id=${continentId}&floor=${floorId}`);
    }

    /**
     * Get all available map IDs
     * @returns {Promise<number[]>} Array of map IDs
     * @throws {Error} If request fails
     */
    async getAllMapIds() {
        try {
            const response = await this._fetchWithTimeout(`${this.baseUrl}/v2/maps`);
            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to get map IDs: ${error.message}`);
        }
    }

    /**
     * Get account homestead decorations (requires API key)
     * Uses access_token query parameter to avoid CORS preflight restrictions.
     * @param {string} apiKey - A valid GW2 API key with the homestead scope
     * @returns {Promise<Array<{id: number, count: number}>|null>} Array of decoration entries or null if not found
     * @throws {Error} If the request fails or the API key is unauthorized
     */
    async getAccountHomesteadDecorations(apiKey) {
        return this._callWithRetry(`v2/account/homestead/decorations?access_token=${encodeURIComponent(apiKey)}`);
    }

    /**
     * Check if the API is reachable
     * @returns {Promise<boolean>} True if API is reachable
     */
    async isHealthy() {
        try {
            await this._callWithRetry('v2/maps/38');
            return true;
        } catch (error) {
            return false;
        }
    }

    // Private helper methods

    /**
     * Call an API endpoint with retry logic and timeout
     * @private
     */
    async _callWithRetry(endpoint, headers = {}) {
        let lastError;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await this._callApiEndpoint(endpoint, headers);
            } catch (error) {
                lastError = error;

                if (attempt < this.maxRetries) {
                    const delayMs = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    console.warn(
                        `API call failed (attempt ${attempt}/${this.maxRetries}), ` +
                        `retrying in ${delayMs}ms: ${error.message}`
                    );
                    await this._sleep(delayMs);
                }
            }
        }

        throw new Error(`API request failed after ${this.maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Make the actual API call
     * @private
     */
    async _callApiEndpoint(endpoint, headers = {}) {
        const response = await this._fetchWithTimeout(`${this.baseUrl}/${endpoint}`, headers);

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Fetch with timeout
     * @private
     */
    _fetchWithTimeout(url, headers = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        return fetch(url, { signal: controller.signal, headers })
            .finally(() => clearTimeout(timeoutId))
            .catch(error => {
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${this.timeout}ms`);
                }
                throw error;
            });
    }

    /**
     * Sleep for a given number of milliseconds
     * @private
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default Gw2ApiAdapter;
