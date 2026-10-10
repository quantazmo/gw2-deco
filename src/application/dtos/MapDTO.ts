/**
 * Data Transfer Object for Map
 */
import { GW2Map } from '../../domain/GW2Map.ts';

export class MapDTO {
    id: string;
    name: string;
    boundary: Array<{ x: number; y: number }>;
    continentId: number;
    floor: number;
    tiles: Array<{ x: number; y: number; z?: number }>;

    constructor(id: string, name: string, boundary: Array<{ x: number; y: number }>, continentId: number, floor: number, tiles: Array<{ x: number; y: number; z?: number }> = []) {
        this.id = id;
        this.name = name;
        this.boundary = boundary;
        this.continentId = continentId;
        this.floor = floor;
        this.tiles = tiles;
    }

    /**
     * Creates a MapDTO from a GW2Map domain entity
     * @param {GW2Map} map - The domain entity
     * @returns {MapDTO}
     */
    static fromDomain(map: GW2Map): MapDTO {
        if (!map.boundary) {
            throw new Error('MapDTO.fromDomain: map boundary is required');
        }

        const boundaryPoints = map.boundary.points.map(point => ({
            x: point.x,
            y: point.y
        }));

        const tiles = map.tiles.map((tile, index) => {
            if (!tile || typeof tile !== 'object') {
                throw new Error(`MapDTO.fromDomain: tile at index ${index} must be an object`);
            }
            const tileData = tile as { x?: unknown; y?: unknown; z?: unknown };
            if (typeof tileData.x !== 'number' || typeof tileData.y !== 'number') {
                throw new Error(`MapDTO.fromDomain: tile at index ${index} must have numeric x and y`);
            }
            return {
                x: tileData.x,
                y: tileData.y,
                ...(typeof tileData.z === 'number' ? { z: tileData.z } : {})
            };
        });

        return new MapDTO(
            String(map.id),
            map.name,
            boundaryPoints,
            map.continent_id,
            map.floor,
            tiles
        );
    }

    /**
     * Converts the DTO to JSON
     * @returns {object}
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            boundary: this.boundary,
            continentId: this.continentId,
            floor: this.floor,
            tiles: this.tiles
        };
    }
}

export default MapDTO;
