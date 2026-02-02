/**
 * MapSwitchedEvent - Domain event fired when the active map is switched
 */
import { DomainEvent } from './DomainEvent.ts';

export class MapSwitchedEvent extends DomainEvent {
    previousMapId: number | null;
    newMapId: number;
    newMapName: string;
    /**
     * @param {string} layoutId - The layout aggregate ID
     * @param {number|null} previousMapId - The previous map ID (null if none)
     * @param {number} newMapId - The new map ID
     * @param {string} newMapName - The new map name
     */
    constructor(layoutId: string, previousMapId: number | null, newMapId: number, newMapName: string) {
        super(layoutId, 'MapSwitched');
        if (newMapId === undefined || newMapId === null) {
            throw new Error('MapSwitchedEvent: newMapId is required');
        }
        if (!newMapName) {
            throw new Error('MapSwitchedEvent: newMapName is required');
        }
        this.previousMapId = previousMapId;
        this.newMapId = newMapId;
        this.newMapName = newMapName;
    }

    toObject() {
        return {
            ...super.toObject(),
            previousMapId: this.previousMapId,
            newMapId: this.newMapId,
            newMapName: this.newMapName
        };
    }
}

export default MapSwitchedEvent;
