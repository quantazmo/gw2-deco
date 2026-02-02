/**
 * Data Transfer Object for Decoration
 */
export class DecorationDTO {
    id: string;
    name: string;
    position: { x: number; y: number; z?: number };
    rotation: number;
    scale: number;

    constructor(id: string, name: string, position: { x: number; y: number; z?: number }, rotation = 0, scale = 1) {
        this.id = id;
        this.name = name;
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
    }

    /**
     * Creates a DecorationDTO from a Decoration domain entity
     * @param {Decoration} decoration - The domain entity
     * @returns {DecorationDTO}
     */
    static fromDomain(decoration: { id: string; name: string; position: { x: number; y: number; z?: number }; rotation: number; scale: number }): DecorationDTO {
        return new DecorationDTO(
            decoration.id,
            decoration.name,
            {
                x: decoration.position.x,
                y: decoration.position.y,
                z: decoration.position.z
            },
            decoration.rotation,
            decoration.scale
        );
    }

    /**
     * Converts the DTO to JSON
     * @returns {object}
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            position: this.position,
            rotation: this.rotation,
            scale: this.scale
        };
    }
}

export default DecorationDTO;
