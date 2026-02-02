/**
 * LayerCreatedEvent - Domain event fired when a layer is created
 */
import { DomainEvent } from './DomainEvent.ts';

export class LayerCreatedEvent extends DomainEvent {
    layerId: string;
    layerName: string;
    constructor(layoutId: string, layerId: string, layerName: string) {
        super(layoutId, 'LayerCreated');
        if (!layerId) {
            throw new Error('LayerCreatedEvent: layerId is required');
        }
        if (!layerName) {
            throw new Error('LayerCreatedEvent: layerName is required');
        }
        this.layerId = layerId;
        this.layerName = layerName;
    }

    getLayerId() {
        return this.layerId;
    }

    getLayerName() {
        return this.layerName;
    }

    toObject() {
        return {
            ...super.toObject(),
            layerId: this.layerId,
            layerName: this.layerName
        };
    }
}

export default LayerCreatedEvent;
