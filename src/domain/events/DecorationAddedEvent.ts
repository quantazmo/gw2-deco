/**
 * DecorationAddedEvent - Domain event fired when a decoration is added
 */
import { DomainEvent } from './DomainEvent.ts';

export class DecorationAddedEvent extends DomainEvent {
    layerId: string;
    decoration: unknown;
    constructor(layoutId: string, layerId: string, decoration: unknown) {
        super(layoutId, 'DecorationAdded');
        if (!layerId) {
            throw new Error('DecorationAddedEvent: layerId is required');
        }
        if (!decoration) {
            throw new Error('DecorationAddedEvent: decoration is required');
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

export default DecorationAddedEvent;
