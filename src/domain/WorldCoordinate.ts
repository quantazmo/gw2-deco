/**
 * WorldCoordinate - Value Object representing absolute world position in GW2
 * Includes x, y coordinates and rotation
 */
export interface WorldCoordinateLike {
    x: number;
    y: number;
    z?: number;
    rotation?: number;
}

class WorldCoordinate {
    x: number;
    y: number;
    z: number;
    rotation: number;

    constructor(x: number, y: number, z: number = 0, rotation: number = 0) {
        this.validate(x, y, z, rotation);
        this.x = Number(x);
        this.y = Number(y);
        this.z = Number(z);
        this.rotation = Number(rotation);
    }

    validate(x: number, y: number, z: number, rotation: number): void {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new Error('WorldCoordinate: x and y must be numbers');
        }
        if (typeof z !== 'number' || typeof rotation !== 'number') {
            throw new Error('WorldCoordinate: z and rotation must be numbers');
        }
        if (!isFinite(x) || !isFinite(y) || !isFinite(z) || !isFinite(rotation)) {
            throw new Error('WorldCoordinate: coordinates must be finite numbers');
        }
    }

    /**
     * Calculate distance to another WorldCoordinate (3D Euclidean distance)
     */
    distanceTo(other: WorldCoordinate): number {
        if (!(other instanceof WorldCoordinate)) {
            throw new Error('distanceTo requires another WorldCoordinate');
        }
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dz = this.z - other.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Check if coordinates are equal
     */
    equals(other: unknown): boolean {
        if (!(other instanceof WorldCoordinate)) {
            return false;
        }
        return this.x === other.x &&
            this.y === other.y &&
            this.z === other.z &&
            this.rotation === other.rotation;
    }

    /**
     * Create a copy of this coordinate
     */
    clone(): WorldCoordinate {
        return new WorldCoordinate(this.x, this.y, this.z, this.rotation);
    }

    /**
     * Convert to plain object for serialization
     */
    toObject(): { x: number; y: number; z: number; rotation: number } {
        return {
            x: this.x,
            y: this.y,
            z: this.z,
            rotation: this.rotation
        };
    }

    toString(): string {
        return `WorldCoordinate(${this.x}, ${this.y}, ${this.z}, rotation: ${this.rotation})`;
    }

    static fromObject(obj: WorldCoordinateLike): WorldCoordinate {
        return new WorldCoordinate(obj.x, obj.y, obj.z ?? 0, obj.rotation ?? 0);
    }
}

export { WorldCoordinate };
