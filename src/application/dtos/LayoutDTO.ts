/**
 * Data Transfer Object for Layout
 */
import { MapDTO } from './MapDTO.js';
import { LayerDTO } from './LayerDTO.js';
import { HomesteadLayout } from '../../domain/HomesteadLayout.ts';

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
    static fromDomain(layout: HomesteadLayout): LayoutDTO {
        if (!layout.map) {
            throw new Error('LayoutDTO.fromDomain: layout map is required');
        }
        const mapDTO = MapDTO.fromDomain(layout.map);
        const layerDTOs = layout.getAllLayers().map(layer => LayerDTO.fromDomain(layer));

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
