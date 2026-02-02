import { loadGw2Map, loadGw2Continent, loadGw2MapFloor } from './gw2api.js';


/**
 * @typedef {object} GW2Map
 * @property {number} id - The map ID.
 * @property {string} name - The map name.
 * @property {number[][]} map_rect - The dimensions of the map, given as the coordinates of the lower-left (SW) and upper-right (NE) corners.
 * @property {Point[]} boundary - The dimensions of the map, given as the coordinates of the lower-left (SW) and upper-right (NE) corners.
 * @property {Point[]} tiles - Array of tile coordinates needed to cover the map.
 */

/**
 * @typedef {object} Rect
 * @property {number} width - The width of the rectangle.
 * @property {number} height - The height of the rectangle.
 */

/**
 * @typedef {object} Point
 * @property {number} x - The X coordinate.
 * @property {number} y - The Y coordinate.
 * @property {number} z - The Z coordinate.
 */

/**
 * @typedef {object} Decoration
 * @property {number} id - The decoration ID.
 * @property {string} name - The decoration name.
 * @property {Point} position - The position of the decoration.
 * @property {Point} rotation - The rotation of the decoration.
 * @property {number} scale - The scale of the decoration.
 */

/**
 * @typedef {object} GW2Template
 * @property {number} id - The map ID.
 * @property {string} name - The map name.
 * @property {Decoration[]} decorations - Array of decorations on the map.
 */


/**
 * 
 * @param {number} mapId 
 * @returns {Promise<GW2Map>}
 */
export async function loadMap(mapId) {
    const mapJson = await loadGw2Map(mapId);
    const mapFloor = mapJson.floors.find(floor => floor !== mapJson.default_floor) ?? mapJson.floors[mapJson.floors.length - 1];
    const continentJson = await loadGw2Continent(mapJson.continent_id);
    // const continent_rect = { width: continentJson.continent_dims[0], height: continentJson.continent_dims[1] };
    const continentRect = { width: 32768, height: 32768 }; // Hardcoded for now. 

    const continentFloorJson = await loadGw2MapFloor(mapJson.continent_id, mapFloor);
    const mapFloorJson = continentFloorJson.regions[mapJson.region_id].maps[mapId];
    console.log('Map Floor Region:', mapFloorJson);

    const bounds = mapFloorJson.sectors[0].bounds;

    const continentToMapConverter = createCoordinateConverter(mapFloorJson.continent_rect, mapFloorJson.map_rect);
    const convertedBounds = bounds.map(b => continentToMapConverter(b));

    const continentTileSize = continentRect.width / Math.pow(2, 7);
    console.log('Continent Tile Size:', continentTileSize);
    const { x: mapTileX1, y: _mapTileY1 } = continentToMapConverter([0, 0]);
    const { x: mapTileX2, y: _mapTileY2 } = continentToMapConverter([continentTileSize, continentTileSize]);
    const mapTileSize = mapTileX2 - mapTileX1;
    const tiles = [];
    const tileRange = calculateTilesForMap(continentRect, bounds, 7);
    for (let x = tileRange.min_x; x <= tileRange.max_x; x++) {
        for (let y = tileRange.min_y; y <= tileRange.max_y; y++) {
            const contX = x * (continentRect.width / Math.pow(2, 7));
            const contY = (1 + y) * (continentRect.height / Math.pow(2, 7));
            const mapCoords = continentToMapConverter([contX, contY]);
            tiles.push({
                mapTile: { x, y },
                mapCoords,
                tileSize: mapTileSize,
                url: getTileUrl(mapJson.continent_id, mapJson.default_floor, 7, x, y)
            });
        }
    }

    return {
        id: mapJson.id,
        name: mapJson.name,
        map_rect: mapJson.map_rect,
        boundary: convertedBounds,
        continent_id: mapJson.continent_id,
        floor: mapJson.default_floor,
        tiles: tiles,
    };
}

/**
 * Create a coordinate converter from continent coordinates to map coordinates
 * @param {number[][]} continentCoords - [[nw_x, nw_y], [se_x, se_y]] upper-left and lower-right corners
 * @param {number[][]} mapCoords - [[bl_x, bl_y], [tr_x, tr_y]] lower-left and upper-right corners
 * @returns {function} A converter function that transforms a single point from continent to map coordinates
 */
export function createCoordinateConverter(continentCoords, mapCoords) {
    const [cont_nw, cont_se] = continentCoords;
    const [map_bl, map_tr] = mapCoords;
    const contRect = { width: cont_se[0] - cont_nw[0], height: cont_nw[1] - cont_se[1] };
    const mapRect = { width: map_tr[0] - map_bl[0], height: map_tr[1] - map_bl[1] };

    return function convertCoordinate([cont_x, cont_y]) {
        // Normalize continent coordinates to [0, 1]
        const norm_x = (cont_x - cont_nw[0]) / contRect.width;
        const norm_y = (cont_nw[1] - cont_y) / contRect.height;

        // Scale to map coordinates
        const map_x = map_bl[0] + norm_x * mapRect.width;
        const map_y = map_bl[1] + (1 - norm_y) * mapRect.height;

        return { x: map_x, y: map_y };
    };
}

/**
 * Calculate the tile range needed to cover a map
 * @param {Rect} continentRect 
 * @param {number[][]} bounds 
 * @param {number} zoom 
 * @returns 
 */
export function calculateTilesForMap(continentRect, bounds, zoom = 7) {
    const tiles_at_zoom = Math.pow(2, zoom);
    const buffer = 50;
    const bounds_min_x = Math.min(...bounds.map(b => b[0])) - buffer;
    const bounds_min_y = Math.min(...bounds.map(b => b[1])) - buffer;
    const bounds_max_x = Math.max(...bounds.map(b => b[0])) + buffer;
    const bounds_max_y = Math.max(...bounds.map(b => b[1])) + buffer;

    // Normalize to tile coordinates
    const min_x = Math.floor((bounds_min_x / continentRect.width) * tiles_at_zoom);
    const max_x = Math.floor((bounds_max_x / continentRect.width) * tiles_at_zoom);
    const min_y = Math.floor((bounds_min_y / continentRect.height) * tiles_at_zoom);
    const max_y = Math.floor((bounds_max_y / continentRect.height) * tiles_at_zoom);

    return {
        min_x, max_x, min_y, max_y
    }
}

let tileSubdomainIndex = 0;

/**
 * Get the URL for a map tile from the GW2 tile service
 * @param {number} continent_id - The continent ID
 * @param {number} floor - The floor ID
 * @param {number} zoom - The zoom level
 * @param {number} x - The tile X coordinate
 * @param {number} y - The tile Y coordinate
 * @returns {string} The tile URL
 */
function getTileUrl(continent_id, floor, zoom, x, y) {
    const subdomain = tileSubdomainIndex % 4 + 1;
    tileSubdomainIndex++;
    return `https://tiles${subdomain}.guildwars2.com/${continent_id}/${floor}/${zoom}/${x}/${y}.jpg`;
}