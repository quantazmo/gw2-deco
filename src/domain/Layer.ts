/**
 * Layer - Domain Entity/Aggregate representing a collection of decorations
 * Properties: id, name, isVisible, decorations[]
 * Business rules: name must be non-empty, can't add duplicate ids
 */
import { Decoration } from './Decoration.ts';

class Layer {
    id: string;
    name: string;
    isVisible: boolean;
    color: string;
    decorations: Map<string, Decoration>;

    constructor(id: string | number, name: string, isVisible: boolean = true, color: string = '#00d4ff') {
        this.validate(id, name);
        this.id = String(id).trim();
        this.name = String(name).trim();
        this.isVisible = Boolean(isVisible);
        this.color = color || '#00d4ff';
        this.decorations = new Map(); // Map<decorationId, Decoration>
    }

    validate(id: string | number, name: string): void {
        if (typeof id !== 'string' && typeof id !== 'number') {
            throw new Error('Layer: id must be a string or number');
        }
        if (String(id).trim().length === 0) {
            throw new Error('Layer: id cannot be empty');
        }
        if (typeof name !== 'string') {
            throw new Error('Layer: name must be a string');
        }
        if (String(name).trim().length === 0) {
            throw new Error('Layer: name cannot be empty');
        }
    }

    /**
     * Add a decoration to the layer
     */
    addDecoration(decoration: Decoration): void {
        if (!decoration || typeof decoration.uid !== 'string') {
            throw new Error('Layer.addDecoration: decoration must have a uid');
        }
        if (this.decorations.has(decoration.uid)) {
            throw new Error(`Layer.addDecoration: decoration with uid "${decoration.uid}" already exists`);
        }
        this.decorations.set(decoration.uid, decoration);
    }

    /**
     * Insert a decoration at a specific index position.
     * If index is out of range, appends to the end.
     * @param {Decoration} decoration
     * @param {number} index - Zero-based insertion index
     */
    insertDecorationAt(decoration: Decoration, index: number): void {
        if (!decoration || typeof decoration.uid !== 'string') {
            throw new Error('Layer.insertDecorationAt: decoration must have a uid');
        }
        if (this.decorations.has(decoration.uid)) {
            throw new Error(`Layer.insertDecorationAt: decoration with uid "${decoration.uid}" already exists`);
        }
        const entries = Array.from(this.decorations.entries());
        const clampedIndex = Math.max(0, Math.min(index, entries.length));
        entries.splice(clampedIndex, 0, [decoration.uid, decoration]);
        this.decorations = new Map(entries);
    }

    /**
     * Get the zero-based index of a decoration in this layer.
     * Returns -1 if not found.
     * @param {string} decorationId
     * @returns {number}
     */
    getDecorationIndex(decorationId: string): number {
        let i = 0;
        for (const key of this.decorations.keys()) {
            if (key === decorationId) return i;
            i++;
        }
        return -1;
    }

    /**
     * Remove a decoration from the layer
     */
    removeDecoration(decorationId: string): void {
        if (!this.decorations.has(decorationId)) {
            throw new Error(`Layer.removeDecoration: decoration with id "${decorationId}" not found`);
        }
        this.decorations.delete(decorationId);
    }

    /**
     * Get a decoration by id
     */
    getDecoration(decorationId: string): Decoration | null {
        return this.decorations.get(decorationId) || null;
    }

    /**
     * Get all decorations as array
     */
    getAllDecorations(): Decoration[] {
        return Array.from(this.decorations.values());
    }

    /**
     * Check if layer is empty
     */
    isEmpty(): boolean {
        return this.decorations.size === 0;
    }

    /**
     * Get number of decorations
     */
    getDecorationCount(): number {
        return this.decorations.size;
    }

    /**
     * Toggle visibility
     */
    toggleVisibility(): void {
        this.isVisible = !this.isVisible;
    }

    /**
     * Validate the layer state
     */
    validateState(): { isValid: boolean; errors: string[] } {
        const errors = [];

        try {
            this.validate(this.id, this.name);
        } catch (error) {
            errors.push((error as Error).message);
        }

        if (this.decorations.size === 0) {
            errors.push('Layer is empty (no decorations)');
        }

        // Validate all decorations
        for (const decoration of this.decorations.values()) {
            const result = decoration.validateState();
            if (!result.isValid) {
                errors.push(`Decoration "${decoration.id}": ${result.errors.join(', ')}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Convert to data transfer object
     */
    toDTO() {
        return {
            id: this.id,
            name: this.name,
            isVisible: this.isVisible,
            color: this.color,
            decorations: this.getAllDecorations().map(d => d.toDTO())
        };
    }

    /**
     * Check if layers are equal
     */
    equals(other: unknown): boolean {
        if (!(other instanceof Layer)) {
            return false;
        }
        if (this.id !== other.id || this.name !== other.name || this.isVisible !== other.isVisible || this.color !== other.color) {
            return false;
        }
        if (this.decorations.size !== other.decorations.size) {
            return false;
        }
        for (const [id, decoration] of this.decorations) {
            const otherDecoration = other.decorations.get(id);
            if (!otherDecoration || !decoration.equals(otherDecoration)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Create a copy of this layer
     */
    clone(): Layer {
        const layer = new Layer(this.id, this.name, this.isVisible, this.color);
        for (const decoration of this.decorations.values()) {
            layer.addDecoration(decoration.clone());
        }
        return layer;
    }

    toString() {
        return `Layer(${this.id}, "${this.name}", ${this.decorations.size} decorations)`;
    }

    /**
     * Create from DTO
     */
    static fromDTO(dto: Record<string, unknown>): Layer {
        const layer = new Layer(dto.id as string | number, dto.name as string, dto.isVisible as boolean, dto.color as string | undefined);
        for (const decorationDto of ((dto.decorations as unknown[]) || [])) {
            layer.addDecoration(Decoration.fromDTO(decorationDto as Record<string, unknown>));
        }
        return layer;
    }
}

export { Layer };
