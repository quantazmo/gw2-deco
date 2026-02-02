/**
 * Data Transfer Object for Layout
 */
import { MapDTO } from './MapDTO.js';
import { LayerDTO } from './LayerDTO.js';

export class LayoutDTO {
    id: string;
    name: string;
    map: MapDTO;
    layers: LayerDTO[];
    activeLayerId: string | null;

    constructor(id: string, name: string, map: MapDTO, layers: LayerDTO[] = [], activeLayerId: string | null = null) {
        this.id = id;
        this.name = name;
        this.map = map;
        this.layers = layers;
        this.activeLayerId = activeLayerId;
    }

    /**
     * Creates a Layout DTO from a HomesteadLayout domain entity
     * @param {HomesteadLayout} layout - The domain entity
     * @returns {LayoutDTO}
     */
    static fromDomain(layout: { id: string; name: string; map: unknown; activeLayerId: string | null; getAllLayers(): Array<{ id: string; name: string; isVisible: boolean; getAllDecorations(): unknown[] }> }): LayoutDTO {
        const mapDTO = MapDTO.fromDomain(layout.map as any); // JS domain object – narrowed as needed here
        const layerDTOs = layout.getAllLayers().map(l => LayerDTO.fromDomain(l as any)); // JS domain Layer object

        return new LayoutDTO(
            layout.id,
            layout.name,
            mapDTO,
            layerDTOs,
            layout.activeLayerId
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
            map: this.map,
            layers: this.layers,
            activeLayerId: this.activeLayerId
        };
    }
}

export default LayoutDTO;
