/**
 * Data Transfer Object for Map
 */
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
    static fromDomain(map: { id: string; name: string; boundary: { points: Array<{ x: number; y: number }> }; tiles: Array<{ x: number; y: number; z?: number }>; continent_id: number; floor: number }): MapDTO {
        const boundaryPoints = map.boundary.points.map(p => ({
            x: p.x,
            y: p.y
        }));

        const tiles = map.tiles.map(t => ({
            x: t.x,
            y: t.y,
            z: t.z
        }));

        return new MapDTO(
            map.id,
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
