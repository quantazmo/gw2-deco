// @ts-nocheck
/**
 * Gw2MapRepository
 * 
 * Implements MapRepository using the GW2 API via gw2api.js.
 * Provides access to Guild Wars 2 map data with caching support.
 */
import { MapRepository } from './MapRepository.js';
import { GW2Map } from '../../domain/GW2Map.js';
import { MapBoundary } from '../../domain/MapBoundary.js';
import { Coordinate } from '../../domain/Coordinate.js';

export class Gw2MapRepository extends MapRepository {
    constructor(gw2ApiAdapter, cacheAdapter) {
        super();
        this.gw2Api = gw2ApiAdapter;
        this.cacheAdapter = cacheAdapter;
        this.inMemoryCache = new Map(); // mapId -> GW2Map
    }

    /**
     * Load a GW2 map by ID
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<GW2Map|null>}
     */
    async loadById(mapId) {
        try {
            mapId = Number(mapId);

            // Check in-memory cache first
            if (this.inMemoryCache.has(mapId)) {
                return this.inMemoryCache.get(mapId);
            }

            // Check persistent cache
            const cached = await this.cacheAdapter?.get(`map-${mapId}`);
            if (cached) {
                const map = this._reconstructMapFromCached(cached);
                this.inMemoryCache.set(mapId, map);
                return map;
            }

            // Load from API
            const mapData = await this.gw2Api.getMap(mapId);
            if (!mapData) {
                return null;
            }

            const map = await this._buildMapFromApiData(mapData);

            // Cache the result
            if (this.cacheAdapter) {
                await this.cacheAdapter.set(`map-${mapId}`, this._serializeMap(map), 3600); // 1 hour
            }
            this.inMemoryCache.set(mapId, map);

            return map;
        } catch (error) {
            throw new Error(`Failed to load map ${mapId}: ${error.message}`);
        }
    }

    /**
     * Load all available GW2 maps
     * This is expensive - typically you'd load specific maps
     * @returns {Promise<GW2Map[]>}
     */
    async loadAll() {
        try {
            const mapIds = await this.gw2Api.getAllMapIds();
            const maps = [];

            for (const mapId of mapIds) {
                const map = await this.loadById(mapId);
                if (map) {
                    maps.push(map);
                }
            }

            return maps;
        } catch (error) {
            throw new Error(`Failed to load all maps: ${error.message}`);
        }
    }

    /**
     * Get a map's boundary data
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<MapBoundary|null>}
     */
    async getBoundary(mapId) {
        try {
            const map = await this.loadById(mapId);
            return map ? map.boundary : null;
        } catch (error) {
            throw new Error(`Failed to get boundary for map ${mapId}: ${error.message}`);
        }
    }

    /**
     * Get a map's tile grid coordinates
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<Coordinate[]|null>}
     */
    async getTiles(mapId) {
        try {
            const map = await this.loadById(mapId);
            if (!map) {
                return null;
            }
            if (!map.tiles || map.tiles.length === 0) {
                return [];
            }

            // Convert tile data to Coordinate objects if needed
            return map.tiles.map(tile => {
                if (tile instanceof Coordinate) {
                    return tile;
                }
                return new Coordinate(tile.x ?? tile.mapCoords?.x, tile.y ?? tile.mapCoords?.y);
            });
        } catch (error) {
            throw new Error(`Failed to get tiles for map ${mapId}: ${error.message}`);
        }
    }

    /**
     * Get a map's floor information for a specific continent
     * @param {string|number} continentId - The continent ID
     * @param {string|number} floorId - The floor ID
     * @returns {Promise<object|null>}
     */
    async getFloorData(continentId, floorId) {
        try {
            const floorData = await this.gw2Api.getMapFloor(continentId, floorId);
            return floorData || null;
        } catch (error) {
            throw new Error(`Failed to get floor data for continent ${continentId}, floor ${floorId}: ${error.message}`);
        }
    }

    /**
     * Check if a map exists
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<boolean>}
     */
    async exists(mapId) {
        try {
            const map = await this.loadById(mapId);
            return map !== null;
        } catch (error) {
            // If API fails, assume it doesn't exist
            return false;
        }
    }

    /**
     * Cache a map in the repository
     * @param {GW2Map} map - The map to cache
     * @returns {Promise<void>}
     */
    async cache(map) {
        try {
            if (!map || !map.id) {
                throw new Error('Invalid map: must have an id');
            }

            this.inMemoryCache.set(map.id, map);

            if (this.cacheAdapter) {
                await this.cacheAdapter.set(`map-${map.id}`, this._serializeMap(map), 3600);
            }
        } catch (error) {
            throw new Error(`Failed to cache map: ${error.message}`);
        }
    }

    /**
     * Clear cache for a specific map
     * @param {string|number} mapId - The GW2 map ID
     * @returns {Promise<void>}
     */
    async clearCache(mapId) {
        try {
            mapId = Number(mapId);
            this.inMemoryCache.delete(mapId);

            if (this.cacheAdapter) {
                await this.cacheAdapter.delete(`map-${mapId}`);
            }
        } catch (error) {
            throw new Error(`Failed to clear cache for map ${mapId}: ${error.message}`);
        }
    }

    /**
     * Clear all cached maps
     * @returns {Promise<void>}
     */
    async clearAllCache() {
        try {
            this.inMemoryCache.clear();

            if (this.cacheAdapter) {
                const keys = Array.from(this.inMemoryCache.keys());
                for (const key of keys) {
                    if (key.toString().startsWith('map-')) {
                        await this.cacheAdapter.delete(key);
                    }
                }
            }
        } catch (error) {
            throw new Error(`Failed to clear all cache: ${error.message}`);
        }
    }

    // Private helper methods

    /**
     * Build a GW2Map from API response data, including tiles and boundary from the floor API.
     * @private
     */
    async _buildMapFromApiData(mapData) {
        const map = new GW2Map(mapData.id, mapData.name, mapData.continent_id, mapData.default_floor);

        // Set rect if available
        if (mapData.map_rect) {
            map.rect = mapData.map_rect;
        }

        // Fetch floor data to get tiles and boundary polygon
        try {
            // Match legacy floor selection: prefer a non-default floor, fall back to last available
            const floor = mapData.floors?.find(f => f !== mapData.default_floor)
                ?? mapData.floors?.[mapData.floors.length - 1]
                ?? mapData.default_floor;
            const floorData = await this.gw2Api.getMapFloor(mapData.continent_id, floor);
            const regionMaps = floorData?.regions?.[mapData.region_id]?.maps;
            const mapFloorData = regionMaps?.[mapData.id];

            if (mapFloorData) {
                // Build coordinate converter: continent coords → map coords
                const continentToMap = this._createContinentToMapConverter(
                    mapFloorData.continent_rect,
                    mapFloorData.map_rect
                );

                // Set boundary from the first sector's bounds (continent coords → map coords)
                const sectors = mapFloorData.sectors;
                const firstSector = Array.isArray(sectors) ? sectors[0] : Object.values(sectors)[0];
                const rawBounds = firstSector?.bounds;
                if (rawBounds && rawBounds.length >= 3) {
                    // Remove duplicate closing point if present (first === last)
                    const boundsPoints = (rawBounds[0][0] === rawBounds[rawBounds.length - 1][0] &&
                        rawBounds[0][1] === rawBounds[rawBounds.length - 1][1])
                        ? rawBounds.slice(0, -1)
                        : rawBounds;
                    const boundaryPoints = boundsPoints.map(b => {
                        const { x, y } = continentToMap(b);
                        return new Coordinate(x, y);
                    });
                    map.setBoundary(new MapBoundary(boundaryPoints));
                }

                // Build tiles from continent rect and sector bounds
                const rawBoundsForTiles = firstSector?.bounds;
                if (rawBoundsForTiles) {
                    const continentRect = {
                        width: 32768,
                        height: 32768
                    };
                    const tileZoom = 7;
                    const tileRange = this._calculateTileRange(continentRect, rawBoundsForTiles, tileZoom);
                    const tiles = [];

                    const continentTileSize = continentRect.width / Math.pow(2, tileZoom);
                    const { x: mapTileX1 } = continentToMap([0, 0]);
                    const { x: mapTileX2 } = continentToMap([continentTileSize, continentTileSize]);
                    const mapTileSize = mapTileX2 - mapTileX1;

                    let tileIndex = 0;
                    for (let x = tileRange.min_x; x <= tileRange.max_x; x++) {
                        for (let y = tileRange.min_y; y <= tileRange.max_y; y++) {
                            const contX = x * continentTileSize;
                            const contY = (1 + y) * continentTileSize;
                            const mapCoords = continentToMap([contX, contY]);
                            const subdomain = (tileIndex % 4) + 1;
                            tileIndex++;
                            tiles.push({
                                mapTile: { x, y },
                                mapCoords,
                                tileSize: mapTileSize,
                                url: `https://tiles${subdomain}.guildwars2.com/${mapData.continent_id}/${floor}/${tileZoom}/${x}/${y}.jpg`
                            });
                        }
                    }
                    map.setTiles(tiles);
                }
            }
        } catch (error) {
            console.warn(`[Gw2MapRepository] Could not load floor data for map ${mapData.id}: ${error.message}`);
        }

        // Fallback: if no boundary was set, create a rectangular one from map_rect
        if (!map.boundary && mapData.map_rect?.length === 2) {
            const [[minX, minY], [maxX, maxY]] = mapData.map_rect;
            const boundaryPoints = [
                new Coordinate(minX, minY),
                new Coordinate(maxX, minY),
                new Coordinate(maxX, maxY),
                new Coordinate(minX, maxY)
            ];
            map.setBoundary(new MapBoundary(boundaryPoints));
        }

        return map;
    }

    /**
     * Create a function that converts continent coordinates to map coordinates.
     * @param {number[][]} continentRect - [[nw_x, nw_y], [se_x, se_y]]
     * @param {number[][]} mapRect - [[bl_x, bl_y], [tr_x, tr_y]]
     * @returns {function([number, number]): {x: number, y: number}}
     * @private
     */
    _createContinentToMapConverter(continentRect, mapRect) {
        const [cont_nw, cont_se] = continentRect;
        const [map_bl, map_tr] = mapRect;
        const contWidth = cont_se[0] - cont_nw[0];
        const contHeight = cont_nw[1] - cont_se[1];
        const mapWidth = map_tr[0] - map_bl[0];
        const mapHeight = map_tr[1] - map_bl[1];

        return function ([cont_x, cont_y]) {
            const norm_x = (cont_x - cont_nw[0]) / contWidth;
            const norm_y = (cont_nw[1] - cont_y) / contHeight;
            return {
                x: map_bl[0] + norm_x * mapWidth,
                y: map_bl[1] + (1 - norm_y) * mapHeight
            };
        };
    }

    /**
     * Calculate the tile index range needed to cover a set of continent-coordinate bounds.
     * @param {{width: number, height: number}} continentRect
     * @param {number[][]} bounds - Array of [x, y] continent coordinate points
     * @param {number} zoom
     * @returns {{min_x: number, max_x: number, min_y: number, max_y: number}}
     * @private
     */
    _calculateTileRange(continentRect, bounds, zoom = 7) {
        const tilesAtZoom = Math.pow(2, zoom);
        const buffer = 50;
        const minBX = Math.min(...bounds.map(b => b[0])) - buffer;
        const minBY = Math.min(...bounds.map(b => b[1])) - buffer;
        const maxBX = Math.max(...bounds.map(b => b[0])) + buffer;
        const maxBY = Math.max(...bounds.map(b => b[1])) + buffer;
        return {
            min_x: Math.floor((minBX / continentRect.width) * tilesAtZoom),
            max_x: Math.floor((maxBX / continentRect.width) * tilesAtZoom),
            min_y: Math.floor((minBY / continentRect.height) * tilesAtZoom),
            max_y: Math.floor((maxBY / continentRect.height) * tilesAtZoom)
        };
    }

    /**
     * Reconstruct a GW2Map from cached data
     * @private
     */
    _reconstructMapFromCached(cached) {
        const map = new GW2Map(cached.id, cached.name, cached.continent_id, cached.floor);

        if (cached.tiles) {
            map.setTiles(cached.tiles);
        }

        if (cached.boundary && cached.boundary.points) {
            const boundaryPoints = cached.boundary.points.map(point =>
                new Coordinate(point.x, point.y, point.z || 0)
            );
            const boundary = new MapBoundary(boundaryPoints);
            map.setBoundary(boundary);
        }

        if (cached.rect) {
            map.rect = cached.rect;
        }

        return map;
    }

    /**
     * Serialize a GW2Map for caching
     * @private
     */
    _serializeMap(map) {
        return {
            id: map.id,
            name: map.name,
            continent_id: map.continent_id,
            floor: map.floor,
            tiles: map.tiles,
            boundary: map.boundary ? {
                points: map.boundary.points.map(p => ({
                    x: p.x,
                    y: p.y,
                    z: p.z
                }))
            } : null,
            rect: map.rect
        };
    }
}

export default Gw2MapRepository;
