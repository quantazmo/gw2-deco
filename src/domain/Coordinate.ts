/**
 * Coordinate Value Object
 * Represents a 2D point with x and y coordinates
 * Replaces ad-hoc [x, y] arrays with a typed, validated object
 */
export class Coordinate {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        if (typeof x !== 'number' || !isFinite(x)) {
            throw new Error(`Invalid x coordinate: ${x}. Must be a finite number.`);
        }
        if (typeof y !== 'number' || !isFinite(y)) {
            throw new Error(`Invalid y coordinate: ${y}. Must be a finite number.`);
        }

        this.x = x;
        this.y = y;
    }

    /**
     * Create a Coordinate from an array [x, y]
     * @param {number[]} arr - Array with [x, y] values
     * @returns {Coordinate}
     * @throws {Error} If array format is invalid
     */
    static fromArray(arr: number[]): Coordinate {
        if (!Array.isArray(arr) || arr.length < 2) {
            throw new Error(`Invalid array format for Coordinate. Expected [x, y], got ${JSON.stringify(arr)}`);
        }
        return new Coordinate(arr[0], arr[1]);
    }

    /**
     * Create a Coordinate from an object
     * @param {Object} obj - Object with x and y properties
     * @returns {Coordinate}
     * @throws {Error} If object format is invalid
     */
    static fromObject(obj: { x: number; y: number }): Coordinate {
        if (typeof obj !== 'object' || obj === null || !('x' in obj) || !('y' in obj)) {
            throw new Error(`Invalid object format for Coordinate. Expected {x, y}, got ${JSON.stringify(obj)}`);
        }
        return new Coordinate(obj.x, obj.y);
    }

    /**
     * Convert to array representation [x, y]
     * @returns {number[]}
     */
    toArray(): number[] {
        return [this.x, this.y];
    }

    /**
     * Convert to object representation {x, y}
     * @returns {{x: number, y: number}}
     */
    toObject(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    /**
     * Calculate the distance to another coordinate
     * @param {Coordinate} other - The other coordinate
     * @returns {number} The Euclidean distance
     * @throws {Error} If other is not a Coordinate instance
     */
    distanceTo(other: Coordinate): number {
        if (!(other instanceof Coordinate)) {
            throw new Error('distanceTo requires a Coordinate instance');
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if this coordinate equals another
     * @param {Coordinate} other - The other coordinate
     * @returns {boolean}
     * @throws {Error} If other is not a Coordinate instance
     */
    equals(other: unknown): boolean {
        if (!(other instanceof Coordinate)) {
            throw new Error('equals requires a Coordinate instance');
        }
        return this.x === other.x && this.y === other.y;
    }

    /**
     * Create a new coordinate with offset values
     * @param {number} dx - X offset
     * @param {number} dy - Y offset
     * @returns {Coordinate} New coordinate with applied offset
     */
    translate(dx: number, dy: number): Coordinate {
        return new Coordinate(this.x + dx, this.y + dy);
    }

    /**
     * Create a new coordinate scaled by a factor
     * @param {number} factor - Scale factor
     * @returns {Coordinate} New scaled coordinate
     */
    scale(factor: number): Coordinate {
        return new Coordinate(this.x * factor, this.y * factor);
    }

    /**
     * Get string representation
     * @returns {string}
     */
    toString(): string {
        return `(${this.x}, ${this.y})`;
    }
}
