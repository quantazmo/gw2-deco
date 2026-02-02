// @ts-nocheck
/**
 * Tests for Gw2MapRepository
 */

import { Gw2MapRepository } from '../../../src/infrastructure/repositories/Gw2MapRepository.js';
import { GW2Map } from '../../../src/domain/GW2Map.js';
import { MapBoundary } from '../../../src/domain/MapBoundary.js';
import { Coordinate } from '../../../src/domain/Coordinate.js';

describe('Gw2MapRepository', () => {
    let mockApiAdapter;
    let mockCacheAdapter;
    let repository;

    beforeEach(() => {
        // Mock GW2 API Adapter
        mockApiAdapter = {
            getMap: vi.fn(),
            getContinent: vi.fn(),
            getMapFloor: vi.fn(),
            getAllMapIds: vi.fn()
        };

        // Mock Cache Adapter
        mockCacheAdapter = {
            get: vi.fn(),
            set: vi.fn(),
            delete: vi.fn(),
            clear: vi.fn()
        };

        repository = new Gw2MapRepository(mockApiAdapter, mockCacheAdapter);
    });

    describe('loadById', () => {
        it('should return GW2Map from API when not cached', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0,
                map_rect: [[0, 0], [100, 100]],
                boundary: [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 100, y: 100 },
                    { x: 0, y: 100 }
                ]
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);

            const result = await repository.loadById(38);

            expect(result).toBeInstanceOf(GW2Map);
            expect(result.id).toBe(38);
            expect(result.name).toBe('Queensdale');
            expect(result.continent_id).toBe(1);
            expect(mockApiAdapter.getMap).toHaveBeenCalledWith(38);
        });

        it('should return null for non-existent map', async () => {
            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(null);

            const result = await repository.loadById(99999);

            expect(result).toBeNull();
            expect(mockApiAdapter.getMap).toHaveBeenCalledWith(99999);
        });

        it('should use in-memory cache on second call', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);

            // First call - loads from API
            const firstResult = await repository.loadById(38);
            expect(mockApiAdapter.getMap).toHaveBeenCalledTimes(1);

            // Second call - should use in-memory cache
            const secondResult = await repository.loadById(38);
            expect(mockApiAdapter.getMap).toHaveBeenCalledTimes(1); // Not called again
            expect(mockCacheAdapter.get).toHaveBeenCalledTimes(1); // Not checked again

            expect(firstResult).toBe(secondResult); // Same instance
        });

        it('should use localStorage cache before API', async () => {
            const cachedData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                floor: 0,
                tiles: [],
                boundary: null,
                rect: null
            };

            mockCacheAdapter.get.mockResolvedValue(cachedData);

            const result = await repository.loadById(38);

            expect(result).toBeInstanceOf(GW2Map);
            expect(result.id).toBe(38);
            expect(mockCacheAdapter.get).toHaveBeenCalledWith('map-38');
            expect(mockApiAdapter.getMap).not.toHaveBeenCalled();
        });

        it('should cache in all tiers after API fetch', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);

            await repository.loadById(38);

            // Should cache in localStorage
            expect(mockCacheAdapter.set).toHaveBeenCalledWith(
                'map-38',
                expect.objectContaining({
                    id: 38,
                    name: 'Queensdale',
                    continent_id: 1
                }),
                3600
            );

            // Should also be in memory cache (tested by second call not hitting API)
            await repository.loadById(38);
            expect(mockApiAdapter.getMap).toHaveBeenCalledTimes(1);
        });

        it('should construct valid GW2Map domain entity with boundary', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0,
                region_id: 4,
                floors: [0],
                map_rect: [[-43008, -27648], [43008, 30720]],
                continent_rect: [[9856, 11776], [13568, 15616]]
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);
            mockApiAdapter.getMapFloor.mockResolvedValue({
                regions: {
                    4: {
                        maps: {
                            38: {
                                continent_rect: [[9856, 11776], [13568, 15616]],
                                map_rect: [[-43008, -27648], [43008, 30720]],
                                sectors: {
                                    1: {
                                        bounds: [
                                            [9856, 11776],
                                            [13568, 11776],
                                            [13568, 15616],
                                            [9856, 15616]
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const result = await repository.loadById(38);

            expect(result).toBeInstanceOf(GW2Map);
            expect(result.boundary).toBeInstanceOf(MapBoundary);
            expect(result.hasBoundary()).toBe(true);
        });

        it('should handle maps with tiles', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0,
                region_id: 4,
                floors: [0],
                map_rect: [[-43008, -27648], [43008, 30720]],
                continent_rect: [[9856, 11776], [13568, 15616]]
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);
            mockApiAdapter.getMapFloor.mockResolvedValue({
                regions: {
                    4: {
                        maps: {
                            38: {
                                continent_rect: [[9856, 11776], [13568, 15616]],
                                map_rect: [[-43008, -27648], [43008, 30720]],
                                sectors: {
                                    1: {
                                        bounds: [
                                            [9856, 11776],
                                            [13568, 11776],
                                            [13568, 15616],
                                            [9856, 15616]
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const result = await repository.loadById(38);

            expect(result.hasTiles()).toBe(true);
            expect(result.tiles.length).toBeGreaterThan(0);
        });

        it('should throw error when API fails', async () => {
            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockRejectedValue(new Error('API error'));

            await expect(repository.loadById(38)).rejects.toThrow('Failed to load map 38');
        });
    });

    describe('getBoundary', () => {
        it('should return MapBoundary for valid map', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0,
                region_id: 4,
                floors: [0],
                map_rect: [[-43008, -27648], [43008, 30720]],
                continent_rect: [[9856, 11776], [13568, 15616]]
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);
            mockApiAdapter.getMapFloor.mockResolvedValue({
                regions: {
                    4: {
                        maps: {
                            38: {
                                continent_rect: [[9856, 11776], [13568, 15616]],
                                map_rect: [[-43008, -27648], [43008, 30720]],
                                sectors: {
                                    1: {
                                        bounds: [
                                            [9856, 11776],
                                            [13568, 11776],
                                            [13568, 15616],
                                            [9856, 15616]
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const boundary = await repository.getBoundary(38);

            expect(boundary).toBeInstanceOf(MapBoundary);
        });

        it('should return null for map without boundary', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);

            const boundary = await repository.getBoundary(38);

            expect(boundary).toBeNull();
        });
    });

    describe('loadAll', () => {
        it('should return array of GW2Map entities', async () => {
            const mockMapIds = [15, 17, 38];
            const mockMapData = (id) => ({
                id,
                name: `Map ${id}`,
                continent_id: 1,
                default_floor: 0
            });

            mockApiAdapter.getAllMapIds.mockResolvedValue(mockMapIds);
            mockCacheAdapter.get.mockResolvedValue(null);

            mockMapIds.forEach(id => {
                mockApiAdapter.getMap.mockImplementation((mapId) => {
                    if (mockMapIds.includes(mapId)) {
                        return Promise.resolve(mockMapData(mapId));
                    }
                    return Promise.resolve(null);
                });
            });

            const maps = await repository.loadAll();

            expect(Array.isArray(maps)).toBe(true);
            expect(maps.length).toBe(3);
            expect(maps[0]).toBeInstanceOf(GW2Map);
            expect(mockApiAdapter.getAllMapIds).toHaveBeenCalled();
        });

        it('should handle errors when loading all maps', async () => {
            mockApiAdapter.getAllMapIds.mockRejectedValue(new Error('API error'));

            await expect(repository.loadAll()).rejects.toThrow('Failed to load all maps');
        });
    });

    describe('getTiles', () => {
        it('should return tiles as Coordinate array', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0,
                region_id: 4,
                floors: [0],
                map_rect: [[-43008, -27648], [43008, 30720]],
                continent_rect: [[9856, 11776], [13568, 15616]]
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);
            mockApiAdapter.getMapFloor.mockResolvedValue({
                regions: {
                    4: {
                        maps: {
                            38: {
                                continent_rect: [[9856, 11776], [13568, 15616]],
                                map_rect: [[-43008, -27648], [43008, 30720]],
                                sectors: {
                                    1: {
                                        bounds: [
                                            [9856, 11776],
                                            [13568, 11776],
                                            [13568, 15616],
                                            [9856, 15616]
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            });

            const tiles = await repository.getTiles(38);

            expect(Array.isArray(tiles)).toBe(true);
            expect(tiles.length).toBeGreaterThan(0);
            expect(tiles[0]).toBeInstanceOf(Coordinate);
        });

        it('should return empty array for map without tiles', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);

            const tiles = await repository.getTiles(38);

            expect(tiles).toEqual([]);
        });
    });

    describe('getFloorData', () => {
        it('should return floor data from API', async () => {
            const mockFloorData = {
                texture_dims: [32768, 32768],
                regions: {}
            };

            mockApiAdapter.getMapFloor.mockResolvedValue(mockFloorData);

            const floorData = await repository.getFloorData(1, 0);

            expect(floorData).toEqual(mockFloorData);
            expect(mockApiAdapter.getMapFloor).toHaveBeenCalledWith(1, 0);
        });
    });

    describe('exists', () => {
        it('should return true for existing map', async () => {
            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0
            };

            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(mockMapData);

            const exists = await repository.exists(38);

            expect(exists).toBe(true);
        });

        it('should return false for non-existent map', async () => {
            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockResolvedValue(null);

            const exists = await repository.exists(99999);

            expect(exists).toBe(false);
        });

        it('should return false on API error', async () => {
            mockCacheAdapter.get.mockResolvedValue(null);
            mockApiAdapter.getMap.mockRejectedValue(new Error('API error'));

            const exists = await repository.exists(38);

            expect(exists).toBe(false); // Gracefully handle errors
        });
    });

    describe('cache management', () => {
        it('should cache a map manually', async () => {
            const map = new GW2Map(38, 'Queensdale', 1, 0);

            await repository.cache(map);

            expect(mockCacheAdapter.set).toHaveBeenCalledWith(
                'map-38',
                expect.objectContaining({
                    id: 38,
                    name: 'Queensdale'
                }),
                3600
            );

            // Verify it's in memory cache
            const cached = repository.inMemoryCache.get(38);
            expect(cached).toBe(map);
        });

        it('should throw error when caching invalid map', async () => {
            const invalidMap = { name: 'Invalid' }; // No id

            await expect(repository.cache(invalidMap)).rejects.toThrow('Invalid map: must have an id');
        });

        it('should clear cache for specific map', async () => {
            const map = new GW2Map(38, 'Queensdale', 1, 0);
            repository.inMemoryCache.set(38, map);

            await repository.clearCache(38);

            expect(repository.inMemoryCache.has(38)).toBe(false);
            expect(mockCacheAdapter.delete).toHaveBeenCalledWith('map-38');
        });

        it('should clear all caches', async () => {
            const map1 = new GW2Map(38, 'Queensdale', 1, 0);
            const map2 = new GW2Map(17, 'Divinity\'s Reach', 1, 0);
            repository.inMemoryCache.set(38, map1);
            repository.inMemoryCache.set(17, map2);

            await repository.clearAllCache();

            expect(repository.inMemoryCache.size).toBe(0);
        });
    });

    describe('cache reconstruction', () => {
        it('should reconstruct map with boundary from cache', async () => {
            const cachedData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                floor: 0,
                tiles: [],
                boundary: {
                    points: [
                        { x: 0, y: 0, z: 0 },
                        { x: 100, y: 0, z: 0 },
                        { x: 100, y: 100, z: 0 },
                        { x: 0, y: 100, z: 0 }
                    ]
                },
                rect: null
            };

            mockCacheAdapter.get.mockResolvedValue(cachedData);

            const result = await repository.loadById(38);

            expect(result).toBeInstanceOf(GW2Map);
            expect(result.boundary).toBeInstanceOf(MapBoundary);
            expect(result.boundary.points.length).toBe(4);
        });

        it('should reconstruct map with rect from cache', async () => {
            const cachedData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                floor: 0,
                tiles: [],
                boundary: null,
                rect: {
                    min: { x: 0, y: 0 },
                    max: { x: 100, y: 100 }
                }
            };

            mockCacheAdapter.get.mockResolvedValue(cachedData);

            const result = await repository.loadById(38);

            expect(result.rect).toBeDefined();
            expect(result.rect.min).toEqual({ x: 0, y: 0 });
        });
    });

    describe('repository without cache adapter', () => {
        it('should work without cache adapter', async () => {
            const repoWithoutCache = new Gw2MapRepository(mockApiAdapter, null);

            const mockMapData = {
                id: 38,
                name: 'Queensdale',
                continent_id: 1,
                default_floor: 0
            };

            mockApiAdapter.getMap.mockResolvedValue(mockMapData);

            const result = await repoWithoutCache.loadById(38);

            expect(result).toBeInstanceOf(GW2Map);
            expect(result.id).toBe(38);
        });
    });
});
