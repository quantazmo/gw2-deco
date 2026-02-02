/**
 * PanChangedEvent - Domain event fired when pan (viewport position) changes
 */
import { DomainEvent } from './DomainEvent.ts';

export class PanChangedEvent extends DomainEvent {
    oldPan: { x: number; y: number };
    newPan: { x: number; y: number };
    constructor(layoutId: string, oldPan: { x: number; y: number }, newPan: { x: number; y: number }) {
        super(layoutId, 'PanChanged');
        if (!oldPan || typeof oldPan.x !== 'number' || !newPan || typeof newPan.x !== 'number') {
            throw new Error('PanChangedEvent: oldPan and newPan must have x and y properties');
        }
        this.oldPan = oldPan;
        this.newPan = newPan;
    }

    getOldPan() {
        return this.oldPan;
    }

    getNewPan() {
        return this.newPan;
    }

    toObject() {
        return {
            ...super.toObject(),
            oldPan: { ...this.oldPan },
            newPan: { ...this.newPan }
        };
    }
}

export default PanChangedEvent;
