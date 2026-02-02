/**
 * ZoomChangedEvent - Domain event fired when zoom level changes
 */
import { DomainEvent } from './DomainEvent.ts';

export class ZoomChangedEvent extends DomainEvent {
    oldZoom: number;
    newZoom: number;
    constructor(layoutId: string, oldZoom: number, newZoom: number) {
        super(layoutId, 'ZoomChanged');
        if (typeof oldZoom !== 'number' || typeof newZoom !== 'number') {
            throw new Error('ZoomChangedEvent: oldZoom and newZoom must be numbers');
        }
        this.oldZoom = oldZoom;
        this.newZoom = newZoom;
    }

    getOldZoom() {
        return this.oldZoom;
    }

    getNewZoom() {
        return this.newZoom;
    }

    toObject() {
        return {
            ...super.toObject(),
            oldZoom: this.oldZoom,
            newZoom: this.newZoom
        };
    }
}

export default ZoomChangedEvent;
