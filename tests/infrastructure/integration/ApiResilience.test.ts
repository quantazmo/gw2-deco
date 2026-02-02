// @ts-nocheck
/**
 * Integration Tests: API Resilience
 * 
 * Tests the complete API interaction workflow with:
 * - Gw2ApiAdapter retry logic
 * - Network error handling
 * - Eventual success scenarios
 * - Timeout behavior
 */

import { Gw2ApiAdapter } from '../../../src/infrastructure/adapters/Gw2ApiAdapter.js';

// Mock fetch for controlled API responses
global.fetch = vi.fn();

describe('Integration: API Resilience', () => {
    let apiAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        apiAdapter = new Gw2ApiAdapter({
            maxRetries: 4, // Changed to 4 for initial + 3 retries
            timeout: 5000,
            retryDelay: 100 // Short delay for tests
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // T090: Integration test - API retry with eventual success
    describe('T090: API Retry with Eventual Success', () => {
        it('should succeed after first retry', async () => {
            let callCount = 0;

            global.fetch.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    // First call fails
                    throw new Error('Network error');
                }
                // Second call succeeds
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ id: 1428, name: "Wizard's Fief" })
                };
            });

            const result = await apiAdapter.getMap(1428);

            expect(result).toBeDefined();
            expect(result.id).toBe(1428);
            expect(callCount).toBe(2); // Initial call + 1 retry
        });

        it('should succeed after second retry', async () => {
            let callCount = 0;

            global.fetch.mockImplementation(async () => {
                callCount++;
                if (callCount <= 2) {
                    // First two calls fail
                    throw new Error('Network error');
                }
                // Third call succeeds
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ id: 1428, name: "Wizard's Fief" })
                };
            });

            const result = await apiAdapter.getMap(1428);

            expect(result).toBeDefined();
            expect(result.id).toBe(1428);
            expect(callCount).toBe(3); // Initial call + 2 retries
        });

        it('should succeed on last retry attempt', async () => {
            let callCount = 0;

            global.fetch.mockImplementation(async () => {
                callCount++;
                if (callCount <= 3) {
                    // First three calls fail
                    throw new Error('Network error');
                }
                // Fourth call succeeds
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ id: 1428, name: "Wizard's Fief" })
                };
            });

            const result = await apiAdapter.getMap(1428);

            expect(result).toBeDefined();
            expect(result.id).toBe(1428);
            expect(callCount).toBe(4); // Initial call + 3 retries (maxRetries)
        });

        it('should handle intermittent network failures', async () => {
            const responses = [
                // Call 1: Network error
                () => Promise.reject(new Error('Network error')),
                // Call 2: Success
                () => Promise.resolve({
                    ok: true,
                    status: 200,
                    json: async () => ({ id: 1428, name: "Map 1" })
                })
            ];

            let callIndex = 0;
            global.fetch.mockImplementation(() => responses[callIndex++]());

            const result = await apiAdapter.getMap(1428);

            expect(result.id).toBe(1428);
        });

        it('should handle server errors with eventual success', async () => {
            let callCount = 0;

            global.fetch.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    // First call: 500 Internal Server Error
                    return {
                        ok: false,
                        status: 500,
                        json: async () => ({ error: 'Internal Server Error' })
                    };
                }
                // Second call succeeds
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ id: 1428, name: "Wizard's Fief" })
                };
            });

            const result = await apiAdapter.getMap(1428);

            expect(result).toBeDefined();
            expect(result.id).toBe(1428);
            expect(callCount).toBe(2);
        });

        it('should handle 503 Service Unavailable with retry', async () => {
            let callCount = 0;

            global.fetch.mockImplementation(async () => {
                callCount++;
                if (callCount <= 2) {
                    // Service temporarily unavailable
                    return {
                        ok: false,
                        status: 503,
                        json: async () => ({ error: 'Service Unavailable' })
                    };
                }
                // Service recovered
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ id: 1428, name: "Wizard's Fief" })
                };
            });

            const result = await apiAdapter.getMap(1428);

            expect(result).toBeDefined();
            expect(callCount).toBe(3);
        });
    });

    describe('Multiple Endpoint Resilience', () => {
        it('should handle retries independently for different endpoints', async () => {
            let mapCalls = 0;
            let continentCalls = 0;

            global.fetch.mockImplementation(async (url) => {
                if (url.includes('/maps/')) {
                    mapCalls++;
                    if (mapCalls === 1) {
                        throw new Error('Map API error');
                    }
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ id: 1428, name: "Wizard's Fief" })
                    };
                }

                if (url.includes('/continents/')) {
                    continentCalls++;
                    if (continentCalls === 1) {
                        throw new Error('Continent API error');
                    }
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ id: 2, name: "Tyria" })
                    };
                }

                return { ok: false, status: 404 };
            });

            // Both should eventually succeed
            const map = await apiAdapter.getMap(1428);
            const continent = await apiAdapter.getContinent(2);

            expect(map.id).toBe(1428);
            expect(continent.id).toBe(2);
            expect(mapCalls).toBe(2);
            expect(continentCalls).toBe(2);
        });

        it('should handle mixed success and failure scenarios', async () => {
            global.fetch.mockImplementation(async (url) => {
                if (url.includes('/maps/1428')) {
                    // This map succeeds immediately
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ id: 1428, name: "Map 1" })
                    };
                }

                if (url.includes('/maps/1329')) {
                    // This map fails permanently (404)
                    return {
                        ok: false,
                        status: 404,
                        json: async () => ({ error: 'Not Found' })
                    };
                }

                return { ok: false, status: 500 };
            });

            // First should succeed
            const map1 = await apiAdapter.getMap(1428);
            expect(map1.id).toBe(1428);

            // Second should return null (404)
            const map2 = await apiAdapter.getMap(1329);
            expect(map2).toBeNull();
        });
    });

    describe('Health Check Resilience', () => {
        it('should handle health check with retry', async () => {
            let callCount = 0;

            global.fetch.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    throw new Error('Health check failed');
                }
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ id: '12345' })
                };
            });

            const healthy = await apiAdapter.isHealthy();

            expect(healthy).toBe(true);
            expect(callCount).toBe(2);
        });

        it('should report unhealthy after exhausting retries', async () => {
            global.fetch.mockRejectedValue(new Error('API down'));

            const healthy = await apiAdapter.isHealthy();

            expect(healthy).toBe(false);
        });
    });

    describe('Concurrent Request Resilience', () => {
        it('should handle multiple concurrent requests with retries', async () => {
            let callCount = 0;

            global.fetch.mockImplementation(async (url) => {
                callCount++;
                const mapId = url.match(/\/maps\/(\d+)/)?.[1];

                // First call for each map fails
                if (callCount <= 3) {
                    throw new Error('Network error');
                }

                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ id: parseInt(mapId), name: `Map ${mapId}` })
                };
            });

            // Make three concurrent requests
            const [map1, map2, map3] = await Promise.all([
                apiAdapter.getMap(1428),
                apiAdapter.getMap(1329),
                apiAdapter.getMap(1330)
            ]);

            expect(map1.id).toBe(1428);
            expect(map2.id).toBe(1329);
            expect(map3.id).toBe(1330);
        });
    });
});
