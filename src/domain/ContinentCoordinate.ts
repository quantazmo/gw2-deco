/**
 * ContinentCoordinate - Value Object representing position in continent tile system
 * Continent space uses the GW2 continent tile coordinate system
 */
export class ContinentCoordinate {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.validate(x, y);
        this.x = Number(x);
        this.y = Number(y);
    }

    validate(x: number, y: number): void {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('ContinentCoordinate: x and y must be numbers');
        }
        if (!isFinite(x) || !isFinite(y)) {
            throw new Error('ContinentCoordinate: coordinates must be finite numbers');
        }
    }

    /**
     * Calculate distance to another ContinentCoordinate
     */
    distanceTo(other: ContinentCoordinate): number {
        if (!(other instanceof ContinentCoordinate)) {
            throw new Error('distanceTo requires another ContinentCoordinate');
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if coordinates are equal
     */
    equals(other: unknown): boolean {
        if (!(other instanceof ContinentCoordinate)) {
            return false;
        }
        return this.x === other.x && this.y === other.y;
    }

    /**
     * Create a copy of this coordinate
     */
    clone(): ContinentCoordinate {
        return new ContinentCoordinate(this.x, this.y);
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
        return `ContinentCoordinate(${this.x}, ${this.y})`;
    }

    /**
     * Create from plain object
     */
    static fromObject(obj: { x: number; y: number }): ContinentCoordinate {
        return new ContinentCoordinate(obj.x, obj.y);
    }
}

export default ContinentCoordinate;
