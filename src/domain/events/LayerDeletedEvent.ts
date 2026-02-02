/**
 * LayerDeletedEvent - Domain event fired when a layer is deleted
 */
import { DomainEvent } from './DomainEvent.ts';

export class LayerDeletedEvent extends DomainEvent {
    layerId: string;
    constructor(layoutId: string, layerId: string) {
        super(layoutId, 'LayerDeleted');
        if (!layerId) {
            throw new Error('LayerDeletedEvent: layerId is required');
        }
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

export default LayerDeletedEvent;
