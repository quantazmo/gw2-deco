/**
 * CoordinateConversionService - Domain Service for converting between coordinate systems
 * Handles: continent ↔ map ↔ screen conversions
 */
import { MapCoordinate } from './MapCoordinate.ts';
import { ScreenCoordinate } from './ScreenCoordinate.ts';
import { ContinentCoordinate } from './ContinentCoordinate.ts';

type ZoomState = { xZoom: number; yZoom: number; xPan?: number; yPan?: number };
type Scale = { x: number; y: number };
type GW2Rect = [number[], number[]];

export class CoordinateConversionService {
    /**
     * Convert continent coordinates to map coordinates using the GW2 affine transform.
     * @param {ContinentCoordinate} continentCoord - Coordinate in continent system
     * @param {Object} mapFloorData - Map floor data from API containing continent_rect and map_rect
     *   continent_rect: [[nw_x, nw_y], [se_x, se_y]] — the map's bounding box in continent space
     *   map_rect:       [[bl_x, bl_y], [tr_x, tr_y]] — the map's bounding box in map-local space
     * @returns {MapCoordinate} - Coordinate in map local space
     */
    static continentToMap(continentCoord: ContinentCoordinate, mapFloorData: Record<string, unknown>): MapCoordinate {
        if (!continentCoord || typeof continentCoord.x !== 'number') {
            throw new Error('CoordinateConversionService.continentToMap: invalid continentCoord');
        }
        if (!mapFloorData) {
            throw new Error('CoordinateConversionService.continentToMap: mapFloorData is required');
        }

        const continentRect = mapFloorData.continent_rect as GW2Rect;
        const mapRect = mapFloorData.map_rect as GW2Rect;
        if (!continentRect || !mapRect) {
            throw new Error('CoordinateConversionService.continentToMap: mapFloorData must contain continent_rect and map_rect');
        }

        // GW2 API format: [[nw_x, nw_y], [se_x, se_y]]
        const [cont_nw, cont_se] = continentRect;
        const [map_bl, map_tr] = mapRect;

        const contWidth = cont_se[0] - cont_nw[0];
        const contHeight = cont_nw[1] - cont_se[1];
        const mapWidth = map_tr[0] - map_bl[0];
        const mapHeight = map_tr[1] - map_bl[1];

        // Normalise into [0,1] then scale into map-local space
        const norm_x = (continentCoord.x - cont_nw[0]) / contWidth;
        const norm_y = (cont_nw[1] - continentCoord.y) / contHeight;

        const mapX = map_bl[0] + norm_x * mapWidth;
        const mapY = map_bl[1] + (1 - norm_y) * mapHeight;

        return new MapCoordinate(mapX, mapY);
    }

    /**
     * Convert map coordinates to screen coordinates
     * @param {MapCoordinate} mapCoord - Coordinate in map local space
     * @param {Object} zoomState - {xZoom, yZoom, xPan, yPan}
     * @param {Object} scale - {x: scaleX, y: scaleY} - pixels per map unit
     * @returns {ScreenCoordinate} - Coordinate in SVG viewport space
     */
    static mapToScreen(mapCoord: MapCoordinate, zoomState: ZoomState, scale: Scale): ScreenCoordinate {
        if (!mapCoord || typeof mapCoord.x !== 'number') {
            throw new Error('CoordinateConversionService.mapToScreen: invalid mapCoord');
        }
        if (!zoomState) {
            throw new Error('CoordinateConversionService.mapToScreen: zoomState is required');
        }
        if (!scale) {
            throw new Error('CoordinateConversionService.mapToScreen: scale is required');
        }

        // Apply scale and zoom, then pan offset
        const screenX = (mapCoord.x * scale.x * zoomState.xZoom) + (zoomState.xPan || 0);
        const screenY = (mapCoord.y * scale.y * zoomState.yZoom) + (zoomState.yPan || 0);

        return new ScreenCoordinate(screenX, screenY);
    }

    /**
     * Convert screen coordinates to map coordinates
     * @param {ScreenCoordinate} screenCoord - Coordinate in SVG viewport space
     * @param {Object} zoomState - {xZoom, yZoom, xPan, yPan}
     * @param {Object} scale - {x: scaleX, y: scaleY} - pixels per map unit
     * @returns {MapCoordinate} - Coordinate in map local space
     */
    static screenToMap(screenCoord: ScreenCoordinate, zoomState: ZoomState, scale: Scale): MapCoordinate {
        if (!screenCoord || typeof screenCoord.x !== 'number') {
            throw new Error('CoordinateConversionService.screenToMap: invalid screenCoord');
        }
        if (!zoomState) {
            throw new Error('CoordinateConversionService.screenToMap: zoomState is required');
        }
        if (!scale) {
            throw new Error('CoordinateConversionService.screenToMap: scale is required');
        }

        // Reverse the transformation: undo pan, zoom, and scale
        const mapX = (screenCoord.x - (zoomState.xPan || 0)) / (scale.x * zoomState.xZoom);
        const mapY = (screenCoord.y - (zoomState.yPan || 0)) / (scale.y * zoomState.yZoom);

        return new MapCoordinate(mapX, mapY);
    }

    /**
     * Convert map coordinates to continent coordinates (inverse of continentToMap).
     * @param {MapCoordinate} mapCoord - Coordinate in map local space
     * @param {Object} mapFloorData - Map floor data from API containing continent_rect and map_rect
     * @returns {ContinentCoordinate} - Coordinate in continent system
     */
    static mapToContinent(mapCoord: MapCoordinate, mapFloorData: Record<string, unknown>): ContinentCoordinate {
        if (!mapCoord || typeof mapCoord.x !== 'number') {
            throw new Error('CoordinateConversionService.mapToContinent: invalid mapCoord');
        }
        if (!mapFloorData) {
            throw new Error('CoordinateConversionService.mapToContinent: mapFloorData is required');
        }

        const continentRect2 = mapFloorData.continent_rect as GW2Rect;
        const mapRect2 = mapFloorData.map_rect as GW2Rect;
        if (!continentRect2 || !mapRect2) {
            throw new Error('CoordinateConversionService.mapToContinent: mapFloorData must contain continent_rect and map_rect');
        }

        const [cont_nw, cont_se] = continentRect2;
        const [map_bl, map_tr] = mapRect2;

        const contWidth = cont_se[0] - cont_nw[0];
        const contHeight = cont_nw[1] - cont_se[1];
        const mapWidth = map_tr[0] - map_bl[0];
        const mapHeight = map_tr[1] - map_bl[1];

        // Reverse the affine transform
        const norm_x = (mapCoord.x - map_bl[0]) / mapWidth;
        const norm_y = 1 - (mapCoord.y - map_bl[1]) / mapHeight;

        const continentX = cont_nw[0] + norm_x * contWidth;
        const continentY = cont_nw[1] - norm_y * contHeight;

        return new ContinentCoordinate(continentX, continentY);
    }

    /**
     * Convert world coordinates to map coordinates
     * World coordinates are typically the same as continent coordinates in GW2
     * @param {WorldCoordinate} worldCoord - Coordinate in world space
     * @param {Object} mapFloorData - Map floor data from API with bounds/tiles info
     * @returns {MapCoordinate} - Coordinate in map local space
     */
    static worldToMap(worldCoord: { x: number; y: number }, mapFloorData: Record<string, unknown>): MapCoordinate {
        if (!worldCoord || typeof worldCoord.x !== 'number') {
            throw new Error('CoordinateConversionService.worldToMap: invalid worldCoord');
        }
        if (!mapFloorData) {
            throw new Error('CoordinateConversionService.worldToMap: mapFloorData is required');
        }

        type BoundsLike = { min: { x: number; y: number }; max: { x: number; y: number } };
        let bounds = (mapFloorData.bounds || mapFloorData.rect) as BoundsLike | number[][] | null;
        if (!bounds) {
            throw new Error('CoordinateConversionService.worldToMap: mapFloorData must contain bounds/rect');
        }

        // Handle GW2 API array format: [[minX, maxY], [maxX, minY]]
        if (Array.isArray(bounds)) {
            const arrBounds = bounds as number[][];
            if (arrBounds.length !== 2 || !Array.isArray(arrBounds[0]) || !Array.isArray(arrBounds[1])) {
                throw new Error('CoordinateConversionService.worldToMap: invalid rect array format');
            }
            bounds = {
                min: { x: arrBounds[0][0], y: arrBounds[1][1] },
                max: { x: arrBounds[1][0], y: arrBounds[0][1] }
            };
        }

        const b = bounds as BoundsLike;
        if (!b.min || !b.max) {
            throw new Error('CoordinateConversionService.worldToMap: mapFloorData must contain bounds/rect');
        }

        // Convert world coords to map local coords (same as continent to map)
        const mapX = worldCoord.x - b.min.x;
        const mapY = worldCoord.y - b.min.y;

        return new MapCoordinate(mapX, mapY);
    }
}

export default CoordinateConversionService;
