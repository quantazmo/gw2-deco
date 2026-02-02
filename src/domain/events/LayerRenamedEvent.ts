/**
 * LayerRenamedEvent - Domain event fired when a layer is renamed
 */
import { DomainEvent } from './DomainEvent.ts';

export class LayerRenamedEvent extends DomainEvent {
    layerId: string;
    oldName: string;
    newName: string;
    constructor(layoutId: string, layerId: string, oldName: string, newName: string) {
        super(layoutId, 'LayerRenamed');
        if (!layerId) {
            throw new Error('LayerRenamedEvent: layerId is required');
        }
        if (!oldName || !newName) {
            throw new Error('LayerRenamedEvent: oldName and newName are required');
        }
        this.layerId = layerId;
        this.oldName = oldName;
        this.newName = newName;
    }

    getLayerId() {
        return this.layerId;
    }

    getOldName() {
        return this.oldName;
    }

    getNewName() {
        return this.newName;
    }

    toObject() {
        return {
            ...super.toObject(),
            layerId: this.layerId,
            oldName: this.oldName,
            newName: this.newName
        };
    }
}

export default LayerRenamedEvent;
