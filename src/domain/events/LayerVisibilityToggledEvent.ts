/**
 * LayerVisibilityToggledEvent - Domain event fired when a layer's visibility is toggled
 */
import { DomainEvent } from './DomainEvent.ts';

export class LayerVisibilityToggledEvent extends DomainEvent {
    layerId: string;
    isVisible: boolean;
    constructor(layoutId: string, layerId: string, isVisible: boolean) {
        super(layoutId, 'LayerVisibilityToggled');
        if (!layerId) {
            throw new Error('LayerVisibilityToggledEvent: layerId is required');
        }
        if (typeof isVisible !== 'boolean') {
            throw new Error('LayerVisibilityToggledEvent: isVisible must be a boolean');
        }
        this.layerId = layerId;
        this.isVisible = isVisible;
    }

    getLayerId() {
        return this.layerId;
    }

    getIsVisible() {
        return this.isVisible;
    }

    toObject() {
        return {
            ...super.toObject(),
            layerId: this.layerId,
            isVisible: this.isVisible
        };
    }
}

export default LayerVisibilityToggledEvent;
