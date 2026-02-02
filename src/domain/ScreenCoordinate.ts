/**
 * ScreenCoordinate - Value Object representing position in SVG viewport space
 * Screen space is the visual representation coordinates in the HTML/SVG viewport
 */
export class ScreenCoordinate {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.validate(x, y);
        this.x = Number(x);
        this.y = Number(y);
    }

    validate(x: number, y: number): void {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('ScreenCoordinate: x and y must be numbers');
        }
        if (!isFinite(x) || !isFinite(y)) {
            throw new Error('ScreenCoordinate: coordinates must be finite numbers');
        }
    }

    /**
     * Calculate distance to another ScreenCoordinate
     */
    distanceTo(other: ScreenCoordinate): number {
        if (!(other instanceof ScreenCoordinate)) {
            throw new Error('distanceTo requires another ScreenCoordinate');
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if coordinates are equal
     */
    equals(other: unknown): boolean {
        if (!(other instanceof ScreenCoordinate)) {
            return false;
        }
        return this.x === other.x && this.y === other.y;
    }

    /**
     * Create a copy of this coordinate
     */
    clone(): ScreenCoordinate {
        return new ScreenCoordinate(this.x, this.y);
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
        return `ScreenCoordinate(${this.x}, ${this.y})`;
    }

    /**
     * Create from plain object
     */
    static fromObject(obj: { x: number; y: number }): ScreenCoordinate {
        return new ScreenCoordinate(obj.x, obj.y);
    }
}

export default ScreenCoordinate;
