/**
 * LayerId - Value Object representing a layer identifier with validation
 */
export class LayerId {
    id: string;

    constructor(id: string | number) {
        this.validate(id);
        this.id = String(id).trim();
    }

    validate(id: string | number): void {
        if (typeof id !== 'string' && typeof id !== 'number') {
            throw new Error('LayerId: id must be a string or number');
        }
        const idString = String(id).trim();
        if (idString.length === 0) {
            throw new Error('LayerId: id cannot be empty');
        }
        if (idString.length > 256) {
            throw new Error('LayerId: id cannot exceed 256 characters');
        }
    }

    /**
     * Check if layer ids are equal
     */
    equals(other: unknown): boolean {
        if (!(other instanceof LayerId)) {
            return false;
        }
        return this.id === other.id;
    }

    /**
     * Create a copy of this layer id
     */
    clone(): LayerId {
        return new LayerId(this.id);
    }

    /**
     * Get the string value
     */
    getValue(): string {
        return this.id;
    }

    /**
     * Convert to plain object for serialization
     */
    toObject() {
        return {
            id: this.id
        };
    }

    toString() {
        return this.id;
    }

    /**
     * Create from plain object
     */
    static fromObject(obj: { id: string }): LayerId {
        return new LayerId(obj.id);
    }
}

export default LayerId;
