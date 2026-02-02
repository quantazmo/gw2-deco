/**
 * MapCoordinate - Value Object representing position in local map space
 * Map space is the local coordinate system of a specific map
 */
export class MapCoordinate {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.validate(x, y);
        this.x = Number(x);
        this.y = Number(y);
    }

    validate(x: number, y: number): void {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('MapCoordinate: x and y must be numbers');
        }
        if (!isFinite(x) || !isFinite(y)) {
            throw new Error('MapCoordinate: coordinates must be finite numbers');
        }
    }

    /**
     * Calculate distance to another MapCoordinate
     */
    distanceTo(other: MapCoordinate): number {
        if (!(other instanceof MapCoordinate)) {
            throw new Error('distanceTo requires another MapCoordinate');
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if coordinates are equal
     */
    equals(other: unknown): boolean {
        if (!(other instanceof MapCoordinate)) {
            return false;
        }
        return this.x === other.x && this.y === other.y;
    }

    /**
     * Create a copy of this coordinate
     */
    clone(): MapCoordinate {
        return new MapCoordinate(this.x, this.y);
    }

    /**
     * Convert to plain object for serialization
     */
    toObject() {
        return {
            x: this.x,
            y: this.y
        };
    }

    toString() {
        return `MapCoordinate(${this.x}, ${this.y})`;
    }

    /**
     * Create from plain object
     */
    static fromObject(obj: { x: number; y: number }): MapCoordinate {
        return new MapCoordinate(obj.x, obj.y);
    }
}

export default MapCoordinate;
