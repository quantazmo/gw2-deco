/**
 * DecorationUpdatedEvent - Domain event fired when a decoration is updated
 */
import { DomainEvent } from './DomainEvent.ts';

export class DecorationUpdatedEvent extends DomainEvent {
    layerId: string;
    decoration: unknown;
    constructor(layoutId: string, layerId: string, decoration: unknown) {
        super(layoutId, 'DecorationUpdated');
        if (!layerId) {
            throw new Error('DecorationUpdatedEvent: layerId is required');
        }
        if (!decoration) {
            throw new Error('DecorationUpdatedEvent: decoration is required');
        }
        this.layerId = layerId;
        this.decoration = decoration;
    }

    getLayerId() {
        return this.layerId;
    }

    getDecoration() {
        return this.decoration;
    }

    toObject() {
        return {
            ...super.toObject(),
            layerId: this.layerId,
            decoration: (this.decoration as { toDTO?(): unknown }).toDTO ? (this.decoration as { toDTO(): unknown }).toDTO() : this.decoration
        };
    }
}

export default DecorationUpdatedEvent;
