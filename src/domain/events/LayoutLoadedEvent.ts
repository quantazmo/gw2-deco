/**
 * LayoutLoadedEvent - Domain event fired when a layout is loaded
 */
import { DomainEvent } from './DomainEvent.ts';

export class LayoutLoadedEvent extends DomainEvent {
    layout: unknown;
    constructor(layoutId: string, layout: unknown) {
        super(layoutId, 'LayoutLoaded');
        if (!layout) {
            throw new Error('LayoutLoadedEvent: layout is required');
        }
        this.layout = layout;
    }

    getLayout() {
        return this.layout;
    }

    toObject() {
        return {
            ...super.toObject(),
            layout: (this.layout as { toDTO?(): unknown }).toDTO ? (this.layout as { toDTO(): unknown }).toDTO() : this.layout
        };
    }
}

export default LayoutLoadedEvent;
