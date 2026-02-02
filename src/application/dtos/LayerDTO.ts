/**
 * Data Transfer Object for Layer
 */
import { DecorationDTO } from './DecorationDTO.js';

export class LayerDTO {
    id: string;
    name: string;
    isVisible: boolean;
    decorations: DecorationDTO[];

    constructor(id: string, name: string, isVisible: boolean, decorations: DecorationDTO[] = []) {
        this.id = id;
        this.name = name;
        this.isVisible = isVisible;
        this.decorations = decorations;
    }

    /**
     * Creates a LayerDTO from a Layer domain entity
     * @param {Layer} layer - The domain entity
     * @returns {LayerDTO}
     */
    static fromDomain(layer: { id: string; name: string; isVisible: boolean; getAllDecorations(): Array<{ id: string; name: string; position: { x: number; y: number; z?: number }; rotation: number; scale: number }> }): LayerDTO {
        const decorations = layer.getAllDecorations().map(d => DecorationDTO.fromDomain(d));
        return new LayerDTO(layer.id, layer.name, layer.isVisible, decorations);
    }

    /**
     * Converts the DTO to JSON
     * @returns {object}
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            isVisible: this.isVisible,
            decorations: this.decorations
        };
    }
}

export default LayerDTO;
