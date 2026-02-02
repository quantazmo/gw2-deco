/**
 * LayerColorChangedEvent - Domain event fired when a layer's color is changed
 */
import { DomainEvent } from './DomainEvent.ts';

export class LayerColorChangedEvent extends DomainEvent {
    layerId: string;
    color: string;

    constructor(layoutId: string, layerId: string, color: string) {
        super(layoutId, 'LayerColorChanged');
        if (!layerId) {
            throw new Error('LayerColorChangedEvent: layerId is required');
        }
        if (!color) {
            throw new Error('LayerColorChangedEvent: color is required');
        }
        this.layerId = layerId;
        this.color = color;
    }

    getLayerId() {
        return this.layerId;
    }

    getColor() {
        return this.color;
    }

    toObject() {
        return {
            aggregateId: this.aggregateId,
            eventType: this.eventType,
            timestamp: this.timestamp,
            layerId: this.layerId,
            color: this.color
        };
    }
}

export default LayerColorChangedEvent;
