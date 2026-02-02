/**
 * MapRect Value Object
 * Represents a rectangular boundary defined by minimum and maximum coordinates
 * Encapsulates min/max coordinate logic and bounds operations
 */
export class MapRect {
    minX!: number;
    minY!: number;
    maxX!: number;
    maxY!: number;

    /**
     * Create a new MapRect
     * @param {number|Coordinate} minOrX - Minimum coordinate or X value
     * @param {number|Coordinate} [maxOrY] - Maximum coordinate or Y value
     * @throws {Error} If coordinates are invalid
     * 
     * @example
     * // Using Coordinate objects
     * const rect1 = new MapRect(minCoord, maxCoord);
     * 
     * // Using separate x, y values (requires 4 arguments)
     * const rect2 = new MapRect(0, 0, 100, 100);
     */
    constructor(minOrX: number | { x: number; y: number }, maxOrY?: number | { x: number; y: number }, maxX?: number, maxY?: number) {
        // Support both (Coordinate, Coordinate) and (minX, minY, maxX, maxY) signatures
        if (typeof minOrX === 'object' && minOrX !== null && 'x' in minOrX && 'y' in minOrX) {
            // Using Coordinate objects
            if (typeof maxOrY === 'object' && maxOrY !== null && 'x' in maxOrY && 'y' in maxOrY) {
                this._setFromCoordinates(minOrX, maxOrY);
            } else {
                throw new Error('Invalid MapRect constructor: when using Coordinate objects, both arguments must be Coordinates');
            }
        } else if (typeof minOrX === 'number' && typeof maxOrY === 'number' && typeof maxX === 'number' && typeof maxY === 'number') {
            // Using individual x, y values
            this._setFromValues(minOrX, maxOrY, maxX, maxY);
        } else {
            throw new Error('Invalid MapRect constructor: use either (minCoord, maxCoord) or (minX, minY, maxX, maxY)');
        }
    }

    /**
     * Internal method to initialize from Coordinate objects
     * @private
     */
    private _setFromCoordinates(minCoord: { x: number; y: number }, maxCoord: { x: number; y: number }): void {
        if (minCoord.x > maxCoord.x || minCoord.y > maxCoord.y) {
            throw new Error(`Invalid MapRect: minCoord (${minCoord.x}, ${minCoord.y}) must be <= maxCoord (${maxCoord.x}, ${maxCoord.y})`);
        }
        this.minX = minCoord.x;
        this.minY = minCoord.y;
        this.maxX = maxCoord.x;
        this.maxY = maxCoord.y;
    }

    /**
     * Internal method to initialize from individual values
     * @private
     */
    private _setFromValues(minX: number, minY: number, maxX: number, maxY: number): void {
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
            throw new Error(`Invalid MapRect: all values must be finite numbers. Got (${minX}, ${minY}, ${maxX}, ${maxY})`);
        }
        if (minX > maxX || minY > maxY) {
            throw new Error(`Invalid MapRect: min values (${minX}, ${minY}) must be <= max values (${maxX}, ${maxY})`);
        }
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    /**
     * Create a MapRect from two coordinate pairs
     * @param {number[]} minCoord - [x, y] for minimum corner
     * @param {number[]} maxCoord - [x, y] for maximum corner
     * @returns {MapRect}
     */
    static fromArrays(minCoord: number[], maxCoord: number[]): MapRect {
        if (!Array.isArray(minCoord) || minCoord.length < 2 || !Array.isArray(maxCoord) || maxCoord.length < 2) {
            throw new Error('fromArrays requires two [x, y] arrays');
        }
        return new MapRect(minCoord[0], minCoord[1], maxCoord[0], maxCoord[1]);
    }

    /**
     * Create a MapRect from an object with x, y min/max values
     * @param {Object} obj - Object with minX, minY, maxX, maxY properties
     * @returns {MapRect}
     */
    static fromObject(obj: { minX: number; minY: number; maxX: number; maxY: number }): MapRect {
        if (typeof obj !== 'object' || obj === null || !('minX' in obj) || !('minY' in obj) || !('maxX' in obj) || !('maxY' in obj)) {
            throw new Error('fromObject requires an object with minX, minY, maxX, maxY properties');
        }
        return new MapRect(obj.minX, obj.minY, obj.maxX, obj.maxY);
    }

    /**
     * Get the minimum coordinate corner
     * @returns {{x: number, y: number}} Minimum corner as object
     */
    getMin(): { x: number; y: number } {
        return { x: this.minX, y: this.minY };
    }

    /**
     * Get the maximum coordinate corner
     * @returns {{x: number, y: number}} Maximum corner as object
     */
    getMax(): { x: number; y: number } {
        return { x: this.maxX, y: this.maxY };
    }

    /**
     * Get the width of the rectangle
     * @returns {number}
     */
    getWidth(): number {
        return this.maxX - this.minX;
    }

    /**
     * Get the height of the rectangle
     * @returns {number}
     */
    getHeight(): number {
        return this.maxY - this.minY;
    }

    /**
     * Get the size as {width, height}
     * @returns {{width: number, height: number}}
     */
    getSize(): { width: number; height: number } {
        return {
            width: this.getWidth(),
            height: this.getHeight()
        };
    }

    /**
     * Get the center point
     * @returns {{x: number, y: number}}
     */
    getCenter(): { x: number; y: number } {
        return {
            x: (this.minX + this.maxX) / 2,
            y: (this.minY + this.maxY) / 2
        };
    }

    /**
     * Get the aspect ratio (width / height)
     * @returns {number}
     */
    getAspectRatio(): number {
        const height = this.getHeight();
        if (height === 0) {
            throw new Error('Cannot calculate aspect ratio: height is 0');
        }
        return this.getWidth() / height;
    }

    /**
     * Check if a point is within bounds
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if point is within bounds (inclusive)
     */
    contains(x: number, y: number): boolean {
        return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
    }

    /**
     * Check if a coordinate object is within bounds
     * @param {Object} coord - Object with x, y properties
     * @returns {boolean}
     */
    containsCoord(coord: unknown): boolean {
        if (typeof coord !== 'object' || coord === null || !('x' in coord) || !('y' in coord)) {
            throw new Error('containsCoord requires a coordinate object with x, y properties');
        }
        return this.contains((coord as { x: number; y: number }).x, (coord as { x: number; y: number }).y);
    }

    /**
     * Check if another rect overlaps with this one
     * @param {MapRect} other - The other rectangle
     * @returns {boolean}
     */
    overlaps(other: MapRect): boolean {
        if (!(other instanceof MapRect)) {
            throw new Error('overlaps requires a MapRect instance');
        }
        return !(this.maxX < other.minX || this.minX > other.maxX ||
            this.maxY < other.minY || this.minY > other.maxY);
    }

    /**
     * Check equality with another rect
     * @param {MapRect} other
     * @returns {boolean}
     */
    equals(other: unknown): boolean {
        if (!(other instanceof MapRect)) {
            return false;
        }
        return this.minX === other.minX && this.minY === other.minY &&
            this.maxX === other.maxX && this.maxY === other.maxY;
    }

    /**
     * Create an expanded rectangle with padding
     * @param {number} padding - Padding amount on all sides
     * @returns {MapRect} New rectangle with padding applied
     */
    expand(padding: number): MapRect {
        return new MapRect(
            this.minX - padding,
            this.minY - padding,
            this.maxX + padding,
            this.maxY + padding
        );
    }

    /**
     * Create a new rectangle scaled by a factor around its center
     * @param {number} factor - Scale factor (1 = no change, 2 = double size)
     * @returns {MapRect}
     */
    scale(factor: number): MapRect {
        const center = this.getCenter();
        const halfWidth = this.getWidth() / 2 * factor;
        const halfHeight = this.getHeight() / 2 * factor;
        return new MapRect(
            center.x - halfWidth,
            center.y - halfHeight,
            center.x + halfWidth,
            center.y + halfHeight
        );
    }

    /**
     * Create a new rectangle adjusted to match a target aspect ratio
     * Expands the smaller dimension to match the target ratio
     * @param {number} targetAspect - Target aspect ratio (width / height)
     * @returns {MapRect}
     */
    adjustToAspectRatio(targetAspect: number): MapRect {
        const currentAspect = this.getAspectRatio();
        const center = this.getCenter();
        const width = this.getWidth();
        const height = this.getHeight();

        let newWidth = width;
        let newHeight = height;

        if (currentAspect > targetAspect) {
            // Current is wider than target, expand height
            newHeight = width / targetAspect;
        } else {
            // Current is narrower than target, expand width
            newWidth = height * targetAspect;
        }

        const halfNewWidth = newWidth / 2;
        const halfNewHeight = newHeight / 2;

        return new MapRect(
            center.x - halfNewWidth,
            center.y - halfNewHeight,
            center.x + halfNewWidth,
            center.y + halfNewHeight
        );
    }

    /**
     * Convert to object representation
     * @returns {Object}
     */
    toObject() {
        return {
            minX: this.minX,
            minY: this.minY,
            maxX: this.maxX,
            maxY: this.maxY
        };
    }

    /**
     * Get string representation
     * @returns {string}
     */
    toString() {
        return `MapRect(min: (${this.minX}, ${this.minY}), max: (${this.maxX}, ${this.maxY}))`;
    }
}
