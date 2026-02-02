/**
 * ZoomLevel - Value Object representing a zoom scale factor with min/max validation
 */
export class ZoomLevel {
    scale: number;
    min: number;
    max: number;

    constructor(scale: number, min: number = 0.1, max: number = 10) {
        this.validate(scale, min, max);
        this.scale = Number(scale);
        this.min = Number(min);
        this.max = Number(max);
    }

    validate(scale: number, min: number, max: number): void {
        if (typeof scale !== 'number' || typeof min !== 'number' || typeof max !== 'number') {
            throw new Error('ZoomLevel: scale, min, and max must be numbers');
        }
        if (!isFinite(scale) || !isFinite(min) || !isFinite(max)) {
            throw new Error('ZoomLevel: values must be finite numbers');
        }
        if (min >= max) {
            throw new Error('ZoomLevel: min must be less than max');
        }
        if (scale < min || scale > max) {
            throw new Error(`ZoomLevel: scale must be between ${min} and ${max}`);
        }
    }

    /**
     * Check if zoom level is at minimum
     */
    isAtMinimum(): boolean {
        return this.scale === this.min;
    }

    /**
     * Check if zoom level is at maximum
     */
    isAtMaximum(): boolean {
        return this.scale === this.max;
    }

    /**
     * Create a new ZoomLevel with a different scale (respects bounds)
     */
    withScale(newScale: number): ZoomLevel {
        const constrained = Math.max(this.min, Math.min(this.max, newScale));
        return new ZoomLevel(constrained, this.min, this.max);
    }

    /**
     * Check if zoom levels are equal
     */
    equals(other: unknown): boolean {
        if (!(other instanceof ZoomLevel)) {
            return false;
        }
        return this.scale === other.scale &&
            this.min === other.min &&
            this.max === other.max;
    }

    /**
     * Create a copy of this zoom level
     */
    clone(): ZoomLevel {
        return new ZoomLevel(this.scale, this.min, this.max);
    }

    /**
     * Convert to plain object for serialization
     */
    toObject() {
        return {
            scale: this.scale,
            min: this.min,
            max: this.max
        };
    }

    toString() {
        return `ZoomLevel(${this.scale.toFixed(2)}, range: ${this.min.toFixed(2)}-${this.max.toFixed(2)})`;
    }

    /**
     * Create from plain object
     */
    static fromObject(obj: { scale: number; min: number; max: number }): ZoomLevel {
        return new ZoomLevel(obj.scale, obj.min, obj.max);
    }
}

export default ZoomLevel;
