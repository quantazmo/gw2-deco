/**
 * LayerSelectedEvent - Domain event fired when a layer is selected
 */
import { DomainEvent } from './DomainEvent.ts';

export class LayerSelectedEvent extends DomainEvent {
    layerId: string | null;
    constructor(layoutId: string, layerId: string | null) {
        super(layoutId, 'LayerSelected');
        // layerId can be null when deselecting all layers
        this.layerId = layerId;
    }

    getLayerId() {
        return this.layerId;
    }

    toObject() {
        return {
            ...super.toObject(),
            layerId: this.layerId
        };
    }
}

export default LayerSelectedEvent;
