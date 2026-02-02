/**
 * Decoration - Domain Entity representing a single decoration item
 *
 * `id`  — the prop-type id from the GW2 XML file (`<prop id="419">`).
 *         Numeric string, stable across loads, used for XML export.
 *         Multiple instances of the same prop share the same `id`.
 * `uid` — unique internal instance identifier (auto-incrementing counter).
 *         Used as the Map key in Layer and for selection/DOM tracking.
 *         NOT exported to the GW2 XML file.
 *
 * For decorations not created from XML (tests, manual add) `uid` defaults
 * to the same value as `id` so existing lookup paths continue to work.
 */
import { WorldCoordinate, WorldCoordinateLike } from './WorldCoordinate.ts';

/** Module-level counter; incremented each time a unique uid is needed. */
let _uidCounter = 0;

class Decoration {
    id: string;   // XML prop-type id (e.g. "419") — exported
    uid: string;  // unique instance id (counter) — internal only
    name: string;
    position: WorldCoordinate;
    rotation: number;
    rotX: number;
    rotZ: number;
    scale: number;

    constructor(id: string | number, name: string, position: WorldCoordinate | WorldCoordinateLike, rotation: number = 0, scale: number = 1) {
        const idStr = String(id).trim();
        this.validate(idStr, name, position, rotation, scale);
        this.id = idStr;
        this.uid = idStr; // same as id by default; overridden by Decoration.create()

        this.name = String(name).trim();

        if (position instanceof WorldCoordinate) {
            this.position = position;
        } else if (position && typeof (position as { x?: unknown }).x === 'number' && typeof (position as { y?: unknown }).y === 'number') {
            const p = position as WorldCoordinateLike;
            this.position = new WorldCoordinate(p.x, p.y, p.z || 0, p.rotation || 0);
        } else {
            throw new Error('Decoration: position must be a WorldCoordinate or plain object with x, y');
        }

        this.rotation = Number(rotation);
        this.rotX = 0;
        this.rotZ = 0;
        this.scale = Number(scale);
    }

    /**
     * Factory for XML-loaded decorations.
     * Sets `id` to the XML prop-type id and assigns a new counter-based `uid`
     * so that multiple props of the same type can coexist in a Layer.
     */
    static create(propTypeId: number | string, name: string, position: WorldCoordinate | WorldCoordinateLike, rotation: number = 0, scale: number = 1): Decoration {
        const d = new Decoration(String(propTypeId), name, position, rotation, scale);
        d.uid = String(++_uidCounter);
        return d;
    }

    validate(id: string | number, name: string, position: unknown, rotation: number, scale: number): void {
        if (typeof id !== 'string' && typeof id !== 'number') {
            throw new Error('Decoration: id must be a string or number');
        }
        if (String(id).trim().length === 0) {
            throw new Error('Decoration: id cannot be empty');
        }
        if (typeof name !== 'string') {
            throw new Error('Decoration: name must be a string');
        }
        if (String(name).trim().length === 0) {
            throw new Error('Decoration: name cannot be empty');
        }
        const pos = position as { x?: unknown; y?: unknown };
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
            throw new Error('Decoration: position must be a WorldCoordinate with x and y properties');
        }
        if (!isFinite(rotation)) {
            throw new Error('Decoration: rotation must be a finite number');
        }
        if (!isFinite(scale) || scale <= 0) {
            throw new Error('Decoration: scale must be a positive finite number');
        }
    }

    /**
     * Validate the decoration state
     */
    validateState(): { isValid: boolean; errors: string[] } {
        try {
            this.validate(this.id, this.name, this.position, this.rotation, this.scale);
            return { isValid: true, errors: [] };
        } catch (error) {
            return { isValid: false, errors: [(error as Error).message] };
        }
    }

    /**
     * Convert to data transfer object
     */
    toDTO(): Record<string, unknown> {
        return {
            id: this.id,
            uid: this.uid, // internal tracking id — persisted for undo/restore but NOT in XML export
            name: this.name,
            position: this.position.toObject(),
            rotation: this.rotation,
            rotX: this.rotX,
            rotZ: this.rotZ,
            scale: this.scale
        };
    }

    /**
     * Check if decorations are equal
     */
    equals(other: unknown): boolean {
        if (!(other instanceof Decoration)) {
            return false;
        }
        return this.id === other.id &&
            this.name === other.name &&
            this.position.equals(other.position) &&
            this.rotation === other.rotation &&
            this.scale === other.scale;
    }

    /**
     * Create a copy of this decoration
     */
    clone(): Decoration {
        const copy = new Decoration(
            this.id,
            this.name,
            this.position.clone(),
            this.rotation,
            this.scale
        );
        copy.uid = this.uid;  // preserve uid so undo/restore can re-insert at correct key
        copy.rotX = this.rotX;
        copy.rotZ = this.rotZ;
        return copy;
    }

    toString() {
        return `Decoration(${this.id}, "${this.name}", ${this.position})`;
    }

    /**
     * Create from DTO
     */
    static fromDTO(dto: Record<string, unknown>): Decoration {
        const position = WorldCoordinate.fromObject(dto.position as WorldCoordinateLike);
        const d = new Decoration(
            dto.id as string | number,
            dto.name as string,
            position,
            (dto.rotation as number) ?? 0,
            (dto.scale as number) ?? 1
        );
        if (dto.uid) d.uid = dto.uid as string; // restore internal uid for round-trip fidelity
        return d;
    }
}

export { Decoration };
