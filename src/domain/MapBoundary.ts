/**
 * MapBoundary - Domain Entity representing the boundary of a map
 * Properties: points (Coordinate[])
 */
class MapBoundary {
    points: Array<{ x: number; y: number }>;

    constructor(points: Array<{ x: number; y: number }> = []) {
        this.validate(points);
        this.points = points.map(p => ({ x: Number(p.x), y: Number(p.y) }));
    }

    validate(points: unknown[]): void {
        if (!Array.isArray(points)) {
            throw new Error('MapBoundary: points must be an array');
        }
        if (points.length < 3) {
            throw new Error('MapBoundary: boundary must have at least 3 points');
        }
        for (let i = 0; i < points.length; i++) {
            const point = points[i] as { x?: unknown; y?: unknown };
            if (typeof point.x !== 'number' || typeof point.y !== 'number') {
                throw new Error(`MapBoundary: point at index ${i} must have x and y numbers`);
            }
            if (!isFinite(point.x) || !isFinite(point.y)) {
                throw new Error(`MapBoundary: point at index ${i} must have finite coordinates`);
            }
        }
    }

    /**
     * Check if a point is contained within the boundary using ray casting algorithm
     */
    contains(point: { x: number; y: number }): boolean {
        if (typeof point.x !== 'number' || typeof point.y !== 'number') {
            throw new Error('MapBoundary.contains: point must have x and y properties');
        }

        let inside = false;
        let p1x = this.points[0].x;
        let p1y = this.points[0].y;

        for (let i = 1; i <= this.points.length; i++) {
            const p2x = this.points[i % this.points.length].x;
            const p2y = this.points[i % this.points.length].y;

            if (point.y > Math.min(p1y, p2y)) {
                if (point.y <= Math.max(p1y, p2y)) {
                    if (point.x <= Math.max(p1x, p2x)) {
                        if (p1y !== p2y) {
                            const xinters = ((point.y - p1y) * (p2x - p1x)) / (p2y - p1y) + p1x;
                            if (p1x === p2x || point.x <= xinters) {
                                inside = !inside;
                            }
                        }
                    }
                }
            }
            p1x = p2x;
            p1y = p2y;
        }

        return inside;
    }

    /**
     * Get the bounding box of the boundary
     */
    getBounds(): { min: { x: number; y: number }; max: { x: number; y: number }; width: number; height: number } {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const point of this.points) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }

        return {
            min: { x: minX, y: minY },
            max: { x: maxX, y: maxY },
            width: maxX - minX,
            height: maxY - minY
        };
    }

    /**
     * Validate the boundary state
     */
    validateState(): { isValid: boolean; errors: string[] } {
        try {
            this.validate(this.points);
            return { isValid: true, errors: [] };
        } catch (error) {
            return { isValid: false, errors: [(error as Error).message] };
        }
    }

    /**
     * Get the centroid of the boundary
     */
    getCentroid(): { x: number; y: number } {
        let sumX = 0;
        let sumY = 0;
        for (const point of this.points) {
            sumX += point.x;
            sumY += point.y;
        }
        return {
            x: sumX / this.points.length,
            y: sumY / this.points.length
        };
    }

    /**
     * Convert to plain object for serialization
     */
    toObject() {
        return {
            points: this.points
        };
    }

    /**
     * Create a copy of this boundary
     */
    clone(): MapBoundary {
        return new MapBoundary([...this.points.map(p => ({ x: p.x, y: p.y }))]);
    }

    /**
     * Check if boundaries are equal
     */
    equals(other: unknown): boolean {
        if (!(other instanceof MapBoundary)) {
            return false;
        }
        if (this.points.length !== other.points.length) {
            return false;
        }
        for (let i = 0; i < this.points.length; i++) {
            if (this.points[i].x !== other.points[i].x || this.points[i].y !== other.points[i].y) {
                return false;
            }
        }
        return true;
    }

    toString() {
        return `MapBoundary(${this.points.length} points)`;
    }

    /**
     * Create from plain object
     */
    static fromObject(obj: { points: Array<{ x: number; y: number }> }): MapBoundary {
        return new MapBoundary(obj.points);
    }
}

export { MapBoundary };
