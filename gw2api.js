
/**
 * @typedef {object} GW2ApiContinent
 * @property {number} id - The continent ID.
 * @property {string} name - The continent name.
 * @property {number[]} continent_dims - The width and height dimensions of the continent.
 * @property {number} min_zoom - The minimal zoom level for use with the map tile service.
 * @property {number} max_zoom - The maximum zoom level for use with the map tile service.
 * @property {number[]} floors -  A list of floors ids available for this continent.
 */

/**
 * @typedef {object} GW2ApiMap
 * @property {number} id - The map ID.
 * @property {string} name - The map name.
 * @property {number} min_level - The minimal level of this map.
 * @property {number} max_level - The maximum level of this map.
 * @property {number} default_floor - The default floor of the map.
 * @property {string} type - The map type (e.g., "Public", "Instance", "Pvp", "WvW", "Tutorial", "Unknown").
 * @property {number[]} floors - A list of available floors for this map.
 * @property {number} region_id - The id of the region this map belongs to.
 * @property {string} [region_name] - The name of the region this map belongs to.
 * @property {number} continent_id - The id of the continent this map belongs to.
 * @property {string} continent_name - The name of the continent this map belongs to.
 * @property {number[][]} map_rect - The dimensions of the map, given as the coordinates of the lower-left (SW) and upper-right (NE) corners.
 * @property {number[][]} continent_rect - The dimensions of the map within the continent coordinate system, given as the coordinates of the upper-left (NW) and lower-right (SE) corners.
 */

/**
 * @typedef {object} GW2ApiMarker
 * @property {number} file_id - The file id to be used with the render service.
 * @property {string} signature - The file signature to be used with the render service.
 */

/**
 * @typedef {object} GW2ApiPointOfInterest
 * @property {number} poi_id - The point of interest id.
 * @property {string} name - The name of the point of interest.
 * @property {string} type - The type: "landmark", "waypoint", or "vista".
 * @property {number} floor - The floor of this object.
 * @property {number[]} coord - The coordinates of this object (x, y).
 * @property {GW2ApiMarker} [marker] - The icon for this point of interest.
 */

/**
 * @typedef {object} GW2ApiGodShrine
 * @property {number} id - The god shrine id.
 * @property {string} name - The name of the god shrine.
 * @property {string} [name_contested] - The name when contested.
 * @property {string} [icon] - The icon for the god shrine.
 * @property {string} [icon_contested] - The icon when contested.
 * @property {number} poi_id - The id for the PoI of the god shrine.
 * @property {number[]} coord - The coordinates of the god shrine (x, y).
 */

/**
 * @typedef {object} GW2ApiTask
 * @property {number} task_id - The renown heart id.
 * @property {string} objective - The objective or name of the heart.
 * @property {number} level - The level of the heart.
 * @property {number[]} coord - The coordinates where it takes place (x, y).
 */

/**
 * @typedef {object} GW2ApiSkillChallenge
 * @property {number[]} coord - The coordinates of this skill challenge (x, y).
 */

/**
 * @typedef {object} GW2ApiSector
 * @property {number} sector_id - The area id.
 * @property {string} name - The name of the area.
 * @property {number} level - The level of the area.
 * @property {number[]} coord - The coordinates of this area, usually the center position (x, y).
 * @property {number[][]} bounds - The bounds of this area, a polygon defined as an array of [x, y] points.
 */

/**
 * @typedef {object} GW2ApiTrainingPoint
 * @property {number} id - The mastery insight id.
 * @property {number[]} coord - The coordinates of the mastery insight marker (x, y).
 * @property {string} name - The name of the mastery insight (usually blank).
 * @property {string} description - The description of the mastery insight (usually blank).
 * @property {string} type - The mastery type: "Tyria", "Maguuma", "Desert", or "Tundra".
 */

/**
 * @typedef {object} GW2ApiAdventureLeaderboard
 * @property {string} guid - The internal id.
 * @property {string} title - The text that appears at the top of the leaderboard window.
 * @property {string} description - The description text below the title in the leaderboard window.
 */

/**
 * @typedef {object} GW2ApiAdventure
 * @property {string} guid - The internal id.
 * @property {number[]} coord - The coordinates of the marker (x, y).
 * @property {string} name - The name of the adventure.
 * @property {GW2ApiAdventureLeaderboard} leaderboard - The associated leaderboard details.
 */

/**
 * @typedef {object} GW2ApiMapFloorMap
 * @property {string} name - The map name.
 * @property {number} min_level - The minimum level of the map.
 * @property {number} max_level - The maximum level of the map.
 * @property {number} default_floor - The default floor of the map.
 * @property {number[][]} map_rect - The dimensions of the map (lower-left and upper-right corners).
 * @property {number[][]} continent_rect - The dimensions within the continent (upper-left and lower-right corners).
 * @property {GW2ApiPointOfInterest[]} points_of_interest - Points of interest (landmarks, waypoints, vistas).
 * @property {GW2ApiGodShrine[]} god_shrines - God shrines.
 * @property {GW2ApiTask[]} tasks - Renown hearts.
 * @property {GW2ApiSkillChallenge[]} skill_challenges - Skill challenges.
 * @property {GW2ApiSector[]} sectors - Areas within the map.
 * @property {GW2ApiTrainingPoint[]} training_points - Mastery insights.
 * @property {GW2ApiAdventure[]} adventures - Adventures within the map.
 */

/**
 * @typedef {object} GW2ApiMapFloorRegion
 * @property {string} name - The region name.
 * @property {number[]} label_coord - The coordinates of the region label (x, y).
 * @property {Object<string, GW2ApiMapFloorMap>} maps - A mapping from map id to map objects.
 */

/**
 * @typedef {object} GW2ApiMapFloor
 * @property {number[]} texture_dims - The dimensions of the texture (width and height).
 * @property {number[][]} [clamped_view] - A rectangle representing the downloadable textures area.
 * @property {Object<string, GW2ApiMapFloorRegion>} regions - A mapping from region id to region objects.
 */

/**
 * Load map data from GW2 API
 * @param {number} id - The map ID
 * @returns {Promise<GW2ApiMap>} Promise that resolves to the map data JSON object
 */
export async function loadGw2Map(id) {
    return await callGw2Api(`v2/maps/${id}`);
}

/**
 * Load continent data from GW2 API
 * @param {number} id Continent ID
 * @returns {Promise<GW2ApiContinent>} Promise that resolves to the continent data JSON object
 */
export async function loadGw2Continent(id) {
    return await callGw2Api(`v2/continents/${id}`);
}

/**
 * Load map data from GW2 API
 * @param {number} continent - The continent ID
 * @param {number} floor - The floor ID
 * @returns {Promise<GW2ApiMapFloor>} Promise that resolves to the map floor data JSON object
 */
export async function loadGw2MapFloor(continent, floor) {
    return await callGw2Api(`v1/map_floor.json?continent_id=${continent}&floor=${floor}`);
}

/**
 * Call GW2 API
 * @param {string} url - The API URL
 * @returns {Promise<Object>} Promise that resolves to the map data JSON object
 */
async function callGw2Api(url) {
    try {
        const cacheKey = `gw2_api_${url}`;

        // Check if data exists in localStorage
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            const cachedWrapper = JSON.parse(cachedData);
            const cacheAge = Date.now() - new Date(cachedWrapper.timestamp).getTime();
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

            if (cacheAge < oneWeekMs) {
                console.log(`Loaded response for '${url}' from cache`, cachedWrapper);
                return cachedWrapper.response;
            } else {
                // Cache is over 1 week old, invalidate it
                localStorage.removeItem(cacheKey);
                console.log(`Cache for '${url}' expired (${Math.floor(cacheAge / (24 * 60 * 60 * 1000))} days old), fetching fresh data`);
            }
        }

        // Fetch from API if not in cache
        const response = await fetch(`https://api.guildwars2.com/${url}`);
        if (!response.ok) {
            throw new Error(`Failed to call API: ${response.statusText}`);
        }
        const jsonResponse = await response.json();
        console.log(`Loaded response for '${url}' from API`, jsonResponse);
        // Store in localStorage with timestamp for future use
        const wrapper = {
            response: jsonResponse,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(cacheKey, JSON.stringify(wrapper));
        return jsonResponse;
    } catch (error) {
        console.error('Error calling GW2 API:', error);
        throw error;
    }
}
