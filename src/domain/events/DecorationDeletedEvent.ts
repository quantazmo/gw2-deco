/**
 * DecorationDeletedEvent - Domain event fired when a decoration is deleted
 */
import { DomainEvent } from './DomainEvent.ts';

export class DecorationDeletedEvent extends DomainEvent {
    layerId: string;
    decorationId: string;
    constructor(layoutId: string, layerId: string, decorationId: string) {
        super(layoutId, 'DecorationDeleted');
        if (!layerId) {
            throw new Error('DecorationDeletedEvent: layerId is required');
        }
        if (!decorationId) {
            throw new Error('DecorationDeletedEvent: decorationId is required');
        }
        this.layerId = layerId;
        this.decorationId = decorationId;
    }

    getLayerId() {
        return this.layerId;
    }

    getDecorationId() {
        return this.decorationId;
    }

    toObject() {
        return {
            ...super.toObject(),
            layerId: this.layerId,
            decorationId: this.decorationId
        };
    }
}

export default DecorationDeletedEvent;
