/**
 * AllLayersClearedEvent - Domain event fired when all layers are cleared (e.g., map switch)
 */
import { DomainEvent } from './DomainEvent.ts';

export class AllLayersClearedEvent extends DomainEvent {
    previousLayerCount: number;
    /**
     * @param {string} layoutId - The layout aggregate ID
     * @param {number} previousLayerCount - Number of layers that were cleared
     */
    constructor(layoutId: string, previousLayerCount: number) {
        super(layoutId, 'AllLayersCleared');
        if (typeof previousLayerCount !== 'number' || previousLayerCount < 0) {
            throw new Error('AllLayersClearedEvent: previousLayerCount must be a non-negative number');
        }
        this.previousLayerCount = previousLayerCount;
    }

    toObject() {
        return {
            ...super.toObject(),
            previousLayerCount: this.previousLayerCount
        };
    }
}

export default AllLayersClearedEvent;
